
-- 1) Tabela
CREATE TABLE public.financial_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('receivable','payable')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','received','cancelled')),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  notify_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_commitments TO authenticated;
GRANT ALL ON public.financial_commitments TO service_role;

-- 3) RLS
ALTER TABLE public.financial_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fc_select_own" ON public.financial_commitments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fc_insert_own" ON public.financial_commitments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fc_update_own" ON public.financial_commitments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fc_delete_own" ON public.financial_commitments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4) Trigger updated_at
CREATE TRIGGER trg_fc_updated_at
  BEFORE UPDATE ON public.financial_commitments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Índices
CREATE INDEX idx_fc_user_due ON public.financial_commitments (user_id, due_date);
CREATE INDEX idx_fc_user_status ON public.financial_commitments (user_id, status);

-- 6) RPC: converter compromisso em transação no mês atual
CREATE OR REPLACE FUNCTION public.convert_commitment_to_transaction(_commitment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_c public.financial_commitments;
  v_today date := CURRENT_DATE;
  v_mes int := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  v_ano int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_month_id uuid;
  v_tx_id uuid;
  v_tx_type public.transaction_type;
  v_new_status text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_c FROM public.financial_commitments WHERE id = _commitment_id;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Compromisso não encontrado'; END IF;
  IF v_c.user_id <> v_caller THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF v_c.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Compromisso não está pendente';
  END IF;

  -- Resolve/cria mês corrente
  SELECT id INTO v_month_id
    FROM public.months
   WHERE user_id = v_caller AND month = v_mes AND year = v_ano
   LIMIT 1;
  IF v_month_id IS NULL THEN
    INSERT INTO public.months (user_id, month, year, status, initial_balance)
    VALUES (v_caller, v_mes, v_ano, 'draft', 0)
    RETURNING id INTO v_month_id;
  END IF;

  v_tx_type := CASE WHEN v_c.type = 'receivable'
                    THEN 'income'::public.transaction_type
                    ELSE 'expense'::public.transaction_type END;
  v_new_status := CASE WHEN v_c.type = 'receivable' THEN 'received' ELSE 'paid' END;

  INSERT INTO public.transactions (
    user_id, month_id, type, name, amount, date,
    status, is_fixed, recurrence, source, impacta_saldo, origem, category
  ) VALUES (
    v_caller, v_month_id, v_tx_type, v_c.title, v_c.amount, v_today,
    'realized', false, 'none', 'manual'::public.transaction_source,
    true, 'compromisso', NULL
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.financial_commitments
     SET status = v_new_status,
         transaction_id = v_tx_id,
         updated_at = now()
   WHERE id = _commitment_id;

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_commitment_to_transaction(uuid) TO authenticated;
