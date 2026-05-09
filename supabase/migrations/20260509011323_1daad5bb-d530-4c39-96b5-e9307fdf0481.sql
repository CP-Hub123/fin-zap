
-- 1) Subscriptions: restrict UPDATE/DELETE to admins only
CREATE POLICY "Only admin can update subscriptions"
  ON public.subscriptions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Only admin can delete subscriptions"
  ON public.subscriptions AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_admin());

-- 2) notifications_log: remove user-side insert policy (service role only)
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications_log;

-- 3) Set search_path on functions missing it
ALTER FUNCTION public.calc_proxima_execucao(integer, date) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.cofrinho_calc_meta_reserva() SET search_path = public;
ALTER FUNCTION public.recurring_set_next_execution() SET search_path = public;

-- 4) Harden SECURITY DEFINER RPCs to use auth.uid() instead of trusting _user_id
CREATE OR REPLACE FUNCTION public.executar_recorrencias_usuario(_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_today date := CURRENT_DATE;
  v_count int := 0;
  v_month_id uuid;
  v_mes int;
  v_ano int;
  v_caller uuid := auth.uid();
  v_uid uuid;
  r RECORD;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_uid := v_caller; -- ignore _user_id param to prevent spoofing
  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE user_id = v_uid AND ativo = true
      AND proxima_execucao IS NOT NULL AND proxima_execucao <= v_today
  LOOP
    v_mes := EXTRACT(MONTH FROM r.proxima_execucao)::int;
    v_ano := EXTRACT(YEAR FROM r.proxima_execucao)::int;
    SELECT id INTO v_month_id FROM public.months
      WHERE user_id = v_uid AND month = v_mes AND year = v_ano LIMIT 1;
    IF v_month_id IS NULL THEN
      INSERT INTO public.months (user_id, month, year, status, initial_balance)
      VALUES (v_uid, v_mes, v_ano, 'draft', 0) RETURNING id INTO v_month_id;
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
      WHERE user_id = v_uid AND month_id = v_month_id
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
      v_uid, v_month_id, r.cofrinho_id,
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

CREATE OR REPLACE FUNCTION public.fechar_mes_cofrinhos(_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_mes_atual int := EXTRACT(MONTH FROM now())::int;
  v_ano_atual int := EXTRACT(YEAR FROM now())::int;
  v_count int := 0;
  v_caller uuid := auth.uid();
  v_uid uuid;
  c RECORD;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_uid := v_caller;
  FOR c IN
    SELECT * FROM public.cofrinhos
    WHERE user_id = v_uid
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

CREATE OR REPLACE FUNCTION public.transferir_entre_cofrinhos(
  _user_id uuid, _origem_id uuid, _destino_id uuid, _valor numeric, _descricao text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_origem  public.cofrinhos;
  v_destino public.cofrinhos;
  v_caller uuid := auth.uid();
  v_uid uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_uid := v_caller;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _origem_id = _destino_id THEN RAISE EXCEPTION 'Origem e destino devem ser diferentes'; END IF;
  SELECT * INTO v_origem  FROM public.cofrinhos WHERE id = _origem_id  AND user_id = v_uid;
  SELECT * INTO v_destino FROM public.cofrinhos WHERE id = _destino_id AND user_id = v_uid;
  IF v_origem.id IS NULL OR v_destino.id IS NULL THEN RAISE EXCEPTION 'Cofrinho não encontrado'; END IF;
  IF v_origem.saldo < _valor THEN RAISE EXCEPTION 'Saldo insuficiente no cofrinho de origem'; END IF;
  UPDATE public.cofrinhos SET saldo = saldo - _valor WHERE id = _origem_id;
  UPDATE public.cofrinhos SET saldo = saldo + _valor WHERE id = _destino_id;
END; $function$;

-- 5) Revoke EXECUTE from anon/public on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aplicar_transacao_cofrinho() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.executar_recorrencias_usuario(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fechar_mes_cofrinhos(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transferir_entre_cofrinhos(uuid, uuid, uuid, numeric, text) FROM PUBLIC, anon;
