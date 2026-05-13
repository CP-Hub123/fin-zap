import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';
import { useCreditCards, type CreditCard, type CardPurchase } from '@/hooks/useCreditCards';

const PARCELAS_OPTS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 24, 36, 48, 60];

interface Impact {
  lockedCount: number;
  lockedAmount: number;
  futureCount: number;
  futureAmount: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  purchase: CardPurchase | null;
  cards: CreditCard[];
}

export function EditCardPurchaseDialog({ open, onOpenChange, purchase, cards }: Props) {
  const { updatePurchase, fetchEditImpact } = useCreditCards();
  const [form, setForm] = useState({
    descricao: '',
    valor_total: '',
    parcelas: 1,
    card_id: '',
    data_compra: '',
    categoria: '',
  });
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  useEffect(() => {
    if (open && purchase) {
      setForm({
        descricao: purchase.descricao,
        valor_total: String(purchase.valor_total).replace('.', ','),
        parcelas: purchase.parcelas,
        card_id: purchase.card_id,
        data_compra: purchase.data_compra.slice(0, 10),
        categoria: purchase.categoria ?? '',
      });
      setImpact(null);
      setLoadingImpact(true);
      fetchEditImpact(purchase.id)
        .then(setImpact)
        .catch(() => setImpact(null))
        .finally(() => setLoadingImpact(false));
    }
  }, [open, purchase]);

  const valorNum = useMemo(
    () => parseFloat(String(form.valor_total).replace(',', '.')) || 0,
    [form.valor_total],
  );

  const locked = impact?.lockedCount ?? 0;
  const lockedSum = impact?.lockedAmount ?? 0;
  const remaining = Math.max(0, form.parcelas - locked);
  const remainingValor = Math.max(0, valorNum - lockedSum);
  const novoParcelaValor = remaining > 0 ? remainingValor / remaining : 0;

  const parcelasInvalida = form.parcelas < locked;
  const valorInvalido = valorNum < lockedSum;

  async function submit() {
    if (!purchase) return;
    if (parcelasInvalida || valorInvalido) return;
    if (!form.descricao.trim() || !form.card_id || valorNum <= 0) return;
    await updatePurchase.mutateAsync({
      id: purchase.id,
      descricao: form.descricao.trim(),
      valor_total: valorNum,
      parcelas: form.parcelas,
      card_id: form.card_id,
      data_compra: form.data_compra,
      categoria: form.categoria || null,
    });
    onOpenChange(false);
  }

  const parcelasOpts = useMemo(() => {
    const set = new Set(PARCELAS_OPTS);
    if (purchase) set.add(purchase.parcelas);
    if (locked > 0) set.add(locked);
    return Array.from(set).filter(n => n >= Math.max(1, locked)).sort((a, b) => a - b);
  }, [purchase, locked]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar compra</DialogTitle>
          <DialogDescription>
            Ajustes seguros: meses já fechados permanecem intactos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              className="h-11"
              maxLength={48}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cartão</Label>
            <Select value={form.card_id} onValueChange={v => setForm(f => ({ ...f, card_id: v }))}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {cards.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                      {c.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor total (R$)</Label>
              <Input
                inputMode="decimal"
                value={form.valor_total}
                onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))}
                className="h-11 tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Parcelas</Label>
              <Select value={String(form.parcelas)} onValueChange={v => setForm(f => ({ ...f, parcelas: Number(v) }))}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {parcelasOpts.map(n => (
                    <SelectItem key={n} value={String(n)}>{n === 1 ? 'À vista' : `${n}x`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Data da compra</Label>
            <Input
              type="date"
              value={form.data_compra}
              onChange={e => setForm(f => ({ ...f, data_compra: e.target.value }))}
              className="h-11"
            />
          </div>

          {/* Impacto */}
          <div className="rounded-xl border bg-muted/40 p-3 space-y-2 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Impacto desta edição
            </p>

            {loadingImpact ? (
              <p className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Calculando…
              </p>
            ) : (
              <div className="space-y-1.5 text-muted-foreground">
                {locked > 0 ? (
                  <p className="flex items-start gap-1.5">
                    <Lock className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
                    <span>
                      <span className="font-semibold text-foreground">{locked}</span> parcela(s) em meses fechados ({formatCurrency(lockedSum)}) serão <span className="font-semibold text-foreground">preservadas</span>.
                    </span>
                  </p>
                ) : (
                  <p className="flex items-start gap-1.5">
                    <ShieldCheck className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                    <span>Nenhuma parcela consolidada — toda a compra será recalculada.</span>
                  </p>
                )}

                {remaining > 0 ? (
                  <p>
                    Próximas <span className="font-semibold text-foreground">{remaining}</span> parcelas serão recriadas em{' '}
                    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(novoParcelaValor)}</span> cada.
                  </p>
                ) : (
                  <p>Nenhuma parcela futura a recriar.</p>
                )}

                {parcelasInvalida && (
                  <p className="text-destructive">
                    Não é possível ter menos de {locked} parcelas (já consolidadas).
                  </p>
                )}
                {valorInvalido && (
                  <p className="text-destructive">
                    O valor total não pode ser menor que o já consolidado ({formatCurrency(lockedSum)}).
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={
              !form.descricao.trim() ||
              !form.card_id ||
              valorNum <= 0 ||
              parcelasInvalida ||
              valorInvalido ||
              updatePurchase.isPending
            }
          >
            {updatePurchase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}