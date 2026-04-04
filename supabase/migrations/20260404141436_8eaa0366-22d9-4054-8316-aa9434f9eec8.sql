
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Users insert own subscription" ON public.subscriptions;

-- Create a restricted INSERT policy: users can only create trial subscriptions
CREATE POLICY "Users insert own trial subscription"
ON public.subscriptions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'trial'
  AND status = 'active'
  AND is_manual = false
);
