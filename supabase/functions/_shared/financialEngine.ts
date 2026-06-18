/**
 * FinZap — Engine financeira canônica (mirror para edge functions).
 *
 * ATENÇÃO: este arquivo é um espelho fiel de `src/lib/financialEngine.ts`.
 * Qualquer alteração de regra deve ser feita PRIMEIRO em `src/lib/financialEngine.ts`
 * e depois copiada aqui para manter a única fonte de verdade entre app e PDF.
 *
 * Funções puras que servem como ÚNICA fonte de verdade para:
 *   - totais de receitas / despesas do mês
 *   - saldos (contábil, reservado, livre, projetado)
 *   - uso de cartão (limite consumido pelas parcelas do mês)
 *
 * Toda tela (Dashboard, Cofrinhos, Ritmo, Insights, PDF) DEVE consumir
 * estas funções para garantir consistência matemática.
 */

export type FinTx = {
  type: 'income' | 'expense' | string;
  amount: number | string;
  status?: string | null;
  impacta_saldo?: boolean | null;
  cofrinho_id?: string | null;
  card_purchase_id?: string | null;
  month_id?: string | null;
};

export type FinRecurring = {
  ativo?: boolean | null;
  tipo: 'receita' | 'despesa' | string;
  valor: number | string;
  proxima_execucao?: string | null;
  cofrinho_id?: string | null;
};

export type FinInstallment = {
  month_id: string;
  amount: number | string;
  status?: string | null;
  card_purchase_id?: string | null;
};

/** Considera transações com `impacta_saldo !== false` (default true para legados/nulls). */
export const impactaSaldo = (t: FinTx) => t.impacta_saldo !== false;

/** Totais de receita / despesa / delta de um mês (apenas transações que impactam saldo). */
export function computeMonthTotals(transactions: FinTx[]) {
  const tx = transactions.filter(impactaSaldo);
  const totalIncome = tx
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = tx
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  return { totalIncome, totalExpense, delta: totalIncome - totalExpense };
}

/** Recorrências do mês atual ainda não executadas, separadas por tipo e por vínculo a cofrinho. */
export function computeUpcomingRecurring(
  recurring: FinRecurring[],
  reference: Date = new Date(),
) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  let expenseFree = 0;
  let expenseCofrinho = 0;
  let incomeAll = 0;
  for (const r of recurring) {
    if (r.ativo === false) continue;
    if (!r.proxima_execucao) continue;
    const target = new Date(`${r.proxima_execucao}T12:00:00`);
    if (target.getFullYear() !== year || target.getMonth() !== month) continue;
    if (target.getTime() < reference.getTime()) continue;
    const val = Number(r.valor || 0);
    if (r.tipo === 'despesa') {
      if (r.cofrinho_id) expenseCofrinho += val;
      else expenseFree += val;
    } else {
      incomeAll += val;
    }
  }
  return {
    commitmentsRemaining: expenseFree + expenseCofrinho,
    commitmentsRemainingFree: expenseFree,
    commitmentsRemainingCofrinho: expenseCofrinho,
    projectedIncomeRemaining: incomeAll,
  };
}

/** Parcelas de cartão pendentes neste mês (não realizadas), separadas por vínculo a cofrinho. */
export function computeCardsPendingThisMonth(
  installments: FinInstallment[],
  monthId: string | undefined,
  purchaseToCofrinho: Map<string, string | null> = new Map(),
) {
  if (!monthId) return { total: 0, free: 0, cofrinho: 0 };
  let free = 0;
  let cofrinho = 0;
  for (const i of installments) {
    if (i.month_id !== monthId) continue;
    if (i.status === 'realized') continue;
    const v = Number(i.amount || 0);
    const cof = i.card_purchase_id ? purchaseToCofrinho.get(i.card_purchase_id) : null;
    if (cof) cofrinho += v;
    else free += v;
  }
  return { total: free + cofrinho, free, cofrinho };
}

export type SaldoInput = {
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  saldoReservado: number;
  commitmentsRemainingFree: number;
  projectedIncomeRemaining: number;
  cardsPendingFree: number;
};

/**
 * Calcula a família canônica de saldos.
 *
 * Regra crítica (correção P0 #1):
 *  - `saldoLivre` NÃO subtrai compromissos/cartões vinculados a cofrinhos:
 *    quando esses compromissos forem executados, eles reduzirão tanto o saldo
 *    contábil quanto o saldo reservado — sem afetar `saldoLivre`. Subtraí-los
 *    aqui causaria contagem dupla.
 */
export function computeBalances(input: SaldoInput) {
  const {
    initialBalance, totalIncome, totalExpense, saldoReservado,
    commitmentsRemainingFree, projectedIncomeRemaining, cardsPendingFree,
  } = input;
  const delta = totalIncome - totalExpense;
  const saldoTotal = initialBalance + delta;
  const saldoLivre =
    saldoTotal - saldoReservado - commitmentsRemainingFree - cardsPendingFree + projectedIncomeRemaining;
  return { delta, saldoTotal, saldoLivre };
}

/** Saldo previsto ao fim do mês ponderando ritmo histórico de gasto. */
export function computeSaldoPrevisto(args: {
  isCurrentMonth: boolean;
  saldoLivre: number;
  saldoTotal: number;
  totalExpense: number;
  daysElapsed: number;
  daysRemaining: number;
}) {
  if (!args.isCurrentMonth) return args.saldoTotal;
  const burn = args.daysElapsed > 0 ? args.totalExpense / args.daysElapsed : 0;
  return args.saldoLivre - burn * args.daysRemaining * 0.5;
}

/**
 * Uso de cartão neste mês (correção P0 #3):
 * soma apenas as parcelas faturadas no mês corrente, agrupadas por cartão.
 *
 * Em vez de somar `credit_card_purchases.valor_total` (histórico irrestrito)
 * derivamos do conjunto de parcelas/transações do mês — o que casa exatamente
 * com a visão do Dashboard e dos Cofrinhos.
 */
export function computeCardUsageByMonth(
  txs: FinTx[],
  purchaseToCard: Map<string, string>,
) {
  const usado = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    if (!t.card_purchase_id) continue;
    const cardId = purchaseToCard.get(t.card_purchase_id);
    if (!cardId) continue;
    usado.set(cardId, (usado.get(cardId) || 0) + Number(t.amount || 0));
  }
  return usado;
}