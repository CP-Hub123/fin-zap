
# Reservar dinheiro como fluxo primário (sem fricção de cofrinho)

## Objetivo

Hoje, para reservar dinheiro o usuário **precisa** criar um cofrinho na aba Cofrinhos (`CofrinhosView` → botão "Novo" → dialog com nome/tipo/meta). Vamos transformar "Reservar dinheiro" em uma ação direta a partir do Dashboard. O cofrinho permanece como **agrupamento opcional** da reserva, não como pré-requisito.

A reserva criada precisa refletir imediatamente em `saldoReservado` e `saldoLivre` via `financialEngine.computeBalances`, sem qualquer cálculo local. **Reservar é realocação interna, não despesa**: o dinheiro não sai do caixa, apenas migra de "livre" para "reservado".

## Arquitetura escolhida

Para manter a engine como fonte única de verdade sem inventar uma nova entidade paralela, toda reserva direta vai para um **cofrinho-reserva padrão** criado automaticamente por usuário (invisível na listagem de cofrinhos do Planejamento). Como `saldoReservado = Σ cofrinhos.saldo`, a engine continua funcionando intocada.

```text
Dashboard "Reservar R$ X"
        │
        ▼
RPC reservar_valor(_valor, _descricao, _month_id)
        │
        ├── garante cofrinho default do usuário (cria se não existe)
        ├── INSERT transactions (
        │     type='expense', impacta_saldo=FALSE,
        │     origem='reserva', cofrinho_id=NULL
        │   )                                 ← rastro/auditoria, não mexe em saldoTotal
        └── UPDATE cofrinhos SET saldo = saldo + valor  WHERE id = default
                │
                ▼
useFinancialBalance  →  computeBalances
   saldoTotal      → inalterado (não é saída de caixa)
   saldoReservado  ↑ (cofrinho default ganhou saldo)
   saldoLivre      ↓ (= saldoTotal − saldoReservado − …)
```

A operação inversa "Resgatar reserva" é **simétrica**: também usa `impacta_saldo=false` (é realocação interna, não receita) e reduz o saldo do cofrinho default.

## Mudanças

### 1. Banco (migration)

- `cofrinhos`: adicionar `is_default boolean not null default false` e índice único parcial garantindo um único default por usuário (`UNIQUE (user_id) WHERE is_default`).
- Função `ensure_default_reserve(_user_id uuid) returns uuid` (SECURITY DEFINER): retorna o id do cofrinho default; cria se não existir com `tipo='reserva'`, `nome='Reserva'`, `is_default=true`, `cover_preset='reserva'`, `saldo=0`, `meses_protegidos=6`, `custo_mensal=0`.
- Função `reservar_valor(_valor numeric, _descricao text, _month_id uuid) returns uuid` (SECURITY DEFINER):
  - valida `auth.uid()` e `_valor > 0`;
  - `ensure_default_reserve(auth.uid())` → `v_cof_id`;
  - `INSERT` em `transactions` com:
    - `type='expense'` (apenas para classificar no extrato),
    - `impacta_saldo=FALSE` (não entra em `totalExpense` da engine),
    - `origem='reserva'`,
    - `cofrinho_id=NULL` (evita o trigger `aplicar_transacao_cofrinho`, que faria saldo errado),
    - `status='realized'`, `source='manual'`, `date=current_date`, `month_id=_month_id`;
  - `UPDATE cofrinhos SET saldo = saldo + _valor WHERE id = v_cof_id`;
  - retorna id da transação.
- Função `resgatar_reserva(_valor numeric, _descricao text, _month_id uuid) returns uuid` (SECURITY DEFINER), **simétrica**:
  - valida usuário, `_valor > 0`, e `saldo do default >= _valor` (senão `RAISE EXCEPTION 'Saldo reservado insuficiente'`);
  - `INSERT` em `transactions` com:
    - `type='income'` (só para classificar no extrato),
    - `impacta_saldo=FALSE` (não entra em `totalIncome` da engine),
    - `origem='reserva'`,
    - `cofrinho_id=NULL`,
    - mesmo padrão de `status/source/date/month_id`;
  - `UPDATE cofrinhos SET saldo = saldo - _valor WHERE id = v_cof_id`;
  - retorna id da transação.
- Backfill: nenhum cofrinho existente é marcado `is_default`. A função `ensure_default_reserve` cria sob demanda no primeiro uso.

### 2. Hook `useReserve` (novo)

`src/hooks/useReserve.ts` expõe `reservar({ valor, descricao, monthId })` e `resgatar({ valor, descricao, monthId })` como `useMutation`s que chamam as RPCs e invalidam via `useFinzapInvalidate` as queries de `transactions`, `cofrinhos`, `months`. Nada de matemática local.

### 3. UI — Dashboard

- `QuickActionsCard` (`src/pages/Index.tsx`/`QuickActionsCard.tsx`): substituir/atualizar "Novo cofrinho" por **"Reservar dinheiro"** (ícone `PiggyBank`/`ShieldCheck`). Abre um sheet leve.
- `IntelligentBalanceCard`: adicionar atalho secundário "Reservar" próximo ao `saldoLivre`, reforçando o vínculo livre → reservado. Quando `saldoReservado > 0`, também exibir um link discreto "Resgatar".
- Novo `ReserveSheet.tsx` (mobile-first, PT-BR):
  - alterna entre modos **Reservar** / **Resgatar**;
  - campo `valor` em BRL (`Intl.NumberFormat`);
  - campo `descricao` opcional (defaults: "Reserva rápida" / "Resgate de reserva");
  - validações sem recalcular nada: `valor > 0`; em Reservar `valor <= saldoLivre`; em Resgatar `valor <= saldoReservado` — todos lidos de `useFinancialBalance`;
  - botão primário chama `useReserve.reservar` ou `.resgatar`;
  - link discreto "Organizar em um cofrinho específico" → leva à `CofrinhosView` (fluxo avançado opcional, sem mudanças).
- Toasts PT-BR: "Reservado R$ X. Saldo livre atualizado." / "Resgatado R$ X. Disponível no saldo livre."

### 4. Cofrinhos (Planejamento)

- `useCofrinhos`: filtrar `is_default=true` da listagem retornada — o cofrinho default fica invisível na grid e em todos os selects de vínculo (transações, recorrências, cartões).
- `CofrinhoDetailSheet`: não editável/deletável caso seja acessado por algum atalho futuro.
- Nenhuma mudança no fluxo atual de criar cofrinhos nomeados além do filtro.

### 5. Engine financeira

- **Nada muda em `financialEngine.ts` nem em `useFinancialBalance.ts`.** Como o cofrinho default tem `saldo > 0`, ele entra naturalmente em `saldoReservado = Σ cofrinhos.saldo` (`useFinancialBalance.ts:88`).
- `computeBalances` continua sendo a única função que produz `saldoTotal`, `saldoLivre`, `saldoReservado`.
- SummaryView, IA, ClosingView, PDF (`generate-report`) herdam automaticamente.

## Por que `impacta_saldo=false` em ambos os lados

Reservar e resgatar são **realocação interna** do mesmo caixa. Em uma RPC com `impacta_saldo=true`:

- Reservar reduziria `saldoTotal` (despesa) **e** aumentaria `saldoReservado` → `saldoLivre` cairia em `2×valor`. Errado.
- Resgatar aumentaria `saldoTotal` (receita) **e** reduziria `saldoReservado` → `saldoLivre` subiria em `2×valor`. Errado.

Com `impacta_saldo=false` dos dois lados:

| Operação  | saldoTotal | saldoReservado | saldoLivre |
| --------- | ---------- | -------------- | ---------- |
| Reservar  | =          | +X             | −X         |
| Resgatar  | =          | −X             | +X         |

Comportamento simétrico, sem contagem dupla, sem distorcer KPIs de income/expense do mês.

## Detalhes técnicos

- **`cofrinho_id=NULL` na transação**: necessário para não acionar `aplicar_transacao_cofrinho`. A RPC ajusta `cofrinhos.saldo` explicitamente, na direção correta.
- **`type='expense'`/`'income'`**: serve só para o extrato e filtros visuais; como `impacta_saldo=false`, a engine ignora.
- **`origem='reserva'`**: marcador para o extrato exibir etiqueta "Reserva" / "Resgate" em vez de despesa/receita comum.
- **Atomicidade**: cada RPC é uma única transação SQL — `INSERT` + `UPDATE` ou ambos sucedem ou nenhum.
- **RLS**: ambas RPCs `SECURITY DEFINER` validando `auth.uid()`, padrão de `transferir_entre_cofrinhos`/`convert_commitment_to_transaction`.
- **Idempotência**: cada clique é uma operação nova (não idempotente). `ensure_default_reserve` é idempotente via `UNIQUE` parcial.

## Validação

- Antes/Depois de uma reserva: `saldoTotal` inalterado; `saldoReservado` +X; `saldoLivre` −X.
- Antes/Depois de um resgate (após reservar): tudo volta ao estado anterior.
- `totalIncome` e `totalExpense` do mês permanecem inalterados (porque `impacta_saldo=false`).
- Conferir Dashboard, SummaryView, IA, ClosingView, PDF — todos consomem `useFinancialBalance`, um teste end-to-end basta.

## Fora de escopo

- Não criar tabela `reserves` separada — manteria duas fontes de verdade.
- Não alterar `financialEngine.ts` nem `useFinancialBalance.ts`.
- Não mexer em cartões, recorrências, planejamento, IA ou edge functions.
- O fluxo avançado de criar cofrinhos nomeados na aba Cofrinhos continua existindo sem mudanças.
