
# Plano: Sistema de Bug Reports + Admin Premium

Este é um projeto grande, dividido em duas frentes principais. Implementação em fases bem definidas para garantir qualidade.

## PARTE 1 — Sistema de Reporte de Bugs

### 1.1 Backend (banco de dados + storage)
- Migration criando tabela `bug_reports` com campos:
  - `id`, `user_id`, `title`, `description`
  - `category` (enum: visual, financial, recurring, cofrinhos, dashboard, open_finance, performance, other)
  - `priority` (enum: low, medium, high, critical)
  - `status` (enum: new, analyzing, fixing, resolved, ignored) — default `new`
  - `route`, `device_info` (jsonb), `browser_info` (jsonb), `screen_size`, `theme`, `app_version`
  - `admin_notes`, `created_at`, `updated_at`
- Tabela auxiliar `bug_report_screenshots` com `bug_report_id`, `image_url`, `created_at`
- Bucket privado `bug-screenshots` com policies:
  - Usuário faz upload em pasta `{user_id}/...`
  - Apenas admin lê todos
- RLS:
  - Usuário insere/lê próprios bug_reports
  - Admin lê/atualiza todos (status, admin_notes)
  - Trigger updated_at

### 1.2 Componente flutuante de reportar bug
- Novo componente `BugReportFAB.tsx`:
  - Desktop: FAB pequeno (40px) bottom-right, ícone Bug, glass/blur, hover suave, opacidade 70% → 100%
  - Mobile: integrar item no menu de perfil/config (não FAB extra para não poluir)
- Renderizar globalmente em `ProtectedRoute` (apenas para usuários logados, exceto rota /admin onde já existe outro contexto)

### 1.3 Modal premium `BugReportModal.tsx`
- Campos:
  - Título (input)
  - Descrição (textarea)
  - Categoria (select com ícones)
  - Prioridade (4 chips visuais com cores semânticas)
  - Upload de até 3 screenshots (drag-drop desktop, input file mobile)
  - Preview de imagens com remoção individual
- Captura automática silenciosa: `window.location.pathname`, `navigator.userAgent`, `screen.width x screen.height`, tema atual (do localStorage), `import.meta.env.VITE_APP_VERSION` ou hardcoded
- Submit:
  - Cria bug_report
  - Faz upload das imagens em `{user_id}/{bug_report_id}/{index}.ext`
  - Insere em `bug_report_screenshots`
- Loading com spinner refinado, sucesso com animação check + toast elegante
- Validação com zod (título 3-120 chars, descrição 10-2000 chars)

## PARTE 2 — Refatoração Completa do Admin

### 2.1 Novo layout `AdminLayout.tsx`
- Sidebar fixa esquerda (desktop, w-64) usando shadcn sidebar:
  - Itens: Dashboard, Usuários, Bugs, Cofrinhos, Recorrências, Assinaturas, Tutoriais, Configurações
  - Logo FinZap topo + chip "Admin"
  - Footer: perfil admin
- Mobile: sidebar offcanvas com SidebarTrigger no header
- Header superior:
  - SidebarTrigger (mobile)
  - Busca global (placeholder por enquanto, foco no usuário)
  - Status do sistema (badge ativo/manutenção)
  - Sino notificações (placeholder)
  - Avatar admin

### 2.2 Refatoração das páginas admin existentes
- `AdminDashboard`: 4 KPI cards limpos (usuários totais, ativos, bugs abertos, manutenção status), grid responsivo
- `AdminUsers`: tabela mais clean, busca por nome, paginação visual
- `AdminTutorials`, `AdminSettings`, `AdminSubscriptions`: aplicar mesma linguagem visual (cards com `border` sutil, mais padding, tipografia hierárquica)
- Remover excesso de cards-em-cards e bordas duplicadas

### 2.3 Nova página `/admin/bugs` (`AdminBugs.tsx`)
- Lista com tabela responsiva:
  - Colunas: prioridade (chip colorido), título, categoria, usuário, rota, data, status (chip)
  - Mobile: cards
- Filtros topo:
  - Status (tabs)
  - Prioridade (select)
  - Categoria (select)
  - Busca textual
- Click em bug abre Sheet/Dialog com:
  - Descrição completa
  - Carrossel de screenshots (clique amplia em lightbox)
  - Metadados (device, browser, screen, theme, rota, hora)
  - Select de status + textarea de admin_notes + botão salvar

### 2.4 Design tokens / dark mode refinement
- Revisar `index.css`: garantir backgrounds não 100% pretos (usar `222 20% 6%` em vez de puro), bordas suaves, sombras leves
- Tokens admin específicos: `--admin-surface`, `--admin-sidebar`
- Light mode: backgrounds `0 0% 99%`, bordas `0 0% 92%`

### 2.5 Responsividade
- Sidebar collapse para icon-only abaixo de lg
- Tabelas viram cards no mobile
- Modais com max-h-screen e scroll interno

## Detalhes técnicos (referência)

- Stack: React + Vite + Tailwind + Supabase (já configurado)
- Validação: zod
- Forms: react-hook-form (já no projeto)
- Storage: bucket privado, signed URLs para preview no admin (`createSignedUrl(path, 3600)`)
- Versão app: constante em `src/lib/constants.ts` (ex.: `APP_VERSION = "1.0.0"`)
- Helper: `src/lib/deviceInfo.ts` para coletar contexto
- Hook: `src/hooks/useBugReports.ts` (lista admin com filtros via react-query)

## Ordem de execução
1. Migration (tabela + bucket + policies + trigger)
2. Helpers: deviceInfo, constants, hook
3. BugReportModal + BugReportFAB + integração global
4. AdminLayout (sidebar + header)
5. Refatorar páginas admin existentes para novo layout
6. Página AdminBugs (lista + filtros + detalhe)
7. Ajustes de tema (dark/light refinement)
8. QA visual responsivo

## Fora de escopo (explícito)
- Replay de sessão, Sentry, LogRocket — apenas preparar arquitetura, não integrar
- Busca global funcional — apenas placeholder UI por enquanto
- Notificações no header admin — apenas ícone placeholder
