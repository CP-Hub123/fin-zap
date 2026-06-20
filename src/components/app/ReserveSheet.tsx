import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PiggyBank, ShieldCheck, ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { useFinancialBalance } from '@/hooks/useFinancialBalance';
import { useReserve } from '@/hooks/useReserve';
import { formatCurrency } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Mode = 'reservar' | 'resgatar';

interface Props {
  monthId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: Mode;
  onOpenCofrinhos?: () => void;
}

/**
 * Sheet primário para reservar/resgatar dinheiro direto do Dashboard, sem
 * exigir criação de cofrinho. Toda validação consulta `useFinancialBalance`
 * (fonte única de verdade) — nenhum cálculo local.
 */
export const ReserveSheet = ({ monthId, open, onOpenChange, initialMode = 'reservar', onOpenCofrinhos }: Props) => {
  const fb = useFinancialBalance(monthId);
  const { reservar, resgatar } = useReserve();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [valorStr, setValorStr] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setValorStr('');
      setDescricao('');
    }
  }, [open, initialMode]);

  const valor = useMemo(() => {
    const n = parseFloat(valorStr.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [valorStr]);

  const teto = mode === 'reservar' ? fb.saldoLivre : fb.defaultReserveSaldo;
  const excede = valor > 0 && valor > teto;
  const pode = valor > 0 && !excede && !!monthId;
  const pending = reservar.isPending || resgatar.isPending;

  const handleSubmit = async () => {
    if (!pode) return;
    const action = mode === 'reservar' ? reservar : resgatar;
    await action.mutateAsync({
      valor,
      descricao: descricao.trim() || undefined,
      monthId,
    });
    onOpenChange(false);
  };

  const setSugestao = (frac: number) => {
    if (teto <= 0) return;
    const v = Math.max(0, Math.min(teto, Math.round(teto * frac * 100) / 100));
    setValorStr(v.toFixed(2).replace('.', ','));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[92vh] overflow-y-auto">
        {/* Hero */}
        <div
          className={cn(
            'relative px-5 pt-6 pb-5 text-white overflow-hidden',
            mode === 'reservar'
              ? 'bg-gradient-to-br from-primary via-primary to-indigo-600'
              : 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500'
          )}
        >
          <div aria-hidden className="absolute -top-12 -right-10 h-32 w-32 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
          <SheetHeader className="relative z-10 space-y-3 text-left">
            <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              {mode === 'reservar' ? <ShieldCheck className="h-5 w-5" /> : <PiggyBank className="h-5 w-5" />}
            </div>
            <div>
              <SheetTitle className="text-xl font-semibold text-white">
                {mode === 'reservar' ? 'Reservar dinheiro' : 'Resgatar reserva'}
              </SheetTitle>
              <SheetDescription className="text-white/80 text-[12.5px] mt-1">
                {mode === 'reservar'
                  ? 'Separe um valor do saldo livre. Não é uma despesa — é uma realocação interna.'
                  : 'Devolva um valor do reservado para o saldo livre.'}
              </SheetDescription>
            </div>
          </SheetHeader>
        </div>

        {/* Toggle modo */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted">
            <button
              type="button"
              onClick={() => setMode('reservar')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all',
                mode === 'reservar' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              )}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" /> Reservar
            </button>
            <button
              type="button"
              onClick={() => setMode('resgatar')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all',
                mode === 'resgatar' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              )}
            >
              <ArrowUpRight className="h-3.5 w-3.5" /> Resgatar
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-5 py-5 space-y-4">
          {/* Status atual */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border/60 bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saldo livre</p>
              <p className="mt-1 text-base font-bold tabular-nums">{formatCurrency(fb.saldoLivre)}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reserva rápida</p>
              <p className="mt-1 text-base font-bold tabular-nums">{formatCurrency(fb.defaultReserveSaldo)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reserve-valor">Valor</Label>
            <Input
              id="reserve-valor"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              className="text-lg font-semibold tabular-nums h-12"
              autoFocus
            />
            <div className="flex gap-2">
              {[0.25, 0.5, 1].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSugestao(f)}
                  disabled={teto <= 0}
                  className="flex-1 rounded-xl border border-border/60 bg-muted/40 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {f === 1 ? 'Tudo' : `${f * 100}%`}
                </button>
              ))}
            </div>
            {excede && (
              <p className="text-[11.5px] text-rose-500 font-medium">
                {mode === 'reservar'
                  ? `Valor excede o saldo livre (${formatCurrency(fb.saldoLivre)}).`
                  : `Valor excede a reserva rápida disponível (${formatCurrency(fb.defaultReserveSaldo)}).`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reserve-desc">Descrição (opcional)</Label>
            <Input
              id="reserve-desc"
              type="text"
              placeholder={mode === 'reservar' ? 'Reserva rápida' : 'Resgate de reserva'}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!pode || pending}
            className="w-full h-12 text-[15px] font-semibold"
          >
            {pending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processando…</>
            ) : mode === 'reservar' ? (
              `Reservar ${valor > 0 ? formatCurrency(valor) : ''}`
            ) : (
              `Resgatar ${valor > 0 ? formatCurrency(valor) : ''}`
            )}
          </Button>

          {onOpenCofrinhos && (
            <button
              type="button"
              onClick={() => { onOpenChange(false); onOpenCofrinhos(); }}
              className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              Organizar em um cofrinho específico →
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};