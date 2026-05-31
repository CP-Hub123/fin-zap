import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_MODEL = "google/gemini-3-flash-preview";

// Acceptable insight levels
const LEVELS = ["positive", "neutral", "warning", "critical"] as const;
type Level = (typeof LEVELS)[number];

interface Context {
  saldoAtual: number;
  saldoDisponivel: number;
  saldoPrevisto: number;
  totalReceitas: number;
  totalDespesas: number;
  compromissosFuturos: number;
  saldoReservado: number;
  cardsPendentes: number;
  diasRestantes: number;
  isMesAtual: boolean;
  rhythmScore?: number;
  predictabilityScore?: number;
  cofrinhos?: Array<{ nome: string; pct: number; tipo: string }>;
  topCategorias?: Array<{ categoria: string; total: number }>;
  recorrenciasProximas?: Array<{ nome: string; valor: number; dias: number; tipo: string }>;
  mesRef?: string;
}

// Stable hash of the meaningful context (cents + integers).
async function hashContext(ctx: Context): Promise<string> {
  // Round currency to nearest R$ 10 — avoids busting cache on every centavo.
  const round = (v: number) => Math.round((v ?? 0) / 10) * 10;
  const norm = {
    a: round(ctx.saldoAtual),
    b: round(ctx.saldoDisponivel),
    c: round(ctx.saldoPrevisto),
    r: round(ctx.totalReceitas),
    d: round(ctx.totalDespesas),
    cf: round(ctx.compromissosFuturos),
    sr: round(ctx.saldoReservado),
    cp: round(ctx.cardsPendentes),
    dr: ctx.diasRestantes,
    rs: Math.round((ctx.rhythmScore ?? 0) / 5) * 5,
    ps: Math.round((ctx.predictabilityScore ?? 0) / 5) * 5,
    cof: (ctx.cofrinhos ?? []).map((c) => `${c.nome}:${Math.round(c.pct / 10) * 10}`).join("|"),
    tc: (ctx.topCategorias ?? []).map((t) => `${t.categoria}:${round(t.total)}`).join("|"),
    rp: (ctx.recorrenciasProximas ?? []).map((r) => `${r.nome}:${r.dias}`).join("|"),
    m: ctx.mesRef ?? "",
  };
  const json = JSON.stringify(norm);
  const enc = new TextEncoder().encode(json);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildPrompt(ctx: Context): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

  const lines: string[] = [];
  lines.push(`Mês: ${ctx.mesRef ?? "atual"} | Dias restantes: ${ctx.diasRestantes}`);
  lines.push(`Saldo atual: ${fmt(ctx.saldoAtual)}`);
  lines.push(`Saldo disponível real: ${fmt(ctx.saldoDisponivel)}`);
  lines.push(`Projeção fim de mês: ${fmt(ctx.saldoPrevisto)}`);
  lines.push(`Receitas no mês: ${fmt(ctx.totalReceitas)}`);
  lines.push(`Despesas no mês: ${fmt(ctx.totalDespesas)}`);
  lines.push(`Compromissos futuros: ${fmt(ctx.compromissosFuturos)}`);
  lines.push(`Cartões pendentes: ${fmt(ctx.cardsPendentes)}`);
  lines.push(`Saldo reservado em cofrinhos: ${fmt(ctx.saldoReservado)}`);
  if (ctx.rhythmScore != null) lines.push(`Ritmo financeiro: ${ctx.rhythmScore}/100`);
  if (ctx.predictabilityScore != null) lines.push(`Previsibilidade: ${ctx.predictabilityScore}/100`);
  if (ctx.cofrinhos?.length) {
    lines.push(`Cofrinhos: ${ctx.cofrinhos.map((c) => `${c.nome} (${c.pct}%)`).join(", ")}`);
  }
  if (ctx.topCategorias?.length) {
    lines.push(
      `Top categorias de gasto: ${ctx.topCategorias.map((t) => `${t.categoria} ${fmt(t.total)}`).join(", ")}`,
    );
  }
  if (ctx.recorrenciasProximas?.length) {
    lines.push(
      `Recorrências próximas: ${ctx.recorrenciasProximas
        .map((r) => `${r.nome} ${fmt(r.valor)} em ${r.dias}d (${r.tipo})`)
        .join(", ")}`,
    );
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = `Você é o motor de insights financeiros do FinZap, um app brasileiro premium de gestão pessoal.

Sua função: ler o panorama financeiro de UM usuário e retornar UM único insight curto, editorial e contextual.

REGRAS RÍGIDAS:
- Idioma: português do Brasil.
- Tom: sofisticado, sereno, humano, premium (estilo Apple/Stripe/Notion). NUNCA motivacional, NUNCA coaching, NUNCA clichê ("mantenha o foco", "você consegue", "continue assim").
- O insight deve refletir APENAS o estado real apresentado nos dados. Sem generalizações, sem conselhos genéricos.
- "title": 1 título curto e descritivo (máx. 32 caracteres).
- "message": 1 a 2 frases, máximo 180 caracteres no total. Sem emojis. Sem exclamações exageradas.
- "level": classifique semanticamente em "positive" (estabilidade/melhora), "neutral" (consistência sem desvios), "warning" (atenção/pressão crescente), "critical" (risco real, saldo negativo, estouro, comprometimento alto).
- Interprete: estabilidade, degradação, melhora, mudança de comportamento, consumo de cartão, aderência a orçamentos, projeção de fechamento.
- NÃO sugira ações longas. NÃO peça ao usuário para fazer X. Apenas observe e contextualize.
- Use valores em R$ apenas quando relevante para o insight.

Retorne via a ferramenta financial_insight, sem texto adicional.`;

async function callGemini(ctx: Context): Promise<{ title: string; message: string; level: Level }> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(ctx) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "financial_insight",
            description: "Retorna o insight financeiro contextual do usuário.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", maxLength: 40 },
                message: { type: "string", maxLength: 200 },
                level: { type: "string", enum: LEVELS as unknown as string[] },
              },
              required: ["title", "message", "level"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "financial_insight" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini gateway ${resp.status}: ${t}`);
  }

  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  const argsRaw = call?.function?.arguments;
  if (!argsRaw) throw new Error("Gemini did not return a tool call");

  const parsed = JSON.parse(argsRaw);
  let { title, message, level } = parsed ?? {};
  if (typeof title !== "string" || typeof message !== "string") {
    throw new Error("Insight inválido");
  }
  if (!LEVELS.includes(level)) level = "neutral";
  title = title.trim().slice(0, 40);
  message = message.trim().slice(0, 200);
  return { title, message, level: level as Level };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const ctx: Context = body?.context;
    if (!ctx || typeof ctx !== "object") {
      return new Response(JSON.stringify({ error: "missing context" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const hash = await hashContext(ctx);
    const force = body?.force === true;

    // Cache lookup
    const { data: cached } = await admin
      .from("ai_insights_cache")
      .select("title, message, level, context_hash, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const cacheFresh =
      cached &&
      cached.context_hash === hash &&
      Date.now() - new Date(cached.updated_at).getTime() < 24 * 60 * 60 * 1000;

    if (cached && cacheFresh && !force) {
      return new Response(
        JSON.stringify({
          title: cached.title,
          message: cached.message,
          level: cached.level,
          cached: true,
          source: "cache",
          model: GEMINI_MODEL,
          generated_at: cached.updated_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate
    let insight: { title: string; message: string; level: Level };
    try {
      insight = await callGemini(ctx);
    } catch (e) {
      console.error("Gemini error", e);
      // graceful fallback: serve stale cache if exists
      if (cached) {
        return new Response(
          JSON.stringify({
            title: cached.title,
            message: cached.message,
            level: cached.level,
            cached: true,
            stale: true,
            source: "cache-stale",
            model: GEMINI_MODEL,
            generated_at: cached.updated_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "ai_unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("ai_insights_cache").upsert({
      user_id: userId,
      context_hash: hash,
      title: insight.title,
      message: insight.message,
      level: insight.level,
      context_snapshot: ctx as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    });

    const nowIso = new Date().toISOString();
    return new Response(JSON.stringify({
      ...insight,
      cached: false,
      source: "gemini",
      model: GEMINI_MODEL,
      generated_at: nowIso,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-financial-insight error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});