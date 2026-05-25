INSERT INTO public.system_settings (key, value, is_public)
VALUES ('app_icon_mode', 'normal', true)
ON CONFLICT (key) DO NOTHING;