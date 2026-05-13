import type { Transaction } from '@/hooks/useTransactions';

export interface CategoryStat {
  category: string;
  avg: number;
  min: number;
  max: number;
  current: number;
  trend: 'up' | 'down' | 'flat';
  // 0..1 confort metric: current vs avg range
  pace: number; // current / avg (1 = on average)
  samples: number;
}

export interface MonthProjection {
  daysInMonth: number;
  dayOfMonth: number;
  pctElapsed: number;
  realizedExpense: number;
  plannedFutureExpense: number; // installments + planned
  recurringPendingExpense: number;
  projectedExpense: number;
  projectedIncome: number;
  realizedIncome: number;
  projectedBalance: number;
  cardShare: number; // % do gasto previsto que é cartão
  freeMargin: number; // sobra prevista
}

export type PlanningInsightTone = 'calm' | 'positive' | 'attention' | 'info';

export interface PlanningInsight {
  id: string;
  tone: PlanningInsightTone;
  title: string;
  message: string;
  priority: number;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}`;

export function buildCategoryStats(
  history: Transaction[], // transactions from PRIOR months (closed or not)
  current: Transaction[], // current month transactions
): CategoryStat[] {
  // Aggregate per category per month
  const buckets: Record<string, Record<string, number>> = {};
  for (const t of history) {
    if (t.type !== 'expense') continue;
    const cat = (t.category || 'Outros').trim();
    const k = monthKey(new Date(t.date));
    buckets[cat] ??= {};
    buckets[cat][k] = (buckets[cat][k] || 0) + Number(t.amount);
  }

  const currentByCat: Record<string, number> = {};
  for (const t of current) {
    if (t.type !== 'expense') continue;
    const cat = (t.category || 'Outros').trim();
    currentByCat[cat] = (currentByCat[cat] || 0) + Number(t.amount);
  }

  const cats = new Set([...Object.keys(buckets), ...Object.keys(currentByCat)]);
  const stats: CategoryStat[] = [];
  cats.forEach(cat => {
    const monthly = Object.values(buckets[cat] || {});
    const samples = monthly.length;
    const avg = samples ? monthly.reduce((a, b) => a + b, 0) / samples : 0;
    const min = samples ? Math.min(...monthly) : 0;
    const max = samples ? Math.max(...monthly) : 0;
    const current = currentByCat[cat] || 0;

    // Trend: average of last 2 vs previous 2
    const sortedKeys = Object.keys(buckets[cat] || {}).sort();
    const last2 = sortedKeys.slice(-2).map(k => buckets[cat][k]);
    const prev2 = sortedKeys.slice(-4, -2).map(k => buckets[cat][k]);
    const lastAvg = last2.length ? last2.reduce((a, b) => a + b, 0) / last2.length : 0;
    const prevAvg = prev2.length ? prev2.reduce((a, b) => a + b, 0) / prev2.length : lastAvg;
    let trend: CategoryStat['trend'] = 'flat';
    if (prevAvg > 0) {
      const delta = (lastAvg - prevAvg) / prevAvg;
      if (delta > 0.12) trend = 'up';
      else if (delta < -0.12) trend = 'down';
    }

    stats.push({
      category: cat,
      avg,
      min,
      max,
      current,
      trend,
      pace: avg > 0 ? current / avg : 0,
      samples,
    });
  });

  return stats.sort((a, b) => (b.current + b.avg) - (a.current + a.avg));
}

export function buildMonthProjection(
  monthDate: Date, // any date inside the month
  transactions: Transaction[],
  today: Date = new Date(),
): MonthProjection {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // dayOfMonth only meaningful if today is inside this month
  const insideMonth = today.getFullYear() === year && today.getMonth() === month;
  const dayOfMonth = insideMonth ? today.getDate() : (today > new Date(year, month, daysInMonth) ? daysInMonth : 1);
  const pctElapsed = dayOfMonth / daysInMonth;

  let realizedExpense = 0;
  let plannedFutureExpense = 0;
  let recurringPendingExpense = 0;
  let realizedIncome = 0;
  let projectedIncome = 0;
  let cardExpense = 0;

  for (const t of transactions) {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      if (t.status === 'realized') realizedIncome += amt;
      else projectedIncome += amt;
      continue;
    }
    // expense
    if (t.status === 'realized') {
      realizedExpense += amt;
    } else {
      plannedFutureExpense += amt;
      if ((t as any).source === 'recurring') recurringPendingExpense += amt;
    }
    if ((t as any).origem === 'cartao') cardExpense += amt;
  }

  const projectedExpense = realizedExpense + plannedFutureExpense;
  const totalIncome = realizedIncome + projectedIncome;
  const projectedBalance = totalIncome - projectedExpense;
  const cardShare = projectedExpense > 0 ? cardExpense / projectedExpense : 0;
  const freeMargin = projectedBalance;

  return {
    daysInMonth,
    dayOfMonth,
    pctElapsed,
    realizedExpense,
    plannedFutureExpense,
    recurringPendingExpense,
    projectedExpense,
    projectedIncome,
    realizedIncome,
    projectedBalance,
    cardShare,
    freeMargin,
  };
}

export function buildPlanningInsights(args: {
  projection: MonthProjection;
  stats: CategoryStat[];
  upcoming: Transaction[]; // next 14 days non-realized
}): PlanningInsight[] {
  const { projection, stats, upcoming } = args;
  const out: PlanningInsight[] = [];

  // 1. Free margin
  if (projection.freeMargin > 0) {
    out.push({
      id: 'free-margin',
      tone: 'positive',
      title: 'Margem livre prevista',
      message: `Sua sobra prevista para o mês é confortável: você ainda deve ficar no positivo até o fechamento.`,
      priority: 80,
    });
  } else if (projection.freeMargin < 0 && projection.projectedExpense > 0) {
    out.push({
      id: 'tight-month',
      tone: 'attention',
      title: 'Mês mais apertado que o habitual',
      message: `As despesas previstas estão acima das receitas projetadas. Vale revisar próximos compromissos.`,
      priority: 95,
    });
  }

  // 2. Card share
  if (projection.cardShare >= 0.35 && projection.projectedExpense > 0) {
    out.push({
      id: 'card-share',
      tone: 'info',
      title: 'Peso do cartão neste mês',
      message: `O cartão representa cerca de ${Math.round(projection.cardShare * 100)}% dos seus gastos previstos.`,
      priority: 60,
    });
  }

  // 3. Upcoming concentration (next 7 days vs next 14 days)
  const today = new Date();
  const in7 = new Date(); in7.setDate(today.getDate() + 7);
  const in14 = new Date(); in14.setDate(today.getDate() + 14);
  let next7 = 0, next14 = 0;
  for (const t of upcoming) {
    const d = new Date(t.date);
    const a = Number(t.amount);
    if (d <= in14) next14 += a;
    if (d <= in7) next7 += a;
  }
  if (next7 > 0 && next14 > 0 && next7 / next14 >= 0.7) {
    out.push({
      id: 'concentration-week',
      tone: 'info',
      title: 'Concentração nos próximos dias',
      message: `A maior parte dos compromissos das próximas duas semanas se concentra nos próximos 7 dias.`,
      priority: 70,
    });
  }

  // 4. Category pace
  const heavy = stats.find(s => s.samples >= 2 && s.pace >= 1.25 && s.current > 0);
  if (heavy) {
    out.push({
      id: 'cat-pace-' + heavy.category,
      tone: 'attention',
      title: `${heavy.category} acima do padrão`,
      message: `Você costuma gastar entre ${fmt(heavy.min)} e ${fmt(heavy.max)} com ${heavy.category.toLowerCase()}. Este mês já está em ${fmt(heavy.current)}.`,
      priority: 75,
    });
  }

  const calm = stats.find(s => s.samples >= 2 && s.pace > 0 && s.pace <= 0.7);
  if (calm) {
    out.push({
      id: 'cat-calm-' + calm.category,
      tone: 'calm',
      title: `${calm.category} mais leve`,
      message: `Seu ritmo em ${calm.category.toLowerCase()} está abaixo da média histórica — bom espaço para reorganizar prioridades.`,
      priority: 40,
    });
  }

  // 5. Trend
  const trendUp = stats.find(s => s.samples >= 3 && s.trend === 'up');
  if (trendUp) {
    out.push({
      id: 'trend-up-' + trendUp.category,
      tone: 'info',
      title: `${trendUp.category} em alta`,
      message: `Seu padrão de ${trendUp.category.toLowerCase()} aumentou nas últimas semanas.`,
      priority: 50,
    });
  }

  return out.sort((a, b) => b.priority - a.priority);
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

export const TONE_STYLES: Record<PlanningInsightTone, { bg: string; text: string; ring: string; dot: string }> = {
  calm: {
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  positive: {
    bg: 'bg-primary/5',
    text: 'text-primary',
    ring: 'ring-primary/20',
    dot: 'bg-primary',
  },
  info: {
    bg: 'bg-muted/50',
    text: 'text-foreground',
    ring: 'ring-border',
    dot: 'bg-muted-foreground',
  },
  attention: {
    bg: 'bg-amber-500/5',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-500/20',
    dot: 'bg-amber-500',
  },
};