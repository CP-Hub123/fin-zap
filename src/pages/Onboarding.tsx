import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonths } from '@/hooks/useMonths';
import { useTransactions } from '@/hooks/useTransactions';
import { useCofrinhos } from '@/hooks/useCofrinhos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTH_NAMES, formatCurrency } from '@/lib/constants';
import {
  ArrowRight, ArrowLeft, CheckCircle2, Sparkles, CreditCard, Repeat,
  Target, PiggyBank, Lightbulb, Lock, BarChart3, TrendingUp, Calendar,
  Wand2, Shield, ChevronRight, X,
} from 'lucide-react';
import { Logo } from '@/components/app/Logo';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Onboarding guiado e premium do FinZap.
 * Estrutura: narrativa (descoberta do ecossistema) + setup mínimo guiado.
 */

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ElementType;
  visual: React.ReactNode;
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const VisualProjection = () => (
  <div className="rounded-2xl border bg-card/60 p-4 space-y-3">
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>Hoje</span><span>Fechamento previsto</span>
    </div>
    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-[55%] bg-gradient-zap rounded-full" />
    </div>
    <div className="grid grid-cols-3 gap-2 pt-1">
      <div className="rounded-lg bg-muted/40 p-2">
        <p className="text-[10px] text-muted-foreground">Realizado</p>
        <p className="text-sm font-semibold">{fmt(1850)}</p>
      </div>
      <div className="rounded-lg bg-muted/40 p-2">
        <p className="text-[10px] text-muted-foreground">Previsto</p>
        <p className="text-sm font-semibold">{fmt(1320)}</p>
      </div>
      <div className="rounded-lg bg-primary/10 p-2 ring-1 ring-primary/20">
        <p className="text-[10px] text-primary">Sobra</p>
        <p className="text-sm font-semibold text-primary">{fmt(830)}</p>
      </div>
    </div>
  </div>
);

const VisualCard = () => (
  <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary/60 p-4 text-primary-foreground shadow-lg space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs opacity-80">Cartão Principal</span>
      <CreditCard className="h-4 w-4" />
    </div>
    <div>
      <p className="text-[10px] opacity-80">Comprometido em Dez</p>
      <p className="text-2xl font-bold tracking-tight">{fmt(1240)}</p>
    </div>
    <div className="space-y-1">
      <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
        <div className="h-full w-[62%] bg-white/90 rounded-full" />
      </div>
      <p className="text-[10px] opacity-80">62% do limite</p>
    </div>
  </div>
);

const VisualInstallments = () => (
  <div className="rounded-2xl border bg-card/60 p-4 space-y-2">
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Notebook · 6x</span>
      <span className="font-semibold">{fmt(450)}/mês</span>
    </div>
    <div className="grid grid-cols-6 gap-1">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className={cn(
          'h-8 rounded-md flex items-center justify-center text-[10px] font-medium',
          i <= 2 ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary',
        )}>{i}/6</div>
      ))}
    </div>
    <p className="text-[11px] text-muted-foreground pt-1">
      Cada parcela aparece automaticamente no mês certo.
    </p>
  </div>
);

const VisualRecurring = () => (
  <div className="rounded-2xl border bg-card/60 p-4 space-y-2">
    {[
      { name: 'Aluguel', value: 1800, day: 5 },
      { name: 'Streaming', value: 39, day: 12 },
      { name: 'Academia', value: 89, day: 15 },
    ].map(r => (
      <div key={r.name} className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Repeat className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="font-medium leading-tight">{r.name}</p>
            <p className="text-[10px] text-muted-foreground">Dia {r.day}</p>
          </div>
        </div>
        <span className="text-sm font-semibold">{fmt(r.value)}</span>
      </div>
    ))}
  </div>
);

const VisualInsights = () => (
  <div className="space-y-2">
    <div className="rounded-xl border bg-emerald-500/5 ring-1 ring-emerald-500/20 p-3">
      <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Margem confortável</p>
      <p className="text-xs text-foreground/80">Você deve fechar o mês positivo.</p>
    </div>
    <div className="rounded-xl border bg-amber-500/5 ring-1 ring-amber-500/20 p-3">
      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Alimentação acima do padrão</p>
      <p className="text-xs text-foreground/80">Ritmo 28% maior que sua média.</p>
    </div>
  </div>
);

const VisualCofrinhos = () => (
  <div className="grid grid-cols-2 gap-2">
    {[
      { name: 'Geral', value: 2400 },
      { name: 'Alimentação', value: 680 },
      { name: 'Lazer', value: 320 },
      { name: 'Reserva', value: 1500 },
    ].map(c => (
      <div key={c.name} className="rounded-xl border bg-card/60 p-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-medium">{c.name}</p>
        </div>
        <p className="text-sm font-bold mt-1">{fmt(c.value)}</p>
      </div>
    ))}
  </div>
);

const VisualEcosystem = () => (
  <div className="grid grid-cols-3 gap-2">
    {[
      { icon: BarChart3, label: 'Resumo' },
      { icon: Calendar, label: 'Transações' },
      { icon: CreditCard, label: 'Cartões' },
      { icon: Target, label: 'Plano' },
      { icon: Lightbulb, label: 'Insights' },
      { icon: Lock, label: 'Fechar' },
    ].map(({ icon: Icon, label }) => (
      <div key={label} className="rounded-xl border bg-card/60 p-3 flex flex-col items-center gap-1">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
    ))}
  </div>
);

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    eyebrow: 'Bem-vindo',
    title: 'Seu copiloto financeiro inteligente.',
    body: 'O FinZap antecipa o futuro do seu mês, organiza cartões, parcelas e recorrências, e te mostra o caminho com clareza — sem julgar.',
    icon: Sparkles,
    visual: (
      <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 text-center space-y-2">
        <Logo />
        <p className="text-xs text-muted-foreground pt-2">Inteligência financeira, sem planilha.</p>
      </div>
    ),
  },
  {
    id: 'projection',
    eyebrow: 'Previsibilidade',
    title: 'Veja como seu mês provavelmente vai terminar.',
    body: 'O FinZap combina o que já aconteceu com o que ainda está previsto e mostra sua sobra estimada em tempo real.',
    icon: TrendingUp,
    visual: <VisualProjection />,
  },
  {
    id: 'cards',
    eyebrow: 'Central de Crédito',
    title: 'Cartões com comprometimento futuro real.',
    body: 'Cada cartão mostra fatura, limite usado e quanto do seu futuro já está comprometido — antes da fatura chegar.',
    icon: CreditCard,
    visual: <VisualCard />,
  },
  {
    id: 'installments',
    eyebrow: 'Parcelamentos',
    title: 'Parcelas entram automaticamente no mês certo.',
    body: 'Cadastrou uma compra em 6x? O FinZap distribui cada parcela no mês exato e atualiza sua previsão.',
    icon: Wand2,
    visual: <VisualInstallments />,
  },
  {
    id: 'recurring',
    eyebrow: 'Recorrências',
    title: 'Automatize o que se repete todo mês.',
    body: 'Aluguel, assinaturas, salário — o sistema replica essas entradas e saídas automaticamente para você.',
    icon: Repeat,
    visual: <VisualRecurring />,
  },
  {
    id: 'insights',
    eyebrow: 'Insights',
    title: 'Sinais inteligentes, sem alarme.',
    body: 'O FinZap observa seus padrões e te avisa com calma quando algo merece atenção — ou quando o mês está leve.',
    icon: Lightbulb,
    visual: <VisualInsights />,
  },
  {
    id: 'cofrinhos',
    eyebrow: 'Cofrinhos',
    title: 'Organize por contexto, não por planilha.',
    body: 'Separe gastos e reservas em cofrinhos. Cada transação vira parte de uma história clara.',
    icon: PiggyBank,
    visual: <VisualCofrinhos />,
  },
  {
    id: 'ecosystem',
    eyebrow: 'Ecossistema',
    title: 'Tudo conectado, do resumo ao fechamento.',
    body: 'Resumo, Transações, Cartões, Plano e Fechamento conversam entre si. Você sempre sabe onde está.',
    icon: Shield,
    visual: <VisualEcosystem />,
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'tour' | 'setup'>('tour');
  const [slideIdx, setSlideIdx] = useState(0);

  // Setup state
  const [setupStep, setSetupStep] = useState<0 | 1>(0);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [initialBalance, setInitialBalance] = useState('');
  const [createdMonthId, setCreatedMonthId] = useState<string | null>(null);
  const [createdCofrinhoId, setCreatedCofrinhoId] = useState<string | null>(null);
  const [txName, setTxName] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [cofrinhoNome, setCofrinhoNome] = useState('Geral');

  const { createMonth, months } = useMonths();
  const { addTransaction } = useTransactions(createdMonthId ?? undefined);
  const { createCofrinho } = useCofrinhos();

  const totalSlides = SLIDES.length;
  const slide = SLIDES[slideIdx];

  const goNext = () => {
    if (slideIdx < totalSlides - 1) setSlideIdx(slideIdx + 1);
    else setPhase('setup');
  };
  const goPrev = () => {
    if (slideIdx > 0) setSlideIdx(slideIdx - 1);
  };

  const handleCreateMonth = async () => {
    try {
      const result = await createMonth.mutateAsync({
        month, year,
        initial_balance: parseFloat(initialBalance) || 0,
      });
      setCreatedMonthId(result.id);
      setSetupStep(1);
    } catch (err: any) {
      toast.error(err.message?.includes('duplicate') ? 'Este mês já existe.' : 'Não foi possível criar o mês.');
    }
  };

  const handleFirstTransaction = async () => {
    if (!createdMonthId || !txName || !txAmount || !cofrinhoNome.trim()) {
      toast.error('Preencha todos os campos.');
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
      toast.success('Tudo pronto. Boas-vindas ao FinZap.');
      navigate('/app');
    } catch {
      toast.error('Não foi possível salvar.');
    }
  };

  const skipSetupTransaction = () => {
    toast.success('Você pode adicionar transações quando quiser.');
    navigate('/app');
  };

  const skipAll = async () => {
    // Garante estado financeiro mínimo: cria o mês atual se ainda não existir.
    try {
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      const exists = months.some(mo => mo.month === m && mo.year === y);
      if (!exists && months.length === 0) {
        await createMonth.mutateAsync({ month: m, year: y, initial_balance: 0 });
      }
    } catch {
      // silencioso — se falhar, /app trata o estado vazio
    }
    navigate('/app');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-background via-background to-primary/5">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2 sm:px-6">
        <div className="text-xs text-muted-foreground font-medium">
          {phase === 'tour' ? `${slideIdx + 1} / ${totalSlides}` : 'Configuração inicial'}
        </div>
        <button
          onClick={skipAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Pular <X className="h-3 w-3" />
        </button>
      </header>

      {/* Progress segments */}
      <div className="px-4 sm:px-6 pb-2">
        <div className="flex gap-1">
          {phase === 'tour'
            ? SLIDES.map((_, i) => (
                <div key={i} className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-500',
                  i < slideIdx ? 'bg-primary' :
                  i === slideIdx ? 'bg-primary/60' : 'bg-muted',
                )} />
              ))
            : [0, 1].map(i => (
                <div key={i} className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-500',
                  i <= setupStep ? 'bg-primary' : 'bg-muted',
                )} />
              ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4">
        <div className="w-full max-w-md">
          {phase === 'tour' ? (
            <TourSlide slide={slide} />
          ) : setupStep === 0 ? (
            <SetupMonth
              month={month} year={year} initialBalance={initialBalance}
              setMonth={setMonth} setYear={setYear} setInitialBalance={setInitialBalance}
              loading={createMonth.isPending}
              onSubmit={handleCreateMonth}
            />
          ) : (
            <SetupFirstTx
              txName={txName} txAmount={txAmount} txType={txType} cofrinhoNome={cofrinhoNome}
              setTxName={setTxName} setTxAmount={setTxAmount} setTxType={setTxType} setCofrinhoNome={setCofrinhoNome}
              loading={addTransaction.isPending || createCofrinho.isPending}
              onSubmit={handleFirstTransaction}
              onSkip={skipSetupTransaction}
            />
          )}
        </div>
      </main>

      {/* Footer nav (tour only) */}
      {phase === 'tour' && (
        <footer className="px-4 sm:px-6 pb-6 pt-2">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={slideIdx === 0}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div className="flex-1" />
            <Button onClick={goNext} className="px-5">
              {slideIdx === totalSlides - 1 ? 'Configurar agora' : 'Próximo'}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
};

const TourSlide = ({ slide }: { slide: Slide }) => {
  const Icon = slide.icon;
  return (
    <div key={slide.id} className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          {slide.eyebrow}
        </span>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-[28px] font-bold leading-tight tracking-tight text-foreground">
          {slide.title}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {slide.body}
        </p>
      </div>
      <div className="pt-2">{slide.visual}</div>
    </div>
  );
};

const SetupMonth = ({
  month, year, initialBalance, setMonth, setYear, setInitialBalance, loading, onSubmit,
}: any) => (
  <div className="space-y-5 animate-fade-in">
    <div className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Setup · 1 de 2</span>
      <h1 className="text-2xl font-bold tracking-tight">Vamos começar pelo seu primeiro mês.</h1>
      <p className="text-sm text-muted-foreground">
        Escolha o mês atual e informe quanto você tem em conta hoje. Isso ancora suas previsões.
      </p>
    </div>
    <Card className="border-0 shadow-sm bg-card/60 backdrop-blur">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Mês</Label>
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ano</Label>
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
        <div className="space-y-1.5">
          <Label className="text-xs">Saldo inicial em conta</Label>
          <Input
            type="number" inputMode="decimal" step="0.01" placeholder="R$ 0,00"
            value={initialBalance} onChange={e => setInitialBalance(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">Pode deixar zero se preferir começar do zero.</p>
        </div>
      </CardContent>
    </Card>
    <Button className="w-full" size="lg" onClick={onSubmit} disabled={loading}>
      {loading ? 'Criando...' : 'Continuar'} <ChevronRight className="h-4 w-4 ml-1" />
    </Button>
  </div>
);

const SetupFirstTx = ({
  txName, txAmount, txType, cofrinhoNome,
  setTxName, setTxAmount, setTxType, setCofrinhoNome,
  loading, onSubmit, onSkip,
}: any) => (
  <div className="space-y-5 animate-fade-in">
    <div className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Setup · 2 de 2</span>
      <h1 className="text-2xl font-bold tracking-tight">Sua primeira transação.</h1>
      <p className="text-sm text-muted-foreground">
        Adicione uma receita ou despesa real. O FinZap já começa a desenhar sua previsão.
      </p>
    </div>
    <Card className="border-0 shadow-sm bg-card/60 backdrop-blur">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button" variant={txType === 'income' ? 'default' : 'outline'}
            onClick={() => setTxType('income')} className="h-10"
          >Receita</Button>
          <Button
            type="button" variant={txType === 'expense' ? 'default' : 'outline'}
            onClick={() => setTxType('expense')} className="h-10"
          >Despesa</Button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nome</Label>
          <Input placeholder={txType === 'income' ? 'Ex: Salário' : 'Ex: Mercado'} value={txName} onChange={e => setTxName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Valor</Label>
          <Input type="number" inputMode="decimal" step="0.01" placeholder="R$ 0,00" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cofrinho</Label>
          <Input placeholder="Ex: Geral, Alimentação..." value={cofrinhoNome} onChange={e => setCofrinhoNome(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">Cofrinhos organizam transações por contexto. Você pode criar mais depois.</p>
        </div>
      </CardContent>
    </Card>
    <div className="space-y-2">
      <Button className="w-full" size="lg" onClick={onSubmit} disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar e entrar no FinZap'}
        <CheckCircle2 className="h-4 w-4 ml-1" />
      </Button>
      <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
        Adicionar depois
      </Button>
    </div>
  </div>
);

export default Onboarding;