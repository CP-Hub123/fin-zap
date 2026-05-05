-- 1. Adicionar 'recurring' ao enum transaction_source
ALTER TYPE public.transaction_source ADD VALUE IF NOT EXISTS 'recurring';

-- 2. Criar tabela recurring_transactions
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL CHECK (valor > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('despesa', 'receita')),
  cofrinho_id UUID NOT NULL,
  dia_do_mes INTEGER NOT NULL DEFAULT 1 CHECK (dia_do_mes BETWEEN 1 AND 31),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultima_execucao DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_user ON public.recurring_transactions(user_id);
CREATE INDEX idx_recurring_ativo ON public.recurring_transactions(user_id, ativo);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring transactions"
  ON public.recurring_transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin reads all recurring transactions"
  ON public.recurring_transactions
  FOR SELECT
  USING (is_admin());

CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
