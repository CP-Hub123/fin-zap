Substituir os arquivos de ícone PWA do FinZap com as imagens enviadas pelo usuário.

1. Copiar a imagem 3D com operários para `public/finzap-icon-maintenance-v1.png`.
2. Copiar o logo flat (identidade visual "I") para `public/finzap-icon-normal-v1.png`.
3. Copiar o mesmo logo flat também para `public/finzap-icon-event-v1.png` e `public/finzap-icon-founders-v1.png` (até que o usuário envie ícones específicos para esses modos no futuro).

Nenhuma mudança de código é necessária — os hooks (`useAppBranding.ts`), o manifest dinâmico (`dynamic-manifest/index.ts`) e o componente `Logo.tsx` já apontam para esses nomes de arquivo.