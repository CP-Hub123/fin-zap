import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/app/Logo';
import {
  ArrowRight,
  X,
  Users,
  TrendingUp,
  ThumbsUp,
  Target,
  Wallet,
  Eye,
  PieChart,
  CalendarCheck,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Zap,
  ClipboardList,
} from 'lucide-react';

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showUrgency, setShowUrgency] = useState(true);

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/app');
    }
  }, [user, isLoading, navigate]);

  const scrollToHow = () => {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===== URGENCY BAR ===== */}
      {showUrgency && (
        <div className="sticky top-0 z-50 bg-primary text-primary-foreground py-2 px-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-sm">
            <span className="flex-1 text-center font-medium">
              🔥 Acesso gratuito liberado por tempo limitado
            </span>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs font-semibold"
                onClick={() => navigate('/auth')}
              >
                Começar agora
              </Button>
              <button onClick={() => setShowUrgency(false)} className="opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40" style={{ top: showUrgency ? '36px' : '0' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          <Button onClick={() => navigate('/auth')} size="sm">
            Entrar <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
            <Users className="h-4 w-4" />
            +100 pessoas já organizam suas finanças com o FinZap
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            A clareza financeira que você sempre quis
            <br className="hidden sm:block" />
            <span className="text-primary"> — em menos de 60 segundos.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            Organize, planeje e acompanhe seu dinheiro de forma simples e visual.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={() => navigate('/auth')} className="w-full sm:w-auto px-8 text-base">
              Quero organizar minhas finanças agora <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={scrollToHow} className="w-full sm:w-auto px-8 text-base">
              Ver como funciona
            </Button>
          </div>
        </div>
      </section>

      {/* ===== METRICS ===== */}
      <section className="bg-card border-y">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Users, value: '+100', label: 'Usuários ativos' },
            { icon: TrendingUp, value: 'R$ 500 mil+', label: 'Organizados' },
            { icon: ThumbsUp, value: '98%', label: 'Satisfação' },
            { icon: Target, value: '100%', label: 'Controle mensal' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="space-y-1">
              <Icon className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl md:text-3xl font-bold">{value}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DOR ===== */}
      <section className="bg-destructive/5">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            Quanto custa <span className="text-destructive">NÃO</span> organizar suas finanças?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Pequenos gastos esquecidos podem estar drenando seu dinheiro todos os meses.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            {[
              { icon: Wallet, title: 'Assinaturas esquecidas', desc: 'Serviços que você nem usa mais continuam cobrando.' },
              { icon: Eye, title: 'Gastos invisíveis', desc: 'Comprinhas pequenas que somam centenas por mês.' },
              { icon: PieChart, title: 'Falta de controle', desc: 'O dinheiro acaba antes do fim do mês e você não sabe porquê.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-xl bg-card shadow-sm text-left space-y-2">
                <Icon className="h-6 w-6 text-destructive" />
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENEFÍCIOS ===== */}
      <section className="bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">O que o FinZap faz por você</h2>
            <p className="text-muted-foreground">Funcionalidades que se traduzem em resultado real.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: CalendarCheck, title: 'Controle mensal real', desc: 'Veja exatamente quanto entra e sai todos os meses, sem confusão.' },
              { icon: BarChart3, title: 'Planejado vs realizado', desc: 'Compare o que você previu com o que realmente aconteceu.' },
              { icon: Target, title: 'Orçamento por categoria', desc: 'Defina limites para cada área e saiba onde ajustar.' },
              { icon: ShieldCheck, title: 'Fechamento protegido', desc: 'Feche o mês e preserve seus dados como histórico permanente.' },
              { icon: Zap, title: 'Setup em 60 segundos', desc: 'Comece a organizar sem precisar aprender nada novo.' },
              { icon: ClipboardList, title: 'Visão completa do mês', desc: 'Receitas, despesas, saldo e progresso em uma única tela.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-xl bg-card border shadow-sm space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section id="como-funciona" className="bg-card border-y">
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">Como funciona</h2>
            <p className="text-muted-foreground">4 passos para assumir o controle do seu dinheiro.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { step: '1', title: 'Cadastre receitas e despesas', desc: 'Adicione o que entra e o que sai de forma rápida.' },
              { step: '2', title: 'Planeje seu mês', desc: 'Defina orçamentos por categoria e veja o que cabe no seu bolso.' },
              { step: '3', title: 'Acompanhe o realizado', desc: 'Registre os gastos reais e compare com o planejado.' },
              { step: '4', title: 'Feche o mês com clareza', desc: 'Bloqueie alterações e preserve seu histórico financeiro.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 p-5 rounded-xl bg-background border shadow-sm">
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {step}
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ANTES VS DEPOIS ===== */}
      <section className="bg-background">
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center">Antes vs Depois do FinZap</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-destructive/5 border border-destructive/20 space-y-4">
              <h3 className="font-bold text-destructive text-lg">❌ Sem FinZap</h3>
              {['Desorganização total', 'Dinheiro sumindo sem explicação', 'Sem controle de gastos', 'Decisões no escuro', 'Meses sem fechamento'].map(t => (
                <div key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>
            <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
              <h3 className="font-bold text-primary text-lg">✅ Com FinZap</h3>
              {['Clareza total do seu dinheiro', 'Planejamento mensal completo', 'Controle de cada centavo', 'Decisões conscientes', 'Histórico protegido'].map(t => (
                <div key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bg-card border-y">
        <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center">Perguntas frequentes</h2>
          <div className="space-y-3">
            {[
              { q: 'O FinZap é gratuito?', a: 'Sim! O acesso está liberado gratuitamente por tempo limitado. Aproveite.' },
              { q: 'É seguro usar?', a: 'Seus dados são protegidos com criptografia e armazenados em servidores seguros.' },
              { q: 'Preciso entender de finanças?', a: 'Não. O sistema é guiado e intuitivo — qualquer pessoa consegue usar.' },
              { q: 'Funciona no celular?', a: 'Sim! O FinZap é 100% responsivo e funciona em qualquer dispositivo.' },
              { q: 'Meus dados ficam protegidos?', a: 'Sim. Cada usuário só acessa seus próprios dados, com isolamento total.' },
              { q: 'Posso usar para minha família?', a: 'Por enquanto é individual, mas estamos trabalhando em contas compartilhadas.' },
              { q: 'Como faço para começar?', a: 'Basta criar uma conta gratuita e seguir o onboarding — leva menos de 60 segundos.' },
            ].map(({ q, a }) => (
              <FaqItem key={q} question={q} answer={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-6 relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold">
            Você pode continuar no escuro…
            <br />
            <span className="text-primary">ou assumir o controle hoje.</span>
          </h2>
          <Button size="lg" onClick={() => navigate('/auth')} className="px-10 text-base">
            Começar agora gratuitamente <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground">Sem risco. Sem complicação.</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t bg-card py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo size="small" />
          <p>© {new Date().getFullYear()} FinZap. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

/* ===== FAQ Accordion Item ===== */
const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left p-4 rounded-xl bg-background border shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium text-sm">{question}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && <p className="mt-3 text-sm text-muted-foreground">{answer}</p>}
    </button>
  );
};

export default Index;
