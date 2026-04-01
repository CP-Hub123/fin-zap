import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Shield, Zap } from 'lucide-react';
import { Logo } from '@/components/app/Logo';

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/app');
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">FinZap</span>
          </div>
          <Button onClick={() => navigate('/auth')}>
            Entrar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-20 text-center space-y-8">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Organize suas finanças
          <br />
          <span className="text-primary">em 4 passos simples</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          FinZap é o sistema financeiro pessoal que você configura em menos de 60 segundos. 
          Sem planilhas, sem complicação.
        </p>
        <Button size="lg" onClick={() => navigate('/auth')} className="px-8">
          Começar agora — é grátis <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          {[
            { icon: Zap, title: 'Rápido', desc: 'Configure seu mês financeiro em segundos' },
            { icon: BarChart3, title: 'Visual', desc: 'Acompanhe receitas, despesas e saldo em tempo real' },
            { icon: Shield, title: 'Seguro', desc: 'Feche meses e mantenha histórico protegido' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl bg-card shadow-sm text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
