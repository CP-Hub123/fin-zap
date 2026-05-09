import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMonths } from '@/hooks/useMonths';
import { useTransactions } from '@/hooks/useTransactions';
import { useCofrinhos } from '@/hooks/useCofrinhos';
import { useSubscription } from '@/hooks/useSubscription';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
import { useAutoExecutarRecorrencias } from '@/hooks/useRecurringTransactions';
import { Stepper } from '@/components/layout/Stepper';
import { MonthSelector } from '@/components/app/MonthSelector';
import { SummaryView } from '@/components/app/SummaryView';
import { TransactionsView } from '@/components/app/TransactionsView';
import { CofrinhosView } from '@/components/app/CofrinhosView';
import { ClosingView } from '@/components/app/ClosingView';
import { NudgeBanner } from '@/components/app/NudgeBanner';
import { PaywallModal } from '@/components/app/PaywallModal';
import { DecisionModeSheet } from '@/components/app/DecisionModeSheet';
import { Button } from '@/components/ui/button';
import { LogOut, BookOpen, Plus, Menu, X, Sparkles } from 'lucide-react';
import { Logo } from '@/components/app/Logo';
import { NotificationBell } from '@/components/app/NotificationBell';
import { ThemeToggle } from '@/components/app/ThemeToggle';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);

  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { months, isLoading: monthsLoading, createMonth, updateMonthStatus } = useMonths();
  const selectedMonth = months.find(m => m.id === selectedMonthId);
  const { transactions, totalIncome, totalExpense, balance, incomes, expenses, addTransaction, updateTransaction, deleteTransaction } = useTransactions(selectedMonthId);
  const { cofrinhos, createCofrinho, updateCofrinho, deleteCofrinho, fecharMes, transferir } = useCofrinhos();
  const { subscription, canAct, isTrial, daysLeft, isExpired } = useSubscription();
  const { permission, subscribe: subscribePush } = usePushNotifications();

  // Executa recorrências mensais automaticamente ao carregar o app
  useAutoExecutarRecorrencias();

  // Automatic notification triggers
  useNotificationTriggers({
    transactions,
    budgetPlans: [],
    subscription: subscription ?? null,
    monthId: selectedMonthId,
  });

  // Run automatic monthly closure on app load
  useEffect(() => {
    if (user) fecharMes.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Prompt for push permission after first load
  useEffect(() => {
    if (permission === 'default') {
      const timer = setTimeout(() => subscribePush(), 3000);
      return () => clearTimeout(timer);
    }
  }, [permission, subscribePush]);

  const isClosed = selectedMonth?.status === 'closed';
  const isBlocked = isClosed || !canAct;

  const guardedAction = <T,>(fn: (data: T) => Promise<any>) => (data: T) => {
    if (!canAct) { setPaywallOpen(true); return Promise.resolve(); }
    return fn(data);
  };

  useEffect(() => {
    if (months.length > 0 && !selectedMonthId) setSelectedMonthId(months[0].id);
  }, [months, selectedMonthId]);

  useEffect(() => {
    if (!monthsLoading && months.length === 0) navigate('/onboarding');
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
    <div className="min-h-screen bg-background pb-4">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <Logo />

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2">
            <MonthSelector months={months} selectedMonthId={selectedMonthId} onSelect={setSelectedMonthId} />
            <Button variant="outline" size="icon" onClick={() => setNewMonthOpen(true)} title="Novo mês">
              <Plus className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate('/tutorials')} title="Tutoriais">
              <BookOpen className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>Admin</Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile: month selector + hamburger */}
          <div className="flex sm:hidden items-center gap-1.5">
            <MonthSelector months={months} selectedMonthId={selectedMonthId} onSelect={setSelectedMonthId} />
            <NotificationBell />
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t bg-card px-3 py-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
            <Button variant="ghost" className="w-full justify-start min-h-[44px]" onClick={() => { setNewMonthOpen(true); setMobileMenuOpen(false); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo mês
            </Button>
            <Button variant="ghost" className="w-full justify-start min-h-[44px]" onClick={() => { navigate('/tutorials'); setMobileMenuOpen(false); }}>
              <BookOpen className="h-4 w-4 mr-2" /> Tutoriais
            </Button>
            {isAdmin && (
              <Button variant="ghost" className="w-full justify-start min-h-[44px]" onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}>
                <Menu className="h-4 w-4 mr-2" /> Painel Admin
              </Button>
            )}
            <Button variant="ghost" className="w-full justify-start min-h-[44px] text-destructive" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        )}
      </header>

      {/* Stepper */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <Stepper currentStep={currentStep} onStepChange={setCurrentStep} />
        </div>
      </div>

        {/* Trial/Expired banner */}
        {(isTrial || isExpired) && (
          <div className={`max-w-5xl mx-auto px-3 sm:px-4 pt-3`}>
            <div className={`flex items-center justify-between gap-3 p-3 rounded-lg text-sm ${isExpired ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              <span>
                {isExpired
                  ? '⏰ Seu acesso expirou. Ative o premium para continuar.'
                  : `🎁 Teste gratuito — ${daysLeft} dia(s) restante(s)`}
              </span>
              <Button size="sm" variant={isExpired ? 'destructive' : 'default'} className="shrink-0" onClick={() => navigate('/upgrade')}>
                {isExpired ? 'Ativar acesso' : 'Ver planos'}
              </Button>
            </div>
          </div>
        )}

      {/* Content */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {selectedMonth && <NudgeBanner month={selectedMonth} transactions={transactions} />}

        {selectedMonth && currentStep === 0 && (
          <SummaryView month={selectedMonth} totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} transactions={transactions} budgetPlans={[]} />
        )}

        {selectedMonth && currentStep === 1 && (
          <TransactionsView
            transactions={transactions}
            monthId={selectedMonth.id}
            isClosed={isBlocked}
            cofrinhos={cofrinhos}
            onAdd={guardedAction(data => addTransaction.mutateAsync(data))}
            onUpdate={guardedAction(data => updateTransaction.mutateAsync(data))}
            onDelete={guardedAction(id => deleteTransaction.mutateAsync(id))}
          />
        )}


        {selectedMonth && currentStep === 2 && (
          <CofrinhosView
            cofrinhos={cofrinhos}
            isClosed={isBlocked}
            onCreate={guardedAction(data => createCofrinho.mutateAsync(data))}
            onUpdate={guardedAction(data => updateCofrinho.mutateAsync(data))}
            onDelete={guardedAction(id => deleteCofrinho.mutateAsync(id))}
            onTransfer={guardedAction(data => transferir.mutateAsync(data))}
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
        <DialogContent className="max-w-lg mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Novo mês financeiro</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={String(newMonth)} onValueChange={v => setNewMonth(Number(v))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((n, i) => <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={String(newYear)} onValueChange={v => setNewYear(Number(v))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Saldo inicial (R$)</Label>
            <Input type="number" step="0.01" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="0,00" className="min-h-[44px]" />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setNewMonthOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancelar</Button>
            <Button onClick={handleCreateMonth} disabled={createMonth.isPending} className="w-full sm:w-auto min-h-[44px]">
              {createMonth.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />

      {/* Floating Decision Mode trigger */}
      <button
        type="button"
        onClick={() => setDecisionOpen(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-zap px-4 py-3 text-sm font-semibold text-primary-foreground shadow-zap transition-all hover:scale-[1.03] active:scale-95 sm:bottom-6 sm:right-6"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        aria-label="Abrir Modo Decisão"
      >
        <Sparkles className="h-4 w-4" strokeWidth={2.5} />
        <span className="hidden sm:inline">Modo Decisão</span>
        <span className="sm:hidden">Decidir</span>
      </button>

      <DecisionModeSheet open={decisionOpen} onOpenChange={setDecisionOpen} monthId={selectedMonthId} />
    </div>
  );
};

export default AppPage;
