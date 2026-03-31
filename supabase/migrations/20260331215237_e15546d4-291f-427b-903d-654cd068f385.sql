
-- 1. Fix privilege escalation: prevent non-admin users from inserting/updating/deleting in user_roles
-- Drop the overly permissive "Admins manage roles" ALL policy and replace with admin-only write policies
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

-- Admin can do everything
CREATE POLICY "Admins select roles" ON public.user_roles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Make monthly_closures explicitly immutable (deny UPDATE and DELETE)
CREATE POLICY "No updates on closures" ON public.monthly_closures FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "No deletes on closures" ON public.monthly_closures FOR DELETE TO authenticated
  USING (false);

-- 3. Restrict system_settings: add is_public column and update SELECT policy
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Anyone can read settings" ON public.system_settings;

CREATE POLICY "Authenticated read public settings" ON public.system_settings FOR SELECT TO authenticated
  USING (is_public = true OR has_role(auth.uid(), 'admin'::app_role));
