import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/constants';
import { TrendingUp, TrendingDown, Minus, Sparkles, CalendarDays, Wallet, CreditCard as CardIcon, Activity } from 'lucide-react';
import type { Month } from '@/hooks/useMonths';
import type { Transaction } from '@/hooks/useTransactions';
import { useHistoricalTransactions } from '@/hooks/useHistoricalTransactions';
import {
  buildCategoryStats,
  buildMonthProjection,
  buildPlanningInsights,
  TONE_STYLES,
  type CategoryStat,
} from '@/lib/planningEngine';
import { CofrinhosView } from './CofrinhosView';
import type { Cofrinho } from '@/hooks/useCofrinhos';

interface Props {
  month: Month;
  transactions: Transaction[];
  cofrinhos: Cofrinho[];
  isClosed: boolean;
  onCreateCofrinho: (data: any) => Promise<any>;
  onUpdateCofrinho: (data: Partial<Cofrinho> & { id: string }) => Promise<any>;
  onDeleteCofrinho: (id: string) => Promise<any>;
  onTransfer?: (data: { origem_id: string; destino_id: string; valor: number; descricao?: string }) => Promise<any>;
}

export const PlanningCenterView = ({
  month, transactions, cofrinhos, isClosed,
  onCreateCofrinho, onUpdateCofrinho, onDeleteCofrinho, onTransfer,
}: Props) => {
  const { data: history = [], isLoading: historyLoading } = useHistoricalTransactions(6);

  const monthDate = useMemo(() => new Date(month.year, month.month - 1, 1), [month]);
  const today = new Date();

  const projection = useMemo(
    () => buildMonthProjection(monthDate, transactions, today),
    [monthDate, transactions],
  );

  const stats = useMemo(
    () => buildCategoryStats(history, transactions),
    [history, transactions],
  );

  const upcoming = useMemo(() => {
    const in14 = new Date(); in14.setDate(today.getDate() + 14);
    return transactions
      .filter(t => t.type === 'expense' && t.status !== 'realized')
      .filter(t => {
        const d = new Date(t.date);
        return d >= today && d <= in14;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  const insights = useMemo(
    () => buildPlanningInsights({ projection, stats, upcoming }),
    [projection, stats, upcoming],
  );

  return (
    <Tabs defaultValue="previsao" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-11">
        <TabsTrigger value="previsao" className="text-xs sm:text-sm">
          <Activity className="h-3.5 w-3.5 mr-1.5" /> Previsibilidade
        </TabsTrigger>
        <TabsTrigger value="cofrinhos" className="text-xs sm:text-sm">
          <Wallet className="h-3.5 w-3.5 mr-1.5" /> Cofrinhos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="previsao" className="space-y-4 mt-4">
        {/* Hero — Projection */}
        <ProjectionHero projection={projection} />

        {/* Insights */}
        <section className="space-y-2">
          <SectionLabel icon={<Sparkles className="h-3.5 w-3.5" />} label="Insights de planejamento" />
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : insights.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              eyebrow="Aprendendo seu padrão"
              title="Em breve, leituras do seu mês"
              description="Conforme você registra transações, o FinZap entende seu ritmo e começa a sugerir leituras inteligentes aqui."
              tone="neutral"
              compact
            />
          ) : (
            <div className="space-y-2">
              {insights.slice(0, 5).map(i => {
                const s = TONE_STYLES[i.tone];
                return (
                  <div
                    key={i.id}
                    className={`rounded-xl ring-1 ${s.ring} ${s.bg} p-3.5 sm:p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                      <div className="min-w-0 space-y-0.5">
                        <p className={`text-sm font-semibold ${s.text}`}>{i.title}</p>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">{i.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming commitments */}
        {upcoming.length > 0 && (
          <section className="space-y-2">
            <SectionLabel icon={<CalendarDays className="h-3.5 w-3.5" />} label="Próximos compromissos (14 dias)" />
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <ul className="divide-y divide-border/60">
                  {upcoming.slice(0, 6).map(t => (
                    <li key={t.id} className="flex items-center justify-between gap-3 p-3.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          {t.category ? ` • ${t.category}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums shrink-0">
                        {formatCurrency(Number(t.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Category patterns */}
        <section className="space-y-2">
          <SectionLabel icon={<Activity className="h-3.5 w-3.5" />} label="Padrões por categoria" />
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : stats.length === 0 ? (
            <EmptyState
              icon={Activity}
              eyebrow="Ainda construindo seu histórico"
              title="Padrões aparecem com o tempo"
              description="Em poucos meses, o FinZap começa a prever sua faixa habitual por categoria — mínimo, média e máximo."
              tone="neutral"
              compact
            />
          ) : (
            <div className="space-y-2.5">
              {stats.slice(0, 8).map(s => (
                <CategoryRow key={s.category} stat={s} />
              ))}
            </div>
          )}
        </section>
      </TabsContent>

      <TabsContent value="cofrinhos" className="mt-4">
        <CofrinhosView
          cofrinhos={cofrinhos}
          isClosed={isClosed}
          onCreate={onCreateCofrinho}
          onUpdate={onUpdateCofrinho}
          onDelete={onDeleteCofrinho}
          onTransfer={onTransfer}
        />
      </TabsContent>
    </Tabs>
  );
};

const SectionLabel = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
    {icon}
    <span>{label}</span>
  </div>
);

const ProjectionHero = ({ projection }: { projection: ReturnType<typeof buildMonthProjection> }) => {
  const { projectedExpense, projectedBalance, realizedExpense, plannedFutureExpense, cardShare, pctElapsed } = projection;
  const positive = projectedBalance >= 0;
  const expensePct = projectedExpense > 0 ? Math.min(100, Math.round((realizedExpense / projectedExpense) * 100)) : 0;

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Saldo previsto até o fechamento</p>
            <p className={`text-2xl sm:text-3xl font-bold tabular-nums mt-1 ${positive ? 'text-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
              {formatCurrency(projectedBalance)}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {positive
                ? 'Mantendo o ritmo atual, você deve fechar o mês no positivo.'
                : 'Mantendo o ritmo atual, há risco de fechar o mês negativo.'}
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Mês decorrido</span>
            <span className="tabular-nums">{Math.round(pctElapsed * 100)}%</span>
          </div>
          <Progress value={pctElapsed * 100} className="h-1.5" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniStat
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Realizado"
            value={formatCurrency(realizedExpense)}
            sub={`${expensePct}% do previsto`}
          />
          <MiniStat
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="A vencer"
            value={formatCurrency(plannedFutureExpense)}
            sub="próximas saídas"
          />
          <MiniStat
            icon={<CardIcon className="h-3.5 w-3.5" />}
            label="Cartão"
            value={`${Math.round(cardShare * 100)}%`}
            sub="dos gastos"
          />
        </div>
      </CardContent>
    </Card>
  );
};

const MiniStat = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) => (
  <div className="rounded-xl bg-muted/40 p-2.5">
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
      {icon}<span className="truncate">{label}</span>
    </div>
    <p className="text-sm font-semibold tabular-nums mt-1 truncate">{value}</p>
    <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
  </div>
);

const CategoryRow = ({ stat }: { stat: CategoryStat }) => {
  const hasHistory = stat.samples > 0;
  const upperBound = Math.max(stat.max, stat.current, 1);
  const currentPct = Math.min(100, Math.round((stat.current / upperBound) * 100));
  const avgPct = Math.min(100, Math.round((stat.avg / upperBound) * 100));

  const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    stat.trend === 'up' ? 'text-amber-600 dark:text-amber-400'
      : stat.trend === 'down' ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-muted-foreground';

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{stat.category}</p>
            <p className="text-[11px] text-muted-foreground">
              {hasHistory
                ? `Faixa habitual ${formatCurrency(stat.min)} – ${formatCurrency(stat.max)}`
                : 'Sem histórico ainda'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold tabular-nums">{formatCurrency(stat.current)}</p>
            {hasHistory && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                {stat.trend === 'up' ? 'em alta' : stat.trend === 'down' ? 'em queda' : 'estável'}
              </span>
            )}
          </div>
        </div>
        {hasHistory && (
          <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary/70"
              style={{ width: `${currentPct}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-px bg-foreground/40"
              style={{ left: `${avgPct}%` }}
              title="Média"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};