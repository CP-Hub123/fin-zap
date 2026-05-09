import { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AlertCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { severityStyles, type Insight, type InsightSeverity } from '@/lib/insightsEngine';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  insights: Insight[];
}

const iconFor = (sev: InsightSeverity) =>
  sev === 'critical' ? AlertCircle : sev === 'warning' ? AlertTriangle : Info;

const order: InsightSeverity[] = ['critical', 'warning', 'info'];

export const InsightsCenterSheet = ({ open, onOpenChange, insights }: Props) => {
  const grouped = useMemo(() => {
    const map: Record<InsightSeverity, Insight[]> = { critical: [], warning: [], info: [] };
    insights.forEach(i => map[i.severity].push(i));
    return map;
  }, [insights]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-zap text-primary-foreground">
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            </span>
            Central de Insights
          </SheetTitle>
          <SheetDescription>
            Sinais inteligentes do FinZap sobre seus cofrinhos, recorrências e ritmo do mês.
          </SheetDescription>
        </SheetHeader>

        {insights.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Tudo tranquilo por aqui. Continue acompanhando seus cofrinhos.
          </div>
        ) : (
          <div className="mt-2 space-y-6">
            {order.map(sev => {
              const items = grouped[sev];
              if (items.length === 0) return null;
              const s = severityStyles[sev];
              return (
                <section key={sev} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {s.label} · {items.length}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {items.map(i => {
                      const Icon = iconFor(i.severity);
                      return (
                        <div
                          key={i.id}
                          className={`flex items-start gap-3 rounded-2xl p-3.5 ${s.bg} ${s.ring}`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card/70">
                            <Icon className={`h-4 w-4 ${s.text}`} strokeWidth={2.3} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-semibold leading-tight">{i.title}</p>
                            <p className="text-[12.5px] text-muted-foreground leading-snug mt-0.5">
                              {i.message}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};