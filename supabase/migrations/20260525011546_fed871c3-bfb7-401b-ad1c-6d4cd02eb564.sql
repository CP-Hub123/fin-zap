
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS cartoes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS saldo_orcamento boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sistema_novidades boolean NOT NULL DEFAULT true;
