
-- 1) RESET de dados antigos
TRUNCATE TABLE public.monthly_closures, public.budget_plans, public.transactions, public.months, public.categories RESTART IDENTITY CASCADE;

-- 2) Atualizar trigger handle_new_user para NÃO criar categorias padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$function$;

-- 3) Tabela COFRINHOS
CREATE TABLE public.cofrinhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#3B82F6',
  saldo numeric NOT NULL DEFAULT 0,
  orcamento_mensal numeric NOT NULL DEFAULT 0,
  gasto_mes numeric NOT NULL DEFAULT 0,
  mes_ref integer NOT NULL DEFAULT EXTRACT(MONTH FROM now())::int,
  ano_ref integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cofrinhos_user ON public.cofrinhos(user_id);

ALTER TABLE public.cofrinhos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cofrinhos" ON public.cofrinhos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin reads all cofrinhos" ON public.cofrinhos
  FOR SELECT USING (is_admin());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_cofrinhos_updated_at
BEFORE UPDATE ON public.cofrinhos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Refatorar TRANSACTIONS
-- Remover dependência de month_id e category obrigatórios; adicionar cofrinho_id
ALTER TABLE public.transactions
  ADD COLUMN user_id uuid,
  ADD COLUMN cofrinho_id uuid REFERENCES public.cofrinhos(id) ON DELETE RESTRICT,
  ADD COLUMN origem text NOT NULL DEFAULT 'usuario',
  ADD COLUMN impacta_saldo boolean NOT NULL DEFAULT true,
  ADD COLUMN descricao text;

-- Como truncamos, podemos tornar campos antigos nullable e novos obrigatórios
ALTER TABLE public.transactions
  ALTER COLUMN month_id DROP NOT NULL,
  ALTER COLUMN category DROP NOT NULL,
  ALTER COLUMN cofrinho_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL;

-- Nova policy baseada em user_id direto
DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_cofrinho ON public.transactions(cofrinho_id);

-- 5) Trigger: ao inserir/atualizar/excluir transação, ajustar cofrinho
CREATE OR REPLACE FUNCTION public.aplicar_transacao_cofrinho()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_delta numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.impacta_saldo THEN
      IF NEW.type = 'expense' THEN
        UPDATE public.cofrinhos
          SET saldo = saldo - NEW.amount,
              gasto_mes = gasto_mes + NEW.amount
          WHERE id = NEW.cofrinho_id;
      ELSE
        UPDATE public.cofrinhos
          SET saldo = saldo + NEW.amount
          WHERE id = NEW.cofrinho_id;
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.impacta_saldo THEN
      IF OLD.type = 'expense' THEN
        UPDATE public.cofrinhos
          SET saldo = saldo + OLD.amount,
              gasto_mes = GREATEST(0, gasto_mes - OLD.amount)
          WHERE id = OLD.cofrinho_id;
      ELSE
        UPDATE public.cofrinhos
          SET saldo = saldo - OLD.amount
          WHERE id = OLD.cofrinho_id;
      END IF;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- reverter antiga
    IF OLD.impacta_saldo THEN
      IF OLD.type = 'expense' THEN
        UPDATE public.cofrinhos
          SET saldo = saldo + OLD.amount,
              gasto_mes = GREATEST(0, gasto_mes - OLD.amount)
          WHERE id = OLD.cofrinho_id;
      ELSE
        UPDATE public.cofrinhos
          SET saldo = saldo - OLD.amount
          WHERE id = OLD.cofrinho_id;
      END IF;
    END IF;
    -- aplicar nova
    IF NEW.impacta_saldo THEN
      IF NEW.type = 'expense' THEN
        UPDATE public.cofrinhos
          SET saldo = saldo - NEW.amount,
              gasto_mes = gasto_mes + NEW.amount
          WHERE id = NEW.cofrinho_id;
      ELSE
        UPDATE public.cofrinhos
          SET saldo = saldo + NEW.amount
          WHERE id = NEW.cofrinho_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_aplicar_transacao_cofrinho
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.aplicar_transacao_cofrinho();

-- 6) Snapshot de fechamento mensal por cofrinho
CREATE TABLE public.cofrinho_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cofrinho_id uuid NOT NULL REFERENCES public.cofrinhos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  mes integer NOT NULL,
  ano integer NOT NULL,
  saldo_final numeric NOT NULL,
  gasto_mes numeric NOT NULL,
  orcamento_mensal numeric NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cofrinho_id, mes, ano)
);

ALTER TABLE public.cofrinho_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own cofrinho closures" ON public.cofrinho_closures
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own cofrinho closures" ON public.cofrinho_closures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin reads all cofrinho closures" ON public.cofrinho_closures
  FOR SELECT USING (is_admin());

-- 7) Função de fechamento automático
CREATE OR REPLACE FUNCTION public.fechar_mes_cofrinhos(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mes_atual int := EXTRACT(MONTH FROM now())::int;
  v_ano_atual int := EXTRACT(YEAR FROM now())::int;
  v_count int := 0;
  c RECORD;
BEGIN
  FOR c IN
    SELECT * FROM public.cofrinhos
    WHERE user_id = _user_id
      AND (ano_ref < v_ano_atual OR (ano_ref = v_ano_atual AND mes_ref < v_mes_atual))
  LOOP
    -- snapshot
    INSERT INTO public.cofrinho_closures
      (cofrinho_id, user_id, mes, ano, saldo_final, gasto_mes, orcamento_mensal)
    VALUES
      (c.id, c.user_id, c.mes_ref, c.ano_ref, c.saldo, c.gasto_mes, c.orcamento_mensal)
    ON CONFLICT (cofrinho_id, mes, ano) DO NOTHING;

    -- reset
    UPDATE public.cofrinhos
      SET gasto_mes = 0,
          mes_ref = v_mes_atual,
          ano_ref = v_ano_atual
      WHERE id = c.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
