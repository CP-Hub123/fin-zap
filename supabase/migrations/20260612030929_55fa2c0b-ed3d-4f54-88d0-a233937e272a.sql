
CREATE OR REPLACE FUNCTION public.set_app_config(_key text, _value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
BEGIN
  INSERT INTO private.app_config(key, value, updated_at)
  VALUES (_key, _value, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END; $function$;

REVOKE ALL ON FUNCTION public.set_app_config(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_app_config(text, text) TO service_role;
