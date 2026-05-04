-- Source enum
DO $$ BEGIN
  CREATE TYPE public.transaction_source AS ENUM ('manual', 'external');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_status_type AS ENUM ('pending', 'synced', 'error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source public.transaction_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS sync_status public.sync_status_type;

-- Unique external_id (when present)
CREATE UNIQUE INDEX IF NOT EXISTS transactions_external_id_unique
  ON public.transactions (provider, external_id)
  WHERE external_id IS NOT NULL;

-- Reserva de emergência no profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reserva_emergencia numeric NOT NULL DEFAULT 0;
