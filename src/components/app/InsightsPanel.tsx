import { useState } from 'react';
import { Sparkles, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { severityStyles, type Insight } from '@/lib/insightsEngine';
import { InsightsCenterSheet } from './InsightsCenterSheet';

interface InsightsPanelProps {
  insights: Insight[];
  /** quantos itens mostrar no preview */
  preview?: number;
}

const iconFor = (sev: Insight['severity']) => {
  if (sev === 'critical') return AlertCircle;
  if (sev === 'warning') return AlertTriangle;
  return Info;
};

export const InsightsPanel = ({ insights, preview = 3 }: InsightsPanelProps) => {
  const [open, setOpen] = useState(false);
  if (insights.length === 0) return null;

  const top = insights.slice(0, preview);
  const rest = insights.length - top.length;

  return (
    <>
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-zap text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Insights inteligentes</p>
              <p className="text-[11px] text-muted-foreground">
                {insights.length} sinal{insights.length === 1 ? '' : 'is'} sobre seu mês
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setOpen(true)}
          >
            Ver tudo <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </div>
        <div className="divide-y divide-border/40">
          {top.map(i => {
            const s = severityStyles[i.severity];
            const Icon = iconFor(i.severity);
            return (
              <div key={i.id} className="flex items-start gap-3 px-4 sm:px-5 py-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.bg} ${s.ring}`}>
                  <Icon className={`h-4 w-4 ${s.text}`} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-tight">{i.title}</p>
                  <p className="text-[12.5px] text-muted-foreground leading-snug mt-0.5">
                    {i.message}
                  </p>
                </div>
              </div>
            );
          })}
          {rest > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full text-left px-4 sm:px-5 py-2.5 text-[12px] text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              + {rest} insight{rest === 1 ? '' : 's'} adicional{rest === 1 ? '' : 'is'}
            </button>
          )}
        </div>
      </Card>
      <InsightsCenterSheet open={open} onOpenChange={setOpen} insights={insights} />
    </>
  );
};