CREATE OR REPLACE FUNCTION public.executar_recorrencias_usuario(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes int := EXTRACT(MONTH FROM now())::int;
  v_ano int := EXTRACT(YEAR FROM now())::int;
  v_inicio_mes date := make_date(v_ano, v_mes, 1);
  v_count int := 0;
  v_month_id uuid;
  v_data date;
  v_dia int;
  v_ultimo_dia int;
  r RECORD;
BEGIN
  -- garante que existe um month para o mês atual
  SELECT id INTO v_month_id
    FROM public.months
    WHERE user_id = _user_id AND month = v_mes AND year = v_ano
    LIMIT 1;

  IF v_month_id IS NULL THEN
    INSERT INTO public.months (user_id, month, year, status, initial_balance)
    VALUES (_user_id, v_mes, v_ano, 'draft', 0)
    RETURNING id INTO v_month_id;
  END IF;

  v_ultimo_dia := EXTRACT(DAY FROM (date_trunc('month', v_inicio_mes) + interval '1 month - 1 day'))::int;

  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE user_id = _user_id
      AND ativo = true
      AND (ultima_execucao IS NULL OR ultima_execucao < v_inicio_mes)
  LOOP
    v_dia := LEAST(r.dia_do_mes, v_ultimo_dia);
    v_data := make_date(v_ano, v_mes, v_dia);

    INSERT INTO public.transactions (
      user_id, month_id, cofrinho_id, type, name, amount,
      date, status, is_fixed, recurrence, source, impacta_saldo, origem
    ) VALUES (
      _user_id, v_month_id, r.cofrinho_id,
      CASE WHEN r.tipo = 'receita' THEN 'income'::transaction_type ELSE 'expense'::transaction_type END,
      r.nome, r.valor, v_data, 'realized', true, 'monthly',
      'recurring'::transaction_source, true, 'recorrencia'
    );

    UPDATE public.recurring_transactions
      SET ultima_execucao = v_inicio_mes
      WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.executar_recorrencias_usuario(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.executar_recorrencias_usuario(uuid) TO authenticated;
