## Realidade técnica (importante ler antes)

**O ícone instalado na tela inicial NÃO pode ser trocado em tempo real.** Isso é uma limitação da plataforma, não do código:

- **iOS (Safari/PWA):** ícone fica pinado no momento do "Adicionar à Tela de Início". Nenhuma mudança em manifest, SW ou cache propaga. Único caminho real: reinstalar.
- **Android (Chrome WebAPK):** o Chrome busca o manifest a cada ~24h-7d. Se o hash dos ícones mudar, ele agenda uma atualização do WebAPK via Play Services. Pode levar **horas a dias**, e o usuário pode ver um toast do sistema. Não é instantâneo, não é controlado por nós.
- **Service Worker:** controla cache de assets do app, **não** controla o ícone da home screen.

Quem promete "troca instantânea do ícone instalado sem reinstalar" está mentindo. Vamos construir o **melhor possível** dentro do que existe.

## O que vou implementar

### 1. Modos de branding (system_settings)
Nova chave `app_icon_mode` com valores: `normal | maintenance | event | founders`. Controlada pelo admin em `/admin/settings`.

### 2. Ícones versionados em `/public`
- `finzap-icon-normal-v1.png`
- `finzap-icon-maintenance-v1.png`
- `finzap-icon-event-v1.png`
- `finzap-icon-founders-v1.png`

(Por agora reaproveito o atual para "normal" e gero variantes simples para os outros — você pode substituir os PNGs depois.)

### 3. Manifest dinâmico via Edge Function
`GET /manifest` → edge function `dynamic-manifest` lê `app_icon_mode` e devolve JSON apontando para o ícone correto, com `id` e `name` adequados. `index.html` passa a referenciar `<link rel="manifest" href="/manifest">` (proxy via redirect simples) ou diretamente a URL da function. O Chrome refaz fetch deste manifest periodicamente — é assim que o WebAPK eventualmente se atualiza no Android.

### 4. Branding dinâmico DENTRO do app (este SIM é instantâneo)
Um hook `useAppBranding()` que:
- Lê `app_icon_mode` do banco (já refetcha a cada 60s como `system-status`).
- Troca **favicon** em runtime (`<link rel="icon">` apontando para o ícone do modo). Funciona em desktop e em abas de navegador imediatamente.
- Troca o **logo no header** (`<Logo />`) para refletir o modo atual.
- Troca o `theme-color` da status bar.

Resultado: dentro do app aberto, a marca muda na hora. Na home screen instalada, muda quando o sistema operacional decidir refazer o fetch do manifest.

### 5. Service Worker — atualização silenciosa
- Bump da `SW_VERSION` para `finzap-sw-v4`.
- Mantém `skipWaiting` + `clients.claim` (já tem).
- Adiciona listener `message: SKIP_WAITING` para forçar ativação quando um novo SW está esperando.
- Cliente registra checagem `registration.update()` ao focar a janela — sem reload agressivo. Se houver SW novo, ele assume na próxima navegação natural.

### 6. UI admin
Em `/admin/settings`, adicionar select "Modo de branding do app" com as 4 opções e botão Salvar. Persiste em `system_settings.app_icon_mode`.

## O que NÃO vou fazer (por sua instrução explícita e/ou por ser falso marketing)

- Forçar reload de todas as abas.
- Limpar `caches` agressivamente.
- Prometer que o ícone na home screen muda na hora — não muda.
- Mexer em `start_url`, `id` ou `scope` do manifest (esses ficam pinados no install).

## Arquivos a editar/criar

- **Migration:** insere `app_icon_mode = 'normal'` em `system_settings`.
- **Novo:** `supabase/functions/dynamic-manifest/index.ts`
- **Novo:** `src/hooks/useAppBranding.ts`
- **Editar:** `index.html` (manifest href + favicon dinâmico inicial)
- **Editar:** `public/sw.js` (v4 + SKIP_WAITING)
- **Editar:** `src/main.tsx` (update on focus + skipWaiting handshake)
- **Editar:** `src/components/app/Logo.tsx` (lê modo)
- **Editar:** `src/pages/Admin.tsx` (ou settings) para o select de modo
- **Novos PNGs placeholder:** `public/finzap-icon-{normal,maintenance,event,founders}-v1.png`

Posso seguir?