
-- 1. Create new is_admin function based on email
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'email') = 'christianpietromello079@gmail.com'
$$;

-- 2. Update activity_logs policies
DROP POLICY IF EXISTS "Admins read all logs" ON public.activity_logs;
CREATE POLICY "Admins read all logs" ON public.activity_logs FOR SELECT TO public USING (is_admin());

-- 3. Update system_settings policies
DROP POLICY IF EXISTS "Admins manage settings" ON public.system_settings;
CREATE POLICY "Admins manage settings" ON public.system_settings FOR ALL TO public USING (is_admin());

DROP POLICY IF EXISTS "Authenticated read public settings" ON public.system_settings;
CREATE POLICY "Authenticated read public settings" ON public.system_settings FOR SELECT TO authenticated USING (is_public = true OR is_admin());

-- 4. Update tutorials policies
DROP POLICY IF EXISTS "Admins manage tutorials" ON public.tutorials;
CREATE POLICY "Admins manage tutorials" ON public.tutorials FOR ALL TO public USING (is_admin());

-- 5. Drop user_roles table (cascades its policies)
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 6. Drop has_role function
DROP FUNCTION IF EXISTS public.has_role(_user_id uuid, _role app_role);

-- 7. Drop the app_role enum (no longer needed)
DROP TYPE IF EXISTS public.app_role;

-- 8. Update handle_new_user to remove user_roles insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  INSERT INTO public.categories (user_id, name, type) VALUES
    (NEW.id, 'Salário', 'income'),
    (NEW.id, 'Freelance', 'income'),
    (NEW.id, 'Investimentos', 'income'),
    (NEW.id, 'Outros (Receita)', 'income'),
    (NEW.id, 'Alimentação', 'expense'),
    (NEW.id, 'Transporte', 'expense'),
    (NEW.id, 'Moradia', 'expense'),
    (NEW.id, 'Lazer', 'expense'),
    (NEW.id, 'Saúde', 'expense'),
    (NEW.id, 'Educação', 'expense'),
    (NEW.id, 'Outros (Despesa)', 'expense');
  
  RETURN NEW;
END;
$function$;
