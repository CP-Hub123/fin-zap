import { useState } from 'react';
import { Wallet, Lock, Sparkles, TrendingUp, ChevronDown, Info } from 'lucide-react';
import { useFinancialBalance } from '@/hooks/useFinancialBalance';
import { formatCurrency } from '@/lib/constants';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  monthId: string;
}

/**
 * Saldo Inteligente — fonte única de verdade exposta ao usuário.
 * Total · Reservado · Livre · Previsto, todos derivados de useFinancialBalance.
 */
export const IntelligentBalanceCard = ({ monthId }: Props) => {
  const fb = useFinancialBalance(monthId);
  const [open, setOpen] = useState(false);

  const livreTone =
    fb.saldoLivre < 0
      ? 'text-rose-600 dark:text-rose-300'
      : fb.saldoLivre < fb.saldoTotal * 0.1
        ? 'text-amber-600 dark:text-amber-300'
        : 'text-emerald-600 dark:text-emerald-300';

  return (
    <section
      aria-label="Saldo inteligente"
      className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6"
    >
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2.4} />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Saldo inteligente
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
          {/* Saldo Livre — hero */}
          <div className="col-span-2 rounded-2xl border border-border/60 bg-background/40 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Disponível para usar
              </span>
              <Wallet className={`h-4 w-4 ${livreTone}`} strokeWidth={2.2} />
            </div>
            <div className={`mt-1.5 text-3xl sm:text-4xl font-bold tracking-tight tabular-nums ${livreTone}`}>
              {formatCurrency(fb.saldoLivre)}
            </div>
            <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
              Total {formatCurrency(fb.saldoTotal)} − reservas, compromissos e cartões.
            </p>
          </div>

          {/* Reservado */}
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-primary" strokeWidth={2.4} />
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground truncate">
                Reservado
              </span>
            </div>
            <div className="mt-1 text-[15px] sm:text-base font-semibold tabular-nums text-foreground truncate">
              {formatCurrency(fb.saldoReservado)}
            </div>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground truncate">Cofrinhos protegidos</p>
          </div>

          {/* Previsto */}
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-emerald-500" strokeWidth={2.4} />
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground truncate">
                Previsto fim do mês
              </span>
            </div>
            <div className="mt-1 text-[15px] sm:text-base font-semibold tabular-nums text-foreground truncate">
              {formatCurrency(fb.saldoPrevisto)}
            </div>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground truncate">Considerando ritmo atual</p>
          </div>
        </div>

        {/* Detalhamento da fórmula */}
        <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
          <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            <span className="flex items-center gap-1.5">
              <Info className="h-3 w-3" strokeWidth={2.4} />
              Como o FinZap calcula o que você pode gastar
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.4} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-border/40 bg-background/30 p-3 space-y-1.5 text-[12px]">
              <Row label="Saldo total do mês" value={fb.saldoTotal} />
              <Row label="− Reservado em cofrinhos" value={-fb.saldoReservado} />
              <Row label="− Compromissos restantes (livres)" value={-fb.commitmentsRemainingFree} />
              <Row label="− Parcelas de cartão deste mês (livres)" value={-fb.cardsPendingFree} />
              {fb.projectedIncomeRemaining > 0 && (
                <Row label="+ Receitas previstas no mês" value={fb.projectedIncomeRemaining} />
              )}
              <div className="my-1 h-px bg-border/60" />
              <Row label="Saldo livre" value={fb.saldoLivre} strong />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
};

const Row = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <span className={`truncate ${strong ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{label}</span>
    <span className={`tabular-nums ${strong ? 'text-foreground font-semibold' : 'text-foreground/80'}`}>
      {formatCurrency(value)}
    </span>
  </div>
);