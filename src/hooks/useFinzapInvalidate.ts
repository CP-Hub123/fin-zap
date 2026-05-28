import { useQueryClient } from '@tanstack/react-query';

/**
 * Fonte única de invalidação para tudo que afeta a visão financeira do FinZap.
 *
 * Toda mutation financeira (transação, recorrência, cofrinho, cartão, mês, orçamento)
 * deve chamar `invalidateFinancial()` no onSuccess para garantir que TODAS as
 * visualizações dependentes reajam instantaneamente: Resumo, Ritmo Financeiro,
 * Insights, Cofrinhos, Cartões, Gráficos, Previsibilidade etc.
 *
 * Mantém a API simples: um único call no onSuccess é suficiente.
 */
const FINANCIAL_KEYS = [
  'transactions',
  'historical_transactions',
  'months',
  'cofrinhos',
  'recurring_transactions',
  'budget_plans',
  'credit_cards',
  'credit_card_purchases',
  'credit_card_installments',
  // Ritmo Financeiro depende destas chaves dedicadas — sem isso o card "congela".
  'rhythm-recent',
  'rhythm-last-tx',
] as const;

export const useFinzapInvalidate = () => {
  const qc = useQueryClient();
  return () => {
    for (const key of FINANCIAL_KEYS) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
};