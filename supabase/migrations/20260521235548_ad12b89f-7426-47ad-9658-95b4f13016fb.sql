CREATE OR REPLACE FUNCTION public.aplicar_transacao_cofrinho()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.impacta_saldo AND NEW.cofrinho_id IS NOT NULL THEN
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
    IF OLD.impacta_saldo AND OLD.cofrinho_id IS NOT NULL THEN
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
    -- reverter antiga (apenas se havia vínculo)
    IF OLD.impacta_saldo AND OLD.cofrinho_id IS NOT NULL THEN
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
    -- aplicar nova (apenas se há vínculo)
    IF NEW.impacta_saldo AND NEW.cofrinho_id IS NOT NULL THEN
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
$function$;