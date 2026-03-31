import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMonths } from '@/hooks/useMonths';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBudget } from '@/hooks/useBudget';
import { Stepper } from '@/components/layout/Stepper';
import { MonthSelector } from '@/components/app/MonthSelector';
import { SummaryView } from '@/components/app/SummaryView';
import { TransactionsView } from '@/components/app/TransactionsView';
import { BudgetView } from '@/components/app/BudgetView';
import { ClosingView } from '@/components/app/ClosingView';
import { NudgeBanner } from '@/components/app/NudgeBanner';
import { Button } from '@/components/ui/button';
import { DollarSign, LogOut, BookOpen, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTH_NAMES } from '@/lib/constants';
import { toast } from 'sonner';

const AppPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMonthId, setSelectedMonthId] = useState<string | undefined>();
  const [newMonthOpen, setNewMonthOpen] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newBalance, setNewBalance] = useState('');

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { months, isLoading: monthsLoading, createMonth, updateMonthStatus } = useMonths();
  const selectedMonth = months.find(m => m.id === selectedMonthId);
  const { transactions, totalIncome, totalExpense, balance, incomes, expenses, addTransaction, updateTransaction, deleteTransaction } = useTransactions(selectedMonthId);
  const { categories, expenseCategories } = useCategories();
  const { budgetPlans, upsertBudget } = useBudget(selectedMonthId);

  const isClosed = selectedMonth?.status === 'closed';

  // Auto-select first month
  useEffect(() => {
    if (months.length > 0 && !selectedMonthId) {
      setSelectedMonthId(months[0].id);
    }
  }, [months, selectedMonthId]);

  // Redirect to onboarding if no months
  useEffect(() => {
    if (!monthsLoading && months.length === 0) {
      navigate('/onboarding');
    }
  }, [monthsLoading, months, navigate]);

  const handleCreateMonth = async () => {
    try {
      const result = await createMonth.mutateAsync({ month: newMonth, year: newYear, initial_balance: parseFloat(newBalance) || 0 });
      setSelectedMonthId(result.id);
      setNewMonthOpen(false);
      setNewBalance('');
      toast.success('Mês criado!');
    } catch (err: any) {
      toast.error(err.message?.includes('duplicate') ? 'Este mês já existe!' : 'Erro ao criar mês');
    }
  };

  if (monthsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">FinZap</span>
          </div>
          <div className="flex items-center gap-2">
            <MonthSelector months={months} selectedMonthId={selectedMonthId} onSelect={setSelectedMonthId} />
            <Button variant="outline" size="icon" onClick={() => setNewMonthOpen(true)} title="Novo mês">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/tutorials')} title="Tutoriais">
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <Stepper currentStep={currentStep} onStepChange={setCurrentStep} />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {selectedMonth && <NudgeBanner month={selectedMonth} transactions={transactions} />}

        {selectedMonth && currentStep === 0 && (
          <SummaryView month={selectedMonth} totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} transactions={transactions} budgetPlans={budgetPlans} />
        )}

        {selectedMonth && currentStep === 1 && (
          <TransactionsView
            transactions={transactions}
            monthId={selectedMonth.id}
            isClosed={isClosed}
            categories={categories}
            onAdd={data => addTransaction.mutateAsync(data)}
            onUpdate={data => updateTransaction.mutateAsync(data)}
            onDelete={id => deleteTransaction.mutateAsync(id)}
          />
        )}

        {selectedMonth && currentStep === 2 && (
          <BudgetView
            transactions={transactions}
            budgetPlans={budgetPlans}
            monthId={selectedMonth.id}
            isClosed={isClosed}
            expenseCategories={expenseCategories.map(c => c.name)}
            onUpsertBudget={data => upsertBudget.mutateAsync(data)}
          />
        )}

        {selectedMonth && currentStep === 3 && (
          <ClosingView
            month={selectedMonth}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            balance={balance}
            incomeCount={incomes.length}
            expenseCount={expenses.length}
            onUpdateStatus={data => updateMonthStatus.mutateAsync(data)}
          />
        )}
      </main>

      {/* New month dialog */}
      <Dialog open={newMonthOpen} onOpenChange={setNewMonthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo mês financeiro</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={String(newMonth)} onValueChange={v => setNewMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((n, i) => <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={String(newYear)} onValueChange={v => setNewYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Saldo inicial (R$)</Label>
            <Input type="number" step="0.01" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="0,00" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMonthOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateMonth} disabled={createMonth.isPending}>
              {createMonth.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppPage;
