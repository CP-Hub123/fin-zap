ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS ritmo_financeiro boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS atualizacao_diaria boolean NOT NULL DEFAULT true;