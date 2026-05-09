import type { Tables } from '@/integrations/supabase/types';

type Transaction = Tables<'transactions'>;
type Cofrinho = Tables<'cofrinhos'>;
type Recurring = Tables<'recurring_transactions'>;

export type DecisionTipo = 'essencial' | 'opcional' | 'lazer' | 'emergencia';
export type RiskLevel = 'safe' | 'attention' | 'critical';

export interface DecisionInput {
  amount: number;
  date: string; // ISO yyyy-mm-dd
  cofrinhoId?: string | null;
  tipo: DecisionTipo;
}

export interface DecisionContext {
  transactions: Transaction[];
  cofrinhos: Cofrinho[];
  recurring: Recurring[];
  /** saldo já calculado do mês selecionado (incomes - expenses) */
  monthBalance: number;
}

export interface DecisionResult {
  risk: RiskLevel;
  saldoApos: number;
  cofrinho?: {
    nome: string;
    saldoApos: number;
    percentualConsumido: number; // do orçamento mensal
    estouraOrcamento: boolean;
  };
  sobraFimDoMes: number;
  recorrenciasRestantes: number;
  headline: string;
  message: string;
  recomendacao?: string;
}

const TIPO_LABEL: Record<DecisionTipo, string> = {
  essencial: 'essencial',
  opcional: 'opcional',
  lazer: 'lazer',
  emergencia: 'emergência',
};

function endOfMonthISO(dateISO: string): Date {
  const d = new Date(dateISO + 'T00:00:00');
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function sumRecurringUntilEnd(recurring: Recurring[], dateISO: string): number {
  const end = endOfMonthISO(dateISO);
  return recurring.reduce((acc, r) => {
    if (!r.ativo || !r.proxima_execucao) return acc;
    const px = new Date(r.proxima_execucao + 'T00:00:00');
    if (px > end) return acc;
    const valor = Number(r.valor) || 0;
    return r.tipo === 'receita' ? acc + valor : acc - valor;
  }, 0);
}

export function evaluateDecision(input: DecisionInput, ctx: DecisionContext): DecisionResult {
  const amount = Math.max(0, Number(input.amount) || 0);
  const cofrinho = input.cofrinhoId ? ctx.cofrinhos.find(c => c.id === input.cofrinhoId) : undefined;

  const recorrenciasNet = sumRecurringUntilEnd(ctx.recurring, input.date);
  const saldoApos = ctx.monthBalance - amount;
  const sobraFimDoMes = saldoApos + recorrenciasNet;

  let cofrinhoInfo: DecisionResult['cofrinho'];
  if (cofrinho) {
    const saldoCof = Number(cofrinho.saldo) || 0;
    const orcamento = Number(cofrinho.orcamento_mensal) || 0;
    const gasto = Number(cofrinho.gasto_mes) || 0;
    const saldoCofApos = saldoCof - amount;
    const consumido = orcamento > 0 ? Math.round(((gasto + amount) / orcamento) * 100) : 0;
    cofrinhoInfo = {
      nome: cofrinho.nome,
      saldoApos: saldoCofApos,
      percentualConsumido: consumido,
      estouraOrcamento: orcamento > 0 && gasto + amount > orcamento,
    };
  }

  // Risk engine (deterministic)
  let risk: RiskLevel = 'safe';
  if (saldoApos < 0 || sobraFimDoMes < 0) risk = 'critical';
  else if (cofrinhoInfo?.estouraOrcamento) risk = 'critical';
  else if (cofrinhoInfo && cofrinhoInfo.percentualConsumido >= 70) risk = 'attention';
  else if (sobraFimDoMes < amount * 0.5) risk = 'attention';
  else if (input.tipo === 'lazer' && amount > ctx.monthBalance * 0.3) risk = 'attention';

  // Emergency softens tone but never below attention if real risk exists
  const tipoLabel = TIPO_LABEL[input.tipo];

  let headline = '';
  let message = '';
  let recomendacao: string | undefined;

  if (risk === 'safe') {
    headline = 'Decisão segura';
    message = `Esse gasto ${tipoLabel} mantém seu mês estável. Você ainda terá margem confortável até o fechamento.`;
  } else if (risk === 'attention') {
    headline = 'Atenção à margem';
    message = `Esse pagamento reduz bastante sua margem do mês. Se surgir um gasto inesperado, você pode entrar em risco.`;
    if (cofrinhoInfo?.percentualConsumido && cofrinhoInfo.percentualConsumido >= 70) {
      recomendacao = `Esse gasto consumirá ${cofrinhoInfo.percentualConsumido}% do cofrinho ${cofrinhoInfo.nome}. Considere adiar ou reduzir o valor.`;
    } else if (input.tipo === 'lazer') {
      recomendacao = 'Por ser um gasto de lazer, vale avaliar se compensa nesse momento.';
    } else {
      recomendacao = 'Mantenha vigilância sobre os próximos gastos do mês.';
    }
  } else {
    headline = 'Decisão crítica';
    if (saldoApos < 0) {
      message = 'Essa decisão deixa seu saldo do mês negativo agora. Não há cobertura para esse gasto.';
    } else if (sobraFimDoMes < 0) {
      message = 'Considerando suas recorrências futuras, você terminará o mês no vermelho.';
    } else if (cofrinhoInfo?.estouraOrcamento) {
      message = `Esse gasto estoura o orçamento mensal do cofrinho ${cofrinhoInfo.nome}.`;
    } else {
      message = 'Essa decisão compromete seu planejamento atual.';
    }
    recomendacao = input.tipo === 'emergencia'
      ? 'Por se tratar de uma emergência, avalie usar reserva ou redistribuir cofrinhos.'
      : 'Recomendamos adiar, parcelar ou reduzir o valor antes de confirmar.';
  }

  return {
    risk,
    saldoApos,
    cofrinho: cofrinhoInfo,
    sobraFimDoMes,
    recorrenciasRestantes: recorrenciasNet,
    headline,
    message,
    recomendacao,
  };
}

export function compareDecisions(a: DecisionResult, b: DecisionResult): 'A' | 'B' | 'tie' {
  const score = (r: DecisionResult) => {
    const base = r.risk === 'safe' ? 100 : r.risk === 'attention' ? 50 : 0;
    return base + r.sobraFimDoMes / 100;
  };
  const sa = score(a);
  const sb = score(b);
  if (Math.abs(sa - sb) < 1) return 'tie';
  return sa > sb ? 'A' : 'B';
}