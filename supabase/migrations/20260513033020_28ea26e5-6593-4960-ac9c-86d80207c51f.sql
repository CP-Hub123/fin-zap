-- ============= CREDIT CARDS =============
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  bandeira TEXT NOT NULL DEFAULT 'outro',
  cor TEXT NOT NULL DEFAULT '#6366F1',
  limite NUMERIC NOT NULL DEFAULT 0,
  fechamento_dia INT NOT NULL DEFAULT 1 CHECK (fechamento_dia BETWEEN 1 AND 31),
  vencimento_dia INT NOT NULL DEFAULT 10 CHECK (vencimento_dia BETWEEN 1 AND 31),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own credit cards"
  ON public.credit_cards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin reads all credit cards"
  ON public.credit_cards FOR SELECT USING (public.is_admin());

CREATE POLICY "Active subscription required to insert credit_cards"
  ON public.credit_cards AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_active_subscription());

CREATE POLICY "Active subscription required to update credit_cards"
  ON public.credit_cards AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_active_subscription()) WITH CHECK (public.has_active_subscription());

CREATE TRIGGER trg_credit_cards_updated
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_credit_cards_user ON public.credit_cards(user_id);

-- ============= CREDIT CARD PURCHASES =============
CREATE TABLE public.credit_card_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor_total NUMERIC NOT NULL CHECK (valor_total > 0),
  parcelas INT NOT NULL DEFAULT 1 CHECK (parcelas BETWEEN 1 AND 60),
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT,
  cofrinho_id UUID REFERENCES public.cofrinhos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_card_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own card purchases"
  ON public.credit_card_purchases FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin reads all card purchases"
  ON public.credit_card_purchases FOR SELECT USING (public.is_admin());

CREATE POLICY "Active subscription required to insert card purchases"
  ON public.credit_card_purchases AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_active_subscription());

CREATE INDEX idx_card_purchases_user ON public.credit_card_purchases(user_id);
CREATE INDEX idx_card_purchases_card ON public.credit_card_purchases(card_id);

-- ============= TRANSACTIONS: link to card purchase =============
ALTER TABLE public.transactions
  ADD COLUMN card_purchase_id UUID REFERENCES public.credit_card_purchases(id) ON DELETE CASCADE,
  ADD COLUMN parcela_num INT;

CREATE INDEX idx_transactions_card_purchase ON public.transactions(card_purchase_id);

-- ============= TRIGGER: gerar parcelas automaticamente =============
CREATE OR REPLACE FUNCTION public.gerar_parcelas_cartao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card public.credit_cards;
  v_base_year INT;
  v_base_month INT;
  v_parcela_valor NUMERIC;
  v_i INT;
  v_year INT;
  v_month INT;
  v_ultimo_dia INT;
  v_dia INT;
  v_venc_date DATE;
  v_month_id UUID;
  v_label TEXT;
BEGIN
  SELECT * INTO v_card FROM public.credit_cards WHERE id = NEW.card_id;
  IF v_card.id IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado';
  END IF;

  v_parcela_valor := ROUND(NEW.valor_total::numeric / NEW.parcelas, 2);

  v_base_year := EXTRACT(YEAR FROM NEW.data_compra)::int;
  v_base_month := EXTRACT(MONTH FROM NEW.data_compra)::int;
  IF EXTRACT(DAY FROM NEW.data_compra)::int >= v_card.fechamento_dia THEN
    v_base_month := v_base_month + 1;
    IF v_base_month > 12 THEN
      v_base_month := 1;
      v_base_year := v_base_year + 1;
    END IF;
  END IF;

  FOR v_i IN 1..NEW.parcelas LOOP
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
      WHERE user_id = NEW.user_id AND month = v_month AND year = v_year LIMIT 1;
    IF v_month_id IS NULL THEN
      INSERT INTO public.months (user_id, month, year, status, initial_balance)
      VALUES (NEW.user_id, v_month, v_year, 'draft', 0)
      RETURNING id INTO v_month_id;
    END IF;

    v_label := NEW.descricao;
    IF NEW.parcelas > 1 THEN
      v_label := v_label || ' (' || v_i || '/' || NEW.parcelas || ')';
    END IF;
    v_label := v_label || ' • ' || v_card.nome;

    INSERT INTO public.transactions (
      user_id, month_id, cofrinho_id, type, name, amount,
      date, status, is_fixed, recurrence, source, impacta_saldo, origem,
      category, card_purchase_id, parcela_num
    ) VALUES (
      NEW.user_id, v_month_id, NEW.cofrinho_id, 'expense'::transaction_type,
      v_label, v_parcela_valor, v_venc_date,
      'planned'::transaction_status, false, 'none'::recurrence_type,
      'manual'::transaction_source, true, 'cartao',
      NEW.categoria, NEW.id, v_i
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_card_purchase_generate_installments
  AFTER INSERT ON public.credit_card_purchases
  FOR EACH ROW EXECUTE FUNCTION public.gerar_parcelas_cartao();

-- ============= DELETE seguro (preserva meses fechados) =============
CREATE OR REPLACE FUNCTION public.delete_card_purchase_safe(_purchase_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO v_owner FROM public.credit_card_purchases WHERE id = _purchase_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Compra não encontrada'; END IF;
  IF v_owner <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  DELETE FROM public.transactions t
   USING public.months m
   WHERE t.card_purchase_id = _purchase_id
     AND t.month_id = m.id
     AND m.status <> 'closed';

  IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE card_purchase_id = _purchase_id) THEN
    DELETE FROM public.credit_card_purchases WHERE id = _purchase_id;
  END IF;
END;
$$;

-- ============= DELETE de cartão seguro =============
CREATE OR REPLACE FUNCTION public.delete_credit_card_cascade(_card_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO v_owner FROM public.credit_cards WHERE id = _card_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Cartão não encontrado'; END IF;
  IF v_owner <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  DELETE FROM public.transactions t
   USING public.months m
   WHERE t.month_id = m.id
     AND m.status <> 'closed'
     AND t.card_purchase_id IN (SELECT id FROM public.credit_card_purchases WHERE card_id = _card_id);

  DELETE FROM public.credit_card_purchases WHERE card_id = _card_id;
  DELETE FROM public.credit_cards WHERE id = _card_id;
END;
$$;