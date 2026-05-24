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
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
})();

createRoot(document.getElementById("root")!).render(<App />);
