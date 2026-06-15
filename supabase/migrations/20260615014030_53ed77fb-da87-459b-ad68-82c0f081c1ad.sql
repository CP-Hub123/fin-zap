
DROP POLICY IF EXISTS "Users insert own cofrinho closures" ON public.cofrinho_closures;
DROP POLICY IF EXISTS "Users insert own closures" ON public.monthly_closures;

DROP POLICY IF EXISTS "Users read own subscription" ON public.subscriptions;
CREATE POLICY "Users read own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

REVOKE SELECT ON public.subscriptions FROM authenticated, anon;
GRANT SELECT (
  id, user_id, plan, status, is_manual, discount_tag,
  starts_at, expires_at, created_at, updated_at
) ON public.subscriptions TO authenticated;

REVOKE EXECUTE ON FUNCTION public.convert_commitment_to_transaction(uuid) FROM PUBLIC, anon;
