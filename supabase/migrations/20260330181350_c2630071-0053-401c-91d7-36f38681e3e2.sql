
-- Enums
CREATE TYPE public.app_role AS ENUM ('user', 'admin');
CREATE TYPE public.month_status AS ENUM ('draft', 'in_progress', 'ready_to_close', 'closed');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
CREATE TYPE public.transaction_status AS ENUM ('planned', 'realized');
CREATE TYPE public.recurrence_type AS ENUM ('none', 'monthly');
CREATE TYPE public.category_type AS ENUM ('income', 'expense');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type category_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Months
CREATE TABLE public.months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  status month_status NOT NULL DEFAULT 'draft',
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, year)
);
ALTER TABLE public.months ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own months" ON public.months FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id UUID NOT NULL REFERENCES public.months(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  date DATE NOT NULL,
  status transaction_status NOT NULL DEFAULT 'planned',
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  recurrence recurrence_type NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.months WHERE months.id = transactions.month_id AND months.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.months WHERE months.id = transactions.month_id AND months.user_id = auth.uid()));

-- Budget plans
CREATE TABLE public.budget_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id UUID NOT NULL REFERENCES public.months(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  planned_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE (month_id, category)
);
ALTER TABLE public.budget_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget plans" ON public.budget_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.months WHERE months.id = budget_plans.month_id AND months.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.months WHERE months.id = budget_plans.month_id AND months.user_id = auth.uid()));

-- Monthly closures (snapshot)
CREATE TABLE public.monthly_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id UUID NOT NULL REFERENCES public.months(id) ON DELETE CASCADE UNIQUE,
  total_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expense NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  planned_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  realized_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own closures" ON public.monthly_closures FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.months WHERE months.id = monthly_closures.month_id AND months.user_id = auth.uid()));
CREATE POLICY "Users insert own closures" ON public.monthly_closures FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.months WHERE months.id = monthly_closures.month_id AND months.user_id = auth.uid()));

-- Tutorials
CREATE TABLE public.tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tutorials" ON public.tutorials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tutorials" ON public.tutorials FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Activity logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- System settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.system_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-create profile + user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
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
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed system settings
INSERT INTO public.system_settings (key, value) VALUES
  ('app_name', 'FinZap'),
  ('global_message', ''),
  ('system_status', 'active');

-- Indexes
CREATE INDEX idx_months_user ON public.months(user_id, year, month);
CREATE INDEX idx_transactions_month ON public.transactions(month_id, type);
CREATE INDEX idx_categories_user ON public.categories(user_id, type);
CREATE INDEX idx_budget_plans_month ON public.budget_plans(month_id);
