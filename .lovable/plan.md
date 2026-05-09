## Objetivo
Elevar o FinZap a um padrão visual fintech premium (Nubank/Linear/Apple Wallet) sem tocar em lógica financeira, recorrências, cofrinhos backend, dashboard de cálculos ou fechamento mensal. Mudanças apenas em camada de apresentação (tokens, componentes UI, layouts, classes Tailwind).

## Escopo do que **NÃO** será alterado
- `src/hooks/*` (useTransactions, useCofrinhos, useMonths, useRecurringTransactions, useSubscription)
- `supabase/*` (migrations, edge functions, policies)
- Lógica de cálculos em `SummaryView`, `ClosingView`, `useNotificationTriggers`
- Estrutura de rotas em `App.tsx`

## Plano em 4 etapas

### Etapa 1 — Fundação (tokens + Dialog/Sheet primitives)
**Arquivos:** `src/index.css`, `tailwind.config.ts`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`

- Refinar paleta HSL semântica em `index.css`:
  - `--surface`, `--surface-elevated`, `--surface-glass` para níveis de profundidade
  - `--gradient-primary`, `--gradient-success`, `--gradient-danger`
  - `--shadow-card`, `--shadow-elevated`, `--shadow-glow-primary`
  - Refinar `--ring`, `--border` para contraste mais limpo no dark mode
- Adicionar utilitárias `.card-premium`, `.glass-panel`, `.number-display` em `@layer components`
- **DialogContent**: forçar `max-h-[90dvh]`, `overflow-y-auto`, `w-[calc(100vw-2rem)]`, `safe-area` (`pb-[env(safe-area-inset-bottom)]`), close button `top-3 right-3 z-10` sempre visível
- **SheetContent**: mesma proteção mobile + `overscroll-contain`

### Etapa 2 — Cards e microinterações
**Arquivos:** `src/components/ui/card.tsx`, `src/components/app/CofrinhoCard.tsx`, `src/components/app/SummaryView.tsx` (apenas JSX/classes)

- Card base: sombra suave em camadas, hover com `translate-y-[-1px]` + glow sutil, `transition-all duration-200`
- Hierarquia tipográfica: títulos `font-semibold tracking-tight`, números grandes `tabular-nums font-bold`
- CofrinhoCard: profundidade refinada, ring de progresso com gradient stroke, badge de status com `backdrop-blur`
- SummaryView (apenas visual): hero card de saldo com gradient + glow, números de receitas/despesas/saldo com tipografia premium

### Etapa 3 — Modais e formulários
**Arquivos:** `RecurringTransactionsView.tsx`, `CofrinhosView.tsx`, `TransactionsView.tsx`, `ClosingView.tsx`, `AppPage.tsx`, `CofrinhoDetailSheet.tsx`

- Aplicar layout estrutural em **todos** os Dialogs:
  ```
  DialogContent
    ├── DialogHeader (sticky top, bg-card/95 backdrop-blur)
    ├── div com overflow-y-auto, max-h responsive, padding seguro
    └── DialogFooter (sticky bottom, gap-2, botões min-h-11)
  ```
- Inputs com `min-h-12 text-base` (evita zoom iOS), labels mais respiráveis
- Botões CTA: `h-12`, gradient sutil no primário
- Confirmações destructive com `AlertDialog` padronizado

### Etapa 4 — Header, Stepper e mobile shell
**Arquivos:** `AppPage.tsx`, `Stepper.tsx`, `MonthSelector.tsx`, `NotificationBell.tsx`

- Header: glass com `backdrop-blur-xl` + `border-b border-border/40`
- Stepper: pill ativa com gradient + glow, inativas com `text-muted-foreground/60`
- Conteúdo principal com `pb-[env(safe-area-inset-bottom)]`
- Touch targets ≥44px em tudo que é tocável

## Detalhes técnicos

**Tokens principais (HSL) — preservar identidade azul/verde:**
```css
--primary: 217 91% 60%        (azul FinZap atual mantido)
--success: 142 76% 45%        (verde refinado)
--surface-elevated: 222 47% 13%
--gradient-primary: linear-gradient(135deg, hsl(217 91% 60%), hsl(199 89% 65%))
--shadow-card: 0 1px 3px hsl(0 0% 0% / 0.08), 0 4px 12px hsl(0 0% 0% / 0.04)
--shadow-glow-primary: 0 0 24px hsl(217 91% 60% / 0.15)
```

**Padrão Dialog (aplicado uma vez no primitive):**
```tsx
<DialogPrimitive.Content
  className="fixed left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2
             w-[calc(100vw-2rem)] max-w-lg
             max-h-[90dvh] overflow-hidden
             flex flex-col
             rounded-2xl border bg-card shadow-elevated
             pb-[env(safe-area-inset-bottom)]"
/>
```

**Critério de pronto:**
- Nenhum modal corta conteúdo em 320px-1920px
- Botão fechar visível em todos os modais
- Saldo principal lido em <1s
- Touch targets ≥44px
- Sem mudanças em hooks/types/migrations/edge functions
