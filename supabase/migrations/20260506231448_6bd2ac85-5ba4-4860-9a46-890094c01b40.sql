
-- =========================
-- RECORRÊNCIAS
-- =========================

ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS proxima_execucao date,
  ADD COLUMN IF NOT EXISTS lancar_se_dia_passou boolean NOT NULL DEFAULT false;

-- Helper: calcula próxima data válida a partir de um mês/ano e dia desejado
CREATE OR REPLACE FUNCTION public.calc_proxima_execucao(_dia int, _from date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_ano int := EXTRACT(YEAR FROM _from)::int;
  v_mes int := EXTRACT(MONTH FROM _from)::int;
  v_ultimo_dia int;
  v_dia int;
  v_data date;
BEGIN
  v_ultimo_dia := EXTRACT(DAY FROM (date_trunc('month', _from) + interval '1 month - 1 day'))::int;
  v_dia := LEAST(GREATEST(_dia, 1), v_ultimo_dia);
  v_data := make_date(v_ano, v_mes, v_dia);
  IF v_data < _from THEN
    -- pula para o próximo mês
    v_data := (date_trunc('month', _from) + interval '1 month')::date;
    v_ano := EXTRACT(YEAR FROM v_data)::int;
    v_mes := EXTRACT(MONTH FROM v_data)::int;
    v_ultimo_dia := EXTRACT(DAY FROM (date_trunc('month', v_data) + interval '1 month - 1 day'))::int;
    v_dia := LEAST(GREATEST(_dia, 1), v_ultimo_dia);
    v_data := make_date(v_ano, v_mes, v_dia);
  END IF;
  RETURN v_data;
END;
$$;

-- Backfill proxima_execucao para registros existentes
UPDATE public.recurring_transactions
SET proxima_execucao = CASE
  WHEN ultima_execucao IS NULL THEN public.calc_proxima_execucao(dia_do_mes, CURRENT_DATE)
  ELSE public.calc_proxima_execucao(dia_do_mes, (date_trunc('month', ultima_execucao) + interval '1 month')::date)
END
WHERE proxima_execucao IS NULL;

-- Trigger para manter proxima_execucao consistente em INSERT/UPDATE manual
CREATE OR REPLACE FUNCTION public.recurring_set_next_execution()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Se ainda não foi lançada, decide a partir de hoje
    IF NEW.proxima_execucao IS NULL THEN
      DECLARE
        v_today date := CURRENT_DATE;
        v_target date := public.calc_proxima_execucao(NEW.dia_do_mes, v_today);
      BEGIN
        -- Se o dia desse mês já passou e usuário NÃO quer lançar agora,
        -- a função calc_proxima_execucao já moveu para o próximo mês.
        -- Se quiser lançar agora (dia <= hoje), forçamos para hoje.
        IF NEW.lancar_se_dia_passou
           AND NEW.dia_do_mes <= EXTRACT(DAY FROM v_today)::int
           AND NEW.ultima_execucao IS NULL THEN
          NEW.proxima_execucao := v_today;
        ELSE
          NEW.proxima_execucao := v_target;
        END IF;
      END;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Se mudou o dia_do_mes, recalcula
    IF NEW.dia_do_mes <> OLD.dia_do_mes THEN
      NEW.proxima_execucao := public.calc_proxima_execucao(
        NEW.dia_do_mes,
        COALESCE(NEW.ultima_execucao, CURRENT_DATE)
      );
      IF NEW.ultima_execucao IS NOT NULL
         AND NEW.proxima_execucao <= NEW.ultima_execucao THEN
        NEW.proxima_execucao := public.calc_proxima_execucao(
          NEW.dia_do_mes,
          (date_trunc('month', NEW.ultima_execucao) + interval '1 month')::date
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recurring_set_next_execution ON public.recurring_transactions;
CREATE TRIGGER trg_recurring_set_next_execution
BEFORE INSERT OR UPDATE ON public.recurring_transactions
FOR EACH ROW EXECUTE FUNCTION public.recurring_set_next_execution();

-- Substitui o motor de execução
CREATE OR REPLACE FUNCTION public.executar_recorrencias_usuario(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_count int := 0;
  v_month_id uuid;
  v_mes int;
  v_ano int;
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE user_id = _user_id
      AND ativo = true
      AND proxima_execucao IS NOT NULL
      AND proxima_execucao <= v_today
  LOOP
    v_mes := EXTRACT(MONTH FROM r.proxima_execucao)::int;
    v_ano := EXTRACT(YEAR FROM r.proxima_execucao)::int;

    -- garante existência do mês
    SELECT id INTO v_month_id
      FROM public.months
      WHERE user_id = _user_id AND month = v_mes AND year = v_ano
      LIMIT 1;

    IF v_month_id IS NULL THEN
      INSERT INTO public.months (user_id, month, year, status, initial_balance)
      VALUES (_user_id, v_mes, v_ano, 'draft', 0)
      RETURNING id INTO v_month_id;
    END IF;

    -- Não lança em mês já fechado
    IF EXISTS (SELECT 1 FROM public.months WHERE id = v_month_id AND status = 'closed') THEN
      -- adia para próximo mês
      UPDATE public.recurring_transactions
        SET proxima_execucao = public.calc_proxima_execucao(
              r.dia_do_mes,
              (date_trunc('month', r.proxima_execucao) + interval '1 month')::date
            )
        WHERE id = r.id;
      CONTINUE;
    END IF;

    -- Evita duplicidade no mesmo mês para a mesma recorrência
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE user_id = _user_id
        AND month_id = v_month_id
        AND name = r.nome
        AND amount = r.valor
        AND source = 'recurring'
    ) THEN
      UPDATE public.recurring_transactions
        SET ultima_execucao = r.proxima_execucao,
            proxima_execucao = public.calc_proxima_execucao(
              r.dia_do_mes,
              (date_trunc('month', r.proxima_execucao) + interval '1 month')::date
            )
        WHERE id = r.id;
      CONTINUE;
    END IF;

    INSERT INTO public.transactions (
      user_id, month_id, cofrinho_id, type, name, amount,
      date, status, is_fixed, recurrence, source, impacta_saldo, origem
    ) VALUES (
      _user_id, v_month_id, r.cofrinho_id,
      CASE WHEN r.tipo = 'receita' THEN 'income'::transaction_type ELSE 'expense'::transaction_type END,
      r.nome, r.valor, r.proxima_execucao, 'realized', true, 'monthly',
      'recurring'::transaction_source, true, 'recorrencia'
    );

    UPDATE public.recurring_transactions
      SET ultima_execucao = r.proxima_execucao,
          proxima_execucao = public.calc_proxima_execucao(
            r.dia_do_mes,
            (date_trunc('month', r.proxima_execucao) + interval '1 month')::date
          )
      WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- =========================
-- FECHAMENTO DE MÊS
-- =========================

ALTER TABLE public.months
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_count int NOT NULL DEFAULT 0;
