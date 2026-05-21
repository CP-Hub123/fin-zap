import type { Cofrinho } from '@/hooks/useCofrinhos';

export type CofrinhoStatus = 'safe' | 'attention' | 'critical';

export interface CofrinhoMessage {
  severity: CofrinhoStatus;
  text: string;
}

export interface CofrinhoEvolutionPoint {
  label: string;
  saldo: number;
  gasto: number;
}

export interface CofrinhoAnalysis {
  status: CofrinhoStatus;
  messages: CofrinhoMessage[];
  stats: {
    movimentacoes30d: number;
    media30d: number;
    maiorGasto30d: number;
    frequencia: string; // human description
    deltaVsMesAnterior: number | null; // % change in spending vs prev month
  };
  evolution: CofrinhoEvolutionPoint[];
}

interface MiniTx {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string; // YYYY-MM-DD
}

interface MiniClosure {
  mes: number;
  ano: number;
  saldo_final: number;
  gasto_mes: number;
}

const MES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export function analyzeCofrinho(
  c: Cofrinho,
  transactions: MiniTx[],
  closures: MiniClosure[],
): CofrinhoAnalysis {
  const now = new Date();
  const ms30d = 30 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - ms30d);

  const last30 = transactions.filter(t => new Date(t.date + 'T12:00:00') >= cutoff);
  const expenses30 = last30.filter(t => t.type === 'expense');
  const totalExp30 = expenses30.reduce((s, t) => s + Number(t.amount), 0);
  const movimentacoes30d = last30.length;
  const media30d = expenses30.length ? totalExp30 / expenses30.length : 0;
  const maiorGasto30d = expenses30.reduce((m, t) => Math.max(m, Number(t.amount)), 0);

  const freq = movimentacoes30d === 0
    ? 'Sem movimentações recentes'
    : movimentacoes30d >= 20 ? 'Uso muito frequente'
    : movimentacoes30d >= 10 ? 'Uso frequente'
    : movimentacoes30d >= 4  ? 'Uso moderado'
    : 'Uso baixo';

  // Evolution: últimos 5 closures + mês atual
  const sortedClosures = [...closures].sort((a, b) => (a.ano - b.ano) || (a.mes - b.mes)).slice(-5);
  const evolution: CofrinhoEvolutionPoint[] = sortedClosures.map(cl => ({
    label: MES_CURTO[(cl.mes - 1) % 12],
    saldo: Number(cl.saldo_final),
    gasto: Number(cl.gasto_mes),
  }));
  evolution.push({
    label: MES_CURTO[(c.mes_ref - 1) % 12] + ' (atual)',
    saldo: Number(c.saldo),
    gasto: Number(c.gasto_mes),
  });

  // Delta vs mês anterior (gasto)
  let deltaVsMesAnterior: number | null = null;
  const prev = sortedClosures[sortedClosures.length - 1];
  if (prev && Number(prev.gasto_mes) > 0) {
    deltaVsMesAnterior = ((Number(c.gasto_mes) - Number(prev.gasto_mes)) / Number(prev.gasto_mes)) * 100;
  }

  // Mensagens + status
  const messages: CofrinhoMessage[] = [];
  let status: CofrinhoStatus = 'safe';

  if (c.tipo === 'mensal') {
    const orc = Number(c.orcamento_mensal);
    const gasto = Number(c.gasto_mes);
    const pct = orc > 0 ? (gasto / orc) * 100 : 0;

    if (pct >= 100) {
      status = 'critical';
      messages.push({ severity: 'critical', text: `Esse cofrinho está sendo usado acima do planejado (${Math.round(pct)}% do orçamento).` });
    } else if (pct >= 80) {
      status = 'attention';
      messages.push({ severity: 'attention', text: `Você já usou ${Math.round(pct)}% do orçamento. Margem ficando curta.` });
    } else if (pct >= 50) {
      status = 'attention';
      messages.push({ severity: 'attention', text: `Atenção: você passou da metade do orçamento (${Math.round(pct)}%).` });
    } else if (orc > 0) {
      messages.push({ severity: 'safe', text: 'Você ainda possui margem segura neste cofrinho.' });
    }

    if (deltaVsMesAnterior !== null && deltaVsMesAnterior >= 30) {
      if (status === 'safe') status = 'attention';
      messages.push({ severity: 'attention', text: `Os gastos aumentaram ${Math.round(deltaVsMesAnterior)}% em relação ao mês anterior.` });
    } else if (deltaVsMesAnterior !== null && deltaVsMesAnterior <= -20) {
      messages.push({ severity: 'safe', text: `Você reduziu ${Math.round(Math.abs(deltaVsMesAnterior))}% dos gastos vs mês anterior. Excelente!` });
    }
  } else if (c.tipo === 'meta') {
    const meta = Number(c.meta_valor);
    const saldo = Number(c.saldo);
    const pct = meta > 0 ? (saldo / meta) * 100 : 0;
    if (pct >= 100) {
      messages.push({ severity: 'safe', text: '🎉 Meta concluída! Você atingiu seu objetivo.' });
    } else if (pct >= 75) {
      messages.push({ severity: 'safe', text: `Seu objetivo está próximo (${Math.round(pct)}% concluído).` });
    } else if (pct >= 40) {
      messages.push({ severity: 'safe', text: `Você está no caminho certo: ${Math.round(pct)}% da meta.` });
    } else if (meta > 0) {
      status = 'attention';
      messages.push({ severity: 'attention', text: `Meta ainda distante (${Math.round(pct)}%). Considere aumentar os aportes.` });
    }
  } else if (c.tipo === 'reserva') {
    const cm = Number(c.custo_mensal);
    const meses = cm > 0 ? Number(c.saldo) / cm : 0;
    const alvo = Number(c.meses_protegidos) || 6;
    if (meses >= alvo) {
      messages.push({ severity: 'safe', text: `Reserva completa: você está protegido por ${meses.toFixed(1)} meses.` });
    } else if (meses >= alvo * 0.6) {
      status = 'attention';
      messages.push({ severity: 'attention', text: `Reserva parcial: ${meses.toFixed(1)} de ${alvo} meses cobertos.` });
    } else if (cm > 0) {
      status = 'critical';
      messages.push({ severity: 'critical', text: `Reserva baixa: cobre apenas ${meses.toFixed(1)} meses dos ${alvo} desejados.` });
    }
  }

  if (movimentacoes30d === 0) {
    messages.push({ severity: 'safe', text: 'Nenhuma movimentação nos últimos 30 dias — estabilidade total.' });
  }

  if (messages.length === 0) {
    messages.push({ severity: 'safe', text: 'Você está mantendo estabilidade neste cofrinho.' });
  }

  return {
    status,
    messages,
    stats: { movimentacoes30d, media30d, maiorGasto30d, frequencia: freq, deltaVsMesAnterior },
    evolution,
  };
}

export const STATUS_COLORS: Record<CofrinhoStatus, { bg: string; text: string; ring: string; label: string; dot: string }> = {
  safe:      { bg: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'ring-emerald-500/30', label: 'Seguro',  dot: 'bg-emerald-500' },
  attention: { bg: 'bg-yellow-500/10',  text: 'text-yellow-600',  ring: 'ring-yellow-500/30',  label: 'Atenção', dot: 'bg-yellow-500' },
  critical:  { bg: 'bg-red-500/10',     text: 'text-red-600',     ring: 'ring-red-500/30',     label: 'Crítico', dot: 'bg-red-500' },
};