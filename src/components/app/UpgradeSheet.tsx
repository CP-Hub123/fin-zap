import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, MessageCircle, Infinity as InfinityIcon } from 'lucide-react';
import { FEATURE_META, PLANS, type PlanTier } from '@/lib/plans';
import { usePlan } from '@/hooks/usePlan';
import { openFoundersWhatsApp } from '@/lib/whatsapp';

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
              {meta?.title ?? 'Eleve seu FinZap'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {reason ?? meta?.description ?? plan.tagline}
            </p>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Promise */}
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-2.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">O que muda no Founders</p>
              {plan.promise.map(p => (
                <div key={p} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-foreground/90 leading-snug">{p}</span>
                </div>
              ))}
            </div>

            {/* Pricing — premium, calm */}
            <div className="rounded-2xl border border-primary/30 bg-card/80 p-5 text-center shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Acesso vitalício</p>
              <p className="text-3xl font-semibold tracking-tight mt-1 tabular-nums">{plan.priceLabel}</p>
              {plan.priceHint && <p className="text-[11px] text-muted-foreground mt-1">{plan.priceHint}</p>}
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <InfinityIcon className="h-3 w-3" /> sem mensalidade · sem renovações
              </div>
            </div>

            <div className="space-y-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <Button
                size="lg"
                className="w-full h-12 rounded-full text-base font-semibold"
                onClick={() => { onOpenChange(false); openFoundersWhatsApp(); }}
              >
                <MessageCircle className="h-4 w-4 mr-2" /> {plan.ctaLabel}
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 rounded-full"
                onClick={() => { onOpenChange(false); navigate('/upgrade'); }}
              >
                Ver detalhes
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
