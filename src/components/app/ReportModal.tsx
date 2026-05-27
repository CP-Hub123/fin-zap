import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Sparkles, Lock, Share2, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthId?: string;
  periodoLabel?: string;
}

type Stage = "idle" | "analyzing" | "insights" | "rendering" | "finalizing" | "ready" | "error";

const PROGRESS: Record<Stage, { label: string; sub: string; progress: number }> = {
  idle:       { label: "Pronto para abrir",            sub: "Toque em \"Ver meu relatório\" para começar.",       progress: 0 },
  analyzing:  { label: "Analisando movimentações…",    sub: "Lendo receitas, despesas e cofrinhos do mês.",      progress: 22 },
  insights:   { label: "Gerando insights…",            sub: "Identificando padrões e variações do período.",     progress: 52 },
  rendering:  { label: "Montando relatório…",          sub: "Compondo a edição editorial em A4.",                progress: 80 },
  finalizing: { label: "Finalizando documento…",       sub: "Aplicando os últimos toques.",                      progress: 94 },
  ready:      { label: "Relatório pronto",             sub: "Baixe ou compartilhe sua edição.",                  progress: 100 },
  error:      { label: "Não foi possível gerar agora", sub: "Veja o detalhe técnico abaixo.",                    progress: 0 },
};

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function smartFilename(periodoLabel?: string) {
  const now = new Date();
  const fallback = `${MONTHS_PT[now.getMonth()]}-${now.getFullYear()}`;
  const slug = (periodoLabel || fallback).replace(/\s+de\s+/i, "-").replace(/\s+/g, "-");
  return `FinZap-Relatorio-${slug}.pdf`;
}

export const ReportModal = ({ open, onOpenChange, monthId, periodoLabel }: Props) => {
  const { session } = useAuth();
  const { isFree } = usePlan();
  const [stage, setStage] = useState<Stage>("idle");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>(() => smartFilename(periodoLabel));
  const [errorDetail, setErrorDetail] = useState<{ message: string; stage?: string; reason?: string } | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    if (!open) {
      setStage("idle");
      setErrorDetail(null);
      clearTimers();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      blobRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setFilename(smartFilename(periodoLabel));
  }, [periodoLabel]);

  const handleGenerate = async () => {
    if (!monthId || !session?.access_token) return;
    if (isFree) return;
    setErrorDetail(null);
    setStage("analyzing");
    clearTimers();
    // Progressive stage choreography — runs in parallel with the real request.
    timersRef.current.push(window.setTimeout(() => setStage((s) => (s === "analyzing" ? "insights" : s)), 900));
    timersRef.current.push(window.setTimeout(() => setStage((s) => (s === "insights" ? "rendering" : s)), 2200));
    timersRef.current.push(window.setTimeout(() => setStage((s) => (s === "rendering" ? "finalizing" : s)), 4200));

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`;
      console.log("[ReportModal] POST", url, { monthId });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ monthId }),
      });
      console.log("[ReportModal] response", res.status, res.headers.get("content-type"));
      if (!res.ok) {
        let payload: any = null;
        try { payload = await res.json(); } catch { /* not json */ }
        const message = payload?.error || `HTTP ${res.status}`;
        const detail = { message, stage: payload?.stage, reason: payload?.reason };
        console.error("[ReportModal] generation failed", detail);
        setErrorDetail(detail);
        throw new Error(message);
      }
      const blob = await res.blob();
      if (!blob.size) throw new Error("PDF retornado sem conteúdo");
      blobRef.current = blob;
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
      const disp = res.headers.get("content-disposition") || "";
      const m = disp.match(/filename="([^"]+)"/);
      // Always prefer the smart filename for the UX; keep header as fallback.
      setFilename(smartFilename(periodoLabel) || m?.[1] || "FinZap-Relatorio.pdf");
      clearTimers();
      setStage("ready");
    } catch (e: any) {
      console.error(e);
      clearTimers();
      toast.error(e.message || "Erro ao gerar relatório");
      setStage("error");
    }
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!blobRef.current) return;
    const file = new File([blobRef.current], filename, { type: "application/pdf" });
    if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Relatório FinZap" }); return; } catch {}
    }
    handleDownload();
  };

  const stageInfo = PROGRESS[stage];
  const isBusy = stage === "analyzing" || stage === "insights" || stage === "rendering" || stage === "finalizing";
  const sizeHint = blobRef.current ? `${Math.max(1, Math.round(blobRef.current.size / 1024))} KB` : "~120 KB";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-4 sm:mx-auto p-0 overflow-hidden">
        {/* Editorial header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-background to-background border-b px-6 pt-6 pb-5 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl opacity-70" />
          <div className="relative flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary/80 font-medium">
            <Sparkles className="h-3 w-3" /> FinZap Premium
          </div>
          <DialogHeader className="relative mt-2 space-y-1">
            <DialogTitle className="text-2xl font-semibold leading-tight">
              Relatório Inteligente
            </DialogTitle>
            <DialogDescription className="text-sm">
              {periodoLabel ? `Edição de ${periodoLabel}.` : "Edição do mês selecionado."} Resumo executivo, evolução de 6 meses, cofrinhos, cartões e leitura estratégica do seu dinheiro.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isFree ? (
            <div className="rounded-xl border bg-muted/30 p-4 flex gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">Disponível para o plano premium</p>
                <p className="text-xs text-muted-foreground">
                  Ative o premium para exportar o relatório completo em PDF, com todos os gráficos e insights.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Status / Preview card */}
              <div className={`relative overflow-hidden rounded-xl border p-4 transition-colors ${stage === "ready" ? "border-primary/30 bg-primary/[0.04]" : stage === "error" ? "border-destructive/30 bg-destructive/[0.04]" : "bg-card"}`}>
                {/* Animated sheen while busy */}
                {isBusy && (
                  <div aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
                )}
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stage === "ready" ? "bg-primary text-primary-foreground" : stage === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      {stage === "ready" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : stage === "error" ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <FileText className={`h-5 w-5 ${isBusy ? "animate-pulse" : ""}`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{stageInfo.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {stage === "ready" ? `${filename} · ${sizeHint}` : stageInfo.sub}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {stageInfo.progress}%
                  </span>
                </div>
                <Progress value={stageInfo.progress} className="h-1.5 mt-3" />
                <div className="relative mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Documento A4 · 7 páginas</span>
                  <span>{periodoLabel || "Mês atual"}</span>
                </div>
              </div>

              {stage === "error" && errorDetail && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 space-y-2">
                  <p className="text-xs font-semibold text-destructive">Detalhe técnico</p>
                  <div className="text-[11px] text-muted-foreground space-y-1 font-mono leading-relaxed">
                    <div><span className="text-foreground/70">erro:</span> {errorDetail.message}</div>
                    {errorDetail.stage && (<div><span className="text-foreground/70">etapa:</span> {errorDetail.stage}</div>)}
                    {errorDetail.reason && (<div className="truncate"><span className="text-foreground/70">motivo:</span> {errorDetail.reason}</div>)}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tente novamente em alguns instantes. Se persistir, registre o detalhe técnico acima.
                  </p>
                </div>
              )}

              {stage === "ready" ? (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleDownload} className="flex-1">
                      <Download className="h-4 w-4 mr-2" /> Baixar PDF
                    </Button>
                    <Button variant="outline" onClick={handleShare} className="flex-1">
                      <Share2 className="h-4 w-4 mr-2" /> Compartilhar
                    </Button>
                  </div>
                  {blobUrl && (
                    <Button variant="ghost" asChild className="w-full">
                      <a href={blobUrl} target="_blank" rel="noreferrer">
                        <Eye className="h-4 w-4 mr-2" /> Visualizar no navegador
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <Button onClick={handleGenerate} disabled={isBusy || !monthId} className="w-full" size="lg">
                  {isBusy ? (
                    <>Preparando sua leitura…</>
                  ) : stage === "error" ? (
                    <>Tentar novamente</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Ver meu relatório</>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};