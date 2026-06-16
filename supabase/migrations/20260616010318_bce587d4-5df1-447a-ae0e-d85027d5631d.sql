CREATE OR REPLACE FUNCTION public.block_income_on_mensal_cofrinho()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_tipo text;
BEGIN
  IF NEW.cofrinho_id IS NULL OR NEW.type <> 'income' THEN
    RETURN NEW;
  END IF;
  SELECT tipo INTO v_tipo FROM public.cofrinhos WHERE id = NEW.cofrinho_id;
  IF v_tipo = 'mensal' THEN
    RAISE EXCEPTION 'Receitas não podem ser vinculadas a cofrinhos mensais.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_income_on_mensal_cofrinho ON public.transactions;
CREATE TRIGGER trg_block_income_on_mensal_cofrinho
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.block_income_on_mensal_cofrinho();