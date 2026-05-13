import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { PLANS } from '@/lib/plans';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaywallModal = ({ open, onOpenChange }: PaywallModalProps) => {
  const navigate = useNavigate();
  const pro = PLANS.pro;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/60">
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 h-40 bg-gradient-to-b from-primary/25 via-primary/5 to-transparent blur-3xl" />
          <div className="relative px-6 pt-7 pb-3 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 text-primary flex items-center justify-center">
              <Sparkles className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Seu trial chegou ao fim</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Seus dados continuam aqui — intactos. Para voltar a registrar e planejar, evolua para o {pro.name}.
            </p>
          </div>
          <div className="px-6 pb-6 space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-2.5">
              {pro.promise.slice(0, 3).map(line => (
                <div key={line} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <span className="text-foreground/90 leading-snug">{line}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <Button
                size="lg"
                className="w-full h-12 rounded-full text-base font-semibold"
                onClick={() => { onOpenChange(false); navigate('/upgrade'); }}
              >
                Conhecer planos <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="ghost" className="w-full h-11 rounded-full" onClick={() => onOpenChange(false)}>
                Continuar visualizando
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
