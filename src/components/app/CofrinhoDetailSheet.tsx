import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import { getPreset, getStatusLevel, STATUS_META } from '@/lib/cofrinhoPresets';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Cofrinho } from '@/hooks/useCofrinhos';

interface Props {
  cofrinho: Cofrinho | null;
  cofrinhos: Cofrinho[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (data: { origem_id: string; destino_id: string; valor: number; descricao?: string }) => Promise<any>;
}

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
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!c?.id && open,
  });

  const preset = useMemo(() => getPreset(c?.cover_preset), [c?.cover_preset]);

  if (!c) return null;

  const Icon = preset.icon;
  const isMensal = c.tipo === 'mensal';
  const numerador = isMensal ? Number(c.gasto_mes) : Number(c.saldo);
  const denominador = isMensal ? Number(c.orcamento_mensal) : Number(c.meta_valor);
  const pct = denominador > 0 ? Math.min(150, Math.round((numerador / denominador) * 100)) : 0;
  const statusPct = isMensal ? pct : Math.max(0, 100 - pct);
  const status = getStatusLevel(statusPct);
  const meta = STATUS_META[status];

  const mesesProt = c.tipo === 'reserva' && Number(c.custo_mensal) > 0
    ? Number(c.saldo) / Number(c.custo_mensal)
    : null;

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
      <SheetContent side="bottom" className="h-[92vh] p-0 overflow-y-auto rounded-t-2xl">
        <div
          className="relative p-6 pt-8 text-white"
          style={{ backgroundImage: preset.gradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/30" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Icon className="h-6 w-6" />
              </div>
              <Badge className={`${meta.dot} text-white border-0`}>{meta.label}</Badge>
            </div>
            <div>
              <p className="text-xs opacity-80">{c.nome}</p>
              <p className="text-3xl font-bold tabular-nums">{formatCurrency(Number(c.saldo))}</p>
            </div>
            {denominador > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs opacity-90">
                  <span>{isMensal ? 'Gasto do mês' : 'Progresso da meta'}</span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-700"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className="text-xs opacity-80">
                  {formatCurrency(numerador)} de {formatCurrency(denominador)}
                </p>
              </div>
            )}
            {mesesProt !== null && (
              <div className="flex items-center gap-2 text-sm bg-white/15 backdrop-blur-sm rounded-lg p-3">
                <ShieldCheck className="h-4 w-4" />
                <span>Você está protegido por <strong>{mesesProt.toFixed(1)} {mesesProt === 1 ? 'mês' : 'meses'}</strong></span>
              </div>
            )}
          </div>
        </div>

        <SheetHeader className="sr-only">
          <SheetTitle>{c.nome}</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={() => setTransferOpen(true)} variant="outline" className="justify-start">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Transferir para outro cofrinho
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Extrato</h3>
            {extrato.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Sem movimentações neste cofrinho ainda.
              </p>
            ) : (
              <div className="space-y-1.5">
                {extrato.map((t: any) => {
                  const isIncome = t.type === 'income';
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>
                        {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {t.source === 'recurring' && ' · 🔁'}
                        </p>
                      </div>
                      <p className={`text-sm font-bold tabular-nums ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Transfer dialog */}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent className="max-w-sm mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>Transferir de "{c.nome}"</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Para qual cofrinho?</Label>
                <Select value={destino} onValueChange={setDestino}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Escolha o destino..." /></SelectTrigger>
                  <SelectContent>
                    {cofrinhos.filter(x => x.id !== c.id).map(x => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="min-h-[44px]" />
                <p className="text-xs text-muted-foreground">Saldo disponível: {formatCurrency(Number(c.saldo))}</p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setTransferOpen(false)} className="min-h-[44px]">Cancelar</Button>
              <Button onClick={handleTransfer} disabled={saving} className="min-h-[44px]">
                {saving ? 'Transferindo...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
};