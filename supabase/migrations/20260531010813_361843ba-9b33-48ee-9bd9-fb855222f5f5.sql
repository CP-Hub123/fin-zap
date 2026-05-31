
CREATE TABLE public.ai_insights_cache (
  user_id uuid NOT NULL PRIMARY KEY,
  context_hash text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  level text NOT NULL,
  context_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_insights_cache TO authenticated;
GRANT ALL ON public.ai_insights_cache TO service_role;

ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ai insight"
  ON public.ai_insights_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all ai insights"
  ON public.ai_insights_cache FOR SELECT
  TO authenticated
  USING (is_admin());
