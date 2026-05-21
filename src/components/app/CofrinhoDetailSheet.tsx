import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import { getPreset, getStatusLevel, STATUS_META } from '@/lib/cofrinhoPresets';
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ShieldCheck,
  Activity, TrendingUp, TrendingDown, Sparkles, CalendarDays,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { analyzeCofrinho, STATUS_COLORS } from '@/lib/cofrinhoIntelligence';
import type { Cofrinho } from '@/hooks/useCofrinhos';

interface Props {
  cofrinho: Cofrinho | null;
  cofrinhos: Cofrinho[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (data: { origem_id: string; destino_id: string; valor: number; descricao?: string }) => Promise<any>;
}

const formatDateLabel = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(d); target.setHours(0,0,0,0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
};

export const CofrinhoDetailSheet = ({ cofrinho: c, cofrinhos, open, onOpenChange, onTransfer }: Props) => {
  const [transferOpen, setTransferOpen] = useState(false);
  const [destino, setDestino] = useState('');
  const [valor, setValor] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: extrato = [] } = useQuery({
    queryKey: ['cofrinho-extrato', c?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, name, amount, type, date, source, status')
        .eq('cofrinho_id', c!.id)
        .order('date', { ascending: false })
        .limit(80);
      if (error) throw error;
      return data;
    },
    enabled: !!c?.id && open,
  });

  const { data: closures = [] } = useQuery({
    queryKey: ['cofrinho-closures', c?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cofrinho_closures')
        .select('mes, ano, saldo_final, gasto_mes')
        .eq('cofrinho_id', c!.id)
        .order('ano', { ascending: true })
        .order('mes', { ascending: true })
        .limit(12);
      if (error) throw error;
      return data;
    },
    enabled: !!c?.id && open,
  });

  const preset = useMemo(() => c ? getPreset(c.cover_preset) : null, [c?.cover_preset]);

  const analysis = useMemo(() => {
    if (!c) return null;
    return analyzeCofrinho(
      c,
      (extrato as any[]).map(t => ({ id: t.id, amount: Number(t.amount), type: t.type, date: t.date })),
      closures as any[],
    );
  }, [c, extrato, closures]);

  // Timeline com saldo corrente
  const timeline = useMemo(() => {
    if (!c) return [] as Array<{ data: string; items: Array<any & { saldoApos: number }> }>;
    // extrato vem desc por data; calcular saldo corrente caminhando do mais antigo p/ recente
    const asc = [...(extrato as any[])].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    // estimar saldo inicial: saldo atual − (somatório líquido)
    const liquido = asc.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    running = Number(c.saldo) - liquido;
    const withRunning = asc.map(t => {
      running += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
      return { ...t, saldoApos: running };
    }).reverse();
    // agrupar por data
    const groups: Record<string, any[]> = {};
    for (const t of withRunning) {
      (groups[t.date] ||= []).push(t);
    }
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([data, items]) => ({ data, items }));
  }, [extrato, c?.saldo]);

  if (!c || !preset || !analysis) return null;

  const Icon = preset.icon;
  const isMensal = c.tipo === 'mensal';
  const numerador = isMensal ? Number(c.gasto_mes) : Number(c.saldo);
  const denominador = isMensal ? Number(c.orcamento_mensal) : Number(c.meta_valor);
  const pct = denominador > 0 ? Math.min(150, Math.round((numerador / denominador) * 100)) : 0;
  const statusPct = isMensal ? pct : Math.max(0, 100 - pct);
  const statusLegacy = getStatusLevel(statusPct);
  const metaLegacy = STATUS_META[statusLegacy];

  const mesesProt = c.tipo === 'reserva' && Number(c.custo_mensal) > 0
    ? Number(c.saldo) / Number(c.custo_mensal)
    : null;

  const statusStyle = STATUS_COLORS[analysis.status];

  const handleTransfer = async () => {
    const v = parseFloat(valor);
    if (!destino || !v || v <= 0) return;
    if (v > Number(c.saldo)) {
      toast({ title: 'Saldo insuficiente', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await onTransfer({ origem_id: c.id, destino_id: destino, valor: v });
      toast({ title: 'Transferência realizada' });
      setTransferOpen(false);
      setDestino(''); setValor('');
    } catch (e: any) {
      toast({ title: 'Erro ao transferir', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[94vh] p-0 overflow-y-auto rounded-t-3xl">
        {/* HERO PREMIUM */}
        <div
          className="relative px-6 pt-8 pb-7 text-white"
          style={{ backgroundImage: preset.gradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/40" />
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                <Icon className="h-7 w-7" />
              </div>
              <Badge className={`${metaLegacy.dot} text-white border-0 px-3 py-1`}>
                {metaLegacy.label}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider opacity-80">{c.nome}</p>
              <p className="text-4xl font-bold tabular-nums tracking-tight">
                {formatCurrency(Number(c.saldo))}
              </p>
              {denominador > 0 && (
                <p className="text-sm opacity-90">
                  {isMensal ? 'Gasto' : 'Guardado'} {formatCurrency(numerador)} de {formatCurrency(denominador)}
                </p>
              )}
            </div>
            {denominador > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs opacity-90">
                  <span>{isMensal ? 'Consumo do orçamento' : 'Progresso da meta'}</span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            )}
            {mesesProt !== null && (
              <div className="flex items-center gap-2 text-sm bg-white/15 backdrop-blur-md rounded-xl p-3">
                <ShieldCheck className="h-4 w-4" />
                <span>Você está protegido por <strong>{mesesProt.toFixed(1)} {mesesProt === 1 ? 'mês' : 'meses'}</strong></span>
              </div>
            )}
          </div>
        </div>

        <SheetHeader className="sr-only">
          <SheetTitle>{c.nome}</SheetTitle>
        </SheetHeader>

        <div className="p-5 space-y-6">
          {/* AÇÕES */}
          <Button
            onClick={() => setTransferOpen(true)}
            variant="outline"
            className="w-full justify-start h-12 rounded-xl"
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Transferir para outro cofrinho
          </Button>

          {/* INTELIGÊNCIA */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Inteligência do cofrinho</h3>
            </div>
            <div className="space-y-2">
              {analysis.messages.map((m, i) => {
                const s = STATUS_COLORS[m.severity];
                return (
                  <div key={i} className={`rounded-xl p-3 ring-1 ${s.bg} ${s.ring} flex items-start gap-2.5`}>
                    <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
                    <p className={`text-sm leading-relaxed ${s.text}`}>{m.text}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* STATS */}
          <section className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-secondary/60 p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Activity className="h-3 w-3" /> 30 dias
              </div>
              <p className="text-lg font-bold mt-1 tabular-nums">{analysis.stats.movimentacoes30d}</p>
              <p className="text-[10px] text-muted-foreground">{analysis.stats.frequencia}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Média</p>
              <p className="text-lg font-bold mt-1 tabular-nums">{formatCurrency(analysis.stats.media30d)}</p>
              <p className="text-[10px] text-muted-foreground">por movimentação</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {analysis.stats.deltaVsMesAnterior !== null && analysis.stats.deltaVsMesAnterior >= 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                vs mês ant.
              </div>
              <p className={`text-lg font-bold mt-1 tabular-nums ${
                analysis.stats.deltaVsMesAnterior === null ? '' :
                analysis.stats.deltaVsMesAnterior > 0 ? 'text-red-500' : 'text-emerald-600'
              }`}>
                {analysis.stats.deltaVsMesAnterior === null
                  ? '—'
                  : `${analysis.stats.deltaVsMesAnterior > 0 ? '+' : ''}${Math.round(analysis.stats.deltaVsMesAnterior)}%`}
              </p>
              <p className="text-[10px] text-muted-foreground">em gastos</p>
            </div>
          </section>

          {/* EVOLUÇÃO */}
          {analysis.evolution.length >= 2 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Evolução</h3>
                <span className="text-[10px] text-muted-foreground">Últimos meses</span>
              </div>
              <div className="rounded-xl bg-secondary/40 p-3 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysis.evolution} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any, name) => [formatCurrency(Number(v)), name === 'saldo' ? 'Saldo' : 'Gasto']}
                    />
                    <Area
                      type="monotone"
                      dataKey="saldo"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colSaldo)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* TIMELINE */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Histórico</h3>
            </div>
            {timeline.length === 0 ? (
              <div className={`rounded-xl ${statusStyle.bg} p-6 text-center`}>
                <p className="text-sm text-muted-foreground">
                  Sem movimentações neste cofrinho ainda.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {timeline.map(({ data, items }) => (
                  <div key={data} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {formatDateLabel(data)}
                    </p>
                    <div className="rounded-xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                      {items.map((t: any) => {
                        const isIncome = t.type === 'income';
                        return (
                          <div key={t.id} className="flex items-center gap-3 p-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>
                              {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{t.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {t.source === 'recurring' ? '🔁 Recorrência' : t.source === 'open_finance' ? '🔗 Open Finance' : 'Manual'}
                                {' · Saldo após: '}
                                <span className="font-semibold tabular-nums">{formatCurrency(t.saldoApos)}</span>
                              </p>
                            </div>
                            <p className={`text-sm font-bold tabular-nums ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isIncome ? '+' : '-'}{formatCurrency(Number(t.amount))}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Transfer dialog */}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir de "{c.nome}"</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Para qual cofrinho?</Label>
                <Select value={destino} onValueChange={setDestino}>
                  <SelectTrigger><SelectValue placeholder="Escolha o destino..." /></SelectTrigger>
                  <SelectContent>
                    {cofrinhos.filter(x => x.id !== c.id).map(x => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
                <p className="text-xs text-muted-foreground">Saldo disponível: {formatCurrency(Number(c.saldo))}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancelar</Button>
              <Button onClick={handleTransfer} disabled={saving}>
                {saving ? 'Transferindo...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
};