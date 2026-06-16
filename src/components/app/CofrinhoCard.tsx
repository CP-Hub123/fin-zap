import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/constants';
import { getPreset, getStatusLevel, STATUS_META } from '@/lib/cofrinhoPresets';
import { ShieldCheck, Target, Wallet } from 'lucide-react';
import type { Cofrinho } from '@/hooks/useCofrinhos';

interface Props {
  cofrinho: Cofrinho;
  onClick?: () => void;
}

const TYPE_ICON: Record<string, typeof Wallet> = {
  reserva: ShieldCheck,
  meta: Target,
  mensal: Wallet,
};

const TYPE_LABEL: Record<string, string> = {
  reserva: 'Reserva',
  meta: 'Meta',
  mensal: 'Mensal',
};

export const CofrinhoCard = ({ cofrinho: c, onClick }: Props) => {
  const preset = getPreset(c.cover_preset);
  const Icon = preset.icon;
  const TypeIcon = TYPE_ICON[c.tipo] ?? Wallet;

  // Métrica de progresso depende do tipo
  const isMensal = c.tipo === 'mensal';
  const numerador = isMensal ? Number(c.gasto_mes) : Number(c.saldo);
  const denominador = isMensal ? Number(c.orcamento_mensal) : Number(c.meta_valor);
  const pct = denominador > 0 ? Math.min(150, Math.round((numerador / denominador) * 100)) : 0;

  // Status visual
  // Para mensal: alto = ruim. Para reserva/meta: alto = bom (invertemos).
  const statusPct = isMensal ? pct : Math.max(0, 100 - pct);
  const status = getStatusLevel(statusPct);
  const meta = STATUS_META[status];

  // Reserva: meses protegidos
  const mesesProt = c.tipo === 'reserva' && Number(c.custo_mensal) > 0
    ? Number(c.saldo) / Number(c.custo_mensal)
    : null;

  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden border-0 shadow-lift cursor-pointer transition-all hover:shadow-zap ring-1 ${meta.ring}`}
    >
      {/* Capa gradiente */}
      <div
        className="relative h-24 p-4 flex items-start justify-between text-white"
        style={{ backgroundImage: preset.gradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/20 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-1 min-w-0">
          <Badge className="bg-white/20 hover:bg-white/20 text-white border-0 backdrop-blur-sm w-fit text-[10px] gap-1">
            <TypeIcon className="h-3 w-3" /> {TYPE_LABEL[c.tipo]}
          </Badge>
          <p className="font-bold text-base truncate drop-shadow-sm">{c.nome}</p>
        </div>
        <div className="relative z-10 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`absolute top-2 right-2 z-10 h-2 w-2 rounded-full ${meta.dot} ring-2 ring-white/40`} />
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {isMensal ? 'Gasto / Orçamento' : 'Guardado / Meta'}
            </p>
            <p className="font-bold text-lg leading-tight truncate">
              {formatCurrency(numerador)}
              {denominador > 0 && (
                <span className="text-xs text-muted-foreground font-normal"> / {formatCurrency(denominador)}</span>
              )}
            </p>
          </div>
          {denominador > 0 && (
            <span className="text-sm font-bold tabular-nums">{pct}%</span>
          )}
        </div>

        {denominador > 0 ? (
          <Progress value={Math.min(100, pct)} className={`h-2 ${meta.bar}`} />
        ) : (
          <p className="text-xs text-muted-foreground">
            {isMensal ? 'Sem orçamento definido' : 'Sem meta definida'}
          </p>
        )}

        {mesesProt !== null && (
          <div className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">Protegido por</span>
            <span className="font-semibold">{mesesProt.toFixed(1)} {mesesProt === 1 ? 'mês' : 'meses'}</span>
          </div>
        )}

        {!isMensal && c.tipo === 'meta' && denominador > 0 && pct >= 100 && (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-0">🎉 Meta concluída!</Badge>
        )}

        {isMensal && (
          <p className="text-[10px] text-muted-foreground leading-snug">
            Controla orçamento e gastos. Não guarda dinheiro.
          </p>
        )}
      </div>
    </Card>
  );
};