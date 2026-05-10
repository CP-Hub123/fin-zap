
-- 1. notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  vencimentos boolean NOT NULL DEFAULT true,
  recorrencias boolean NOT NULL DEFAULT true,
  metas_cofrinhos boolean NOT NULL DEFAULT true,
  insights boolean NOT NULL DEFAULT true,
  alertas_criticos boolean NOT NULL DEFAULT true,
  lembrete_diario boolean NOT NULL DEFAULT false,
  resumo_semanal boolean NOT NULL DEFAULT true,
  quiet_hours_start smallint NOT NULL DEFAULT 22,
  quiet_hours_end smallint NOT NULL DEFAULT 7,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notif prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users insert own notif prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users update own notif prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Admin reads all notif prefs" ON public.notification_preferences;

CREATE POLICY "Users read own notif prefs" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notif prefs" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notif prefs" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin reads all notif prefs" ON public.notification_preferences
  FOR SELECT TO authenticated USING (is_admin());

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. push_subscriptions: telemetry
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS device_info jsonb,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0;

-- Dedupe endpoint duplicates: keep most recently used row
DELETE FROM public.push_subscriptions a
USING public.push_subscriptions b
WHERE a.endpoint = b.endpoint
  AND a.id <> b.id
  AND (a.last_seen_at, a.created_at, a.id) < (b.last_seen_at, b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_unique
  ON public.push_subscriptions(endpoint);

-- 3. notifications_log: dedupe + telemetry
ALTER TABLE public.notifications_log
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS error text;

CREATE INDEX IF NOT EXISTS notifications_log_user_type_sent
  ON public.notifications_log(user_id, type, sent_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_log_dedupe_unique
  ON public.notifications_log(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 4. Trigger to seed prefs on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_notif_prefs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_notif_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notif_prefs
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_notif_prefs();

-- 5. Backfill existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 6. Cleanup stale subscriptions
DELETE FROM public.push_subscriptions
WHERE endpoint LIKE '%permanently-removed.invalid%';

-- 7. Enable cron extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
