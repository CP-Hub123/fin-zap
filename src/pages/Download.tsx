import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/app/Logo";
import {
  ArrowLeft,
  CheckCircle2,
  Download as DownloadIcon,
  Loader2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Apple,
  Monitor,
} from "lucide-react";
import {
  APK_FILE_NAME,
  APK_SIZE_MB,
  APP_BUILD,
  APP_VERSION,
  CHANGELOG,
  RELEASE_CHANNEL,
  RELEASE_DATE,
  detectPlatform,
  getApkPublicUrl,
  isStandalonePWA,
  type Platform,
} from "@/lib/appRelease";

const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const InstallStep = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
  <div className="flex gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
      {n}
    </div>
    <div className="space-y-0.5">
      <p className="text-sm font-semibold leading-tight">{title}</p>
      <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
    </div>
  </div>
);

const Download = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const apkUrl = useMemo(() => getApkPublicUrl(), []);
  const installed = useMemo(() => isStandalonePWA(), []);

  useEffect(() => {
    setPlatform(detectPlatform());
    document.title = `Baixar FinZap — v${APP_VERSION} para Android`;
  }, []);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.origin + "/download" : "https://fin-zap.lovable.app/download"
  )}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Trigger direct download via anchor — works for cross-origin Storage URLs.
      const a = document.createElement("a");
      a.href = apkUrl;
      a.download = APK_FILE_NAME;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        setDownloading(false);
        setDownloaded(true);
      }, 1200);
    } catch {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div
          className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <Logo />
          <div className="w-12" />
        </div>
      </header>

      <main
        className="mx-auto max-w-3xl space-y-6 px-4 pb-12 pt-6"
        style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
      >
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 via-card to-background p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary hover:bg-primary/20">
                <Sparkles className="h-3 w-3" /> v{APP_VERSION}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Build estável
              </Badge>
              <Badge variant="outline" className="capitalize">
                {RELEASE_CHANNEL}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
              Leve o FinZap para o seu bolso.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Instale o app oficial para Android e tenha o copiloto financeiro mais inteligente sempre à mão —
              rápido, fluido e feito para o dia a dia.
            </p>

            {installed && (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Você já está usando o FinZap instalado.
              </div>
            )}
          </div>
        </section>

        {/* Platform-aware action */}
        {platform === "android" || platform === "unknown" ? (
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">FinZap para Android</p>
                    <p className="text-xs text-muted-foreground">
                      v{APP_VERSION} · build {APP_BUILD} · {APK_SIZE_MB} MB
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {formatDate(RELEASE_DATE)}
                </Badge>
              </div>

              <Button
                size="lg"
                onClick={handleDownload}
                disabled={downloading}
                className="h-12 w-full text-base font-semibold"
              >
                {downloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando download…
                  </>
                ) : downloaded ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Download iniciado
                  </>
                ) : (
                  <>
                    <DownloadIcon className="mr-2 h-5 w-5" /> Baixar APK ({APK_SIZE_MB} MB)
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Conexão segura via HTTPS · Build assinado pelo FinZap
              </p>
            </CardContent>
          </Card>
        ) : platform === "ios" ? (
          <Card className="border-border/60">
            <CardContent className="space-y-3 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                  <Apple className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Versão para iOS em breve</p>
                  <p className="text-xs text-muted-foreground">
                    Enquanto isso, use o FinZap pelo navegador e adicione à tela inicial.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/app")}>
                Abrir no navegador
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Monitor className="h-4 w-4" /> Você está no desktop
                </div>
                <p className="text-sm text-muted-foreground">
                  Aponte a câmera do seu Android para o QR Code ao lado e baixe o app diretamente no celular.
                </p>
                <Button variant="outline" size="sm" onClick={handleDownload} className="mt-1">
                  <DownloadIcon className="mr-2 h-4 w-4" /> Baixar APK mesmo assim
                </Button>
              </div>
              <div className="flex items-center justify-center rounded-2xl bg-white p-3">
                <img src={qrUrl} alt="QR Code para baixar o FinZap" className="h-36 w-36" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Install steps */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Como instalar
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <InstallStep n={1} title="Baixe o APK" desc="Toque em baixar e aguarde alguns segundos." />
            <InstallStep
              n={2}
              title="Permita a instalação"
              desc="Se solicitado, libere instalações desta fonte uma única vez."
            />
            <InstallStep n={3} title="Pronto" desc="Abra o FinZap pelo ícone na sua tela inicial." />
          </div>
        </section>

        {/* Trust */}
        <section className="grid gap-2.5 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-xs">
            <Shield className="h-4 w-4 text-emerald-500" /> 100% HTTPS
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Build assinado
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sem rastreadores invasivos
          </div>
        </section>

        {/* Changelog */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Notas da versão
          </h2>
          <div className="space-y-3">
            {CHANGELOG.map((entry) => (
              <Card key={entry.version} className="border-border/60">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">v{entry.version}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {entry.highlights.map((h) => (
                      <li key={h} className="flex gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Download;