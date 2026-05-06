import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatCurrency, MONTH_NAMES } from '@/lib/constants';
import { Lock, Unlock, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Month } from '@/hooks/useMonths';

interface ClosingViewProps {
  month: Month;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  onUpdateStatus: (data: { id: string; status: string; closed_at?: string | null }) => Promise<any>;
}

export const ClosingView = ({ month, totalIncome, totalExpense, balance, incomeCount, expenseCount, onUpdateStatus }: ClosingViewProps) => {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reopenStep, setReopenStep] = useState(0); // 0=closed, 1=first confirm, 2=second confirm
  const [loading, setLoading] = useState(false);

  const isClosed = month.status === 'closed';
  const canClose = incomeCount > 0 && expenseCount > 0;
  const finalBalance = balance + Number(month.initial_balance);

  const handleClose = async () => {
    setLoading(true);
    try {
      // Create closure snapshot
      await supabase.from('monthly_closures').insert({
        month_id: month.id,
        total_income: totalIncome,
        total_expense: totalExpense,
        final_balance: finalBalance,
        planned_total: 0,
        realized_total: totalIncome + totalExpense,
      });
      await onUpdateStatus({ id: month.id, status: 'closed', closed_at: new Date().toISOString() });
      toast.success('Mês fechado com sucesso!');
      setCloseDialogOpen(false);
    } catch {
      toast.error('Erro ao fechar mês');
    } finally { setLoading(false); }
  };

  const handleReopen = async () => {
    setLoading(true);
    try {
      // Preserva snapshot (imutável). Apenas marca o mês como reaberto.
      await supabase
        .from('months')
        .update({
          status: 'in_progress' as any,
          closed_at: null,
          reopened_at: new Date().toISOString(),
          reopened_count: (month as any).reopened_count != null ? (month as any).reopened_count + 1 : 1,
        } as any)
        .eq('id', month.id);
      toast.success('Mês reaberto!');
      setReopenStep(0);
    } catch {
      toast.error('Erro ao reabrir mês');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      {isClosed && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Mês fechado em {month.closed_at ? new Date(month.closed_at).toLocaleDateString('pt-BR') : ''}</span>
        </div>
      )}
      {!isClosed && (month as any).reopened_count > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary text-sm">
          <Unlock className="h-4 w-4" />
          <span>Mês reaberto ({(month as any).reopened_count}x). Snapshot original preservado.</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Receitas</p>
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--finzap-green))' }}>{formatCurrency(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">{incomeCount} transações</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Despesas</p>
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--finzap-red))' }}>{formatCurrency(totalExpense)}</p>
            <p className="text-xs text-muted-foreground mt-1">{expenseCount} transações</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Resultado Final</p>
          <p className="text-3xl font-bold" style={{ color: finalBalance >= 0 ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
            {formatCurrency(finalBalance)}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            {finalBalance >= 0
              ? <><CheckCircle className="h-4 w-4" style={{ color: 'hsl(var(--finzap-green))' }} /><span className="text-sm" style={{ color: 'hsl(var(--finzap-green))' }}>Mês positivo</span></>
              : <><AlertTriangle className="h-4 w-4" style={{ color: 'hsl(var(--finzap-red))' }} /><span className="text-sm" style={{ color: 'hsl(var(--finzap-red))' }}>Mês negativo</span></>
            }
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isClosed ? (
        <div className="space-y-3">
          {!canClose && (
            <p className="text-sm text-muted-foreground text-center">
              Para fechar o mês, você precisa ter pelo menos 1 receita e 1 despesa cadastradas.
            </p>
          )}
          <Button className="w-full" size="lg" disabled={!canClose} onClick={() => setCloseDialogOpen(true)}>
            <Lock className="h-4 w-4 mr-2" /> Fechar Mês
          </Button>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setReopenStep(1)}>
          <Unlock className="h-4 w-4 mr-2" /> Reabrir Mês
        </Button>
      )}

      {/* Close confirmation */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar mês de {MONTH_NAMES[month.month - 1]} {month.year}?</AlertDialogTitle>
            <AlertDialogDescription>
              Após fechar, todas as transações e valores serão congelados. Você não poderá editar até reabrir o mês.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={loading}>
              {loading ? 'Fechando...' : 'Confirmar fechamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen step 1 */}
      <AlertDialog open={reopenStep === 1} onOpenChange={() => setReopenStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir mês?</AlertDialogTitle>
            <AlertDialogDescription>Isso permitirá edições novamente. Tem certeza?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => setReopenStep(2)}>Sim, continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen step 2 */}
      <AlertDialog open={reopenStep === 2} onOpenChange={() => setReopenStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação final</AlertDialogTitle>
            <AlertDialogDescription>Esta ação vai remover o registro de fechamento. Deseja prosseguir?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen} disabled={loading}>
              {loading ? 'Reabrindo...' : 'Reabrir mês'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
