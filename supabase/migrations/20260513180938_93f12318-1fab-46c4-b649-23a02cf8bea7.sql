-- ============================================================
-- Helper: returns edit impact summary for a card purchase
-- ============================================================
CREATE OR REPLACE FUNCTION public.card_purchase_edit_impact(_purchase_id uuid)
RETURNS TABLE (
  locked_count int,
  locked_amount numeric,
  future_count int,
  future_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO v_owner FROM public.credit_card_purchases WHERE id = _purchase_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Compra não encontrada'; END IF;
  IF v_owner <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN m.status = 'closed' THEN 1 ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN m.status = 'closed' THEN t.amount ELSE 0 END), 0)::numeric,
    COALESCE(SUM(CASE WHEN m.status <> 'closed' THEN 1 ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN m.status <> 'closed' THEN t.amount ELSE 0 END), 0)::numeric
  FROM public.transactions t
  JOIN public.months m ON m.id = t.month_id
  WHERE t.card_purchase_id = _purchase_id;
END;
$$;

-- ============================================================
-- Safe edit: preserves closed months, rebuilds open ones
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_card_purchase_safe(
  _purchase_id uuid,
  _descricao text,
  _valor_total numeric,
  _parcelas int,
  _card_id uuid,
  _data_compra date,
  _categoria text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_purchase public.credit_card_purchases;
  v_card public.credit_cards;
  v_locked_count int := 0;
  v_locked_sum numeric := 0;
  v_locked_max_parcela int := 0;
  v_remaining_parcelas int;
  v_remaining_valor numeric;
  v_parcela_valor numeric := 0;
  v_base_year int;
  v_base_month int;
  v_i int;
  v_year int;
  v_month int;
  v_ultimo_dia int;
  v_dia int;
  v_venc_date date;
  v_month_id uuid;
  v_label text;
  v_locked_parcela_nums int[];
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_purchase FROM public.credit_card_purchases WHERE id = _purchase_id;
  IF v_purchase.id IS NULL THEN RAISE EXCEPTION 'Compra não encontrada'; END IF;
  v_owner := v_purchase.user_id;
  IF v_owner <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _valor_total IS NULL OR _valor_total <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF _parcelas IS NULL OR _parcelas < 1 THEN RAISE EXCEPTION 'Parcelas inválidas'; END IF;

  SELECT * INTO v_card FROM public.credit_cards WHERE id = _card_id AND user_id = v_owner;
  IF v_card.id IS NULL THEN RAISE EXCEPTION 'Cartão não encontrado'; END IF;

  -- Coletar parcelas em meses fechados (preservadas)
  SELECT
    COALESCE(array_agg(t.parcela_num ORDER BY t.parcela_num), ARRAY[]::int[]),
    COALESCE(COUNT(*), 0)::int,
    COALESCE(SUM(t.amount), 0)::numeric,
    COALESCE(MAX(t.parcela_num), 0)::int
  INTO v_locked_parcela_nums, v_locked_count, v_locked_sum, v_locked_max_parcela
  FROM public.transactions t
  JOIN public.months m ON m.id = t.month_id
  WHERE t.card_purchase_id = _purchase_id AND m.status = 'closed';

  IF _parcelas < v_locked_count THEN
    RAISE EXCEPTION 'Número de parcelas (%) menor que parcelas já consolidadas (%)', _parcelas, v_locked_count;
  END IF;

  IF _valor_total < v_locked_sum THEN
    RAISE EXCEPTION 'Valor total menor que o já consolidado em meses fechados';
  END IF;

  -- Apaga apenas parcelas em meses ainda abertos
  DELETE FROM public.transactions t
   USING public.months m
   WHERE t.card_purchase_id = _purchase_id
     AND t.month_id = m.id
     AND m.status <> 'closed';

  -- Atualiza registro principal
  UPDATE public.credit_card_purchases
     SET descricao   = _descricao,
         valor_total = _valor_total,
         parcelas    = _parcelas,
         card_id     = _card_id,
         data_compra = _data_compra,
         categoria   = _categoria
   WHERE id = _purchase_id;

  v_remaining_parcelas := _parcelas - v_locked_count;
  IF v_remaining_parcelas <= 0 THEN
    RETURN; -- nada a recriar
  END IF;

  v_remaining_valor := _valor_total - v_locked_sum;
  v_parcela_valor := ROUND(v_remaining_valor / v_remaining_parcelas, 2);

  -- Base para cronograma (igual ao trigger gerar_parcelas_cartao)
  v_base_year  := EXTRACT(YEAR FROM _data_compra)::int;
  v_base_month := EXTRACT(MONTH FROM _data_compra)::int;
  IF EXTRACT(DAY FROM _data_compra)::int >= v_card.fechamento_dia THEN
    v_base_month := v_base_month + 1;
    IF v_base_month > 12 THEN
      v_base_month := 1;
      v_base_year := v_base_year + 1;
    END IF;
  END IF;

  FOR v_i IN 1.._parcelas LOOP
    -- Pula parcelas já consolidadas em meses fechados
    IF v_i = ANY(v_locked_parcela_nums) THEN
      CONTINUE;
    END IF;

    v_month := v_base_month + (v_i - 1);
    v_year := v_base_year;
    WHILE v_month > 12 LOOP
      v_month := v_month - 12;
      v_year := v_year + 1;
    END LOOP;

    v_ultimo_dia := EXTRACT(DAY FROM (make_date(v_year, v_month, 1) + interval '1 month - 1 day'))::int;
    v_dia := LEAST(v_card.vencimento_dia, v_ultimo_dia);
    v_venc_date := make_date(v_year, v_month, v_dia);

    SELECT id INTO v_month_id FROM public.months
      WHERE user_id = v_owner AND month = v_month AND year = v_year LIMIT 1;
    IF v_month_id IS NULL THEN
      INSERT INTO public.months (user_id, month, year, status, initial_balance)
      VALUES (v_owner, v_month, v_year, 'draft', 0)
      RETURNING id INTO v_month_id;
    END IF;

    -- Se por acaso esse mês está fechado mas a parcela não estava lá antes,
    -- não criamos para preservar o histórico fechado.
    IF EXISTS (SELECT 1 FROM public.months WHERE id = v_month_id AND status = 'closed') THEN
      CONTINUE;
    END IF;

    v_label := _descricao;
    IF _parcelas > 1 THEN
      v_label := v_label || ' (' || v_i || '/' || _parcelas || ')';
    END IF;
    v_label := v_label || ' • ' || v_card.nome;

    INSERT INTO public.transactions (
      user_id, month_id, cofrinho_id, type, name, amount,
      date, status, is_fixed, recurrence, source, impacta_saldo, origem,
      category, card_purchase_id, parcela_num
    ) VALUES (
      v_owner, v_month_id, v_purchase.cofrinho_id, 'expense'::transaction_type,
      v_label, v_parcela_valor, v_venc_date,
      'planned'::transaction_status, false, 'none'::recurrence_type,
      'manual'::transaction_source, true, 'cartao',
      _categoria, _purchase_id, v_i
    );
  END LOOP;
END;
$$;