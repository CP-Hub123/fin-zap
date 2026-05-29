## Diagnóstico — o que JÁ existe

A engine de notificações inteligentes não está conceitual: ela está em produção.

**Infraestrutura já operacional:**
- `notification_preferences` — 11 categorias + quiet hours + timezone (mais completa que o pedido)
- `notifications_log` — com `dedupe_key`, `delivered_at`, `clicked_at`, `priority`, `category`, `error`
- `push_subscriptions` — endpoints + `failure_count` + `last_error`
- Edge function `notifications-scheduler` (500 linhas) — agendador contextual completo
- Cron `pg_cron` rodando **a cada 15 min** invocando o scheduler
- Edge function `send-push` — entrega com VAPID + dedup + log
- Per-user **daily cap 2/dia** (críticos isentos)
- Deduplicação por `dedupe_key`
- Cooldown semanal nos sinais de ritmo

**Regras inteligentes já implementadas no scheduler:**
| Regra solicitada | Status atual |
|---|---|
| R1 — usuário sumiu (≥7 dias) | ✅ `rhythm_outdated` |
| R2 — previsibilidade caiu (≥4 dias) | ✅ `rhythm_attention` |
| R3 — fechamento próximo (3d) | ❌ **falta** |
| R4 — recorrência amanhã/hoje | ✅ `recurring_due` |
| R5 — usuário ativo | ✅ `rhythm_consistent` (segundas) |
| R6 — cofrinho avançando | ✅ `cofrinho_milestone` 25/50/75/100% |
| Orçamento 50/80/100% | ✅ por categoria |
| Resumo semanal (domingo 19h) | ✅ |
| Próximo mês mais leve no cartão | ✅ `card_lighter_ahead` |
| Concentração de despesas próxima semana | ✅ `week_concentration` |
| Mês mais calmo que histórico | ✅ |

## Lacunas reais a fechar

### 1. Regra de fechamento próximo (faltando)
Adicionar ao scheduler bloco que dispara **3 dias antes do último dia do mês** (e 1 dia antes), uma vez por mês por usuário:
> "Seu fechamento mensal está se aproximando — revise para fechar com clareza."
Dedupe: `month_closing:{user_id}:{YYYY-MM}:{3d|1d}`

### 2. Respeitar `quiet_hours` por usuário
Hoje o scheduler tem cap diário mas **não silencia** durante quiet hours definidas pelo usuário. Adicionar: antes de `dispatch()`, ler `quiet_hours_start/end` + `timezone` da preferência e bloquear envios não-críticos dentro do intervalo (mantendo `alerta`/`critical` passando).

### 3. Tabela `financial_rhythm_state` (persistência do score)
Hoje os scores são computados ad-hoc a cada run. Persistir permite:
- detectar **queda** de previsibilidade (compara snapshot anterior)
- alimentar painel admin
- evitar recálculos

Campos: `user_id` (PK), `last_transaction_at`, `last_open_at`, `rhythm_score 0-100`, `predictability_score 0-100`, `inactivity_level` (`ok|atencao|risco|critico`), `last_notification_at`, `updated_at`.

Atualizado pelo scheduler a cada run. Score = mistura ponderada de: dias-ativos/14, recência da última transação, nº de recorrências ativas, lacunas (>3 dias sem registro), volatilidade do saldo.

### 4. Painel admin de métricas de notificação
Nova rota `/admin/notifications` com:
- enviadas por dia (últimos 30d)
- taxa de clique (`clicked_at IS NOT NULL` / total)
- taxa de entrega (`delivered_at IS NOT NULL` / total)
- top 10 tipos mais eficientes (por CTR)
- usuários silenciosos (sem `clicked_at` em 30d)
- erros recentes de envio (`push_subscriptions.last_error`)

Consultas diretas ao `notifications_log` + `push_subscriptions` (admin já tem RLS via `is_admin()`).

## Plano de execução

```text
1. Migração SQL
   - CREATE TABLE public.financial_rhythm_state + GRANTs + RLS
   - Função/coluna se necessária para fechamento

2. Atualizar supabase/functions/notifications-scheduler/index.ts
   - Bloco "month closing" (R3)
   - Helper isInQuietHours(prefs, now) antes de dispatch
   - Bloco "rhythm snapshot": upsert em financial_rhythm_state
   - Disparo extra quando predictability_score cai >15 pts vs snapshot anterior

3. Frontend admin
   - src/pages/admin/AdminNotifications.tsx (métricas)
   - Adicionar item no AdminLayout
```

## Pontos que NÃO vamos refazer (já existem)

- Não criar `notifications_preferences` nova — usar a existente (`notification_preferences`).
- Não criar `notifications_history` nova — `notifications_log` já cobre tudo (inclusive hash de dedup).
- Não criar segunda edge function `process-smart-notifications` — estender o `notifications-scheduler` que já roda a cada 15 min via pg_cron.
- Não trocar o cron — 15min é mais responsivo que 2h pedido e já está estável.

## Resumo do escopo final

4 entregas: (1) regra de fechamento próximo, (2) respeito a quiet hours por usuário, (3) tabela `financial_rhythm_state` com score persistido + gatilho de queda, (4) painel admin de métricas.

Confirma esse escopo? Se quiser que eu inclua/remova algo (ex.: apenas painel admin, ou só a regra de fechamento), me diz antes de eu começar.