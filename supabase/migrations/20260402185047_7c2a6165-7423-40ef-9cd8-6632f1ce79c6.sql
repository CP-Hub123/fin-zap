
-- Create subscription plan and status types
CREATE TYPE public.subscription_plan AS ENUM ('trial', 'premium');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan subscription_plan NOT NULL DEFAULT 'trial',
  status subscription_status NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  discount_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- Admin can manage all subscriptions
CREATE POLICY "Admin manages all subscriptions"
  ON public.subscriptions FOR ALL
  TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can insert their own subscription (for auto-trial fallback)
CREATE POLICY "Users insert own subscription"
  ON public.subscriptions FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-create trial on signup
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, starts_at, expires_at)
  VALUES (NEW.id, 'trial', 'active', now(), now() + interval '3 days');
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_subscription();
