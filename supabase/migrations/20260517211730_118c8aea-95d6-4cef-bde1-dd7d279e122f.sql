-- 1) Adiciona valor 'archived' ao enum month_status (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'month_status' AND e.enumlabel = 'archived'
  ) THEN
    ALTER TYPE public.month_status ADD VALUE 'archived';
  END IF;
END$$;

-- 2) Função de deleção segura em cascata
CREATE OR REPLACE FUNCTION public.delete_month_cascade(_month_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_is_admin boolean := public.is_admin();
  v_purchase_ids uuid[];
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT user_id INTO v_owner FROM public.months WHERE id = _month_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Mês não encontrado'; END IF;
  IF v_owner <> v_caller AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Coleta compras de cartão tocadas por esse mês
  SELECT COALESCE(array_agg(DISTINCT card_purchase_id), ARRAY[]::uuid[])
    INTO v_purchase_ids
  FROM public.transactions
  WHERE month_id = _month_id AND card_purchase_id IS NOT NULL;

  -- Apaga snapshots de fechamento desse mês
  DELETE FROM public.monthly_closures WHERE month_id = _month_id;

  -- Apaga budget plans desse mês
  DELETE FROM public.budget_plans WHERE month_id = _month_id;

  -- Apaga todas as transações do mês (inclusive parcelas de cartão e recorrentes registradas)
  DELETE FROM public.transactions WHERE month_id = _month_id;

  -- Para compras de cartão que ficaram sem nenhuma parcela em qualquer mês, apaga a compra
  IF array_length(v_purchase_ids, 1) IS NOT NULL THEN
    DELETE FROM public.credit_card_purchases p
     WHERE p.id = ANY(v_purchase_ids)
       AND NOT EXISTS (
         SELECT 1 FROM public.transactions t WHERE t.card_purchase_id = p.id
       );
  END IF;

  -- Finalmente, apaga o mês
  DELETE FROM public.months WHERE id = _month_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_month_cascade(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_month_cascade(uuid) TO authenticated;