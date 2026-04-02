import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Logo } from '@/components/app/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, Zap, Shield, TrendingUp, BarChart3, Clock, Star } from 'lucide-react';

const benefits = [
  { icon: TrendingUp, title: 'Controle ilimitado', desc: 'Crie quantos meses quiser, sem restrições.' },
  { icon: BarChart3, title: 'Planejamento completo', desc: 'Compare orçado vs realizado com dashboards visuais.' },
  { icon: Clock, title: 'Acesso contínuo', desc: 'Sem interrupções. Seus dados sempre disponíveis.' },
  { icon: Shield, title: 'Dados protegidos', desc: 'Segurança de nível bancário para suas informações.' },
  { icon: Star, title: 'Relatórios avançados', desc: 'Gráficos e análises detalhadas da sua evolução.' },
  { icon: Zap, title: 'Atualizações prioritárias', desc: 'Acesso antecipado a novas funcionalidades.' },
];

const Upgrade = () => {
  const navigate = useNavigate();
  const { subscription, isTrial, isExpired } = useSubscription();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Logo size="small" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {isExpired ? '⏰ Acesso expirado' : isTrial ? '🎁 Período de teste' : '✨ Premium'}
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Tenha controle total das suas finanças
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Desbloqueie todas as funcionalidades e organize seu dinheiro sem limites.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefits.map(b => (
            <Card key={b.title} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{b.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-2 border-primary shadow-lg">
          <CardContent className="p-6 text-center space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Acesso Premium</p>
              <p className="text-4xl font-bold mt-1">Em breve</p>
              <p className="text-sm text-muted-foreground mt-1">Pagamento será implementado em breve</p>
            </div>
            <div className="space-y-2 text-left max-w-xs mx-auto">
              {['Meses ilimitados', 'Dashboards completos', 'Planejamento avançado', 'Suporte prioritário'].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <Button size="lg" className="w-full min-h-[48px]" disabled>
              Disponível em breve
            </Button>
            <p className="text-xs text-muted-foreground">
              Entre em contato para ativar seu acesso manualmente.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/app')}>
            ← Voltar ao app
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Upgrade;
