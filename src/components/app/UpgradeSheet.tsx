import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, ArrowRight } from 'lucide-react';
import { FEATURE_META, PLANS, limitLabel, type PlanTier } from '@/lib/plans';
import { usePlan } from '@/hooks/usePlan';

interface UpgradeSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Which feature triggered the upgrade prompt (cards, recorrencias, cofrinhos, advancedInsights, etc.) */
  feature?: keyof typeof FEATURE_META;
  /** Recommended target tier (default 'pro'). */
  target?: PlanTier;
  /** Optional contextual reason shown above. */
  reason?: string;
}

export const UpgradeSheet = ({ open, onOpenChange, feature, target = 'pro', reason }: UpgradeSheetProps) => {
  const navigate = useNavigate();
  const { tier } = usePlan();
  const meta = feature ? FEATURE_META[feature] : null;
  const plan = PLANS[target];
  const Icon = meta?.icon ?? Sparkles;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-3xl border-t-0 max-h-[92vh] overflow-y-auto sm:max-w-md sm:mx-auto"
      >
        <div className="relative overflow-hidden">
          {/* Halo */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-56 bg-gradient-to-b from-primary/25 via-primary/5 to-transparent blur-3xl" />

          <div className="relative px-6 pt-7 pb-3 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 text-primary flex items-center justify-center">
              <Icon className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5">
              <Sparkles className="h-3 w-3" /> {plan.name}
            </span>
            <h2 className="mt-2.5 text-xl font-semibold tracking-tight">
              {meta?.title ?? 'Evolua o seu FinZap'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {reason ?? meta?.description ?? plan.tagline}
            </p>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Promise */}
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-2.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">O que muda no Pro</p>
              {plan.promise.map(p => (
                <div key={p} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-foreground/90 leading-snug">{p}</span>
                </div>
              ))}
            </div>

            {/* Limits comparison */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <LimitMini label="Cartões" free={PLANS.free.limits.cards} pro={plan.limits.cards} />
              <LimitMini label="Cofrinhos" free={PLANS.free.limits.cofrinhos} pro={plan.limits.cofrinhos} />
              <LimitMini label="Recorrências" free={PLANS.free.limits.recorrencias} pro={plan.limits.recorrencias} />
            </div>

            {/* Pricing */}
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 text-center shadow-lg shadow-primary/20">
              <p className="text-xs uppercase tracking-wider opacity-80">Acesso completo</p>
              <p className="text-2xl font-semibold mt-1">{plan.priceLabel}</p>
              {plan.priceHint && <p className="text-xs opacity-80 mt-0.5">{plan.priceHint}</p>}
            </div>

            <div className="space-y-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <Button
                size="lg"
                className="w-full h-12 rounded-full text-base font-semibold"
                onClick={() => { onOpenChange(false); navigate('/upgrade'); }}
              >
                {plan.ctaLabel} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="ghost" className="w-full h-11 rounded-full" onClick={() => onOpenChange(false)}>
                {tier === 'free' ? 'Continuar no Free' : 'Agora não'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const LimitMini = ({ label, free, pro }: { label: string; free: number; pro: number }) => (
  <div className="rounded-xl border border-border/50 bg-muted/30 px-2 py-2.5">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
    <p className="text-[11px] text-muted-foreground/80 mt-1 line-through">{limitLabel(free)}</p>
    <p className="text-sm font-semibold text-primary leading-tight">{limitLabel(pro)}</p>
  </div>
);
