
CREATE POLICY "Admin reads all push subscriptions"
ON public.push_subscriptions FOR SELECT
TO public
USING (is_admin());
