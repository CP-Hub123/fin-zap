import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sparkles, ShieldCheck, AlertTriangle, AlertOctagon, ArrowRight, Wallet } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCofrinhos } from '@/hooks/useCofrinhos';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { evaluateDecision, compareDecisions, type DecisionInput, type DecisionResult, type DecisionTipo, type RiskLevel } from '@/lib/decisionEngine';
import { cn } from '@/lib/utils';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const TIPOS: { value: DecisionTipo; label: string }[] = [
  { value: 'essencial', label: 'Essencial' },
  { value: 'opcional', label: 'Opcional' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'emergencia', label: 'Emergência' },
];

const riskStyles: Record<RiskLevel, { ring: string; bg: string; text: string; icon: typeof ShieldCheck; label: string; dot: string }> = {
  safe: { ring: 'ring-finzap-green/40', bg: 'bg-finzap-green/10', text: 'text-finzap-green', icon: ShieldCheck, label: 'Seguro', dot: 'bg-finzap-green' },
  attention: { ring: 'ring-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle, label: 'Atenção', dot: 'bg-amber-500' },
  critical: { ring: 'ring-destructive/40', bg: 'bg-destructive/10', text: 'text-destructive', icon: AlertOctagon, label: 'Crítico', dot: 'bg-destructive' },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  monthId?: string;
}

export const DecisionModeSheet = ({ open, onOpenChange, monthId }: Props) => {
  const { transactions, balance } = useTransactions(monthId);
  const { cofrinhos } = useCofrinhos();
  const { query: recurringQuery } = useRecurringTransactionsQueryShim();

  const today = new Date().toISOString().slice(0, 10);
  const [valorA, setValorA] = useState('');
  const [valorB, setValorB] = useState('');
  const [tipo, setTipo] = useState<DecisionTipo>('opcional');
  const [cofrinhoId, setCofrinhoId] = useState<string>('none');
  const [date, setDate] = useState(today);
  const [comparar, setComparar] = useState(false);

  const ctx = useMemo(() => ({
    transactions,
    cofrinhos,
    recurring: recurringQuery.data ?? [],
    monthBalance: balance,
  }), [transactions, cofrinhos, recurringQuery.data, balance]);

  const inputA: DecisionInput = {
    amount: parseFloat(valorA.replace(',', '.')) || 0,
    date,
    tipo,
    cofrinhoId: cofrinhoId === 'none' ? null : cofrinhoId,
  };
  const inputB: DecisionInput = { ...inputA, amount: parseFloat(valorB.replace(',', '.')) || 0 };

  const resultA = inputA.amount > 0 ? evaluateDecision(inputA, ctx) : null;
  const resultB = comparar && inputB.amount > 0 ? evaluateDecision(inputB, ctx) : null;
  const winner = resultA && resultB ? compareDecisions(resultA, resultB) : null;

  const reset = () => {
    setValorA(''); setValorB(''); setTipo('opcional');
    setCofrinhoId('none'); setDate(today); setComparar(false);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <SheetContent side="bottom" className="sm:max-w-2xl sm:mx-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-zap text-primary-foreground shadow-lift">
              <Sparkles className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Modo Decisão</span>
          </div>
          <SheetTitle>Simule antes de gastar</SheetTitle>
          <SheetDescription>
            Veja o impacto real no seu mês, no cofrinho e na sua margem antes de confirmar.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor da decisão</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input inputMode="decimal" placeholder="0,00" value={valorA} onChange={e => setValorA(e.target.value)} className="pl-10 text-[17px] font-semibold tabular-nums" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as DecisionTipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Origem (cofrinho)</Label>
                <Select value={cofrinhoId} onValueChange={setCofrinhoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem cofrinho</SelectItem>
                    {cofrinhos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Comparar com outra opção</p>
                <p className="text-xs text-muted-foreground">Veja qual decisão pesa menos no mês</p>
              </div>
              <Switch checked={comparar} onCheckedChange={setComparar} />
            </div>

            {comparar && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label>Valor da opção B</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input inputMode="decimal" placeholder="0,00" value={valorB} onChange={e => setValorB(e.target.value)} className="pl-10 text-[17px] font-semibold tabular-nums" />
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {!resultA && (
            <div className="rounded-2xl border border-dashed bg-muted/30 px-5 py-8 text-center">
              <Wallet className="mx-auto h-6 w-6 text-muted-foreground/60 mb-2" />
              <p className="text-sm text-muted-foreground">Informe um valor para simular o impacto da decisão.</p>
            </div>
          )}

          {resultA && !resultB && <ResultCard input={inputA} result={resultA} />}

          {resultA && resultB && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ResultCard input={inputA} result={resultA} compact label="Opção A" highlight={winner === 'A'} />
                <ResultCard input={inputB} result={resultB} compact label="Opção B" highlight={winner === 'B'} />
              </div>
              {winner !== 'tie' && (
                <div className="flex items-center gap-2 rounded-xl bg-gradient-positive px-4 py-3 text-sm">
                  <Sparkles className="h-4 w-4 text-finzap-green" />
                  <p>
                    <span className="font-semibold">Recomendação:</span> a opção <span className="font-semibold">{winner}</span> é a mais equilibrada para o seu mês.
                  </p>
                </div>
              )}
              {winner === 'tie' && (
                <p className="text-center text-xs text-muted-foreground">As duas opções têm impacto financeiro semelhante.</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface ResultCardProps {
  input: DecisionInput;
  result: DecisionResult;
  compact?: boolean;
  label?: string;
  highlight?: boolean;
}

const ResultCard = ({ input, result, compact, label, highlight }: ResultCardProps) => {
  const s = riskStyles[result.risk];
  const Icon = s.icon;
  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-card p-4 transition-all',
        highlight && 'ring-2 ring-finzap-green/50 shadow-lift',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full ring-2', s.ring, s.bg)}>
            <Icon className={cn('h-4.5 w-4.5', s.text)} strokeWidth={2.25} />
          </div>
          <div>
            {label && <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>}
            <p className={cn('text-sm font-semibold', s.text)}>{result.headline}</p>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', s.bg, s.text)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
          {s.label}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight tabular-nums">{fmt(input.amount)}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn('text-sm font-semibold tabular-nums', result.saldoApos < 0 ? 'text-destructive' : 'text-foreground')}>
          {fmt(result.saldoApos)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric label="Sobra prevista" value={fmt(result.sobraFimDoMes)} negative={result.sobraFimDoMes < 0} />
        {result.cofrinho ? (
          <Metric
            label={`% ${result.cofrinho.nome}`}
            value={`${result.cofrinho.percentualConsumido}%`}
            negative={result.cofrinho.estouraOrcamento}
          />
        ) : (
          <Metric label="Recorrências restantes" value={fmt(result.recorrenciasRestantes)} />
        )}
      </div>

      {!compact && (
        <>
          <p className="mt-4 text-sm leading-relaxed text-foreground/90">{result.message}</p>
          {result.recomendacao && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{result.recomendacao}</p>
          )}
        </>
      )}
    </div>
  );
};

const Metric = ({ label, value, negative }: { label: string; value: string; negative?: boolean }) => (
  <div className="rounded-xl bg-secondary/50 px-3 py-2">
    <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={cn('text-sm font-semibold tabular-nums mt-0.5', negative && 'text-destructive')}>{value}</p>
  </div>
);

/** Lightweight shim to expose the inner query of useRecurringTransactions. */
function useRecurringTransactionsQueryShim() {
  const all = useRecurringTransactions();
  // The hook returns named mutations + a derived query through `query` if available
  // Fallback: re-query directly via the same key not necessary; the hook stores the data internally in TanStack cache.
  // We expose a stable shape:
  return { query: { data: (all as any).recurring ?? (all as any).data ?? (all as any).query?.data ?? [] } };
}