import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/app/Logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { PLANS, limitLabel } from '@/lib/plans';
import { usePlan } from '@/hooks/usePlan';
import { cn } from '@/lib/utils';

const ORDER: Array<keyof typeof PLANS> = ['free', 'pro', 'ultra'];

const Upgrade = () => {
  const navigate = useNavigate();
  const { tier, isTrial, daysLeft } = usePlan();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/85 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Logo size="small" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-10 space-y-8">
        <section className="text-center space-y-3 relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider px-3 py-1">
              <Sparkles className="h-3 w-3" /> Planos FinZap
            </span>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight">
              Evolua quando o seu dinheiro pedir.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              Comece grátis. Evolua para o Pro quando quiser previsibilidade real. Vá ao Ultra quando o FinZap virar seu copiloto financeiro.
            </p>
            {isTrial && daysLeft !== null && (
              <p className="mt-3 text-xs text-muted-foreground">
                Seu trial Pro termina em <strong>{daysLeft} dia{daysLeft === 1 ? '' : 's'}</strong>.
              </p>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {ORDER.map(id => {
            const p = PLANS[id];
            const isCurrent = tier === id;
            const highlight = p.highlight;
            return (
              <div
                key={id}
                className={cn(
                  'relative rounded-3xl border p-5 sm:p-6 flex flex-col bg-card/80 backdrop-blur',
                  highlight ? 'border-primary/60 shadow-lg shadow-primary/10 ring-1 ring-primary/20' : 'border-border/60',
                )}
              >
                {highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shadow">
                    Recomendado
                  </span>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{p.name}</p>
                  <p className="mt-1 text-sm text-foreground/80">{p.tagline}</p>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-semibold tracking-tight">{p.priceLabel}</p>
                  {p.priceHint && <p className="text-[11px] text-muted-foreground mt-0.5">{p.priceHint}</p>}
                </div>
                <ul className="mt-5 space-y-2 flex-1">
                  {p.promise.map(line => (
                    <li key={line} className="flex items-start gap-2 text-[13px] leading-snug">
                      <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                      </span>
                      <span className="text-foreground/90">{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 grid grid-cols-3 gap-1.5 text-center">
                  <Mini label="Cartões" value={limitLabel(p.limits.cards)} />
                  <Mini label="Cofrinhos" value={limitLabel(p.limits.cofrinhos)} />
                  <Mini label="Recorrências" value={limitLabel(p.limits.recorrencias)} />
                </div>
                <Button
                  size="lg"
                  variant={highlight ? 'default' : 'outline'}
                  className="mt-5 h-11 rounded-full"
                  disabled={isCurrent || id === 'free'}
                >
                  {isCurrent ? 'Plano atual' : id === 'free' ? 'Começar grátis' : 'Em breve'}
                </Button>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-[13px] text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium">Sem surpresas, sem amarras.</p>
            <p className="mt-0.5">Cancele quando quiser. Seus dados continuam com você no plano gratuito — você nunca perde acesso ao que já registrou.</p>
          </div>
        </section>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/app')}>← Voltar ao app</Button>
        </div>
      </main>
    </div>
  );
};

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-muted/40 px-2 py-1.5">
    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-[12px] font-semibold tabular-nums">{value}</p>
  </div>
);

export default Upgrade;
