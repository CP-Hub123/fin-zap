// FinZap — Premium Report PDF Generator
// Renders a server-side PDF using @react-pdf/renderer on Deno.
// Auth: validates user JWT in code. Subscription gate: requires active sub.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import React from "npm:react@18.3.1";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Line,
  Rect,
  renderToBuffer,
} from "npm:@react-pdf/renderer@3.4.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// NOTE: We intentionally rely on react-pdf's built-in Helvetica family.
// Registering remote fonts (Manrope) at runtime causes intermittent TLS / DNS
// failures on Deno Deploy and is the single most common cause of silent
// renderToBuffer crashes in this function. Helvetica is identical across
// Chromium / preview / print, so the editorial look is preserved.
const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

// ────────────────────────────────────────────────────────────────────────
// Brand tokens (editorial / premium)
// ────────────────────────────────────────────────────────────────────────
const C = {
  ink: "#0B0F14",
  ink2: "#1A2230",
  muted: "#6B7280",
  hair: "#E5E7EB",
  bg: "#FFFFFF",
  surface: "#F8FAFC",
  brand: "#1F8A4C",
  brandSoft: "#E8F5EE",
  pos: "#1F8A4C",
  neg: "#B42318",
  warn: "#B54708",
  blue: "#1D4ED8",
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: FONT,
    fontSize: 10,
    color: C.ink,
    backgroundColor: C.bg,
  },
  // Cover
  coverWrap: { flexGrow: 1, justifyContent: "space-between" },
  coverTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.brand },
  brandText: { fontSize: 12, fontFamily: FONT_BOLD, letterSpacing: 0.6 },
  coverEyebrow: { fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase" },
  coverTitle: { fontSize: 44, fontFamily: FONT_BOLD, lineHeight: 1.05, marginTop: 12 },
  coverSub: { fontSize: 14, color: C.muted, marginTop: 12, maxWidth: 380 },
  coverMetaGrid: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: C.hair, paddingTop: 16 },
  coverMetaCol: { flex: 1 },
  coverMetaLabel: { fontSize: 8, color: C.muted, letterSpacing: 1.4, textTransform: "uppercase" },
  coverMetaValue: { fontSize: 13, fontFamily: FONT_BOLD, marginTop: 4 },

  // Generic page chrome
  pageHeader: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: C.hair, paddingBottom: 10, marginBottom: 22 },
  pageHeaderL: { fontSize: 8, color: C.muted, letterSpacing: 1.6, textTransform: "uppercase" },
  pageHeaderR: { fontSize: 8, color: C.muted },
  pageFooter: { position: "absolute", left: 48, right: 48, bottom: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted },

  section: { marginBottom: 24 },
  sectionEyebrow: { fontSize: 8, color: C.muted, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 6 },
  sectionTitle: { fontSize: 22, fontFamily: FONT_BOLD, marginBottom: 4 },
  sectionLede: { fontSize: 10, color: C.muted, maxWidth: 480 },

  // KPI cards
  kpiGrid: { flexDirection: "row", gap: 12, marginTop: 14 },
  kpiCard: { flex: 1, padding: 14, borderWidth: 0.5, borderColor: C.hair, borderRadius: 6 },
  kpiLabel: { fontSize: 8, color: C.muted, letterSpacing: 1.4, textTransform: "uppercase" },
  kpiValue: { fontSize: 18, fontFamily: FONT_BOLD, marginTop: 8 },
  kpiHint: { fontSize: 9, color: C.muted, marginTop: 4 },

  // Rows
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.hair },
  rowFirst: { borderTopWidth: 0.5, borderTopColor: C.hair },
  rowName: { fontSize: 10 },
  rowMeta: { fontSize: 9, color: C.muted, marginTop: 2 },
  rowValue: { fontSize: 11, fontFamily: FONT_BOLD },

  // Insights
  insight: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.hair },
  insightLabel: { fontSize: 8, color: C.muted, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 },
  insightTitle: { fontSize: 12, fontFamily: FONT_BOLD, marginBottom: 4 },
  insightBody: { fontSize: 10, color: C.ink2, lineHeight: 1.5 },

  // Closing
  closingWrap: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  closingQuote: { fontSize: 26, fontFamily: FONT_BOLD, textAlign: "center", maxWidth: 380, lineHeight: 1.25 },
  closingSig: { marginTop: 28, fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase" },
});

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
const fmtPct = (v: number) => `${Math.round(v)}%`;
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function PageChrome({ label, periodo }: { label: string; periodo: string }) {
  return React.createElement(
    View,
    { style: styles.pageHeader, fixed: true },
    React.createElement(Text, { style: styles.pageHeaderL }, label),
    React.createElement(Text, { style: styles.pageHeaderR }, `FinZap · ${periodo}`),
  );
}

function PageFooter() {
  return React.createElement(
    View,
    { style: styles.pageFooter, fixed: true },
    React.createElement(Text, null, "FinZap"),
    React.createElement(Text, {
      render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}`,
    }),
  );
}

// Simple SVG line chart drawn manually
function LineChart({ data, width = 460, height = 140, color = C.brand }:
  { data: { label: string; value: number }[]; width?: number; height?: number; color?: string }) {
  if (!data.length) return null;
  const padL = 36, padR = 8, padT = 10, padB = 22;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const values = data.map(d => d.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = padL + i * stepX;
    const y = padT + h - ((d.value - min) / range) * h;
    return { x, y, label: d.label, value: d.value };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map(t => padT + h * t);

  const children: any[] = [];
  // Grid
  gridYs.forEach((y, i) =>
    children.push(React.createElement(Line, {
      key: `g${i}`, x1: padL, x2: width - padR, y1: y, y2: y,
      stroke: C.hair, strokeWidth: 0.5,
    })),
  );
  // Path
  children.push(React.createElement(Path, {
    key: "p", d: pathD, stroke: color, strokeWidth: 1.4, fill: "none",
  }));
  // Dots
  points.forEach((p, i) =>
    children.push(React.createElement(Rect, {
      key: `d${i}`, x: p.x - 1.5, y: p.y - 1.5, width: 3, height: 3, fill: color,
    })),
  );
  // X labels
  points.forEach((p, i) =>
    children.push(React.createElement(
      // @ts-ignore svg text
      Svg.Text || (Text as any), { key: `xl${i}`, x: p.x, y: height - 6, style: { fontSize: 7, fill: C.muted, textAnchor: "middle" } }, p.label,
    )),
  );

  return React.createElement(Svg, { width, height, style: { marginTop: 12 } }, ...children);
}

// Bar chart (paired) — receitas vs despesas
function BarsChart({ data, width = 460, height = 150 }:
  { data: { label: string; income: number; expense: number }[]; width?: number; height?: number }) {
  if (!data.length) return null;
  const padL = 36, padR = 8, padT = 10, padB = 22;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  const groupW = w / data.length;
  const barW = Math.min(14, (groupW - 6) / 2);

  const children: any[] = [];
  [0, 0.5, 1].forEach((t, i) => {
    const y = padT + h * (1 - t);
    children.push(React.createElement(Line, {
      key: `g${i}`, x1: padL, x2: width - padR, y1: y, y2: y, stroke: C.hair, strokeWidth: 0.5,
    }));
  });

  data.forEach((d, i) => {
    const gx = padL + i * groupW + groupW / 2;
    const x1 = gx - barW - 1;
    const x2 = gx + 1;
    const hi = (d.income / max) * h;
    const he = (d.expense / max) * h;
    children.push(React.createElement(Rect, { key: `i${i}`, x: x1, y: padT + h - hi, width: barW, height: hi, fill: C.brand }));
    children.push(React.createElement(Rect, { key: `e${i}`, x: x2, y: padT + h - he, width: barW, height: he, fill: C.neg }));
    children.push(React.createElement(
      Text as any, { key: `xl${i}`, x: gx, y: height - 6, style: { fontSize: 7, fill: C.muted, textAnchor: "middle" } }, d.label,
    ));
  });
  return React.createElement(Svg, { width, height, style: { marginTop: 12 } }, ...children);
}

// ────────────────────────────────────────────────────────────────────────
// Document
// ────────────────────────────────────────────────────────────────────────
function buildDocument(payload: any) {
  const {
    userName, periodo, generatedAt,
    totals, // { income, expense, balance, free, reserved, committed, initial, final }
    history, // [{ label, income, expense, balance }]
    cofrinhos, // [{ nome, saldo, meta, pct }]
    cards, // [{ nome, limite, usado, pct, fech, venc }]
    insights, // [{ label, title, body }]
  } = payload;

  const h = (...args: any[]) => React.createElement.apply(React, args as any);

  // COVER ────────────────────────────────────────────────
  const cover = h(Page, { size: "A4", style: styles.page },
    h(View, { style: styles.coverWrap },
      h(View, { style: styles.coverTop },
        h(View, { style: styles.brandRow },
          h(View, { style: styles.brandDot }),
          h(Text, { style: styles.brandText }, "FINZAP"),
        ),
        h(Text, { style: styles.coverEyebrow }, "Relatório · Edição mensal"),
      ),
      h(View, null,
        h(Text, { style: styles.coverEyebrow }, "Relatório financeiro"),
        h(Text, { style: styles.coverTitle }, periodo),
        h(Text, { style: styles.coverSub },
          "Uma leitura editorial do seu mês: o que entrou, o que saiu, o que você reservou e o que ficou disponível para decisões.",
        ),
      ),
      h(View, { style: styles.coverMetaGrid },
        h(View, { style: styles.coverMetaCol },
          h(Text, { style: styles.coverMetaLabel }, "Preparado para"),
          h(Text, { style: styles.coverMetaValue }, userName || "—"),
        ),
        h(View, { style: styles.coverMetaCol },
          h(Text, { style: styles.coverMetaLabel }, "Saldo final"),
          h(Text, { style: styles.coverMetaValue }, fmtBRL(totals.final)),
        ),
        h(View, { style: styles.coverMetaCol },
          h(Text, { style: styles.coverMetaLabel }, "Emitido em"),
          h(Text, { style: styles.coverMetaValue }, generatedAt),
        ),
      ),
    ),
  );

  // EXECUTIVE SUMMARY ────────────────────────────────────
  const sumPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Resumo executivo", periodo }),
    h(View, { style: styles.section },
      h(Text, { style: styles.sectionEyebrow }, "Visão geral"),
      h(Text, { style: styles.sectionTitle }, "O retrato do mês"),
      h(Text, { style: styles.sectionLede },
        "Indicadores principais consolidados a partir das suas transações realizadas e planejadas, cofrinhos e compromissos do período.",
      ),
      h(View, { style: styles.kpiGrid },
        h(View, { style: styles.kpiCard },
          h(Text, { style: styles.kpiLabel }, "Receitas"),
          h(Text, { style: [styles.kpiValue, { color: C.pos }] }, fmtBRL(totals.income)),
          h(Text, { style: styles.kpiHint }, "Entradas do período"),
        ),
        h(View, { style: styles.kpiCard },
          h(Text, { style: styles.kpiLabel }, "Despesas"),
          h(Text, { style: [styles.kpiValue, { color: C.neg }] }, fmtBRL(totals.expense)),
          h(Text, { style: styles.kpiHint }, "Saídas e compromissos"),
        ),
        h(View, { style: styles.kpiCard },
          h(Text, { style: styles.kpiLabel }, "Saldo líquido"),
          h(Text, { style: styles.kpiValue }, fmtBRL(totals.balance)),
          h(Text, { style: styles.kpiHint }, "Receitas − despesas"),
        ),
      ),
      h(View, { style: [styles.kpiGrid, { marginTop: 12 }] },
        h(View, { style: styles.kpiCard },
          h(Text, { style: styles.kpiLabel }, "Saldo livre"),
          h(Text, { style: styles.kpiValue }, fmtBRL(totals.free)),
          h(Text, { style: styles.kpiHint }, "Disponível para decisões"),
        ),
        h(View, { style: styles.kpiCard },
          h(Text, { style: styles.kpiLabel }, "Reservado"),
          h(Text, { style: styles.kpiValue }, fmtBRL(totals.reserved)),
          h(Text, { style: styles.kpiHint }, "Saldo total em cofrinhos"),
        ),
        h(View, { style: styles.kpiCard },
          h(Text, { style: styles.kpiLabel }, "Comprometido"),
          h(Text, { style: styles.kpiValue }, fmtBRL(totals.committed)),
          h(Text, { style: styles.kpiHint }, "Cartões + recorrências"),
        ),
      ),
    ),
    PageFooter(),
  );

  // EVOLUTION ────────────────────────────────────────────
  const evoPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Evolução financeira", periodo }),
    h(View, { style: styles.section, wrap: false },
      h(Text, { style: styles.sectionEyebrow }, "Histórico · 6 meses"),
      h(Text, { style: styles.sectionTitle }, "Trajetória do saldo"),
      h(Text, { style: styles.sectionLede }, "Evolução do saldo final ao longo dos últimos meses fechados, incluindo o atual."),
      LineChart({ data: history.map((p: any) => ({ label: p.label, value: p.balance })) }),
    ),
    h(View, { style: styles.section, wrap: false },
      h(Text, { style: styles.sectionEyebrow }, "Comparativo"),
      h(Text, { style: styles.sectionTitle }, "Receitas vs. despesas"),
      h(Text, { style: styles.sectionLede }, "Quanto entrou e quanto saiu, mês a mês."),
      BarsChart({ data: history.map((p: any) => ({ label: p.label, income: p.income, expense: p.expense })) }),
    ),
    PageFooter(),
  );

  // COFRINHOS ────────────────────────────────────────────
  const cofPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Cofrinhos", periodo }),
    h(View, { style: styles.section },
      h(Text, { style: styles.sectionEyebrow }, "Reservas"),
      h(Text, { style: styles.sectionTitle }, "Cofrinhos"),
      h(Text, { style: styles.sectionLede }, "Progresso de cada reserva em relação à meta configurada."),
    ),
    h(View, null,
      ...((cofrinhos as any[]).length
        ? cofrinhos.map((c: any, i: number) => h(View, { key: i, style: [styles.row, i === 0 && styles.rowFirst].filter(Boolean), wrap: false },
            h(View, null,
              h(Text, { style: styles.rowName }, c.nome),
              h(Text, { style: styles.rowMeta }, `${fmtBRL(c.saldo)} de ${fmtBRL(c.meta || 0)}`),
            ),
            h(Text, { style: styles.rowValue }, c.meta > 0 ? fmtPct(c.pct) : "—"),
          ))
        : [h(Text, { key: "empty", style: { fontSize: 10, color: C.muted, marginTop: 12 } }, "Nenhum cofrinho criado.")]
      ),
    ),
    PageFooter(),
  );

  // CARTÕES ──────────────────────────────────────────────
  const cardPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Cartões de crédito", periodo }),
    h(View, { style: styles.section },
      h(Text, { style: styles.sectionEyebrow }, "Crédito"),
      h(Text, { style: styles.sectionTitle }, "Cartões"),
      h(Text, { style: styles.sectionLede }, "Uso atual em relação ao limite, fechamento e vencimento."),
    ),
    h(View, null,
      ...((cards as any[]).length
        ? cards.map((c: any, i: number) => h(View, { key: i, style: [styles.row, i === 0 && styles.rowFirst].filter(Boolean), wrap: false },
            h(View, null,
              h(Text, { style: styles.rowName }, c.nome),
              h(Text, { style: styles.rowMeta }, `Limite ${fmtBRL(c.limite)} · Fecha dia ${c.fech} · Vence dia ${c.venc}`),
            ),
            h(View, { style: { alignItems: "flex-end" } },
              h(Text, { style: styles.rowValue }, fmtBRL(c.usado)),
              h(Text, { style: styles.rowMeta }, `${fmtPct(c.pct)} utilizado`),
            ),
          ))
        : [h(Text, { key: "empty", style: { fontSize: 10, color: C.muted, marginTop: 12 } }, "Nenhum cartão cadastrado.")]
      ),
    ),
    PageFooter(),
  );

  // INSIGHTS ─────────────────────────────────────────────
  const insPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Insights", periodo }),
    h(View, { style: styles.section },
      h(Text, { style: styles.sectionEyebrow }, "Leitura estratégica"),
      h(Text, { style: styles.sectionTitle }, "O que os números dizem"),
      h(Text, { style: styles.sectionLede }, "Padrões e movimentos identificados no seu mês."),
    ),
    h(View, null,
      ...insights.map((it: any, i: number) => h(View, { key: i, style: styles.insight, wrap: false },
        h(Text, { style: styles.insightLabel }, it.label),
        h(Text, { style: styles.insightTitle }, it.title),
        h(Text, { style: styles.insightBody }, it.body),
      )),
    ),
    PageFooter(),
  );

  // CLOSING ──────────────────────────────────────────────
  const closing = h(Page, { size: "A4", style: styles.page },
    h(View, { style: styles.closingWrap },
      h(Text, { style: styles.closingQuote }, "Decisões financeiras melhores começam com clareza."),
      h(Text, { style: styles.closingSig }, "FinZap"),
    ),
  );

  return h(Document, { title: `FinZap · ${periodo}`, author: "FinZap" },
    cover, sumPage, evoPage, cofPage, cardPage, insPage, closing,
  );
}

// ────────────────────────────────────────────────────────────────────────
// Data loader
// ────────────────────────────────────────────────────────────────────────
async function loadPayload(supa: any, userId: string, monthId: string) {
  // Auth-scoped: every query is filtered by user_id and validated via RLS.
  const [{ data: profile }, { data: month }, { data: subscription }] = await Promise.all([
    supa.from("profiles").select("name").eq("id", userId).maybeSingle(),
    supa.from("months").select("*").eq("id", monthId).eq("user_id", userId).maybeSingle(),
    supa.from("subscriptions").select("status,expires_at,plan").eq("user_id", userId).maybeSingle(),
  ]);

  if (!month) throw new Error("month_not_found");

  // Subscription gate
  const active = subscription?.status === "active" &&
    (!subscription?.expires_at || new Date(subscription.expires_at) > new Date());
  if (!active) throw new Error("subscription_required");

  const [
    { data: txs },
    { data: cofrinhos },
    { data: cards },
    { data: cardPurchases },
    { data: closures },
    { data: monthsList },
  ] = await Promise.all([
    supa.from("transactions").select("type,amount,status,impacta_saldo,cofrinho_id,card_purchase_id").eq("user_id", userId).eq("month_id", monthId),
    supa.from("cofrinhos").select("nome,saldo,meta_valor,orcamento_mensal").eq("user_id", userId).order("ordem"),
    supa.from("credit_cards").select("id,nome,limite,fechamento_dia,vencimento_dia").eq("user_id", userId).eq("ativo", true).order("ordem"),
    supa.from("credit_card_purchases").select("card_id,valor_total").eq("user_id", userId),
    supa.from("monthly_closures").select("month_id,total_income,total_expense,final_balance").in("month_id",
      // closures for last months — fetched after we list months below; placeholder for now
      [monthId],
    ),
    supa.from("months").select("id,month,year,initial_balance,status").eq("user_id", userId).order("year", { ascending: false }).order("month", { ascending: false }).limit(7),
  ]);

  // History: last 6 months including current
  const histIds = (monthsList || []).map((m: any) => m.id);
  const { data: histClosures } = await supa.from("monthly_closures")
    .select("month_id,total_income,total_expense,final_balance")
    .in("month_id", histIds);
  const { data: histTx } = await supa.from("transactions")
    .select("month_id,type,amount,status,impacta_saldo")
    .in("month_id", histIds);

  const closuresByMonth = new Map<string, any>();
  (histClosures || []).forEach((c: any) => closuresByMonth.set(c.month_id, c));

  const history = (monthsList || []).slice().reverse().map((m: any) => {
    const closed = closuresByMonth.get(m.id);
    if (closed) {
      return {
        label: `${MONTHS_PT[m.month - 1].slice(0, 3)}/${String(m.year).slice(2)}`,
        income: Number(closed.total_income || 0),
        expense: Number(closed.total_expense || 0),
        balance: Number(closed.final_balance || 0),
      };
    }
    // compute from realized transactions
    const mtx = (histTx || []).filter((t: any) => t.month_id === m.id && t.status === "realized" && t.impacta_saldo);
    const income = mtx.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expense = mtx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
    return {
      label: `${MONTHS_PT[m.month - 1].slice(0, 3)}/${String(m.year).slice(2)}`,
      income, expense,
      balance: Number(m.initial_balance || 0) + income - expense,
    };
  });

  // Current month totals
  const realized = (txs || []).filter((t: any) => t.impacta_saldo);
  const income = realized.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expense = realized.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const balance = income - expense;
  const initial = Number(month.initial_balance || 0);
  const final = initial + balance;
  const reserved = (cofrinhos || []).reduce((s: number, c: any) => s + Number(c.saldo || 0), 0);
  // committed = soma de parcelas planejadas (cartão) + recorrências planejadas
  const committed = (txs || []).filter((t: any) => t.status === "planned" && t.type === "expense")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const free = Math.max(0, final - reserved);

  // Cards usage (sum of purchases for currently active cards)
  const usadoByCard = new Map<string, number>();
  (cardPurchases || []).forEach((p: any) => {
    usadoByCard.set(p.card_id, (usadoByCard.get(p.card_id) || 0) + Number(p.valor_total || 0));
  });
  const cardsOut = (cards || []).map((c: any) => {
    const usado = usadoByCard.get(c.id) || 0;
    const limite = Number(c.limite || 0);
    return {
      nome: c.nome,
      limite,
      usado,
      pct: limite ? Math.min(100, (usado / limite) * 100) : 0,
      fech: c.fechamento_dia,
      venc: c.vencimento_dia,
    };
  });

  const cofrinhosOut = (cofrinhos || []).map((c: any) => {
    const meta = Number(c.meta_valor || 0);
    const saldo = Number(c.saldo || 0);
    return { nome: c.nome, saldo, meta, pct: meta ? Math.min(100, (saldo / meta) * 100) : 0 };
  });

  // Insights
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const insights: { label: string; title: string; body: string }[] = [];
  if (prev) {
    if (prev.expense > 0) {
      const delta = ((expense - prev.expense) / prev.expense) * 100;
      if (Math.abs(delta) >= 5) {
        insights.push({
          label: delta > 0 ? "Aumento de gastos" : "Redução de gastos",
          title: `${delta > 0 ? "Despesas subiram" : "Despesas caíram"} ${Math.abs(delta).toFixed(0)}% vs. o mês anterior`,
          body: `Você gastou ${fmtBRL(expense)} este mês contra ${fmtBRL(prev.expense)} no anterior. ${delta > 0 ? "Vale revisar categorias com maior crescimento." : "Continue mantendo o ritmo — pequenas reduções compõem ao longo do ano."}`,
        });
      }
    }
    if (prev.balance !== 0) {
      const dB = balance - prev.balance;
      insights.push({
        label: dB >= 0 ? "Trajetória positiva" : "Atenção ao caixa",
        title: `Saldo do mês ${dB >= 0 ? "melhorou" : "piorou"} em ${fmtBRL(Math.abs(dB))}`,
        body: `A variação do saldo entre os dois últimos meses indica ${dB >= 0 ? "fôlego financeiro maior" : "menor margem"} para decisões.`,
      });
    }
  }
  if (reserved > 0 && income > 0) {
    const pct = (reserved / Math.max(income, 1)) * 100;
    insights.push({
      label: "Reservas",
      title: `Você tem ${fmtBRL(reserved)} reservados em cofrinhos`,
      body: `Isso equivale a aproximadamente ${pct.toFixed(0)}% da sua receita mensal. Reservas regulares são o que separa um mês bom de uma trajetória sólida.`,
    });
  }
  if (committed > balance && balance > 0) {
    insights.push({
      label: "Compromissos futuros",
      title: `Existem ${fmtBRL(committed)} planejados ainda não realizados`,
      body: "Considere o impacto antes de assumir novos compromissos — o saldo livre real é menor do que parece à primeira vista.",
    });
  }
  if (insights.length === 0) {
    insights.push({
      label: "Boas práticas",
      title: "Mês estável, sem variações relevantes",
      body: "Seguir registrando lançamentos é o que torna o relatório do próximo ciclo ainda mais preciso.",
    });
  }

  const periodo = `${MONTHS_PT[(month.month - 1)]} de ${month.year}`;
  const generatedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return {
    userName: profile?.name || "FinZap",
    periodo,
    generatedAt,
    totals: { income, expense, balance, free, reserved, committed, initial, final },
    history,
    cofrinhos: cofrinhosOut,
    cards: cardsOut,
    insights,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  let stage = "init";
  try {
    stage = "auth";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    stage = "parse_body";
    const body = await req.json().catch(() => ({}));
    const monthId = String(body?.monthId || "");
    if (!monthId) {
      return new Response(JSON.stringify({ error: "monthId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role only for read perf, but always filter by userId.
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    stage = "load_payload";
    let payload;
    try {
      payload = await loadPayload(supa, userId, monthId);
    } catch (e: any) {
      const msg = e?.message || "load_error";
      if (msg === "subscription_required") {
        return new Response(JSON.stringify({ error: "Recurso premium" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (msg === "month_not_found") {
        return new Response(JSON.stringify({ error: "Mês não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[generate-report] loadPayload failed", { userId, monthId, error: e });
      return new Response(JSON.stringify({
        error: "Falha ao carregar dados do relatório",
        stage,
        reason: e?.message || String(e),
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    stage = "build_document";
    console.log("[generate-report] payload loaded", {
      userId, monthId, periodo: payload.periodo,
      tx: payload.history?.length, cofrinhos: payload.cofrinhos?.length, cards: payload.cards?.length,
      ms: Date.now() - t0,
    });
    const doc = buildDocument(payload);

    stage = "render_pdf";
    const tRender = Date.now();
    const buffer = await renderToBuffer(doc as any);
    console.log("[generate-report] rendered", {
      bytes: (buffer as any)?.length ?? (buffer as any)?.byteLength,
      renderMs: Date.now() - tRender,
      totalMs: Date.now() - t0,
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="finzap-${payload.periodo.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    const err = e as any;
    console.error("[generate-report] fatal", { stage, error: err, stack: err?.stack });
    return new Response(JSON.stringify({
      error: "Falha ao gerar relatório",
      stage,
      reason: err?.message || String(err),
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});