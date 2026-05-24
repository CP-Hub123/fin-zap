import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/app/Logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Sparkles, ShieldCheck, MessageCircle, Infinity as InfinityIcon } from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { usePlan } from '@/hooks/usePlan';
import { openFoundersWhatsApp } from '@/lib/whatsapp';

const Upgrade = () => {
  const navigate = useNavigate();
  const { isFounders, isTrial, daysLeft } = usePlan();
  const founders = PLANS.pro;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/85 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Logo size="small" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        <section className="text-center space-y-3 relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider px-3 py-1">
              <Sparkles className="h-3 w-3" /> Edição limitada
            </span>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight">
              Faça parte dos primeiros usuários.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              O FinZap Founders é o nosso reconhecimento aos primeiros — acesso vitalício, sem mensalidade, com tudo o que vier no caminho.
            </p>
            {isTrial && daysLeft !== null && (
              <p className="mt-3 text-xs text-muted-foreground">
                Seu acesso completo termina em <strong>{daysLeft} dia{daysLeft === 1 ? '' : 's'}</strong>.
              </p>
            )}
          </div>
        </section>

        {/* Premium Founders card */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute -inset-x-4 -top-8 h-48 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />
          <div className="relative rounded-3xl border border-primary/30 bg-card/90 backdrop-blur-xl shadow-2xl shadow-primary/10 ring-1 ring-primary/15 overflow-hidden">
            <div className="px-6 sm:px-8 pt-8 pb-7 space-y-6">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                  <Sparkles className="h-3 w-3" /> Founders
                </span>
                {isFounders && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
                    Ativo
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-2xl sm:text-[26px] font-semibold tracking-tight">{founders.name}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{founders.tagline}.</p>
              </div>

              <div className="flex items-end gap-2">
                <p className="text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums">{founders.priceLabel}</p>
                <p className="text-sm text-muted-foreground mb-1.5">pagamento único</p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <InfinityIcon className="h-3.5 w-3.5" />
                <span>Acesso vitalício · sem renovações · sem mensalidade</span>
              </div>

              <ul className="space-y-2.5 pt-1">
                {founders.promise.map(line => (
                  <li key={line} className="flex items-start gap-2.5 text-[14px] leading-snug">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-foreground/90">{line}</span>
                  </li>
                ))}
              </ul>

              {!isFounders && (
                <div className="pt-2 space-y-2">
                  <Button
                    size="lg"
                    className="w-full h-12 rounded-full text-base font-semibold"
                    onClick={() => openFoundersWhatsApp()}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Desbloquear Founders
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Atendimento direto via WhatsApp · ativação manual em minutos
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-[13px] text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium">Seus dados são seus, sempre.</p>
            <p className="mt-0.5">Mesmo no plano gratuito, você nunca perde o que já registrou. O Founders apenas libera a experiência completa.</p>
          </div>
        </section>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/app')}>← Voltar ao app</Button>
        </div>
      </main>
    </div>
  );
};

export default Upgrade;
