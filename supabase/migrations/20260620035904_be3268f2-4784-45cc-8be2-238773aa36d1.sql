
-- 1. is_default column + unique partial index
ALTER TABLE public.cofrinhos ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS cofrinhos_user_default_unique
  ON public.cofrinhos (user_id) WHERE is_default;

-- 2. ensure_default_reserve
CREATE OR REPLACE FUNCTION public.ensure_default_reserve(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_mes int := EXTRACT(MONTH FROM now())::int;
  v_ano int := EXTRACT(YEAR FROM now())::int;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  SELECT id INTO v_id FROM public.cofrinhos
   WHERE user_id = _user_id AND is_default = true LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.cofrinhos (
    user_id, nome, tipo, cover_preset, icon, cor,
    saldo, orcamento_mensal, meta_valor, custo_mensal, meses_protegidos,
    gasto_mes, mes_ref, ano_ref, is_default
  ) VALUES (
    _user_id, 'Reserva', 'reserva', 'reserva', 'reserva', '#6366f1',
    0, 0, 0, 0, 6,
    0, v_mes, v_ano, true
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 3. reservar_valor
CREATE OR REPLACE FUNCTION public.reservar_valor(
  _valor numeric, _descricao text, _month_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_cof_id uuid;
  v_tx_id uuid;
  v_desc text := COALESCE(NULLIF(trim(_descricao), ''), 'Reserva rápida');
  v_month_owner uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _month_id IS NULL THEN RAISE EXCEPTION 'month_id required'; END IF;

  SELECT user_id INTO v_month_owner FROM public.months WHERE id = _month_id;
  IF v_month_owner IS NULL OR v_month_owner <> v_caller THEN
    RAISE EXCEPTION 'Mês inválido';
  END IF;

  v_cof_id := public.ensure_default_reserve(v_caller);

  INSERT INTO public.transactions (
    user_id, month_id, cofrinho_id, type, name, amount,
    date, status, is_fixed, recurrence, source, impacta_saldo, origem
  ) VALUES (
    v_caller, _month_id, NULL, 'expense'::transaction_type,
    v_desc, _valor, CURRENT_DATE,
    'realized'::transaction_status, false, 'none'::recurrence_type,
    'manual'::transaction_source, false, 'reserva'
  ) RETURNING id INTO v_tx_id;

  UPDATE public.cofrinhos SET saldo = saldo + _valor WHERE id = v_cof_id;
  RETURN v_tx_id;
END;
$$;

-- 4. resgatar_reserva
CREATE OR REPLACE FUNCTION public.resgatar_reserva(
  _valor numeric, _descricao text, _month_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_cof_id uuid;
  v_tx_id uuid;
  v_saldo numeric;
  v_desc text := COALESCE(NULLIF(trim(_descricao), ''), 'Resgate de reserva');
  v_month_owner uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _month_id IS NULL THEN RAISE EXCEPTION 'month_id required'; END IF;

  SELECT user_id INTO v_month_owner FROM public.months WHERE id = _month_id;
  IF v_month_owner IS NULL OR v_month_owner <> v_caller THEN
    RAISE EXCEPTION 'Mês inválido';
  END IF;

  v_cof_id := public.ensure_default_reserve(v_caller);
  SELECT saldo INTO v_saldo FROM public.cofrinhos WHERE id = v_cof_id;
  IF v_saldo < _valor THEN RAISE EXCEPTION 'Saldo reservado insuficiente'; END IF;

  INSERT INTO public.transactions (
    user_id, month_id, cofrinho_id, type, name, amount,
    date, status, is_fixed, recurrence, source, impacta_saldo, origem
  ) VALUES (
    v_caller, _month_id, NULL, 'income'::transaction_type,
    v_desc, _valor, CURRENT_DATE,
    'realized'::transaction_status, false, 'none'::recurrence_type,
    'manual'::transaction_source, false, 'reserva'
  ) RETURNING id INTO v_tx_id;

  UPDATE public.cofrinhos SET saldo = saldo - _valor WHERE id = v_cof_id;
  RETURN v_tx_id;
END;
$$;
