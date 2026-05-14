import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, X } from "lucide-react";
import { detectPlatform, isStandalonePWA } from "@/lib/appRelease";

const DISMISS_KEY = "finzap_install_banner_dismissed_at";
const PERMANENT_KEY = "finzap_install_banner_never";
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export const InstallAppBanner = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalonePWA()) return;
    if (detectPlatform() !== "android") return;
    if (localStorage.getItem(PERMANENT_KEY) === "1") return;
    const last = Number(localStorage.getItem(DISMISS_KEY) || "0");
    if (Date.now() - last < COOLDOWN_MS) return;
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };
  const never = () => {
    localStorage.setItem(PERMANENT_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:right-6 sm:bottom-24"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="rounded-2xl border border-border/60 bg-card/95 p-3.5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Instale o FinZap no celular</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Experiência mais rápida, fluida e com acesso direto pelo ícone.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => {
                  navigate("/download");
                  setVisible(false);
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar aplicativo
              </Button>
              <button
                onClick={dismiss}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Agora não
              </button>
              <button
                onClick={never}
                className="text-xs font-medium text-muted-foreground/70 hover:text-foreground"
              >
                Não mostrar novamente
              </button>
            </div>
          </div>
          <button
            aria-label="Fechar"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};