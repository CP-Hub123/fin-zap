import { useMemo, useState } from 'react';
import { Sparkles, AlertTriangle, Info, TrendingUp, TrendingDown, ChevronRight, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { severityStyles } from '@/lib/insightsEngine';
import type { CreditInsight } from '@/lib/creditInsightsEngine';

const iconFor = (i: CreditInsight) => {
  if (i.severity === 'warning') return AlertTriangle;
  if (i.category === 'futuro') return TrendingUp;
  if (i.category === 'alivio' || i.category === 'encerramento') return TrendingDown;
  return Info;
};

interface Props {
  insights: CreditInsight[];
  preview?: number;
}

/**
 * Painel premium de inteligência contextual de crédito.
 * Exibe um resumo no topo da Central de Cartões e detalhe completo em sheet.
 */
export function CreditInsightsPanel({ insights, preview = 2 }: Props) {
  const [open, setOpen] = useState(false);
  const top = useMemo(() => insights.slice(0, preview), [insights, preview]);
  const rest = insights.length - top.length;

  if (insights.length === 0) return null;

  return (
    <>
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-zap text-primary-foreground shrink-0">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Inteligência de crédito</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {insights.length} sinal{insights.length === 1 ? '' : 'is'} sobre seus cartões
              </p>
            </div>
          </div>
          {insights.length > preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs shrink-0"
              onClick={() => setOpen(true)}
            >
              Ver tudo <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          )}
        </div>
        <div className="divide-y divide-border/40">
          {top.map(i => {
            const s = severityStyles[i.severity];
            const Icon = iconFor(i);
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => setOpen(true)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.bg} ${s.ring}`}>
                  <Icon className={`h-4 w-4 ${s.text}`} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-tight">{i.title}</p>
                  <p className="text-[12.5px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                    {i.message}
                  </p>
                </div>
              </button>
            );
          })}
          {rest > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full text-left px-4 py-2.5 text-[12px] text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              + {rest} insight{rest === 1 ? '' : 's'} adicional{rest === 1 ? '' : 'is'}
            </button>
          )}
        </div>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="overflow-y-auto max-h-[85vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-zap text-primary-foreground">
                <Sparkles className="h-4 w-4" strokeWidth={2.5} />
              </span>
              Inteligência de crédito
            </SheetTitle>
            <SheetDescription>
              Leituras tranquilas e contextuais sobre seu uso de limite, parcelas e meses futuros.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 space-y-2.5">
            {insights.map(i => {
              const s = severityStyles[i.severity];
              const Icon = iconFor(i);
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
        </SheetContent>
      </Sheet>
    </>
  );
}
