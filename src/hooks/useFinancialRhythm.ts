import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringTransactions } from './useRecurringTransactions';

export type RhythmLevel = 'excellent' | 'good' | 'attention' | 'outdated';

export interface RhythmState {
  /** 0–100 — quão confiável é a previsão atual do FinZap */
  precision: number;
  level: RhythmLevel;
  /** Cópia editorial principal (curta) */
  headline: string;
  /** Sub-texto editorial (consciência, não cobrança) */
  subtitle: string;
  /** Sugestão sutil para aumentar precisão */
  suggestion: string | null;
  /** Dias desde a última movimentação registrada */
  daysSinceLastUpdate: number | null;
  /** Atividade dos últimos 14 dias — contagem por dia (mais antigo → mais recente) */
  activity: { date: string; count: number }[];
  /** Recorrências em atraso (proxima_execucao <= hoje e ainda não lançadas) */
  recorrenciasPendentes: number;
  loading: boolean;
}

const LEVEL_META: Record<RhythmLevel, { headline: string; subtitle: string }> = {
  excellent: {
    headline: 'Excelente visibilidade',
    subtitle: 'O FinZap está acompanhando seus movimentos com precisão.',
  },
  good: {
    headline: 'Boa previsibilidade',
    subtitle: 'Sua projeção está sólida — pequenos ajustes deixam tudo ainda mais nítido.',
  },
  attention: {
    headline: 'Atenção necessária',
    subtitle: 'Seus números talvez não reflitam totalmente sua realidade atual.',
  },
  outdated: {
    headline: 'Dados desatualizados',
    subtitle: 'O FinZap perdeu visibilidade sobre seus últimos movimentos.',
  },
};

const DAY_MS = 86_400_000;

export const useFinancialRhythm = (): RhythmState => {
  const { user } = useAuth();
  const { recorrencias } = useRecurringTransactions();

  const since = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 13);
    return d;
  }, []);

  const recentQuery = useQuery({
    queryKey: ['rhythm-recent', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const sinceIso = since.toISOString();
      const { data, error } = await supabase
        .from('transactions')
        .select('id, date, created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const lastTxQuery = useQuery({
    queryKey: ['rhythm-last-tx', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0]?.created_at ?? null;
    },
  });

  return useMemo<RhythmState>(() => {
    const loading = recentQuery.isLoading || lastTxQuery.isLoading;
    const recent = recentQuery.data ?? [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Atividade dos últimos 14 dias
    const activity: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      activity.push({ date: key, count: 0 });
    }
    const index: Record<string, number> = {};
    activity.forEach((a, i) => { index[a.date] = i; });
    recent.forEach((t: any) => {
      const key = (t.created_at as string).slice(0, 10);
      if (index[key] !== undefined) activity[index[key]].count += 1;
    });

    // Dias desde a última movimentação
    let daysSinceLastUpdate: number | null = null;
    if (lastTxQuery.data) {
      const last = new Date(lastTxQuery.data as string);
      daysSinceLastUpdate = Math.max(0, Math.floor((today.getTime() - last.getTime()) / DAY_MS));
    }

    // Recorrências pendentes (proxima_execucao <= hoje)
    const todayIso = today.toISOString().slice(0, 10);
    const recorrenciasPendentes = recorrencias.filter(
      r => r.ativo && r.proxima_execucao && r.proxima_execucao <= todayIso
    ).length;

    // ─── Cálculo de precisão (0–100) ─────────────────────────────────
    // Componentes:
    //  • Recência (40 pts): quão recente foi o último update
    //  • Frequência (30 pts): dias ativos nos últimos 14
    //  • Recorrências em dia (20 pts)
    //  • Volume recente (10 pts): atividade nos últimos 7 dias
    let recencia = 40;
    if (daysSinceLastUpdate === null) recencia = 0;
    else if (daysSinceLastUpdate <= 1) recencia = 40;
    else if (daysSinceLastUpdate <= 3) recencia = 32;
    else if (daysSinceLastUpdate <= 7) recencia = 22;
    else if (daysSinceLastUpdate <= 14) recencia = 10;
    else recencia = 0;

    const diasAtivos = activity.filter(a => a.count > 0).length; // 0..14
    const frequencia = Math.round((Math.min(diasAtivos, 10) / 10) * 30); // até 30

    const totalRec = recorrencias.filter(r => r.ativo).length;
    let recScore = 20;
    if (totalRec > 0) {
      const ratio = 1 - Math.min(1, recorrenciasPendentes / totalRec);
      recScore = Math.round(ratio * 20);
    }

    const last7 = activity.slice(-7).reduce((s, a) => s + a.count, 0);
    const volume = Math.min(10, last7); // 1pt por movimento (cap 10)

    const precision = Math.max(0, Math.min(100, recencia + frequencia + recScore + volume));

    let level: RhythmLevel;
    if (precision >= 85) level = 'excellent';
    else if (precision >= 65) level = 'good';
    else if (precision >= 40) level = 'attention';
    else level = 'outdated';

    const meta = LEVEL_META[level];

    // Sugestão sutil (consciência, sem cobrança)
    let suggestion: string | null = null;
    if (recorrenciasPendentes > 0) {
      suggestion = `${recorrenciasPendentes} recorrência${recorrenciasPendentes > 1 ? 's' : ''} aguardando confirmação podem refinar sua projeção.`;
    } else if (daysSinceLastUpdate !== null && daysSinceLastUpdate >= 4) {
      suggestion = 'Registrar movimentos recentes devolve nitidez ao seu panorama.';
    } else if (level === 'good') {
      suggestion = 'Pequenos ajustes elevam ainda mais a confiabilidade da projeção.';
    } else if (level === 'excellent') {
      suggestion = null;
    }

    return {
      precision,
      level,
      headline: meta.headline,
      subtitle: meta.subtitle,
      suggestion,
      daysSinceLastUpdate,
      activity,
      recorrenciasPendentes,
      loading,
    };
  }, [recentQuery.data, recentQuery.isLoading, lastTxQuery.data, lastTxQuery.isLoading, recorrencias]);
};