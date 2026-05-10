## Reestruturação completa do sistema de notificações

Vou reconstruir o sistema de notificações do FinZap em camadas: banco, service worker, edge functions, hooks, UI de configurações e gatilhos inteligentes. O foco é confiabilidade, limpeza automática de subscriptions inválidas, permissão pedida no momento certo e mensagens contextuais úteis.

### 1. Banco de dados (migration)

Atualizar o schema para suportar preferências, agendamento e telemetria:

- `push_subscriptions`: adicionar `device_info jsonb`, `user_agent text`, `last_seen_at timestamptz`, `last_error text`, `failure_count int default 0`. Índice único em `(endpoint)`.
- `notification_preferences` (nova): `user_id` (PK), flags `vencimentos`, `recorrencias`, `metas_cofrinhos`, `insights`, `alertas_criticos`, `lembrete_diario`, `resumo_semanal`, `quiet_hours_start`, `quiet_hours_end`, `timezone`. Default: tudo ativo, quiet 22:00–07:00.
- `notifications_log`: adicionar `clicked_at timestamptz`, `delivered_at timestamptz`, `error text`, `dedupe_key text`, `action_url text`. Índice em `(user_id, type, sent_at)` para dedupe.
- Trigger para criar `notification_preferences` automaticamente em novo usuário (junto com `handle_new_user`).
- RLS: usuário gerencia próprias preferências; admin lê tudo.

### 2. Service Worker (`public/sw.js`)

Reescrever com:

- `install` → `self.skipWaiting()`.
- `activate` → `clients.claim()` + limpeza de caches antigos.
- `push` → parse seguro, suporta `actions`, `tag` (dedupe visual), `renotify`, `requireInteraction` para alertas críticos, `data.url` para roteamento.
- `notificationclick` → fecha notificação, foca janela existente ou abre `data.url`. Trata botões de ação ("Ver", "Dispensar").
- `pushsubscriptionchange` → reenvia subscription para o backend.

### 3. Edge functions

`send-push` (refatorar): já existe e está bom; melhorias:

- Respeitar `notification_preferences` do destinatário (skip se categoria desativada ou em quiet hours, exceto `alertas_criticos`).
- Incrementar `failure_count` e remover subscription após 3 falhas consecutivas ou erro 404/410.
- Persistir `delivered_at`, `error`, `dedupe_key`, `action_url` no log.
- Suportar `actions`, `url`, `tag`, `priority` no body.

`notifications-scheduler` (nova, cron): roda a cada 15 min e dispara:

- Vencimentos de recorrências (1 dia antes, no dia).
- Alertas de orçamento (50/80/100%) por categoria.
- Progresso de cofrinhos (a cada marco de 25%).
- Resumo semanal (domingo 19h no fuso do usuário).
- Lembrete de fechamento (último dia útil do mês 19h).
- Lembrete diário opcional (8h).
- Cada envio usa `dedupe_key` (ex.: `budget_80:{cat}:{yyyy-mm}`) para nunca repetir.

Cron: `pg_cron` + `pg_net` chamando a função a cada 15min.

### 4. Frontend

`usePushNotifications` (refatorar): validação rigorosa de endpoint (regex `https://(fcm|updates|web).push…`), `pushsubscriptionchange` listener, recriação automática se inválido, persiste `device_info` + `user_agent`.

`useNotificationPermission` (novo): expõe `requestWithContext(reason)` que mostra um sheet explicativo antes de chamar `Notification.requestPermission()`. Usado em momentos estratégicos: após 1º fechamento de mês, ao criar 1ª recorrência, ao criar 1º cofrinho. Nunca no onboarding.

`NotificationSettingsSheet` (novo): central premium em `/app` (acessível pelo sino → engrenagem). Toggles para cada categoria, quiet hours, e botão "Enviar teste". Visual coerente com design system (HSL tokens).

`NotificationBell`: adicionar engrenagem para abrir a central, mostrar `delivered_at`/categoria com ícone, click route via `action_url`.

`createNotification` (`src/lib/notificationService.ts`): aceitar `dedupe_key`, `action_url`, `priority`, `category`. Backend faz dedupe definitivo.

### 5. Painel admin

Em `src/pages/Admin.tsx` adicionar aba "Notificações" mostrando:

- Total enviadas / entregues / falhas (últimos 7d e 30d) via query agregada em `notifications_log`.
- Subscriptions ativas (count) e por plataforma (parse `user_agent`).
- Taxa de clique (`clicked_at IS NOT NULL` / `delivered_at`).
- Tabela das últimas 50 notificações com status.

### 6. Limpeza e segurança

- `send-push` já rejeita endpoints inválidos; agora também limpa após N falhas.
- Migration faz `DELETE` único de subscriptions com `endpoint LIKE '%permanently-removed.invalid%'`.
- Todas as RLS revisadas (preferences, log update para `clicked_at`).
- VAPID keys já estão em secrets; manter.

### 7. Detalhes técnicos

```text
Cron (pg_cron, a cada 15min)
   ↓
notifications-scheduler (edge)
   ├─ lê months/recurring/cofrinhos/budget_plans
   ├─ calcula gatilhos com dedupe_key
   └─ chama send-push para cada usuário elegível
        ├─ checa notification_preferences + quiet hours
        ├─ insere notifications_log (com dedupe)
        ├─ envia via web-push (VAPID)
        └─ cleanup automático de subs inválidas
```

### Validação final

- Subscription cria endpoint válido (`fcm.googleapis.com/...` ou similar).
- SW responde push, click roteia para `action_url`.
- Preferências silenciam categorias.
- Dedup impede repetição (`dedupe_key` único por janela).
- Endpoints inválidos somem do banco automaticamente.
- Admin vê métricas reais.
- UI premium em dark/light, mobile-first.
- Sistema de prioridade + cooldown de notificações para evitar spam e múltiplos envios simultâneos.
- Central interna/inbox de notificações dentro do app (ícone sino + histórico), sem depender apenas de push notifications.
- Quiet hours / silenciamento inteligente para evitar notificações em horários inadequados.
- Estruturar notificações comportamentais/inteligentes baseadas em contexto financeiro real do usuário, e não apenas eventos simples.
  ___

Objetivo:

transformar notificações em sistema inteligente de retenção e ação financeira, e não apenas mensagens automáticas.