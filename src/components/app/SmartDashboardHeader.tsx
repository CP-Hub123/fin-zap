import { useMemo } from 'react';
import { formatCurrency } from '@/lib/constants';
import { useCofrinhos } from '@/hooks/useCofrinhos';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useInsights } from '@/hooks/useInsights';
import { getPreset, getStatusLevel, STATUS_META } from '@/lib/cofrinhoPresets';
import {
  Sparkles, ShieldCheck, AlertTriangle, AlertCircle,
  CalendarClock, Wallet, ArrowRight,
} from 'lucide-react';
import type { Month } from '@/hooks/useMonths';
import type { Transaction } from '@/hooks/useTransactions';

type SitStatus = 'safe' | 'attention' | 'critical';

const STATUS = {
  safe:      { label: 'Seguro',  emoji: '🟢', bg: 'bg-white/8 border border-emerald-400/30',  text: 'text-emerald-50', dot: 'bg-emerald-400' },
  attention: { label: 'Atenção', emoji: '🟡', bg: 'bg-white/8 border border-amber-300/30',    text: 'text-amber-50',   dot: 'bg-amber-300' },
  critical:  { label: 'Crítico', emoji: '🔴', bg: 'bg-white/8 border border-rose-400/40',     text: 'text-rose-50',    dot: 'bg-rose-400' },
};

const INSIGHT_STYLE: Record<SitStatus | 'info', { bg: string; ring: string; text: string; icon: any; emoji: string }> = {
  safe:      { bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300', icon: ShieldCheck, emoji: '🟢' },
  attention: { bg: 'bg-yellow-500/10',  ring: 'ring-yellow-500/30',  text: 'text-yellow-700 dark:text-yellow-300',   icon: AlertTriangle, emoji: '🟡' },
  critical:  { bg: 'bg-red-500/10',     ring: 'ring-red-500/30',     text: 'text-red-700 dark:text-red-300',         icon: AlertCircle, emoji: '🔴' },
  info:      { bg: 'bg-primary/10',     ring: 'ring-primary/20',     text: 'text-primary',                            icon: Sparkles, emoji: '💡' },
};

interface Props {
  month: Month;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactions: Transaction[];
}

export const SmartDashboardHeader = ({ month, totalIncome, totalExpense, balance, transactions }: Props) => {
  const { cofrinhos } = useCofrinhos();
  const { recorrencias } = useRecurringTransactions();
  const { insights } = useInsights(month);

  const now = new Date();
  const isCurrentMonth = month.year === now.getFullYear() && month.month === now.getMonth() + 1;
  const daysInMonth = new Date(month.year, month.month, 0).getDate();
  const today = isCurrentMonth ? now.getDate() : daysInMonth;
  const daysRemaining = Math.max(0, daysInMonth - today);

  // Próximos impactos (apenas mês atual)
  const proximosImpactos = useMemo(() => {
    if (!isCurrentMonth) return [];
    return recorrencias
      .filter(r => r.ativo && r.proxima_execucao)
      .map(r => {
        const target = new Date(r.proxima_execucao! + 'T12:00:00');
        const diffDays = Math.round((target.getTime() - now.getTime()) / 86400000);
        return { r, target, diffDays };
      })
      .filter(x => x.diffDays >= 0 && x.target.getMonth() === now.getMonth() && x.target.getFullYear() === now.getFullYear())
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 4);
  }, [recorrencias, isCurrentMonth, now]);

  // Compromissos futuros do mês (despesas)
  const compromissosFuturos = proximosImpactos
    .filter(x => x.r.tipo === 'despesa')
    .reduce((s, x) => s + Number(x.r.valor), 0);
  const receitasFuturas = proximosImpactos
    .filter(x => x.r.tipo === 'receita')
    .reduce((s, x) => s + Number(x.r.valor), 0);

  const saldoAtual = balance + Number(month.initial_balance);
  const saldoDisponivelReal = saldoAtual - compromissosFuturos + receitasFuturas;

  // Burn rate diário e projeção fim do mês
  const dailyBurn = isCurrentMonth && today > 0 ? totalExpense / today : 0;
  const projecaoFimMes = isCurrentMonth
    ? saldoDisponivelReal - (dailyBurn * daysRemaining * 0.5) // pondera 50% do ritmo (gastos não-recorrentes)
    : saldoAtual;

  // Status global
  const status: SitStatus = useMemo(() => {
    if (saldoDisponivelReal < 0 || projecaoFimMes < 0) return 'critical';
    if (saldoDisponivelReal < compromissosFuturos * 0.3) return 'attention';
    if (totalIncome > 0 && totalExpense / totalIncome > 0.85) return 'attention';
    return 'safe';
  }, [saldoDisponivelReal, projecaoFimMes, compromissosFuturos, totalIncome, totalExpense]);

  const sStyle = STATUS[status];

  // Insight principal (heurística)
  const insightPrincipal = useMemo(() => {
    if (insights.length > 0) {
      const top = insights[0];
      const sev = (top.severity === 'critical' ? 'critical' : top.severity === 'warning' ? 'attention' : 'info') as keyof typeof INSIGHT_STYLE;
      return { sev, title: top.title, text: top.message };
    }
    if (!isCurrentMonth) {
      return { sev: 'info' as const, title: 'Visualização histórica', text: 'Você está vendo um mês passado. Selecione o mês atual para insights em tempo real.' };
    }
    if (status === 'critical') {
      return { sev: 'critical' as const, title: 'Risco antes do fechamento', text: `Seu planejamento indica risco. Projeção: ${formatCurrency(projecaoFimMes)} ao fim do mês.` };
    }
    if (status === 'attention') {
      return { sev: 'attention' as const, title: 'Os gastos exigem atenção', text: 'Seu ritmo de gasto está alto frente ao saldo disponível. Reduza gastos opcionais.' };
    }
    return { sev: 'safe' as const, title: 'Seu mês está estável', text: `Mantendo este ritmo, você terminará com ${formatCurrency(projecaoFimMes)} livres.` };
  }, [insights, status, projecaoFimMes, isCurrentMonth]);

  const InsightIcon = INSIGHT_STYLE[insightPrincipal.sev].icon;

  // Cofrinhos resumo (top 4 por relevância: críticos primeiro)
  const cofrinhosResumo = useMemo(() => {
    return cofrinhos
      .map(c => {
        const isMensal = c.tipo === 'mensal';
        const num = isMensal ? Number(c.gasto_mes) : Number(c.saldo);
        const den = isMensal ? Number(c.orcamento_mensal) : Number(c.meta_valor);
        const pct = den > 0 ? Math.min(150, Math.round((num / den) * 100)) : 0;
        const sPct = isMensal ? pct : Math.max(0, 100 - pct);
        const sLevel = getStatusLevel(sPct);
        return { c, pct, sLevel, isMensal };
      })
      .sort((a, b) => {
        const order = { over: 0, critical: 1, attention: 2, safe: 3 };
        return order[a.sLevel] - order[b.sLevel];
      })
      .slice(0, 4);
  }, [cofrinhos]);

  return (
    <div className="space-y-4">
      {/* HERO: Saldo Disponível Real — calm, premium, single accent */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero text-white shadow-elevated">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.14em] opacity-60 font-medium">Saldo disponível real</p>
              <p className="fluid-currency font-bold mt-1 max-w-full">
                {formatCurrency(saldoDisponivelReal)}
              </p>
              <p className="text-xs opacity-65 mt-1">
                Após compromissos {isCurrentMonth ? 'do mês' : 'previstos'}
              </p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 ${sStyle.bg} backdrop-blur-md`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sStyle.dot}`} />
              <span className="text-[11px] font-medium tracking-wide">{sStyle.label}</span>
            </div>
          </div>

          {/* Mini KPIs — quieter, separated by hairlines */}
          <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden bg-white/10">
            <div className="bg-white/[0.04] p-3 min-w-0">
              <p className="text-[10px] uppercase tracking-wide opacity-55">Atual</p>
              <p className="fluid-currency-sm font-semibold mt-0.5">{formatCurrency(saldoAtual)}</p>
            </div>
            <div className="bg-white/[0.04] p-3 min-w-0">
              <p className="text-[10px] uppercase tracking-wide opacity-55">Comprometido</p>
              <p className="fluid-currency-sm font-semibold mt-0.5">{formatCurrency(compromissosFuturos)}</p>
            </div>
            <div className="bg-white/[0.04] p-3 min-w-0">
              <p className="text-[10px] uppercase tracking-wide opacity-55">Projeção</p>
              <p className="fluid-currency-sm font-semibold mt-0.5">{formatCurrency(projecaoFimMes)}</p>
            </div>
          </div>

          {isCurrentMonth && (
            <p className="text-[11px] opacity-65">
              Faltam <span className="font-semibold opacity-90">{daysRemaining}</span> {daysRemaining === 1 ? 'dia' : 'dias'} para fechar o mês
            </p>
          )}
        </div>
      </div>

      {/* Insight principal — calmer, single accent on the left */}
      <div className="rounded-2xl bg-card border border-border/60 p-4 flex gap-3 items-start">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${INSIGHT_STYLE[insightPrincipal.sev].bg}`}>
          <InsightIcon className={`h-4 w-4 ${INSIGHT_STYLE[insightPrincipal.sev].text}`} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{insightPrincipal.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insightPrincipal.text}</p>
        </div>
      </div>

      {/* Próximos impactos */}
      {proximosImpactos.length > 0 && (
        <section className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Próximos impactos</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">{proximosImpactos.length} previstos</span>
          </div>
          <div className="space-y-2">
            {proximosImpactos.map(({ r, diffDays }) => {
              const isExpense = r.tipo === 'despesa';
              const valor = Number(r.valor);
              const base = Math.abs(saldoDisponivelReal) || 1;
              const impactoPct = Math.round((valor / base) * 100);
              const quando = diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`;
              return (
                <div key={r.id} className="flex items-center gap-3 py-1.5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isExpense ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600'}`}>
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {quando} · Impacto: <span className="font-semibold">{impactoPct}%</span> do saldo livre
                    </p>
                  </div>
                  <p className={`text-sm font-bold tabular-nums ${isExpense ? 'text-red-500' : 'text-emerald-600'}`}>
                    {isExpense ? '-' : '+'}{formatCurrency(valor)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Cofrinhos resumo */}
      {cofrinhosResumo.length > 0 && (
        <section className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Seus cofrinhos</h3>
            <span className="text-[10px] text-muted-foreground">{cofrinhos.length} total</span>
          </div>
          <div className="space-y-2.5">
            {cofrinhosResumo.map(({ c, pct, sLevel, isMensal }) => {
              const preset = getPreset(c.cover_preset);
              const Icon = preset.icon;
              const sMeta = STATUS_META[sLevel];
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundImage: preset.gradient }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{c.nome}</p>
                      <span className="text-xs font-bold tabular-nums shrink-0">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${sMeta.bar.replace('[&>div]:', '')}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] flex items-center gap-1 shrink-0`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sMeta.dot}`} />
                        {isMensal && pct > 100 ? 'Estourado' : sMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
            Toque em "Cofrinhos" para ver detalhes
            <ArrowRight className="h-3 w-3" />
          </p>
        </section>
      )}
    </div>
  );
};