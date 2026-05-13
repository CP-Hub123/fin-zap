import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, MONTH_NAMES } from '@/lib/constants';
import type { CreditCard, CardPurchase, CardInstallment } from '@/hooks/useCreditCards';
import {
  CreditCard as CreditCardIcon, Calendar, Wallet, TrendingDown, TrendingUp,
  ShoppingBag, Repeat, Layers, Sparkles, AlertCircle, Info, Trash2, Plus,
} from 'lucide-react';
import { EmptyState } from './EmptyState';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  card: CreditCard | null;
  purchases: CardPurchase[];
  installments: CardInstallment[];
  onAddPurchase: (cardId: string) => void;
  onDeletePurchase: (purchaseId: string) => void;
}

function vencimentoMes(card: CreditCard, year: number, month0: number) {
  const last = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(card.vencimento_dia, last));
}

/** Próximo vencimento a partir de hoje. */
function proximoVencimento(card: CreditCard, ref = new Date()) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const day = ref.getDate();
  let venY = y, venM = m;
  if (day >= card.fechamento_dia) {
    venM = m + 1;
    if (venM > 11) { venM = 0; venY += 1; }
  }
  return vencimentoMes(card, venY, venM);
}

function isAssinatura(p: CardPurchase) {
  const s = (p.descricao || '').toLowerCase();
  return /netflix|spotify|prime|disney|hbo|youtube|apple|icloud|globo|deezer|paramount|crunchy|tidal|microsoft|adobe|chatgpt|openai/.test(s);
}

export function CardDetailSheet({
  open, onOpenChange, card, purchases, installments, onAddPurchase, onDeletePurchase,
}: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, [open]);

  const data = useMemo(() => {
    if (!card) return null;
    const cardPurchases = purchases.filter(p => p.card_id === card.id);
    const cardInstallments = installments.filter(i => cardPurchases.some(p => p.id === i.card_purchase_id));

    const venc = proximoVencimento(card, today);
    // Fatura atual = parcelas com data no mês do próximo vencimento
    const faturaInst = cardInstallments.filter(i => {
      const d = new Date(i.date);
      return d.getFullYear() === venc.getFullYear() && d.getMonth() === venc.getMonth();
    });
    const faturaTotal = faturaInst.reduce((s, i) => s + Number(i.amount), 0);

    // Limite utilizado = parcelas a partir do início do mês atual
    const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1);
    const utilizado = cardInstallments
      .filter(i => new Date(i.date) >= inicioMes)
      .reduce((s, i) => s + Number(i.amount), 0);
    const disponivel = Math.max(0, Number(card.limite) - utilizado);
    const pct = card.limite > 0 ? Math.min(100, (utilizado / Number(card.limite)) * 100) : 0;

    // Timeline 6 meses
    const timeline: { y: number; m: number; total: number; label: string }[] = [];
    for (let k = 0; k < 6; k++) {
      const d = new Date(venc.getFullYear(), venc.getMonth() + k, 1);
      const total = cardInstallments
        .filter(i => {
          const id = new Date(i.date);
          return id.getFullYear() === d.getFullYear() && id.getMonth() === d.getMonth();
        })
        .reduce((s, i) => s + Number(i.amount), 0);
      timeline.push({ y: d.getFullYear(), m: d.getMonth(), total, label: MONTH_NAMES[d.getMonth()].slice(0, 3) });
    }
    const maxTimeline = Math.max(1, ...timeline.map(t => t.total));
    const totalFuturo = cardInstallments
      .filter(i => new Date(i.date) > venc)
      .reduce((s, i) => s + Number(i.amount), 0);

    // Agrupamento de compras desta fatura
    const purchaseIdsInFatura = new Set(faturaInst.map(i => i.card_purchase_id));
    const comprasFatura = cardPurchases
      .filter(p => purchaseIdsInFatura.has(p.id))
      .map(p => {
        const inst = faturaInst.find(i => i.card_purchase_id === p.id);
        return { p, parcelaNum: inst?.parcela_num ?? 1, parcelaValor: Number(inst?.amount ?? 0) };
      });
    const assinaturas = comprasFatura.filter(x => isAssinatura(x.p));
    const parceladas = comprasFatura.filter(x => !isAssinatura(x.p) && x.p.parcelas > 1);
    const aVista = comprasFatura.filter(x => !isAssinatura(x.p) && x.p.parcelas === 1);
    const maiores = [...comprasFatura].sort((a, b) => b.parcelaValor - a.parcelaValor).slice(0, 3);

    // Alertas
    const alertas: { icon: typeof Info; tone: 'info' | 'warn' | 'good'; text: string }[] = [];
    if (pct >= 80) alertas.push({ icon: AlertCircle, tone: 'warn', text: 'Você já comprometeu mais de 80% do seu limite. Que tal pausar novas compras?' });
    else if (pct >= 50) alertas.push({ icon: Info, tone: 'info', text: `Seu uso de limite está em ${pct.toFixed(0)}%. Ainda há espaço, mas vale acompanhar.` });

    // próximo mês com pico
    if (timeline.length >= 2) {
      const next = timeline[1];
      if (next.total > faturaTotal * 1.2 && next.total > 0) {
        alertas.push({ icon: TrendingUp, tone: 'warn', text: `${MONTH_NAMES[next.m]} terá uma fatura mais pesada (${formatCurrency(next.total)}).` });
      }
      // queda significativa nos próximos meses
      const lastMonth = timeline[timeline.length - 1];
      if (faturaTotal > 0 && lastMonth.total < faturaTotal * 0.5) {
        alertas.push({ icon: TrendingDown, tone: 'good', text: `Seu comprometimento cai bastante até ${MONTH_NAMES[lastMonth.m]}.` });
      }
    }
    if (parceladas.length === 0 && comprasFatura.length > 0) {
      alertas.push({ icon: Sparkles, tone: 'good', text: 'Nenhum parcelamento nesta fatura. Crédito leve e saudável.' });
    }

    return {
      venc, faturaTotal, faturaInst, utilizado, disponivel, pct, timeline, maxTimeline,
      totalFuturo, comprasFatura, assinaturas, parceladas, aVista, maiores, alertas,
      cardPurchases,
    };
  }, [card, purchases, installments, today]);

  if (!card || !data) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] p-0 rounded-t-3xl overflow-hidden flex flex-col"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Detalhes do cartão {card.nome}</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* HERO */}
          <div
            className="relative px-5 pt-7 pb-6 text-white overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${card.cor}, ${card.cor}cc)` }}
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute right-6 bottom-0 w-24 h-24 rounded-full bg-white/5" />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-widest opacity-80">{card.bandeira}</p>
              <h2 className="text-lg font-bold mt-0.5 truncate">{card.nome}</h2>

              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-widest opacity-80">Fatura atual</p>
                <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-tight mt-0.5">
                  {formatCurrency(data.faturaTotal)}
                </p>
                <p className="text-xs opacity-90 mt-1">
                  Vence em {data.venc.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </p>
              </div>

              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="opacity-80">Limite usado</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(data.utilizado)} <span className="opacity-70 font-normal">/ {formatCurrency(Number(card.limite))}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${data.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] opacity-80">
                  <span>Disponível {formatCurrency(data.disponivel)}</span>
                  <span>{data.pct.toFixed(0)}% usado</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-5 space-y-5">
            {/* KPIs */}
            <section className="grid grid-cols-3 gap-2">
              <MiniKpi icon={<Calendar className="h-3 w-3" />} label="Fechamento" value={`Dia ${card.fechamento_dia}`} />
              <MiniKpi icon={<Calendar className="h-3 w-3" />} label="Vencimento" value={`Dia ${card.vencimento_dia}`} />
              <MiniKpi icon={<Wallet className="h-3 w-3" />} label="Comprometido" value={formatCurrency(data.totalFuturo)} hint="próximas faturas" />
            </section>

            {/* ALERTAS */}
            {data.alertas.length > 0 && (
              <section className="space-y-2">
                {data.alertas.map((a, i) => (
                  <Alerta key={i} {...a} />
                ))}
              </section>
            )}

            {/* TIMELINE FUTURA */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Próximos meses</h3>
                <span className="text-[11px] text-muted-foreground">comprometido</span>
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-6 gap-2 items-end h-32">
                    {data.timeline.map((t, i) => {
                      const h = t.total === 0 ? 4 : Math.max(8, (t.total / data.maxTimeline) * 100);
                      const isCurrent = i === 0;
                      return (
                        <div key={i} className="flex flex-col items-center gap-1.5 min-w-0">
                          <span className="text-[10px] tabular-nums font-medium text-foreground/80 truncate w-full text-center">
                            {t.total > 0 ? formatCurrency(t.total).replace('R$', '').trim() : '—'}
                          </span>
                          <div className="w-full flex-1 flex items-end">
                            <div
                              className={`w-full rounded-md transition-all duration-500 ${
                                isCurrent ? 'bg-primary' : 'bg-primary/25'
                              }`}
                              style={{ height: `${h}%`, minHeight: '4px' }}
                            />
                          </div>
                          <span className={`text-[10px] uppercase tracking-wide ${isCurrent ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                            {t.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* MAIORES GASTOS DA FATURA */}
            {data.maiores.length > 0 && data.faturaTotal > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
                  Maiores na fatura
                </h3>
                <Card>
                  <CardContent className="p-0 divide-y divide-border/50">
                    {data.maiores.map(({ p, parcelaNum, parcelaValor }) => (
                      <CompraRow
                        key={p.id}
                        p={p}
                        parcelaNum={parcelaNum}
                        parcelaValor={parcelaValor}
                        cor={card.cor}
                      />
                    ))}
                  </CardContent>
                </Card>
              </section>
            )}

            {/* GRUPOS */}
            {data.assinaturas.length > 0 && (
              <Grupo
                titulo="Assinaturas"
                icon={<Repeat className="h-3.5 w-3.5" />}
                itens={data.assinaturas}
                cor={card.cor}
                onDelete={onDeletePurchase}
              />
            )}
            {data.parceladas.length > 0 && (
              <Grupo
                titulo="Parcelamentos"
                icon={<Layers className="h-3.5 w-3.5" />}
                itens={data.parceladas}
                cor={card.cor}
                onDelete={onDeletePurchase}
              />
            )}
            {data.aVista.length > 0 && (
              <Grupo
                titulo="Compras à vista"
                icon={<ShoppingBag className="h-3.5 w-3.5" />}
                itens={data.aVista}
                cor={card.cor}
                onDelete={onDeletePurchase}
              />
            )}

            {data.comprasFatura.length === 0 && (
              <EmptyState
                icon={ShoppingBag}
                eyebrow="Fatura limpa"
                title="Sem compras nesta fatura"
                description="Quando você registrar uma compra neste cartão, ela aparece aqui — com data, parcelas e impacto nos próximos meses."
                primaryAction={{ label: 'Registrar compra', onClick: () => card && onAddPurchase(card.id), icon: Plus }}
                tone="neutral"
                compact
              />
            )}

            <div className="h-2" />
          </div>
        </div>

        {/* CTA fixo */}
        <div className="border-t border-border/60 bg-card/95 backdrop-blur p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button onClick={() => onAddPurchase(card.id)} className="w-full h-11 rounded-full">
            <Plus className="h-4 w-4 mr-1.5" /> Nova compra neste cartão
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ===== Subcomponents ===== */

function MiniKpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-2.5 space-y-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="h-4 w-4 flex items-center justify-center">{icon}</span>
          <span className="text-[10px] uppercase tracking-wide font-medium truncate">{label}</span>
        </div>
        <p className="text-sm font-bold tabular-nums truncate">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Alerta({ icon: Icon, tone, text }: { icon: any; tone: 'info' | 'warn' | 'good'; text: string }) {
  const cls =
    tone === 'warn' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
    : tone === 'good' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
    : 'bg-primary/10 text-primary border-primary/20';
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-[12px] leading-snug ${cls}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function CompraRow({ p, parcelaNum, parcelaValor, cor, onDelete }: {
  p: CardPurchase; parcelaNum: number; parcelaValor: number; cor: string; onDelete?: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${cor}20`, color: cor }}
      >
        <ShoppingBag className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{p.descricao}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {p.parcelas > 1 ? `Parcela ${parcelaNum}/${p.parcelas}` : 'À vista'}
          {p.categoria ? ` • ${p.categoria}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <p className="text-sm font-semibold tabular-nums">{formatCurrency(parcelaValor)}</p>
        {onDelete && (
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(p.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Grupo({ titulo, icon, itens, cor, onDelete }: {
  titulo: string;
  icon: React.ReactNode;
  itens: { p: CardPurchase; parcelaNum: number; parcelaValor: number }[];
  cor: string;
  onDelete: (id: string) => void;
}) {
  const total = itens.reduce((s, x) => s + x.parcelaValor, 0);
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <span className="text-foreground/70">{icon}</span>{titulo}
          <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
            ({itens.length})
          </span>
        </h3>
        <span className="text-xs font-semibold tabular-nums">{formatCurrency(total)}</span>
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-border/50">
          {itens.map(({ p, parcelaNum, parcelaValor }) => (
            <CompraRow key={p.id} p={p} parcelaNum={parcelaNum} parcelaValor={parcelaValor} cor={cor} onDelete={onDelete} />
          ))}
        </CardContent>
      </Card>
    </section>
  );
}