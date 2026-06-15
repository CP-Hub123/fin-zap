-- Defense-in-depth: explicitly revoke client-side writes on tables only written by service_role / SECURITY DEFINER
REVOKE INSERT, UPDATE, DELETE ON public.ai_insights_cache FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.financial_rhythm_state FROM authenticated, anon;

-- Re-assert: Stripe identifier columns must never be selectable by client roles
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.subscriptions FROM authenticated, anon;