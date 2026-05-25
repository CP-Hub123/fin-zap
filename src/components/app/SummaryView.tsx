import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/constants';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, PieChart as PieIcon, BarChart3, Target, ChevronDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportModal } from './ReportModal';
import { MONTH_NAMES } from '@/lib/constants';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import type { Month } from '@/hooks/useMonths';
import type { Transaction } from '@/hooks/useTransactions';
import type { BudgetPlan } from '@/hooks/useBudget';
import { useCofrinhos } from '@/hooks/useCofrinhos';
import { SmartDashboardHeader } from './SmartDashboardHeader';
import { useFinancialBalance } from '@/hooks/useFinancialBalance';

interface SummaryViewProps {
  month: Month;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactions: Transaction[];
  budgetPlans: BudgetPlan[];
}

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',   // primary blue
  'hsl(142, 71%, 45%)',   // green
  'hsl(0, 84%, 60%)',     // red
  'hsl(262, 83%, 58%)',   // purple
  'hsl(38, 92%, 50%)',    // amber
  'hsl(174, 72%, 40%)',   // teal
  'hsl(330, 81%, 60%)',   // pink
  'hsl(199, 89%, 48%)',   // sky
  'hsl(24, 95%, 53%)',    // orange
  'hsl(83, 78%, 44%)',    // lime
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-sm">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full inline-block" style={{ background: entry.color }} />
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-sm">
      <p className="font-medium">{d.name}</p>
      <p style={{ color: d.payload.fill }}>{formatCurrency(d.value)} ({d.payload.percent}%)</p>
    </div>
  );
};

export const SummaryView = ({ month, totalIncome, totalExpense, balance, transactions, budgetPlans }: SummaryViewProps) => {
  const { cofrinhos } = useCofrinhos();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // Fonte oficial de saldo final (initial_balance + delta)
  const { currentBalance: finalBalance } = useFinancialBalance(month.id);
  const cofrinhoMap = useMemo(() => {
    const map: Record<string, { nome: string; cor: string; orcamento: number }> = {};
    cofrinhos.forEach(c => {
      map[c.id] = { nome: c.nome, cor: c.cor || 'hsl(217, 91%, 60%)', orcamento: Number(c.orcamento_mensal) };
    });
    return map;
  }, [cofrinhos]);

  const now = new Date();
  const daysInMonth = new Date(month.year, month.month, 0).getDate();
  const currentDay = month.year === now.getFullYear() && month.month === now.getMonth() + 1
    ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
  const monthProgress = Math.round((currentDay / daysInMonth) * 100);
  const isPositive = finalBalance >= 0;

  // Budget usage — based on cofrinhos
  const totalPlanned = cofrinhos.reduce((s, c) => s + Number(c.orcamento_mensal), 0);
  const budgetUsage = totalPlanned > 0 ? Math.round((totalExpense / totalPlanned) * 100) : 0;
  const overBudget = budgetUsage > 100;

  // Pie chart data — expense distribution by cofrinho
  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const key = (t as any).cofrinho_id || '__none__';
      map[key] = (map[key] || 0) + Number(t.amount);
    });
    const entries = Object.entries(map)
      .map(([id, value]) => {
        const c = cofrinhoMap[id];
        return {
          id,
          name: c?.nome ?? 'Sem cofrinho',
          color: c?.cor ?? 'hsl(var(--muted-foreground))',
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
    const total = entries.reduce((s, e) => s + e.value, 0);
    return entries.map((e) => ({
      ...e,
      fill: e.color,
      percent: total > 0 ? Math.round((e.value / total) * 100) : 0,
    }));
  }, [transactions, cofrinhoMap]);

  // Bar chart data — budget vs realized by cofrinho
  const barData = useMemo(() => {
    const realizedMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense' && t.status === 'realized').forEach(t => {
      const key = (t as any).cofrinho_id || '__none__';
      realizedMap[key] = (realizedMap[key] || 0) + Number(t.amount);
    });
    const ids = new Set<string>([
      ...cofrinhos.map(c => c.id),
      ...Object.keys(realizedMap),
    ]);
    return Array.from(ids).map(id => {
      const c = cofrinhoMap[id];
      const nome = c?.nome ?? 'Sem cofrinho';
      return {
        id,
        category: nome.length > 12 ? nome.slice(0, 12) + '…' : nome,
        cor: c?.cor ?? 'hsl(var(--muted-foreground))',
        Orçado: Number(c?.orcamento ?? 0),
        Realizado: realizedMap[id] || 0,
      };
    }).sort((a, b) => b.Realizado - a.Realizado);
  }, [transactions, cofrinhos, cofrinhoMap]);

  // Line chart data — daily cumulative balance evolution
  const lineData = useMemo(() => {
    const sorted = [...transactions]
      .filter(t => t.status === 'realized')
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) return [];

    const dailyMap: Record<string, { income: number; expense: number }> = {};
    sorted.forEach(t => {
      const day = t.date;
      if (!dailyMap[day]) dailyMap[day] = { income: 0, expense: 0 };
      if (t.type === 'income') dailyMap[day].income += Number(t.amount);
      else dailyMap[day].expense += Number(t.amount);
    });

    const days = Object.keys(dailyMap).sort();
    let cumBalance = Number(month.initial_balance);
    return days.map(day => {
      cumBalance += dailyMap[day].income - dailyMap[day].expense;
      const d = new Date(day + 'T12:00:00');
      return {
        day: `${d.getDate()}/${d.getMonth() + 1}`,
        Receitas: dailyMap[day].income,
        Despesas: dailyMap[day].expense,
        Saldo: cumBalance,
      };
    });
  }, [transactions, month.initial_balance]);

  const hasExpenses = pieData.length > 0;
  const hasBudget = barData.length > 0;
  const hasLineData = lineData.length > 0;
  const hasCofrinhos = cofrinhos.length > 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho inteligente: situação real + insight + próximos impactos + cofrinhos */}
      <SmartDashboardHeader month={month} />

      {/* Relatório premium */}
      <div className="flex items-center justify-between rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-4">
        <div className="min-w-0 pr-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Relatório premium</p>
          <p className="text-sm font-medium mt-0.5 truncate">Gere um PDF editorial deste mês</p>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Resumo executivo, evolução de 6 meses, cofrinhos, cartões e insights.</p>
        </div>
        <Button size="sm" onClick={() => setReportOpen(true)} className="shrink-0">
          <FileText className="h-4 w-4 mr-2" /> Gerar relatório
        </Button>
      </div>

      {/* Análise detalhada */}
      <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen} className="space-y-4">
        <CollapsibleTrigger className="group w-full flex items-center justify-between pt-2 pb-1 text-left">
          <div>
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
              Análise detalhada
            </h2>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {analyticsOpen ? 'Toque para ocultar gráficos' : 'Receitas, despesas, orçamento e evolução'}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${analyticsOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 data-[state=open]:animate-fade-in">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'hsl(var(--finzap-green) / 0.1)' }}>
                <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--finzap-green))' }} />
              </div>
              <span className="text-xs text-muted-foreground">Receitas</span>
            </div>
            <p className="text-lg md:text-xl font-bold" style={{ color: 'hsl(var(--finzap-green))' }}>{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'hsl(var(--finzap-red) / 0.1)' }}>
                <TrendingDown className="h-4 w-4" style={{ color: 'hsl(var(--finzap-red))' }} />
              </div>
              <span className="text-xs text-muted-foreground">Despesas</span>
            </div>
            <p className="text-lg md:text-xl font-bold" style={{ color: 'hsl(var(--finzap-red))' }}>{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Saldo</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-primary">{formatCurrency(finalBalance)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${overBudget ? 'bg-[hsl(var(--finzap-red)/0.1)]' : 'bg-primary/10'}`}>
                <Target className={`h-4 w-4 ${overBudget ? '' : 'text-primary'}`} style={overBudget ? { color: 'hsl(var(--finzap-red))' } : {}} />
              </div>
              <span className="text-xs text-muted-foreground">Orçamento</span>
            </div>
            <p className={`text-lg md:text-xl font-bold ${overBudget ? '' : 'text-primary'}`} style={overBudget ? { color: 'hsl(var(--finzap-red))' } : {}}>
              {totalPlanned > 0 ? `${budgetUsage}%` : '—'}
            </p>
            {totalPlanned > 0 && (
              <Progress value={Math.min(budgetUsage, 100)} className={`h-1.5 mt-2 ${overBudget ? '[&>div]:bg-[hsl(var(--finzap-red))]' : ''}`} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget alert */}
      {overBudget && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[hsl(var(--finzap-red)/0.1)]">
          <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--finzap-red))' }} />
          <span className="text-sm font-medium" style={{ color: 'hsl(var(--finzap-red))' }}>
            Orçamento ultrapassado — você gastou {formatCurrency(totalExpense - totalPlanned)} além do previsto.
          </span>
        </div>
      )}

      {/* Charts row 1: Pie + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart: expense distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-muted-foreground" />
              Distribuição de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {hasExpenses ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 w-full max-w-xs">
                  {pieData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.fill }} />
                      <span className="text-muted-foreground truncate">{entry.name}</span>
                      <span className="ml-auto font-medium">{entry.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <PieIcon className="h-8 w-8 opacity-30" />
                <span>{hasCofrinhos ? 'Nenhuma despesa registrada nos cofrinhos' : 'Crie cofrinhos para visualizar a distribuição'}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar chart: budget vs realized */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Orçado vs Realizado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {hasBudget ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Orçado" radius={[4, 4, 0, 0]} barSize={20} fillOpacity={0.35}>
                    {barData.map((entry, i) => (
                      <Cell key={`o-${i}`} fill={entry.cor} />
                    ))}
                  </Bar>
                  <Bar dataKey="Realizado" radius={[4, 4, 0, 0]} barSize={20}>
                    {barData.map((entry, i) => (
                      <Cell key={`r-${i}`} fill={entry.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-8 w-8 opacity-30" />
                <span>{hasCofrinhos ? 'Defina orçamentos nos cofrinhos para comparar' : 'Crie cofrinhos para acompanhar orçamento vs realizado'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line chart: balance evolution */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Evolução do Saldo no Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {hasLineData ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={lineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Saldo" stroke="hsl(217, 91%, 60%)" fill="url(#gradSaldo)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Receitas" stroke="hsl(var(--finzap-green))" strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Despesas" stroke="hsl(var(--finzap-red))" strokeWidth={1.5} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Adicione transações realizadas para ver a evolução
            </div>
          )}
        </CardContent>
      </Card>

      {/* Month progress */}
      <Card className="border border-border/60 shadow-none">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium">Progresso do mês</span>
            <span className="text-sm text-muted-foreground">Dia {currentDay} de {daysInMonth}</span>
          </div>
          <Progress value={monthProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{monthProgress}% do mês concluído</p>
        </CardContent>
      </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
