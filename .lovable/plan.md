

# FinZap — Plano de Implementação Completo

Este é um projeto greenfield (apenas boilerplate ShadCN). Precisamos construir tudo do zero.

---

## Fase 1: Infraestrutura (DB + Auth + Design System)

### 1.1 Habilitar Lovable Cloud
- Ativar Supabase integrado para ter banco de dados, auth e RLS

### 1.2 Banco de Dados — Migrações
Criar todas as tabelas em uma única migração:

- **profiles** — id (FK auth.users ON DELETE CASCADE), name, created_at. Trigger `on_auth_user_created` para auto-criar perfil
- **user_roles** — id, user_id (FK auth.users), role (enum: user/admin). Trigger para atribuir role "user" no signup. RLS via função `has_role()` (security definer)
- **categories** — id, user_id, name, type (income/expense). Seed com categorias padrão (Salário, Freelance, Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Outros)
- **months** — id, user_id, month (1-12), year, initial_balance, status (enum: draft/in_progress/ready_to_close/closed), closed_at
- **transactions** — id, month_id (FK months), type (income/expense), name, amount, category, date, status (planned/realized), is_fixed, recurrence (none/monthly)
- **budget_plans** — id, month_id (FK months), category, planned_amount
- **monthly_closures** — id, month_id (FK months), total_income, total_expense, final_balance, planned_total, realized_total, closed_at (snapshot histórico)
- **tutorials** — id, title, description, video_url, display_order, is_active
- **activity_logs** — id, user_id, action, created_at
- **system_settings** — id, key (unique), value

RLS em todas as tabelas:
- Usuários acessam apenas `WHERE user_id = auth.uid()` (ou via month_id → months.user_id)
- Admin acessa tudo via `has_role(auth.uid(), 'admin')`
- Tabelas públicas (tutorials, system_settings): SELECT para todos autenticados, INSERT/UPDATE/DELETE apenas admin

### 1.3 Design System
Atualizar `index.css`:
- Background: `210 17% 98%` (#F8F9FA)
- Foreground: `240 29% 14%` (#1A1A2E)
- Primary (azul CTA): `217 91% 60%` (#3B82F6)
- Variáveis custom: `--finzap-green: 142 71% 45%`, `--finzap-red: 0 84% 60%`
- Adicionar Inter via Google Fonts no `index.html`

### 1.4 Autenticação
- **AuthContext** — provider global com `onAuthStateChange` + `getSession`
- **Página `/auth`** — login/cadastro com email+senha, validação Zod
- **ProtectedRoute** — redireciona para `/auth` se não logado
- **AdminRoute** — verifica role via `has_role()`, redireciona para `/app` se não admin
- Após primeiro login → redirect para `/onboarding`; logins seguintes → `/app`

---

## Fase 2: Onboarding (`/onboarding`)

Componente com 4 steps internos:

1. **Boas-vindas** — "Organize sua vida financeira em 4 passos" + botão "Começar"
2. **Criar mês** — Seletor mês/ano + input saldo inicial → insere em `months` + cria categorias padrão para o usuário
3. **Preview simulado** — Cards com dados mock (R$ 5.000 receitas, R$ 3.200 despesas, R$ 1.800 saldo) + tooltips explicando cada seção
4. **Primeira transação** — Formulário obrigatório para cadastrar 1 receita ou despesa real → redirect para `/app`

---

## Fase 3: App Principal (`/app`)

### Layout
- Header: logo "FinZap" + seletor de mês (dropdown) + avatar/logout
- Stepper horizontal: 4 etapas clicáveis com indicador visual de progresso
- Nudge banners contextuais ("Registre sua primeira despesa", "Orçamento perto do limite", "Hora de fechar o mês")

### Etapa 1: Resumo (Dashboard)
- 3 cards grandes: Receitas (verde), Despesas (vermelho), Saldo (azul/neutro)
- Mensagem: "Você está no positivo ✓" / "Você está no negativo ✗"
- Barra de progresso do mês (dia atual / total dias)
- Dados calculados em tempo real via React Query (soma de transactions do mês)

### Etapa 2: Base de Dados (Transações)
- Toggle tabs: Receitas / Despesas
- Tabela com todas transações do mês filtradas por tipo
- Botão "+ Adicionar" → formulário (dialog): nome, valor, categoria (select das categories do user), data, tipo fixo/variável, status previsto/realizado
- Edição inline (click na row abre dialog de edição)
- Ações por linha: duplicar (cria cópia), excluir (AlertDialog de confirmação)
- Filtros: categoria, status (previsto/realizado)
- Ordenação por data
- Mês fechado → botões desabilitados, badge "Mês fechado"
- Formatação: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`

### Etapa 3: Planejamento (Orçado vs Real)
- Tabela: Categoria | Planejado (editável) | Realizado (auto) | Diferença | % Progresso
- Planejado salva em `budget_plans`
- Realizado = soma de transactions realizadas por categoria
- Cor da diferença: verde se economizou, vermelho se ultrapassou
- Mensagem: "Você gastou R$ X a mais" ou "Você economizou R$ X"
- Mês fechado → campos de planejado desabilitados

### Etapa 4: Fechamento
- Cards resumo: total planejado vs realizado, saldo final
- Validação: precisa ≥1 receita E ≥1 despesa para fechar
- Botão "Fechar Mês" → Dialog de confirmação → insere snapshot em `monthly_closures`, atualiza `months.status = 'closed'`
- Mês fechado: badge "Fechado", todas etapas em modo read-only
- Botão "Reabrir Mês" → confirmação dupla (dois dialogs sequenciais) → volta status para `in_progress`

---

## Fase 4: Tutoriais (`/tutorials`)

- Lista de cards com vídeos da tabela `tutorials` (where is_active = true)
- Embed YouTube/Vimeo
- Ordenados por `display_order`
- Tooltips de ajuda (ícone "?") nas telas do app linkando para tutoriais relevantes

---

## Fase 5: Painel Admin (`/admin`)

Acesso restrito via AdminRoute. Não aparece na navegação.

- **`/admin`** — Dashboard: cards numéricos (total usuários, ativos, com transações no mês)
- **`/admin/users`** — Tabela: nome, email, role, created_at. Ações: alterar role (user↔admin), excluir (com confirmação)
- **`/admin/tutorials`** — CRUD: título, descrição, URL vídeo, ordem, ativo/inativo
- **`/admin/settings`** — Editar: nome do sistema, mensagem global, status (ativo/manutenção)

---

## Fase 6: Proteções e UX

- Confirmação ao excluir (AlertDialog em todas exclusões)
- Validação Zod em todos formulários (valor > 0, nome obrigatório, data válida)
- Mês fechado → bloqueio total de edição em todas telas
- Nudge banners inteligentes baseados no estado do mês
- Lazy loading de listas com React Query pagination
- Queries indexadas por user_id + month/year
- Mobile responsivo (cards empilham, tabelas com scroll horizontal)

---

## Estrutura de Arquivos

```text
src/
├── contexts/AuthContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useMonths.ts
│   ├── useTransactions.ts
│   ├── useBudget.ts
│   └── useCategories.ts
├── components/
│   ├── layout/ (AppLayout, AdminLayout, Stepper, ProtectedRoute, AdminRoute)
│   ├── onboarding/ (WelcomeStep, CreateMonthStep, PreviewStep, FirstTransactionStep)
│   ├── app/ (SummaryView, TransactionsView, BudgetView, ClosingView, NudgeBanner, MonthSelector, TransactionDialog)
│   └── admin/ (AdminDashboard, UsersManager, TutorialsManager, SettingsManager)
├── pages/ (Index, Auth, Onboarding, AppPage, Tutorials, Admin, NotFound)
└── lib/ (utils, constants, formatCurrency)
```

---

## Ordem de Execução

1. Habilitar Lovable Cloud + criar migração completa
2. Design system + Auth (AuthContext, página login, rotas protegidas)
3. Onboarding (4 steps)
4. App principal (4 etapas do stepper)
5. Tutoriais
6. Admin panel
7. Proteções finais e polish

