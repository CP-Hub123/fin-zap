import { useMemo } from 'react';
import { Gauge, ShieldAlert, CalendarClock, Sparkles } from 'lucide-react';
import { useFinancialRhythm } from '@/hooks/useFinancialRhythm';
import { useFinancialBalance } from '@/hooks/useFinancialBalance';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { formatCurrency } from '@/lib/constants';

interface Props {
  monthId: string;
}

type Tone = 'safe' | 'attention' | 'critical' | 'info';

const TONE: Record<Tone, { ring: string; glow: string; chip: string; dot: string; bar: string; label: string }> = {
  safe:      { ring: 'border-emerald-500/25', glow: 'bg-emerald-500/10',  chip: 'text-emerald-600 dark:text-emerald-300', dot: 'bg-emerald-500', bar: 'bg-emerald-500/70', label: 'Estável' },
  attention: { ring: 'border-amber-500/25',   glow: 'bg-amber-500/10',    chip: 'text-amber-600 dark:text-amber-300',     dot: 'bg-amber-500',   bar: 'bg-amber-500/70',   label: 'Atenção' },
  critical:  { ring: 'border-rose-500/30',    glow: 'bg-rose-500/10',     chip: 'text-rose-600 dark:text-rose-300',       dot: 'bg-rose-500',    bar: 'bg-rose-500/70',    label: 'Risco' },
  info:      { ring: 'border-primary/25',     glow: 'bg-primary/10',      chip: 'text-primary',                            dot: 'bg-primary',     bar: 'bg-primary/70',     label: 'Neutro' },
};

const Widget = ({
  icon: Icon, eyebrow, title, hint, tone, footer,
}: {
  icon: any; eyebrow: string; title: React.ReactNode; hint?: string; tone: Tone; footer?: React.ReactNode;
}) => {
  const t = TONE[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${t.ring} bg-card p-3.5 sm:p-4 min-w-0`}>
      <div aria-hidden className={`pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full blur-2xl ${t.glow}`} />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${t.chip}`} strokeWidth={2.2} />
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground truncate">{eyebrow}</p>
        </div>
        <div className="mt-2 text-[15px] sm:text-base font-semibold leading-snug tracking-tight text-foreground truncate">
          {title}
        </div>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{hint}</p>}
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
};

export const HealthSnapshotGrid = ({ monthId }: Props) => {
  const r = useFinancialRhythm();
  const fb = useFinancialBalance(monthId);
  const { recorrencias } = useRecurringTransactions();

  const proximas = useMemo(() => {
    const now = new Date();
    return recorrencias
      .filter(x => x.ativo && x.proxima_execucao)
      .map(x => {
        const t = new Date(x.proxima_execucao! + 'T12:00:00');
        return { x, diff: Math.round((t.getTime() - now.getTime()) / 86400000) };
      })
      .filter(x => x.diff >= 0 && x.diff <= 14)
      .sort((a, b) => a.diff - b.diff);
  }, [recorrencias]);

  // Previsibilidade
  const previsTone: Tone =
    r.precision >= 75 ? 'safe' : r.precision >= 50 ? 'info' : r.precision >= 30 ? 'attention' : 'critical';

  // Risco (saldo disponível real vs compromissos restantes)
  const compromissos = fb.commitmentsRemaining;
  const livre = fb.availableReal;
  let riskTone: Tone = 'safe';
  let riskTitle = 'Sob controle';
  let riskHint = 'Saldo livre cobre os compromissos restantes.';
  if (livre < 0) {
    riskTone = 'critical';
    riskTitle = 'Risco ativo';
    riskHint = `Faltam ${formatCurrency(Math.abs(livre))} para cobrir compromissos.`;
  } else if (compromissos > 0 && livre < compromissos * 0.5) {
    riskTone = 'attention';
    riskTitle = 'Margem apertada';
    riskHint = `Folga reduzida frente a ${formatCurrency(compromissos)} previstos.`;
  } else if (compromissos === 0) {
    riskTitle = 'Sem riscos';
    riskHint = 'Nenhum compromisso futuro neste mês.';
  }

  // Próxima recorrência
  const prox = proximas[0];
  const proxTone: Tone = !prox ? 'safe' : prox.diff <= 2 ? 'attention' : 'info';
  const proxLabel = !prox
    ? 'Nada nos próximos 14 dias'
    : prox.diff === 0
      ? `Hoje · ${prox.x.nome}`
      : prox.diff === 1
        ? `Amanhã · ${prox.x.nome}`
        : `Em ${prox.diff} dias · ${prox.x.nome}`;

  return (
    <section aria-label="Saúde financeira" className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Saúde financeira
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Widget
          icon={Gauge}
          eyebrow="Previsibilidade"
          tone={previsTone}
          title={<span className="tabular-nums">{r.precision}<span className="text-xs text-muted-foreground ml-1">%</span></span>}
          hint="Confiabilidade da projeção atual do FinZap."
          footer={
            <div className="h-1.5 rounded-full bg-secondary/70 overflow-hidden">
              <div
                className={`h-full ${TONE[previsTone].bar} transition-all duration-700`}
                style={{ width: `${Math.min(100, r.precision)}%` }}
              />
            </div>
          }
        />
        <Widget
          icon={ShieldAlert}
          eyebrow="Risco do mês"
          tone={riskTone}
          title={riskTitle}
          hint={riskHint}
        />
        <Widget
          icon={CalendarClock}
          eyebrow="Próximo compromisso"
          tone={proxTone}
          title={proxLabel}
          hint={prox ? `${formatCurrency(Number(prox.x.valor))} · ${prox.x.tipo === 'despesa' ? 'Saída' : 'Entrada'} prevista` : 'Sem recorrências programadas.'}
        />
      </div>
    </section>
  );
};
