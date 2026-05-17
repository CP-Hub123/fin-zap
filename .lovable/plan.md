## APK já está no ar

Subi o `FinZap.apk` (8.65 MB) para o bucket `app-releases` como `finzap-latest.apk`. O botão de download na página `/download` já funciona agora.

URL pública:
`https://pufhontpohhuifrtqfsu.supabase.co/storage/v1/object/public/app-releases/finzap-latest.apk`

## Pequenos ajustes pendentes

1. **Atualizar metadados** em `src/lib/appRelease.ts`:
   - `APK_SIZE_MB`: `18.4` → `8.65` (tamanho real do APK enviado)
   - Manter `APP_VERSION = "1.0.0"` e `APP_BUILD = "1"` (me avise se for outra versão)

2. **Remover o arquivo temporário** `.tmp-upload/finzap-latest.apk` do repositório (foi usado só como ponte para o upload — o APK oficial agora mora no Storage, não no código).

Aprove para eu aplicar os dois ajustes.