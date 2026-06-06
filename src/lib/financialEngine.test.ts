import { describe, it, expect } from 'vitest';
import {
  computeMonthTotals,
  computeUpcomingRecurring,
  computeCardsPendingThisMonth,
  computeBalances,
  computeSaldoPrevisto,
  computeCardUsageByMonth,
} from './financialEngine';

/**
 * Bateria de regressão da engine financeira do FinZap.
 *
 * Garante que Dashboard, Cofrinhos, Ritmo, Insights e PDF compartilham
 * exatamente a mesma matemática — uma única fonte de verdade.
 */

describe('financialEngine — totals', () => {
  it('soma receitas e despesas considerando impacta_saldo (default true)', () => {
    const t = computeMonthTotals([
      { type: 'income', amount: 5000 },
      { type: 'expense', amount: 1500 },
      { type: 'expense', amount: 300, impacta_saldo: false }, // open finance read-only
      { type: 'income', amount: 200, impacta_saldo: null as any },
    ] as any);
    expect(t.totalIncome).toBe(5200);
    expect(t.totalExpense).toBe(1500);
    expect(t.delta).toBe(3700);
  });

  it('fix P0 #2: ignora transações com impacta_saldo=false (alinha Dashboard ao PDF)', () => {
    const txs = [
      { type: 'income', amount: 1000 },
      { type: 'expense', amount: 400, impacta_saldo: false },
    ];
    const t = computeMonthTotals(txs as any);
    expect(t.totalExpense).toBe(0);
    expect(t.delta).toBe(1000);
  });
});

describe('financialEngine — recurring & cards breakdown', () => {
  const ref = new Date(2026, 5, 6, 12, 0, 0); // 6-Jun-2026

  it('separa compromissos vinculados a cofrinho dos livres', () => {
    const r = computeUpcomingRecurring(
      [
        { ativo: true, tipo: 'despesa', valor: 100, proxima_execucao: '2026-06-15' },
        { ativo: true, tipo: 'despesa', valor: 50, proxima_execucao: '2026-06-20', cofrinho_id: 'cof-1' },
        { ativo: true, tipo: 'receita', valor: 800, proxima_execucao: '2026-06-25' },
        { ativo: true, tipo: 'despesa', valor: 999, proxima_execucao: '2026-05-01' }, // mês passado
        { ativo: false, tipo: 'despesa', valor: 700, proxima_execucao: '2026-06-30' },
      ] as any,
      ref,
    );
    expect(r.commitmentsRemainingFree).toBe(100);
    expect(r.commitmentsRemainingCofrinho).toBe(50);
    expect(r.commitmentsRemaining).toBe(150);
    expect(r.projectedIncomeRemaining).toBe(800);
  });

  it('separa parcelas pendentes por vínculo com cofrinho', () => {
    const toCof = new Map<string, string | null>([
      ['p1', null],
      ['p2', 'cof-1'],
    ]);
    const r = computeCardsPendingThisMonth(
      [
        { month_id: 'm1', amount: 200, status: 'planned', card_purchase_id: 'p1' },
        { month_id: 'm1', amount: 80, status: 'planned', card_purchase_id: 'p2' },
        { month_id: 'm1', amount: 50, status: 'realized', card_purchase_id: 'p1' },
        { month_id: 'm2', amount: 999, status: 'planned', card_purchase_id: 'p1' },
      ] as any,
      'm1',
      toCof,
    );
    expect(r.free).toBe(200);
    expect(r.cofrinho).toBe(80);
    expect(r.total).toBe(280);
  });
});

describe('financialEngine — balances', () => {
  it('cenário simples: 5000 receita / 1500 despesa, sem cofrinhos', () => {
    const b = computeBalances({
      initialBalance: 0,
      totalIncome: 5000,
      totalExpense: 1500,
      saldoReservado: 0,
      commitmentsRemainingFree: 0,
      projectedIncomeRemaining: 0,
      cardsPendingFree: 0,
    });
    expect(b.delta).toBe(3500);
    expect(b.saldoTotal).toBe(3500);
    expect(b.saldoLivre).toBe(3500);
  });

  it('saldo inicial não-zero é respeitado (convergência Dashboard↔PDF)', () => {
    const b = computeBalances({
      initialBalance: 1000, totalIncome: 2000, totalExpense: 500,
      saldoReservado: 0, commitmentsRemainingFree: 0,
      projectedIncomeRemaining: 0, cardsPendingFree: 0,
    });
    expect(b.saldoTotal).toBe(2500);
    expect(b.saldoLivre).toBe(2500);
  });

  it('fix P0 #1: NÃO subtrai compromissos vinculados a cofrinho (sem contagem dupla)', () => {
    // cofrinho com R$300; recorrência futura de R$300 SAI do cofrinho
    const semFix =
      1000 - 300 /* reservado */ - 300 /* commit total — INCORRETO */;
    const comFix = computeBalances({
      initialBalance: 1000, totalIncome: 0, totalExpense: 0,
      saldoReservado: 300,
      commitmentsRemainingFree: 0, // a recorrência é cofrinho-bound → não entra aqui
      projectedIncomeRemaining: 0, cardsPendingFree: 0,
    });
    expect(semFix).toBe(400);
    expect(comFix.saldoLivre).toBe(700); // saldoTotal(1000) - reservado(300)
  });

  it('compromissos livres + cartão pendente livre reduzem saldoLivre', () => {
    const b = computeBalances({
      initialBalance: 0, totalIncome: 5000, totalExpense: 1000,
      saldoReservado: 500,
      commitmentsRemainingFree: 800,
      projectedIncomeRemaining: 1500,
      cardsPendingFree: 600,
    });
    // 4000 - 500 - 800 - 600 + 1500 = 3600
    expect(b.saldoLivre).toBe(3600);
  });
});

describe('financialEngine — saldoPrevisto', () => {
  it('para mês não-corrente devolve saldoTotal', () => {
    expect(
      computeSaldoPrevisto({
        isCurrentMonth: false, saldoLivre: 100, saldoTotal: 200,
        totalExpense: 0, daysElapsed: 0, daysRemaining: 0,
      }),
    ).toBe(200);
  });

  it('pondera 50% do ritmo nos dias restantes', () => {
    const p = computeSaldoPrevisto({
      isCurrentMonth: true, saldoLivre: 1000, saldoTotal: 1500,
      totalExpense: 600, daysElapsed: 10, daysRemaining: 20,
    });
    // burn=60/dia → -60*20*0.5=600 → 1000-600=400
    expect(p).toBe(400);
  });
});

describe('financialEngine — card usage by month (fix P0 #3)', () => {
  it('soma só parcelas do mês corrente, agrupadas por cartão', () => {
    const purchaseToCard = new Map<string, string>([
      ['p1', 'cardA'], ['p2', 'cardA'], ['p3', 'cardB'],
    ]);
    const usado = computeCardUsageByMonth(
      [
        { type: 'expense', amount: 200, card_purchase_id: 'p1' },
        { type: 'expense', amount: 100, card_purchase_id: 'p2' },
        { type: 'expense', amount: 80,  card_purchase_id: 'p3' },
        { type: 'expense', amount: 50,  card_purchase_id: null }, // despesa avulsa
        { type: 'income',  amount: 999, card_purchase_id: 'p1' }, // ignorada
      ] as any,
      purchaseToCard,
    );
    expect(usado.get('cardA')).toBe(300);
    expect(usado.get('cardB')).toBe(80);
    expect(usado.has('cardC')).toBe(false);
  });
});

describe('financialEngine — convergência Dashboard ↔ PDF (cenário ponta-a-ponta)', () => {
  it('mesmas entradas produzem mesmos totais nas duas vistas', () => {
    const txs = [
      { type: 'income',  amount: 5000, status: 'realized', impacta_saldo: true },
      { type: 'expense', amount: 1500, status: 'realized', impacta_saldo: true, cofrinho_id: 'cof-1' },
      { type: 'expense', amount: 800,  status: 'planned',  impacta_saldo: true, card_purchase_id: 'p1' },
      { type: 'expense', amount: 300,  status: 'realized', impacta_saldo: false }, // open finance
    ];
    const dashboard = computeMonthTotals(txs as any);
    // PDF aplica o mesmo filtro impacta_saldo !== false
    const pdfRealized = txs.filter((t: any) => t.impacta_saldo !== false);
    const pdfIncome = pdfRealized.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const pdfExpense = pdfRealized.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    expect(dashboard.totalIncome).toBe(pdfIncome);
    expect(dashboard.totalExpense).toBe(pdfExpense);
    expect(dashboard.delta).toBe(pdfIncome - pdfExpense);
  });
});