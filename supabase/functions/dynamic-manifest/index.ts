// Dynamic PWA manifest — reads `app_icon_mode` from system_settings
// and returns a manifest pointing to the matching versioned icon set.
//
// Note: changing this manifest does NOT instantly update icons on
// already-installed PWAs. iOS never refetches; Android Chrome refetches
// every ~24h–7d and schedules a WebAPK update via Play Services.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type Mode = "normal" | "maintenance" | "event" | "founders";

const ICONS: Record<Mode, { file: string; name: string; short: string; theme: string }> = {
  normal:      { file: "/finzap-icon-normal-v1.png",      name: "FinZap — Decisão financeira inteligente", short: "FinZap",      theme: "#07090F" },
  maintenance: { file: "/finzap-icon-maintenance-v1.png", name: "FinZap (manutenção)",                     short: "FinZap",      theme: "#1f1b16" },
  event:       { file: "/finzap-icon-event-v1.png",       name: "FinZap — Evento especial",                short: "FinZap",      theme: "#1b0b2e" },
  founders:    { file: "/finzap-icon-founders-v1.png",    name: "FinZap Founders",                         short: "Founders",    theme: "#0d0a02" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let mode: Mode = "normal";
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "app_icon_mode")
      .maybeSingle();
    const v = (data?.value ?? "normal") as Mode;
    if (v === "normal" || v === "maintenance" || v === "event" || v === "founders") mode = v;
  } catch (e) {
    console.error("[dynamic-manifest] failed to read mode", e);
  }

  const ref = req.headers.get("origin") || "";
  // Derive site origin: prefer caller origin, fallback to published URL.
  const origin = ref && /^https?:\/\//.test(ref) ? ref : "https://fin-zap.lovable.app";
  const icon = ICONS[mode];
  const iconUrl = origin + icon.file;

  const manifest = {
    name: icon.name,
    short_name: icon.short,
    description: "Copiloto financeiro pessoal. Decida antes de gastar.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07090F",
    theme_color: icon.theme,
    lang: "pt-BR",
    id: "/app",
    icons: [
      { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Resumo do mês", short_name: "Resumo", url: "/app", icons: [{ src: iconUrl, sizes: "192x192" }] },
      { name: "Cartões",       short_name: "Cartões", url: "/cartoes", icons: [{ src: iconUrl, sizes: "192x192" }] },
    ],
    _mode: mode,
    _generated_at: new Date().toISOString(),
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      ...cors,
      "Content-Type": "application/manifest+json; charset=utf-8",
      // Short cache so Chrome refetches reasonably often.
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
});