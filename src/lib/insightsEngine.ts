import type { Transaction } from '@/hooks/useTransactions';
import type { Cofrinho } from '@/hooks/useCofrinhos';
import type { RecurringTransaction } from '@/hooks/useRecurringTransactions';
import type { Month } from '@/hooks/useMonths';

export type InsightSeverity = 'info' | 'warning' | 'critical';
export type InsightCategory =
  | 'cofrinho'
  | 'risco_mes'
  | 'microgastos'
  | 'recorrencia'
  | 'comportamento'
  | 'reserva';

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  message: string;
  /** ranking 0..100 used to prioritize when listing */
  priority: number;
  /** optional related cofrinho */
  cofrinhoId?: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const severityRank: Record<InsightSeverity, number> = {
  critical: 100,
  warning: 60,
  info: 20,
};

interface BuildParams {
  month?: Month;
  transactions: Transaction[];
  cofrinhos: Cofrinho[];
  recurring: RecurringTransaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  reservaEmergencia?: number;
  custoMensalEstimado?: number;
}

/**
 * Pure deterministic engine: given the user's financial state, return a list of
 * intelligent insights. Sorted by priority desc.
 */
export function buildInsights(p: BuildParams): Insight[] {
  const out: Insight[] = [];

  // ── 1. Cofrinhos: thresholds 50 / 80 / 100 / >100 ─────────────────────────
  for (const c of p.cofrinhos) {
    const orc = Number(c.orcamento_mensal) || 0;
    if (orc <= 0) continue;
    const gasto = Number(c.gasto_mes) || 0;
    const pct = (gasto / orc) * 100;

    if (pct > 100) {
      out.push({
        id: `cof_over_${c.id}`,
        category: 'cofrinho',
        severity: 'critical',
        title: `${c.nome} ultrapassou o limite`,
        message: `Você gastou ${fmt(gasto - orc)} além do planejado neste cofrinho.`,
        priority: 95,
        cofrinhoId: c.id,
      });
    } else if (pct >= 100) {
      out.push({
        id: `cof_100_${c.id}`,
        category: 'cofrinho',
        severity: 'critical',
        title: `${c.nome} atingiu o limite`,
        message: `Você usou 100% do orçamento de ${c.nome}.`,
        priority: 88,
        cofrinhoId: c.id,
      });
    } else if (pct >= 80) {
      out.push({
        id: `cof_80_${c.id}`,
        category: 'cofrinho',
        severity: 'warning',
        title: `${c.nome} está perto do limite`,
        message: `Você já usou ${Math.round(pct)}% do orçamento. Reduza o ritmo para o resto do mês.`,
        priority: 72,
        cofrinhoId: c.id,
      });
    } else if (pct >= 50) {
      out.push({
        id: `cof_50_${c.id}`,
        category: 'cofrinho',
        severity: 'info',
        title: `Metade do orçamento de ${c.nome}`,
        message: `Você já utilizou ${Math.round(pct)}% deste cofrinho.`,
        priority: 35,
        cofrinhoId: c.id,
      });
    }
  }

  // ── 2. Risco do mês: projeção pelo ritmo + recorrências futuras ───────────
  if (p.month) {
    const now = new Date();
    const sameMonth =
      now.getFullYear() === p.month.year && now.getMonth() + 1 === p.month.month;
    const daysInMonth = new Date(p.month.year, p.month.month, 0).getDate();
    const currentDay = sameMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
    const daysLeft = Math.max(0, daysInMonth - currentDay);

    const dailyBurn = currentDay > 0 ? p.totalExpense / currentDay : 0;
    const projected = dailyBurn * daysLeft;
    const recurringExpenseLeft = p.recurring
      .filter(r => r.ativo && r.tipo !== 'receita' && r.dia_do_mes >= currentDay)
      .reduce((s, r) => s + Number(r.valor), 0);
    const initial = Number(p.month.initial_balance) || 0;
    const projectedFinal = initial + p.balance - projected - recurringExpenseLeft;

    if (sameMonth && p.totalExpense > 0) {
      if (projectedFinal < 0) {
        out.push({
          id: 'risk_negative',
          category: 'risco_mes',
          severity: 'critical',
          title: 'Risco de fechar o mês negativo',
          message: `No ritmo atual, você terminaria o mês em ${fmt(projectedFinal)}. Reduza despesas ou ajuste recorrências.`,
          priority: 98,
        });
      } else if (projectedFinal < initial * 0.1) {
        out.push({
          id: 'risk_tight',
          category: 'risco_mes',
          severity: 'warning',
          title: 'Mês ficará apertado',
          message: `Projeção de saldo final: ${fmt(projectedFinal)}. Sua margem está ficando estreita.`,
          priority: 65,
        });
      } else {
        out.push({
          id: 'risk_stable',
          category: 'risco_mes',
          severity: 'info',
          title: 'Seu mês está estável',
          message: `Projeção de saldo final positivo de ${fmt(projectedFinal)}.`,
          priority: 15,
        });
      }
    }
  }

  // ── 3. Microgastos acumulados (últimos 7 dias, valor < R$50) ──────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const micro = p.transactions.filter(t => {
    if (t.type !== 'expense') return false;
    if (Number(t.amount) >= 50) return false;
    return new Date(t.date) >= sevenDaysAgo;
  });
  if (micro.length >= 5) {
    const total = micro.reduce((s, t) => s + Number(t.amount), 0);
    out.push({
      id: 'micro_week',
      category: 'microgastos',
      severity: total > 200 ? 'warning' : 'info',
      title: 'Pequenos gastos somam bastante',
      message: `${micro.length} microgastos consumiram ${fmt(total)} nos últimos 7 dias.`,
      priority: total > 200 ? 60 : 30,
    });
  }

  // ── 4. Recorrências próximas do vencimento ────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const r of p.recurring) {
    if (!r.ativo || !r.proxima_execucao) continue;
    const due = new Date(r.proxima_execucao + 'T12:00:00');
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days < 0 || days > 7) continue;
    let severity: InsightSeverity = 'info';
    let priority = 25;
    if (days <= 1) {
      severity = 'warning';
      priority = 70;
    } else if (days <= 3) {
      severity = 'info';
      priority = 45;
    }
    const when =
      days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`;
    out.push({
      id: `rec_${r.id}_${days}`,
      category: 'recorrencia',
      severity,
      title: `${r.nome} vence ${when}`,
      message: `${r.tipo === 'receita' ? 'Receita' : 'Cobrança'} de ${fmt(Number(r.valor))} prevista para ${due.toLocaleDateString('pt-BR')}.`,
      priority,
    });
  }

  // ── 5. Reserva de emergência (se informada) ───────────────────────────────
  if (p.reservaEmergencia && p.reservaEmergencia > 0 && p.custoMensalEstimado && p.custoMensalEstimado > 0) {
    const months = p.reservaEmergencia / p.custoMensalEstimado;
    if (months < 3) {
      out.push({
        id: 'reserva_low',
        category: 'reserva',
        severity: months < 1 ? 'critical' : 'warning',
        title: 'Reserva de emergência baixa',
        message: `Sua reserva cobre cerca de ${months.toFixed(1)} mês(es) de despesas.`,
        priority: months < 1 ? 90 : 55,
      });
    } else {
      out.push({
        id: 'reserva_ok',
        category: 'reserva',
        severity: 'info',
        title: 'Reserva saudável',
        message: `Você possui cobertura estimada para ${months.toFixed(1)} meses.`,
        priority: 10,
      });
    }
  }

  // ── 6. Comportamento: receita ainda não registrada / despesas > receitas ──
  if (p.totalIncome === 0 && p.totalExpense > 0) {
    out.push({
      id: 'no_income',
      category: 'comportamento',
      severity: 'info',
      title: 'Nenhuma receita registrada',
      message: 'Adicione suas receitas para o FinZap conseguir prever melhor seu mês.',
      priority: 28,
    });
  }
  if (p.totalIncome > 0 && p.totalExpense > p.totalIncome) {
    out.push({
      id: 'spending_over_income',
      category: 'comportamento',
      severity: 'warning',
      title: 'Despesas superam suas receitas',
      message: `Diferença de ${fmt(p.totalExpense - p.totalIncome)} este mês.`,
      priority: 75,
    });
  }

  // Sort by priority desc, then severity
  return out.sort((a, b) => {
    const sa = severityRank[a.severity];
    const sb = severityRank[b.severity];
    if (sb !== sa) return sb - sa;
    return b.priority - a.priority;
  });
}

export const severityStyles: Record<
  InsightSeverity,
  { ring: string; bg: string; text: string; dot: string; label: string }
> = {
  critical: {
    ring: 'ring-1 ring-[hsl(var(--finzap-red)/0.25)]',
    bg: 'bg-[hsl(var(--finzap-red)/0.08)]',
    text: 'text-[hsl(var(--finzap-red))]',
    dot: 'bg-[hsl(var(--finzap-red))]',
    label: 'Crítico',
  },
  warning: {
    ring: 'ring-1 ring-amber-500/25',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    label: 'Atenção',
  },
  info: {
    ring: 'ring-1 ring-primary/20',
    bg: 'bg-primary/8',
    text: 'text-primary',
    dot: 'bg-primary',
    label: 'Informativo',
  },
};