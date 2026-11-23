-- 1. Protect cofrinhos.saldo / gasto_mes from direct client updates
CREATE OR REPLACE FUNCTION public.protect_cofrinho_balance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    NEW.saldo := OLD.saldo;
    NEW.gasto_mes := OLD.gasto_mes;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_cofrinho_balance ON public.cofrinhos;
CREATE TRIGGER trg_protect_cofrinho_balance BEFORE UPDATE ON public.cofrinhos
FOR EACH ROW EXECUTE FUNCTION public.protect_cofrinho_balance();

-- 2. ensure_default_reserve only callable internally
REVOKE EXECUTE ON FUNCTION public.ensure_default_reserve(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Card installments: card must belong to purchase owner
CREATE OR REPLACE FUNCTION public.check_card_purchase_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.credit_cards WHERE id = NEW.card_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Cartão não encontrado' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.cofrinho_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cofrinhos WHERE id = NEW.cofrinho_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Cofrinho não encontrado' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_check_card_purchase_owner ON public.credit_card_purchases;
CREATE TRIGGER trg_check_card_purchase_owner BEFORE INSERT OR UPDATE ON public.credit_card_purchases
FOR EACH ROW EXECUTE FUNCTION public.check_card_purchase_owner();

-- 4. Transactions: cofrinho must belong to transaction owner
CREATE OR REPLACE FUNCTION public.check_transaction_cofrinho_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cofrinho_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cofrinhos WHERE id = NEW.cofrinho_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Cofrinho não encontrado' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_check_transaction_cofrinho_owner ON public.transactions;
CREATE TRIGGER trg_check_transaction_cofrinho_owner BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.check_transaction_cofrinho_owner();

-- 5. Tutorials: only active ones visible (admins see all)
DROP POLICY IF EXISTS "Anyone can read tutorials" ON public.tutorials;
CREATE POLICY "Read active tutorials" ON public.tutorials FOR SELECT
USING (is_active = true OR public.is_admin());