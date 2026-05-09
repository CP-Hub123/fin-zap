CREATE OR REPLACE FUNCTION public.delete_cofrinho_cascade(_cofrinho_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO v_owner FROM public.cofrinhos WHERE id = _cofrinho_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Cofrinho não encontrado'; END IF;
  IF v_owner <> v_caller THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  DELETE FROM public.recurring_transactions WHERE cofrinho_id = _cofrinho_id AND user_id = v_caller;
  DELETE FROM public.transactions WHERE cofrinho_id = _cofrinho_id AND user_id = v_caller;
  DELETE FROM public.cofrinho_closures WHERE cofrinho_id = _cofrinho_id AND user_id = v_caller;
  DELETE FROM public.cofrinhos WHERE id = _cofrinho_id AND user_id = v_caller;
END;
$$;