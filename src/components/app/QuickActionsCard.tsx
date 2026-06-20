import { Plus, Minus, FileText, Wallet, ShieldCheck } from 'lucide-react';

interface Props {
  onAddIncome: () => void;
  onAddExpense: () => void;
  onOpenReport?: () => void;
  onOpenPlanning: () => void;
  onOpenReserve?: () => void;
}

const Action = ({
  icon: Icon, label, hint, onClick, tone, disabled,
}: {
  icon: any; label: string; hint: string; onClick?: () => void;
  tone: 'income' | 'expense' | 'primary' | 'neutral';
  disabled?: boolean;
}) => {
  const tones = {
    income:   { iconBg: 'bg-emerald-500/12', iconText: 'text-emerald-500', ring: 'hover:border-emerald-500/40' },
    expense:  { iconBg: 'bg-rose-500/12',    iconText: 'text-rose-500',    ring: 'hover:border-rose-500/40' },
    primary:  { iconBg: 'bg-primary/12',     iconText: 'text-primary',     ring: 'hover:border-primary/40' },
    neutral:  { iconBg: 'bg-muted',          iconText: 'text-foreground',  ring: 'hover:border-foreground/20' },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 text-left transition-all duration-200 ${tones.ring} hover:shadow-[0_10px_28px_-18px_hsl(var(--primary)/0.5)] active:scale-[0.985] min-w-0 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${tones.iconBg}`}>
        <Icon className={`h-[18px] w-[18px] ${tones.iconText}`} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-tight text-foreground truncate">{label}</p>
        <p className="text-[11px] text-muted-foreground leading-snug truncate">{hint}</p>
      </div>
      {disabled && (
        <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5">
          <span className="h-1 w-1 rounded-full bg-amber-400 animate-pulse mr-1" />
          <span className="text-[8px] font-bold uppercase tracking-wider text-amber-300">Breve</span>
        </span>
      )}
    </button>
  );
};

export const QuickActionsCard = ({ onAddIncome, onAddExpense, onOpenReport, onOpenPlanning, onOpenReserve }: Props) => {
  return (
    <section aria-label="Ações rápidas" className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Ações rápidas
        </p>
        <span className="text-[10px] text-muted-foreground/70">Atalhos do FinZap</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Action icon={Plus}     tone="income"  label="Nova receita"     hint="Registre uma entrada"          onClick={onAddIncome} />
        <Action icon={Minus}    tone="expense" label="Nova despesa"     hint="Registre uma saída"            onClick={onAddExpense} />
        <Action icon={ShieldCheck} tone="primary" label="Reservar dinheiro" hint="Separe do saldo livre"      onClick={onOpenReserve} disabled={!onOpenReserve} />
        <Action icon={Wallet}   tone="neutral" label="Planejar mês"      hint="Cofrinhos e previsibilidade"  onClick={onOpenPlanning} />
        <Action icon={FileText} tone="primary" label="Relatório premium" hint="Gere seu resumo inteligente"  onClick={onOpenReport} disabled={!onOpenReport} />
      </div>
    </section>
  );
};
