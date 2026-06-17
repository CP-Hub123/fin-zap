## Objetivo

Eliminar a métrica paralela `availableReal` e consolidar **`fb.saldoLivre`** (engine `computeBalances`) como única fonte de "saldo livre" do FinZap. Após esta refatoração, qualquer alteração na regra de saldo é feita exclusivamente em `src/lib/financialEngine.ts`.

## Pontos divergentes identificados

| Arquivo | Linha | Uso atual | Após |
|---|---|---|---|
| `src/components/app/SmartDashboardHeader.tsx` | 51, 75–79, 144, 207, 218 | `availableReal` exibido como hero e rotulado "saldo livre" | `fb.saldoLivre` |
| `src/components/app/HealthSnapshotGrid.tsx` | 68, 71 | `fb.availableReal` rotulado "Saldo livre…" | `fb.saldoLivre` |
| `src/hooks/useAIInsight.ts` | 80, 97, 108 | Envia `saldoDisponivel: fb.availableReal` à IA | `fb.saldoLivre` |
| `src/hooks/useFinancialBalance.ts` | 22, 84, 153 | Calcula e expõe `availableReal` localmente | Remover |

Nenhum outro consumidor de `availableReal` existe no projeto (varredura `rg` confirma).

## Mudanças

### 1. `src/hooks/useFinancialBalance.ts`
- Remover `const availableReal = …` (L84) e o campo `availableReal` do return (L153).
- Atualizar JSDoc removendo a menção a `availableReal`.

### 2. `src/components/app/SmartDashboardHeader.tsx`
- Trocar `availableReal: saldoDisponivelReal` por `saldoLivre: saldoDisponivelReal` no destructuring (mantém a variável local, só muda a fonte).
- Heurística `getHealthStatus` continua válida (lê `saldoDisponivelReal`).

### 3. `src/components/app/HealthSnapshotGrid.tsx`
- Trocar `const livre = fb.availableReal` por `const livre = fb.saldoLivre`.

### 4. `src/hooks/useAIInsight.ts`
- Trocar `saldoDisponivel: fb.availableReal` por `saldoDisponivel: fb.saldoLivre` (e atualizar a dependência do `useMemo`).

## Não-escopo

- Nenhuma alteração em `financialEngine.ts` (a engine já é canônica).
- Nenhuma alteração em RLS, migrations, triggers, recorrências, cofrinhos, PDF, ou compromissos.
- Nenhuma mudança visual no `IntelligentBalanceCard` (já corrigido na rodada anterior).
- `CardDetailSheet` / `CreditCardsView` mantêm `disponivel` (escopo de limite de cartão, não saldo).

## Validação

1. `rg "availableReal"` deve retornar **zero** ocorrências após a refatoração.
2. Em um mês com compromisso/cartão vinculado a cofrinho, o número exibido em:
   - `IntelligentBalanceCard` (hero "Disponível para usar")
   - `SmartDashboardHeader` (hero)
   - `HealthSnapshotGrid` ("livre")
   - prompt enviado pela IA (`saldoDisponivel`)
   deve ser **idêntico** ao output de `computeBalances`.
3. Build limpa (sem TS errors sobre `availableReal`).
4. Smoke test manual nos cenários: sem movimento · só receita · só despesa · com reservas · com compromissos · com cartões · com receitas previstas · com `impacta_saldo=false`.

## Critério de aceite

- Único caminho para "saldo livre" no projeto: `financialEngine.computeBalances` → `useFinancialBalance.saldoLivre` → UI/IA.
- `availableReal` não existe mais no codebase.
- Toda futura mudança de regra acontece apenas em `financialEngine.ts`.
