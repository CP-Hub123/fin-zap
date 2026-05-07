
-- ============================================================
-- COFRINHOS PREMIUM: schema evolution
-- ============================================================

-- 1) Tipo de cofrinho
DO $$ BEGIN
  CREATE TYPE public.cofrinho_tipo AS ENUM ('reserva', 'mensal', 'meta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Novos campos (todos com default p/ retrocompatibilidade)
ALTER TABLE public.cofrinhos
  ADD COLUMN IF NOT EXISTS tipo            public.cofrinho_tipo NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS meta_valor      numeric             NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icon            text                NOT NULL DEFAULT 'piggy-bank',
  ADD COLUMN IF NOT EXISTS cover_preset    text                NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS prioridade      integer             NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ordem           integer             NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_mensal    numeric             NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meses_protegidos numeric            NOT NULL DEFAULT 6;

-- 3) Garantir que coluna 'descricao' exista em transactions (já existe)
-- 4) Função: transferência entre cofrinhos
CREATE OR REPLACE FUNCTION public.transferir_entre_cofrinhos(
  _user_id uuid,
  _origem_id uuid,
  _destino_id uuid,
  _valor numeric,
  _descricao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origem  public.cofrinhos;
  v_destino public.cofrinhos;
BEGIN
  IF _valor IS NULL OR _valor <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;
  IF _origem_id = _destino_id THEN
    RAISE EXCEPTION 'Origem e destino devem ser diferentes';
  END IF;

  SELECT * INTO v_origem  FROM public.cofrinhos WHERE id = _origem_id  AND user_id = _user_id;
  SELECT * INTO v_destino FROM public.cofrinhos WHERE id = _destino_id AND user_id = _user_id;

  IF v_origem.id IS NULL OR v_destino.id IS NULL THEN
    RAISE EXCEPTION 'Cofrinho não encontrado';
  END IF;
  IF v_origem.saldo < _valor THEN
    RAISE EXCEPTION 'Saldo insuficiente no cofrinho de origem';
  END IF;

  UPDATE public.cofrinhos SET saldo = saldo - _valor WHERE id = _origem_id;
  UPDATE public.cofrinhos SET saldo = saldo + _valor WHERE id = _destino_id;
END;
$$;

-- 5) Trigger para garantir consistência de meta na reserva
CREATE OR REPLACE FUNCTION public.cofrinho_calc_meta_reserva()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tipo = 'reserva' AND NEW.custo_mensal > 0 THEN
    NEW.meta_valor := NEW.custo_mensal * COALESCE(NEW.meses_protegidos, 6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cofrinho_meta_reserva ON public.cofrinhos;
CREATE TRIGGER trg_cofrinho_meta_reserva
BEFORE INSERT OR UPDATE OF tipo, custo_mensal, meses_protegidos
ON public.cofrinhos
FOR EACH ROW
EXECUTE FUNCTION public.cofrinho_calc_meta_reserva();
