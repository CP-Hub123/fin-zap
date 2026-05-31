import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancialBalance } from './useFinancialBalance';
import { useCofrinhos } from './useCofrinhos';
import { useRecurringTransactions } from './useRecurringTransactions';
import { useFinancialRhythm } from './useFinancialRhythm';
import type { Month } from './useMonths';

export type AILevel = 'positive' | 'neutral' | 'warning' | 'critical';

export interface AIInsight {
  title: string;
  message: string;
  level: AILevel;
  cached?: boolean;
  stale?: boolean;
  source?: 'gemini' | 'cache' | 'cache-stale';
  model?: string;
  generated_at?: string;
}

/**
 * useAIInsight — interpretação contextual via Gemini.
 *
 * Opera silenciosamente: monta um snapshot do estado financeiro,
 * envia para a edge function `generate-financial-insight` que faz
 * cache (24h + hash de contexto) e devolve { title, message, level }.
 *
 * Não cria UI nova — é consumido pelo card de Insights já existente.
 */
export const useAIInsight = (month: Month | undefined): { insight: AIInsight | null; isLoading: boolean } => {
  const { user } = useAuth();
  const fb = useFinancialBalance(month?.id);
  const { cofrinhos } = useCofrinhos();
  const { recorrencias } = useRecurringTransactions();
  const rhythm = useFinancialRhythm();

  const context = useMemo(() => {
    if (!month) return null;
    // Top categorias do mês
    const byCat = new Map<string, number>();
    fb.expenses.forEach(t => {
      const k = t.category || 'Outros';
      byCat.set(k, (byCat.get(k) ?? 0) + Number(t.amount ?? 0));
    });
    const topCategorias = Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([categoria, total]) => ({ categoria, total }));

    // Recorrências próximas (próximos 14 dias)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recorrenciasProximas = recorrencias
      .filter(r => r.ativo && r.proxima_execucao)
      .map(r => {
        const d = new Date(r.proxima_execucao! + 'T12:00:00');
        const dias = Math.round((d.getTime() - today.getTime()) / 86400000);
        return { nome: r.nome, valor: Number(r.valor), dias, tipo: r.tipo as string };
      })
      .filter(r => r.dias >= 0 && r.dias <= 14)
      .slice(0, 6);

    const cofrinhosCtx = cofrinhos.slice(0, 8).map(c => {
      const isMensal = c.tipo === 'mensal';
      const num = isMensal ? Number(c.gasto_mes) : Number(c.saldo);
      const den = isMensal ? Number(c.orcamento_mensal) : Number(c.meta_valor);
      const pct = den > 0 ? Math.min(200, Math.round((num / den) * 100)) : 0;
      return { nome: c.nome, pct, tipo: c.tipo as string };
    });

    return {
      saldoAtual: fb.currentBalance,
      saldoDisponivel: fb.availableReal,
      saldoPrevisto: fb.projectedEndOfMonth,
      totalReceitas: fb.totalIncome,
      totalDespesas: fb.totalExpense,
      compromissosFuturos: fb.commitmentsRemaining,
      saldoReservado: fb.saldoReservado,
      cardsPendentes: fb.cardsPendingThisMonth,
      diasRestantes: fb.daysRemaining,
      isMesAtual: fb.isCurrentMonth,
      rhythmScore: rhythm?.precision,
      predictabilityScore: rhythm?.precision,
      cofrinhos: cofrinhosCtx,
      topCategorias,
      recorrenciasProximas,
      mesRef: `${String(month.month).padStart(2, '0')}/${month.year}`,
    };
  }, [
    month, fb.currentBalance, fb.availableReal, fb.projectedEndOfMonth,
    fb.totalIncome, fb.totalExpense, fb.commitmentsRemaining, fb.saldoReservado,
    fb.cardsPendingThisMonth, fb.daysRemaining, fb.isCurrentMonth, fb.expenses,
    cofrinhos, recorrencias, rhythm?.precision,
  ]);

  // Debounce key — buckets de R$10 para evitar refetch a cada centavo
  const debounceKey = useMemo(() => {
    if (!context) return null;
    const r = (v: number) => Math.round((v ?? 0) / 10) * 10;
    return [
      r(context.saldoAtual), r(context.saldoDisponivel), r(context.saldoPrevisto),
      r(context.totalReceitas), r(context.totalDespesas), r(context.compromissosFuturos),
      r(context.cardsPendentes), context.diasRestantes,
      Math.round((context.rhythmScore ?? 0) / 5) * 5,
      context.cofrinhos?.map(c => `${c.nome}:${Math.round(c.pct / 10) * 10}`).join('|'),
      context.recorrenciasProximas?.map(r2 => `${r2.nome}:${r2.dias}`).join('|'),
      context.mesRef,
    ].join('::');
  }, [context]);

  const query = useQuery({
    queryKey: ['ai-insight', user?.id, debounceKey],
    enabled: !!user && !!context && !!debounceKey,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<AIInsight | null> => {
      console.log('[ai-insight] invoking edge fn', {
        userId: user?.id,
        mesRef: context?.mesRef,
        saldoAtual: context?.saldoAtual,
        debounceKey,
      });
      const { data, error } = await supabase.functions.invoke('generate-financial-insight', {
        body: { context },
      });
      if (error) {
        console.warn('[ai-insight] edge fn error', error);
        return null;
      }
      if (!data || data.error) {
        console.warn('[ai-insight] empty/error payload', data);
        return null;
      }
      console.log('[ai-insight] received', {
        source: data.source,
        model: data.model,
        cached: data.cached,
        stale: data.stale,
        generated_at: data.generated_at,
        level: data.level,
      });
      return data as AIInsight;
    },
  });

  const forceRefresh = async (): Promise<AIInsight | null> => {
    if (!context) return null;
    console.log('[ai-insight] FORCE refresh', { mesRef: context.mesRef });
    const { data, error } = await supabase.functions.invoke('generate-financial-insight', {
      body: { context, force: true },
    });
    if (error) {
      console.warn('[ai-insight] force error', error);
      return null;
    }
    await query.refetch();
    return data as AIInsight;
  };

  return { insight: query.data ?? null, isLoading: query.isLoading, forceRefresh };
};