
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pluggy_item_id text NOT NULL,
  pluggy_account_id text,
  bank_name text,
  bank_logo text,
  account_type text,
  account_number text,
  balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  last_sync timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pluggy_account_id)
);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON public.connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_item ON public.connected_accounts(pluggy_item_id);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own connected accounts"
ON public.connected_accounts FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin reads all connected accounts"
ON public.connected_accounts FOR SELECT
USING (is_admin());

CREATE TRIGGER update_connected_accounts_updated_at
BEFORE UPDATE ON public.connected_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Garantir external_id único por usuário/source (evita duplicar imports do Open Finance)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_external
ON public.transactions(user_id, source, external_id)
WHERE external_id IS NOT NULL;
