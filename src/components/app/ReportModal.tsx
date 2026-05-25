import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Loader2, Sparkles, Lock, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthId?: string;
  periodoLabel?: string;
}

type Stage = "idle" | "loading" | "rendering" | "ready" | "error";

const STAGES: Record<Stage, { label: string; progress: number }> = {
  idle:      { label: "Pronto para gerar", progress: 0 },
  loading:   { label: "Reunindo seus dados...", progress: 30 },
  rendering: { label: "Renderizando o relatório editorial...", progress: 75 },
  ready:     { label: "Relatório pronto.", progress: 100 },
  error:     { label: "Algo saiu do esperado.", progress: 0 },
};

export const ReportModal = ({ open, onOpenChange, monthId, periodoLabel }: Props) => {
  const { session } = useAuth();
  const { isFree } = usePlan();
  const [stage, setStage] = useState<Stage>("idle");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("relatorio.pdf");
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (!open) {
      setStage("idle");
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      blobRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleGenerate = async () => {
    if (!monthId || !session?.access_token) return;
    if (isFree) return;
    setStage("loading");
    try {
      // small staged delay so the user perceives progress
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`;
      const t = setTimeout(() => setStage("rendering"), 600);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ monthId }),
      });
      clearTimeout(t);
      if (!res.ok) {
        let msg = "Falha ao gerar relatório";
        try { const j = await res.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      blobRef.current = blob;
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
      const disp = res.headers.get("content-disposition") || "";
      const m = disp.match(/filename="([^"]+)"/);
      if (m?.[1]) setFilename(m[1]);
      setStage("ready");
    } catch (e: any) {
      console.error(e);
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

  const stageInfo = STAGES[stage];
  const isBusy = stage === "loading" || stage === "rendering";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-4 sm:mx-auto p-0 overflow-hidden">
        {/* Editorial header */}
        <div className="bg-gradient-to-br from-primary/8 via-background to-background border-b px-6 pt-6 pb-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Relatório premium
          </div>
          <DialogHeader className="mt-2 space-y-1">
            <DialogTitle className="text-2xl font-semibold leading-tight">
              Seu relatório financeiro
            </DialogTitle>
            <DialogDescription className="text-sm">
              {periodoLabel ? `Edição de ${periodoLabel}.` : "Edição do mês selecionado."} Um documento editorial com resumo executivo, evolução, cofrinhos, cartões e leitura estratégica.
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
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {isBusy ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{stageInfo.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Documento A4 · 7 páginas · ~120kb
                      </p>
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {stageInfo.progress}%
                  </span>
                </div>
                <Progress value={stageInfo.progress} className="h-1.5 mt-3" />
              </div>

              {stage === "ready" ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleDownload} className="flex-1">
                    <Download className="h-4 w-4 mr-2" /> Baixar PDF
                  </Button>
                  <Button variant="outline" onClick={handleShare} className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" /> Compartilhar
                  </Button>
                  {blobUrl && (
                    <Button variant="ghost" asChild className="flex-1">
                      <a href={blobUrl} target="_blank" rel="noreferrer">Visualizar</a>
                    </Button>
                  )}
                </div>
              ) : (
                <Button onClick={handleGenerate} disabled={isBusy || !monthId} className="w-full">
                  {isBusy ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                  ) : stage === "error" ? (
                    "Tentar novamente"
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Gerar relatório</>
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