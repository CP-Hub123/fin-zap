import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAIInsight } from '@/hooks/useAIInsight';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Database, Brain, AlertCircle } from 'lucide-react';
import type { Month } from '@/hooks/useMonths';

interface Props { month: Month | undefined }

/** Painel temporário de diagnóstico do Gemini Insights Engine (apenas admin). */
export const AIInsightDiagnostics = ({ month }: Props) => {
  const { isAdmin } = useAuth();
  const { insight, isLoading, forceRefresh } = useAIInsight(month);
  const [forcing, setForcing] = useState(false);
  const [lastForce, setLastForce] = useState<string | null>(null);

  if (!isAdmin) return null;

  const source = insight?.source ?? (isLoading ? 'carregando…' : 'sem dados');
  const SourceIcon = insight?.source === 'gemini' ? Brain
    : insight?.source?.startsWith('cache') ? Database
    : AlertCircle;

  const handleForce = async () => {
    if (!forceRefresh) return;
    setForcing(true);
    try {
      const r = await forceRefresh();
      setLastForce(r ? `OK · ${r.source} · ${new Date().toLocaleTimeString('pt-BR')}` : 'falhou');
    } finally {
      setForcing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Gemini Insights · Diagnóstico (admin)
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleForce}
          disabled={forcing || !forceRefresh}
          className="h-7 text-xs"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${forcing ? 'animate-spin' : ''}`} />
          Force Gemini Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Field label="Source" value={source} icon={<SourceIcon className="h-3 w-3" />} />
        <Field label="Model" value={insight?.model ?? '—'} />
        <Field label="Cached" value={insight?.cached ? (insight.stale ? 'stale' : 'hit') : 'miss'} />
        <Field label="Gerado" value={insight?.generated_at ? new Date(insight.generated_at).toLocaleString('pt-BR') : '—'} />
      </div>
      {insight && (
        <div className="rounded-lg bg-background/60 border p-2 text-xs space-y-1">
          <p className="font-semibold">{insight.title} <span className="text-muted-foreground font-normal">· {insight.level}</span></p>
          <p className="text-muted-foreground">{insight.message}</p>
        </div>
      )}
      {lastForce && (
        <p className="text-[10px] text-muted-foreground">Última execução forçada: {lastForce}</p>
      )}
    </div>
  );
};

const Field = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">{icon}{label}</p>
    <p className="font-mono text-foreground truncate">{value}</p>
  </div>
);