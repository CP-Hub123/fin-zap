
-- Admin can read all profiles
CREATE POLICY "Admin reads all profiles"
ON public.profiles
FOR SELECT
TO public
USING (is_admin());
