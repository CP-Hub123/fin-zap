import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, X } from "lucide-react";

const DISMISS_KEY = "finzap_pwa_install_dismissed_at";
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

export const PWAInstallBanner = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const last = Number(localStorage.getItem(DISMISS_KEY) || "0");
    if (Date.now() - last < COOLDOWN_MS) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setTimeout(() => setVisible(true), 3000);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome !== "accepted") dismiss();
      setDeferred(null);
      setVisible(false);
    } catch {
      dismiss();
    }
  };

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:right-6 sm:bottom-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="rounded-2xl border border-border/60 bg-card/95 p-3.5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Instale o FinZap</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Adicione à tela inicial para usar como aplicativo.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <Button size="sm" className="h-8 rounded-full px-3 text-xs" onClick={install}>
                Instalar
              </Button>
              <button
                onClick={dismiss}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Agora não
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