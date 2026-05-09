
-- Helper: returns true if caller has active, non-expired subscription, or is admin
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription() FROM PUBLIC, anon;

-- RESTRICTIVE policies: AND'd with existing owner-scoped policies.
-- Block INSERT/UPDATE when subscription is not active. SELECT/DELETE remain unaffected (read-only mode).

-- transactions
CREATE POLICY "Active subscription required to insert transactions"
  ON public.transactions AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_active_subscription());
CREATE POLICY "Active subscription required to update transactions"
  ON public.transactions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_active_subscription())
  WITH CHECK (public.has_active_subscription());

-- months
CREATE POLICY "Active subscription required to insert months"
  ON public.months AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_active_subscription());
CREATE POLICY "Active subscription required to update months"
  ON public.months AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_active_subscription())
  WITH CHECK (public.has_active_subscription());

-- cofrinhos
CREATE POLICY "Active subscription required to insert cofrinhos"
  ON public.cofrinhos AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_active_subscription());
CREATE POLICY "Active subscription required to update cofrinhos"
  ON public.cofrinhos AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_active_subscription())
  WITH CHECK (public.has_active_subscription());

-- budget_plans
CREATE POLICY "Active subscription required to insert budget_plans"
  ON public.budget_plans AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_active_subscription());
CREATE POLICY "Active subscription required to update budget_plans"
  ON public.budget_plans AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_active_subscription())
  WITH CHECK (public.has_active_subscription());

-- recurring_transactions
CREATE POLICY "Active subscription required to insert recurring"
  ON public.recurring_transactions AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_active_subscription());
CREATE POLICY "Active subscription required to update recurring"
  ON public.recurring_transactions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_active_subscription())
  WITH CHECK (public.has_active_subscription());
