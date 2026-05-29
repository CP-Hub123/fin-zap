CREATE TABLE public.financial_rhythm_state (
  user_id uuid PRIMARY KEY,
  last_transaction_at timestamptz,
  last_open_at timestamptz,
  rhythm_score smallint NOT NULL DEFAULT 0,
  predictability_score smallint NOT NULL DEFAULT 0,
  previous_predictability_score smallint,
  inactivity_level text NOT NULL DEFAULT 'ok',
  last_notification_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.financial_rhythm_state TO authenticated;
GRANT ALL ON public.financial_rhythm_state TO service_role;

ALTER TABLE public.financial_rhythm_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own rhythm state"
ON public.financial_rhythm_state
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all rhythm state"
ON public.financial_rhythm_state
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE INDEX idx_rhythm_state_updated ON public.financial_rhythm_state(updated_at DESC);
CREATE INDEX idx_rhythm_state_inactivity ON public.financial_rhythm_state(inactivity_level);