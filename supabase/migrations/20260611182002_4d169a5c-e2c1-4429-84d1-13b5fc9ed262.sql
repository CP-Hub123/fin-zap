
-- 1) Admin versions of closure RPCs (callable only by service_role)
CREATE OR REPLACE FUNCTION public.fechar_mes_cofrinhos_admin(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_mes_atual int := EXTRACT(MONTH FROM now())::int;
  v_ano_atual int := EXTRACT(YEAR FROM now())::int;
  v_count int := 0;
  c RECORD;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  FOR c IN
    SELECT * FROM public.cofrinhos
    WHERE user_id = _user_id
      AND (ano_ref < v_ano_atual OR (ano_ref = v_ano_atual AND mes_ref < v_mes_atual))
  LOOP
    INSERT INTO public.cofrinho_closures
      (cofrinho_id, user_id, mes, ano, saldo_final, gasto_mes, orcamento_mensal)
    VALUES (c.id, c.user_id, c.mes_ref, c.ano_ref, c.saldo, c.gasto_mes, c.orcamento_mensal)
    ON CONFLICT (cofrinho_id, mes, ano) DO NOTHING;
    UPDATE public.cofrinhos
      SET gasto_mes = 0, mes_ref = v_mes_atual, ano_ref = v_ano_atual
      WHERE id = c.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $function$;

REVOKE ALL ON FUNCTION public.fechar_mes_cofrinhos_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fechar_mes_cofrinhos_admin(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.executar_recorrencias_usuario_admin(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_today date := CURRENT_DATE;
  v_count int := 0;
  v_month_id uuid;
  v_mes int;
  v_ano int;
  r RECORD;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE user_id = _user_id AND ativo = true
      AND proxima_execucao IS NOT NULL AND proxima_execucao <= v_today
  LOOP
    v_mes := EXTRACT(MONTH FROM r.proxima_execucao)::int;
    v_ano := EXTRACT(YEAR FROM r.proxima_execucao)::int;
    SELECT id INTO v_month_id FROM public.months
      WHERE user_id = _user_id AND month = v_mes AND year = v_ano LIMIT 1;
    IF v_month_id IS NULL THEN
      INSERT INTO public.months (user_id, month, year, status, initial_balance)
      VALUES (_user_id, v_mes, v_ano, 'draft', 0) RETURNING id INTO v_month_id;
    END IF;
    IF EXISTS (SELECT 1 FROM public.months WHERE id = v_month_id AND status = 'closed') THEN
      UPDATE public.recurring_transactions
        SET proxima_execucao = public.calc_proxima_execucao(
              r.dia_do_mes,
              (date_trunc('month', r.proxima_execucao) + interval '1 month')::date)
        WHERE id = r.id;
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE user_id = _user_id AND month_id = v_month_id
        AND name = r.nome AND amount = r.valor AND source = 'recurring'
    ) THEN
      UPDATE public.recurring_transactions
        SET ultima_execucao = r.proxima_execucao,
            proxima_execucao = public.calc_proxima_execucao(
              r.dia_do_mes,
              (date_trunc('month', r.proxima_execucao) + interval '1 month')::date)
        WHERE id = r.id;
      CONTINUE;
    END IF;
    INSERT INTO public.transactions (
      user_id, month_id, cofrinho_id, type, name, amount,
      date, status, is_fixed, recurrence, source, impacta_saldo, origem
    ) VALUES (
      _user_id, v_month_id, r.cofrinho_id,
      CASE WHEN r.tipo = 'receita' THEN 'income'::transaction_type ELSE 'expense'::transaction_type END,
      r.nome, r.valor, r.proxima_execucao, 'realized', true, 'monthly',
      'recurring'::transaction_source, true, 'recorrencia'
    );
    UPDATE public.recurring_transactions
      SET ultima_execucao = r.proxima_execucao,
          proxima_execucao = public.calc_proxima_execucao(
            r.dia_do_mes,
            (date_trunc('month', r.proxima_execucao) + interval '1 month')::date)
      WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $function$;

REVOKE ALL ON FUNCTION public.executar_recorrencias_usuario_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.executar_recorrencias_usuario_admin(uuid) TO service_role;

-- 2) Orchestrator: process only users not yet processed this month
CREATE OR REPLACE FUNCTION public.run_monthly_autotasks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_mes int := EXTRACT(MONTH FROM now())::int;
  v_ano int := EXTRACT(YEAR FROM now())::int;
  v_today date := CURRENT_DATE;
  v_users_closed int := 0;
  v_users_recurring int := 0;
  v_closures_total int := 0;
  v_recurring_total int := 0;
  v_errors int := 0;
  u RECORD;
  v_count int;
BEGIN
  -- Closures: users with at least one cofrinho whose mes_ref/ano_ref is older than current month
  FOR u IN
    SELECT DISTINCT user_id
    FROM public.cofrinhos
    WHERE (ano_ref < v_ano OR (ano_ref = v_ano AND mes_ref < v_mes))
  LOOP
    BEGIN
      v_count := public.fechar_mes_cofrinhos_admin(u.user_id);
      IF v_count > 0 THEN
        v_users_closed := v_users_closed + 1;
        v_closures_total := v_closures_total + v_count;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  -- Recurring: users with at least one pending recurring transaction due today or earlier
  FOR u IN
    SELECT DISTINCT user_id
    FROM public.recurring_transactions
    WHERE ativo = true
      AND proxima_execucao IS NOT NULL
      AND proxima_execucao <= v_today
  LOOP
    BEGIN
      v_count := public.executar_recorrencias_usuario_admin(u.user_id);
      IF v_count > 0 THEN
        v_users_recurring := v_users_recurring + 1;
        v_recurring_total := v_recurring_total + v_count;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'mes', v_mes, 'ano', v_ano,
    'users_closed', v_users_closed,
    'closures_total', v_closures_total,
    'users_recurring', v_users_recurring,
    'recurring_total', v_recurring_total,
    'errors', v_errors,
    'run_at', now()
  );
END; $function$;

REVOKE ALL ON FUNCTION public.run_monthly_autotasks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_monthly_autotasks() TO service_role;

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_cofrinhos_user_mesano ON public.cofrinhos(user_id, ano_ref, mes_ref);
CREATE INDEX IF NOT EXISTS idx_recurring_user_proxima ON public.recurring_transactions(user_id, ativo, proxima_execucao);
