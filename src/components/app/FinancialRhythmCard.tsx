import { useMemo } from 'react';
import { useFinancialRhythm, type RhythmLevel } from '@/hooks/useFinancialRhythm';
import { Activity, Sparkles } from 'lucide-react';

const TONE: Record<RhythmLevel, {
  ring: string;        // stroke color
  glow: string;        // glow background
  chipBg: string;
  chipText: string;
  dot: string;
  label: string;
  bar: string;
}> = {
  excellent: {
    ring: 'hsl(160, 84%, 50%)',
    glow: 'bg-emerald-500/10',
    chipBg: 'bg-emerald-500/10 border-emerald-500/25',
    chipText: 'text-emerald-600 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Excelente',
    bar: 'bg-emerald-500/70',
  },
  good: {
    ring: 'hsl(217, 91%, 60%)',
    glow: 'bg-primary/10',
    chipBg: 'bg-primary/10 border-primary/25',
    chipText: 'text-primary',
    dot: 'bg-primary',
    label: 'Boa',
    bar: 'bg-primary/70',
  },
  attention: {
    ring: 'hsl(38, 92%, 55%)',
    glow: 'bg-amber-500/10',
    chipBg: 'bg-amber-500/10 border-amber-500/25',
    chipText: 'text-amber-600 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Atenção',
    bar: 'bg-amber-500/70',
  },
  outdated: {
    ring: 'hsl(0, 75%, 60%)',
    glow: 'bg-rose-500/10',
    chipBg: 'bg-rose-500/10 border-rose-500/25',
    chipText: 'text-rose-600 dark:text-rose-300',
    dot: 'bg-rose-500',
    label: 'Defasada',
    bar: 'bg-rose-500/70',
  },
};

const PrecisionRing = ({ value, color }: { value: number; color: string }) => {
  const size = 84;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          fill="none"
          opacity={0.5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums leading-none">{value}<span className="text-[10px] text-muted-foreground ml-0.5">%</span></span>
        <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mt-1">Precisão</span>
      </div>
    </div>
  );
};

const ActivityStrip = ({
  activity,
  barColor,
}: { activity: { date: string; count: number }[]; barColor: string }) => {
  const max = Math.max(1, ...activity.map(a => a.count));
  return (
    <div className="flex items-end gap-[3px] h-10">
      {activity.map((a) => {
        const h = a.count === 0 ? 14 : 18 + (a.count / max) * 82; // %
        const inactive = a.count === 0;
        const d = new Date(a.date + 'T12:00:00');
        const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        return (
          <div
            key={a.date}
            title={`${label} · ${a.count} movimento${a.count === 1 ? '' : 's'}`}
            className="flex-1 rounded-[3px] transition-all"
            style={{
              height: `${h}%`,
              background: inactive ? 'hsl(var(--border))' : undefined,
              opacity: inactive ? 0.5 : 1,
            }}
          >
            {!inactive && (
              <div className={`h-full w-full rounded-[3px] ${barColor}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const FinancialRhythmCard = () => {
  const r = useFinancialRhythm();
  const tone = TONE[r.level];

  const recenciaTexto = useMemo(() => {
    if (r.daysSinceLastUpdate === null) return 'Sem registros ainda';
    if (r.daysSinceLastUpdate === 0) return 'Atualizado hoje';
    if (r.daysSinceLastUpdate === 1) return 'Atualizado ontem';
    return `${r.daysSinceLastUpdate} dias sem novas movimentações`;
  }, [r.daysSinceLastUpdate]);

  const diasAtivos = r.activity.filter(a => a.count > 0).length;

  return (
    <section
      aria-label="Ritmo Financeiro"
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5 sm:p-6"
    >
      {/* Subtle glow */}
      <div className={`pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl ${tone.glow}`} />
      {/* Editorial grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative">
        {/* Eyebrow */}
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ritmo Financeiro
          </p>
          <span className="text-[10px] text-muted-foreground/60">·</span>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
            Confiabilidade da projeção
          </p>
        </div>

        {/* Headline + ring */}
        <div className="mt-4 flex items-start gap-5">
          <div className="shrink-0">
            <PrecisionRing value={r.precision} color={tone.ring} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${tone.chipBg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.chipText}`}>
                {tone.label}
              </span>
            </div>
            <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
              {r.headline}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {r.subtitle}
            </p>
          </div>
        </div>

        {/* Activity strip — últimos 14 dias */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
              Últimos 14 dias
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{diasAtivos}</span>
              <span className="opacity-70">/14 ativos</span>
            </p>
          </div>
          <ActivityStrip activity={r.activity} barColor={tone.bar} />
        </div>

        {/* Hairline meta */}
        <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
              Última movimentação
            </p>
            <p className="text-xs font-medium text-foreground mt-1">{recenciaTexto}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
              Recorrências
            </p>
            <p className="text-xs font-medium text-foreground mt-1">
              {r.recorrenciasPendentes === 0
                ? 'Todas em dia'
                : `${r.recorrenciasPendentes} aguardando confirmação`}
            </p>
          </div>
        </div>

        {r.suggestion && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
            <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={2.2} />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {r.suggestion}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};