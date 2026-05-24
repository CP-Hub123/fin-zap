import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onEnable: () => void;
  onDismiss: () => void;
  isPending?: boolean;
}

/**
 * Banner premium de opt-in de notificações — substitui o window.confirm() nativo.
 * Aparece fixo no rodapé, acima da safe-area, sem bloquear navegação.
 */
export const PushOptInBanner = ({ open, onEnable, onDismiss, isPending }: Props) => {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 px-3 pb-3 transition-all duration-300 pointer-events-none',
        open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
      )}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-border/60 bg-card/95 p-4 shadow-elevated backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug tracking-tight">Ative alertas inteligentes</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Receba previsões, vencimentos e lembretes financeiros diretamente no seu celular.
            </p>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dispensar"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss} className="flex-1 min-h-[40px]">
            Agora não
          </Button>
          <Button size="sm" onClick={onEnable} disabled={isPending} className="flex-1 min-h-[40px] font-semibold">
            {isPending ? 'Ativando…' : 'Ativar notificações'}
          </Button>
        </div>
      </div>
    </div>
  );
};
