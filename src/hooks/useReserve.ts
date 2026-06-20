import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useFinzapInvalidate } from './useFinzapInvalidate';
import { formatCurrency } from '@/lib/constants';

type ReservePayload = {
  valor: number;
  descricao?: string;
  monthId: string;
};

/**
 * Reservar / resgatar dinheiro como realocação interna entre `saldoLivre` e
 * `saldoReservado`. Ambas as operações usam `impacta_saldo=false` no banco —
 * não afetam `totalIncome`/`totalExpense` do mês nem `saldoTotal`. Apenas
 * deslocam o saldo entre os baldes "livre" e "reservado".
 *
 * Toda a matemática vive na engine (`useFinancialBalance`). Este hook só
 * dispara as RPCs e invalida caches.
 */
export const useReserve = () => {
  const { user } = useAuth();
  const invalidateFinancial = useFinzapInvalidate();

  const reservar = useMutation({
    mutationFn: async ({ valor, descricao, monthId }: ReservePayload) => {
      if (!user) throw new Error('Sem usuário');
      const { data, error } = await supabase.rpc('reservar_valor', {
        _valor: valor,
        _descricao: descricao ?? null,
        _month_id: monthId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_id, vars) => {
      invalidateFinancial();
      toast.success(`Reservado ${formatCurrency(vars.valor)}`, {
        description: 'Saldo livre atualizado.',
      });
    },
    onError: (e: any) => toast.error('Erro ao reservar', { description: e?.message }),
  });

  const resgatar = useMutation({
    mutationFn: async ({ valor, descricao, monthId }: ReservePayload) => {
      if (!user) throw new Error('Sem usuário');
      const { data, error } = await supabase.rpc('resgatar_reserva', {
        _valor: valor,
        _descricao: descricao ?? null,
        _month_id: monthId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_id, vars) => {
      invalidateFinancial();
      toast.success(`Resgatado ${formatCurrency(vars.valor)}`, {
        description: 'Disponível no saldo livre.',
      });
    },
    onError: (e: any) => toast.error('Erro ao resgatar', { description: e?.message }),
  });

  return { reservar, resgatar };
};