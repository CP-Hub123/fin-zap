import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyThemeOnLoad } from "./components/app/ThemeToggle";

applyThemeOnLoad();

// Register service worker for PWA installability.
// Skip inside iframes or Lovable preview hosts to avoid stale cache issues.
(() => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const host = window.location.hostname;
  const isPreview = host.includes("id-preview--") || host.includes("lovableproject.com");
  if (inIframe || isPreview) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Soft-update: when the tab regains focus, ask the SW to re-check.
      // If a new SW is waiting, tell it to take over silently — it will
      // only become active on the next natural navigation.
      const trigger = () => {
        reg.update().catch(() => {});
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      };
      window.addEventListener("focus", trigger);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            nw.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    }).catch(() => {});
  });
})();

createRoot(document.getElementById("root")!).render(<App />);
