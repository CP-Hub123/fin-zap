import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMonths } from '@/hooks/useMonths';
import { useTransactions } from '@/hooks/useTransactions';
import { useCofrinhos } from '@/hooks/useCofrinhos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTH_NAMES, formatCurrency } from '@/lib/constants';
import { ArrowRight, TrendingUp, TrendingDown, Wallet, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/app/Logo';
import { toast } from 'sonner';

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [initialBalance, setInitialBalance] = useState('');
  const [createdMonthId, setCreatedMonthId] = useState<string | null>(null);
  const [createdCofrinhoId, setCreatedCofrinhoId] = useState<string | null>(null);
  const [txName, setTxName] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [cofrinhoNome, setCofrinhoNome] = useState('Geral');

  const { user } = useAuth();
  const { createMonth } = useMonths();
  const { addTransaction } = useTransactions(createdMonthId ?? undefined);
  const { createCofrinho } = useCofrinhos();
  const navigate = useNavigate();

  const handleCreateMonth = async () => {
    try {
      const result = await createMonth.mutateAsync({
        month, year,
        initial_balance: parseFloat(initialBalance) || 0,
      });
      setCreatedMonthId(result.id);
      setStep(2);
    } catch (err: any) {
      toast.error(err.message?.includes('duplicate') ? 'Este mês já existe!' : 'Erro ao criar mês');
    }
  };

  const handleFirstTransaction = async () => {
    if (!createdMonthId || !txName || !txAmount || !cofrinhoNome.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      let cofrinhoId = createdCofrinhoId;
      if (!cofrinhoId) {
        const c = await createCofrinho.mutateAsync({ nome: cofrinhoNome.trim() });
        cofrinhoId = c.id;
        setCreatedCofrinhoId(c.id);
      }
      await addTransaction.mutateAsync({
        month_id: createdMonthId,
        cofrinho_id: cofrinhoId!,
        type: txType,
        name: txName,
        amount: parseFloat(txAmount),
        date: new Date().toISOString().split('T')[0],
        status: 'realized',
        is_fixed: false,
        recurrence: 'none',
      } as any);
      toast.success('Transação criada! Vamos começar!');
      navigate('/app');
    } catch {
      toast.error('Erro ao criar transação');
    }
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="flex justify-center">
        <Logo />
      </div>
      <h1 className="text-3xl font-bold text-foreground">Bem-vindo ao FinZap!</h1>
      <p className="text-lg text-muted-foreground max-w-md">
        Organize sua vida financeira em <strong>4 passos simples</strong>. 
        Sem complicação, sem planilhas confusas.
      </p>
      <Button size="lg" onClick={() => setStep(1)} className="mt-4 px-8">
        Começar <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>,

    // Step 1: Create month
    <div key="month" className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Crie seu primeiro mês</h2>
        <p className="text-muted-foreground">Selecione o mês e informe seu saldo inicial</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mês</Label>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ano</Label>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Saldo inicial (R$)</Label>
        <Input type="number" step="0.01" placeholder="0,00" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} />
      </div>
      <Button className="w-full" onClick={handleCreateMonth} disabled={createMonth.isPending}>
        {createMonth.isPending ? 'Criando...' : 'Criar mês'} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>,

    // Step 2: Preview
    <div key="preview" className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">É assim que funciona</h2>
        <p className="text-muted-foreground">Veja como seu painel vai ficar com dados reais</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm" style={{ backgroundColor: 'hsl(142 71% 45% / 0.1)' }}>
          <CardContent className="p-4 text-center">
            <TrendingUp className="mx-auto h-6 w-6 mb-2" style={{ color: 'hsl(142 71% 45%)' }} />
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-lg font-bold" style={{ color: 'hsl(142 71% 45%)' }}>R$ 5.000</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm" style={{ backgroundColor: 'hsl(0 84% 60% / 0.1)' }}>
          <CardContent className="p-4 text-center">
            <TrendingDown className="mx-auto h-6 w-6 mb-2" style={{ color: 'hsl(0 84% 60%)' }} />
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="text-lg font-bold" style={{ color: 'hsl(0 84% 60%)' }}>R$ 3.200</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-primary/10">
          <CardContent className="p-4 text-center">
            <Wallet className="mx-auto h-6 w-6 mb-2 text-primary" />
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className="text-lg font-bold text-primary">R$ 1.800</p>
          </CardContent>
        </Card>
      </div>
      <div className="rounded-lg border p-4 bg-card">
        <p className="text-sm text-muted-foreground mb-2">📊 Etapas do sistema:</p>
        <ul className="text-sm space-y-1">
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> <strong>Resumo</strong> — Veja receitas, despesas e saldo</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> <strong>Base de Dados</strong> — Cadastre transações</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> <strong>Planejamento</strong> — Compare orçado vs real</li>
          <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> <strong>Fechamento</strong> — Feche o mês com segurança</li>
        </ul>
      </div>
      <Button className="w-full" onClick={() => setStep(3)}>
        Entendi! Vamos lá <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>,

    // Step 3: First transaction
    <div key="first-tx" className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Sua primeira transação</h2>
        <p className="text-muted-foreground">Cadastre pelo menos uma receita ou despesa para começar</p>
      </div>
      <div className="flex gap-2">
        <Button variant={txType === 'income' ? 'default' : 'outline'} className="flex-1" onClick={() => setTxType('income')}>
          Receita
        </Button>
        <Button variant={txType === 'expense' ? 'default' : 'outline'} className="flex-1" onClick={() => setTxType('expense')}>
          Despesa
        </Button>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input placeholder="Ex: Salário" value={txName} onChange={e => setTxName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input type="number" step="0.01" placeholder="0,00" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Cofrinho</Label>
          <Input placeholder="Ex: Geral, Alimentação..." value={cofrinhoNome} onChange={e => setCofrinhoNome(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">Toda transação fica vinculada a um cofrinho. Você pode criar mais depois.</p>
        </div>
      </div>
      <Button className="w-full" onClick={handleFirstTransaction} disabled={addTransaction.isPending}>
        {addTransaction.isPending ? 'Salvando...' : 'Salvar e começar'} <CheckCircle className="ml-2 h-4 w-4" />
      </Button>
    </div>,
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-2 w-12 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 md:p-8">
            {steps[step]}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
