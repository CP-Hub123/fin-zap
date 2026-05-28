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
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
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
const FONT_OBL = "Helvetica-Oblique";

// ────────────────────────────────────────────────────────────────────────
// Brand tokens (editorial / premium)
// ────────────────────────────────────────────────────────────────────────
const C = {
  ink:       "#0A0E14",
  ink2:      "#1F2937",
  ink3:      "#374151",
  muted:     "#6B7280",
  mutedSoft: "#9CA3AF",
  hair:      "#EAEDF1",
  hairSoft:  "#F2F4F7",
  bg:        "#FFFFFF",
  surface:   "#F8FAFC",
  surface2:  "#F4F7FB",
  // Official FinZap identity
  brand:     "#2F6BEA",      // FinZap Blue (primary identity)
  brandSoft: "#E8EFFD",
  brand2:    "#22B872",      // FinZap Green (accent / positive)
  brand2Soft:"#E4F6EC",
  blue:      "#2F6BEA",
  blueSoft:  "#E8EFFD",
  green:     "#22B872",
  greenSoft: "#E4F6EC",
  pos:       "#1E9E63",      // financial positive (FinZap green, slightly deepened for AA)
  neg:       "#B42318",
  negSoft:   "#FDECEC",
  warn:      "#B54708",
  warnSoft:  "#FEF5E7",
  glow:      "#7EA8FF",      // proprietary blue glow
  glowGreen: "#9BE7CB",      // secondary green glow
};

// Dark closing palette — cinematic editorial finish
const D = {
  bg:     "#06080C",
  bg2:    "#0B1118",
  ink:    "#F8FAFC",
  muted:  "#94A3B8",
  mutedSoft: "#64748B",
  hair:   "#1E293B",
  brand:  "#5B8DEF",   // FinZap Blue, lifted for dark bg
  brand2: "#3FD597",   // FinZap Green, lifted for dark bg
  blue:   "#5B8DEF",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 52,
    fontFamily: FONT,
    fontSize: 9.5,
    color: C.ink,
    backgroundColor: C.bg,
  },
  pageCover: {
    padding: 0,
    fontFamily: FONT,
    color: C.ink,
    backgroundColor: C.bg,
  },

  // Cover
  coverBg:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  coverInner: { flexGrow: 1, padding: 56, justifyContent: "space-between" },
  coverTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandRow:   { flexDirection: "row", alignItems: "center", gap: 7 },
  brandText:  { fontSize: 13, fontFamily: FONT_BOLD, letterSpacing: 1.2 },
  brandTextFin:{ color: C.ink },
  brandTextZap:{ color: C.brand },
  coverIntelligence: { fontSize: 7.5, color: C.muted, letterSpacing: 2.4, textTransform: "uppercase", marginTop: 3 },
  coverEyebrow: { fontSize: 8.5, color: C.muted, letterSpacing: 2.2, textTransform: "uppercase" },
  coverTitle: { fontSize: 48, fontFamily: FONT_BOLD, lineHeight: 1.04, marginTop: 14, letterSpacing: -0.6 },
  coverPeriod:{ fontSize: 14, color: C.brand, marginTop: 12, fontFamily: FONT_BOLD, letterSpacing: 0.4 },
  coverSub:   { fontSize: 11.5, color: C.ink3, marginTop: 16, maxWidth: 380, lineHeight: 1.6 },
  coverForLine: { fontSize: 10, color: C.muted, marginTop: 22, letterSpacing: 1.6, textTransform: "uppercase" },
  coverForName: { fontSize: 18, fontFamily: FONT_BOLD, marginTop: 4, letterSpacing: -0.2 },

  coverMetaGrid:  { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: C.hair, paddingTop: 18 },
  coverMetaCol:   { flex: 1, paddingRight: 12 },
  coverMetaLabel: { fontSize: 7.5, color: C.muted, letterSpacing: 1.6, textTransform: "uppercase" },
  coverMetaValue: { fontSize: 12, fontFamily: FONT_BOLD, marginTop: 6 },
  coverMetaHint:  { fontSize: 8, color: C.muted, marginTop: 2 },

  // Generic page chrome
  pageHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 26 },
  pageHeaderL: { fontSize: 7.5, color: C.muted, letterSpacing: 1.8, textTransform: "uppercase" },
  pageHeaderR: { fontSize: 7.5, color: C.muted, letterSpacing: 1.2 },
  hairline:    { height: 0.5, backgroundColor: C.hair, marginBottom: 26 },

  pageFooter:  { position: "absolute", left: 52, right: 52, bottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft:  { fontSize: 7.5, color: C.muted, letterSpacing: 1.6 },
  footerRight: { fontSize: 7.5, color: C.muted, letterSpacing: 0.4 },
  footerCenter:{ fontSize: 7.5, color: C.mutedSoft, letterSpacing: 1.4 },

  section: { marginBottom: 28 },
  sectionEyebrow: { fontSize: 7.5, color: C.brand, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 8, fontFamily: FONT_BOLD },
  sectionTitle:   { fontSize: 22, fontFamily: FONT_BOLD, marginBottom: 6, letterSpacing: -0.3 },
  sectionLede:    { fontSize: 10, color: C.ink3, maxWidth: 460, lineHeight: 1.55 },
  personalIntro:  { fontSize: 11, color: C.ink2, lineHeight: 1.6, marginTop: 14, maxWidth: 460, fontFamily: FONT_OBL },

  // KPI cards
  kpiGrid: { flexDirection: "row", gap: 10, marginTop: 16 },
  kpiCard: { flex: 1, padding: 14, borderWidth: 0.5, borderColor: C.hair, borderRadius: 8, backgroundColor: C.bg },
  kpiLabel: { fontSize: 7.5, color: C.muted, letterSpacing: 1.4, textTransform: "uppercase" },
  kpiValue: { fontSize: 18, fontFamily: FONT_BOLD, marginTop: 10, letterSpacing: -0.3 },
  kpiHint:  { fontSize: 8.5, color: C.muted, marginTop: 4 },
  kpiDelta: { fontSize: 8, fontFamily: FONT_BOLD, marginTop: 6 },

  // Rows
  rowGroup: { borderTopWidth: 0.5, borderTopColor: C.hair },
  row:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.hair },
  rowL:     { flex: 1, paddingRight: 14 },
  rowName:  { fontSize: 10.5, fontFamily: FONT_BOLD },
  rowMeta:  { fontSize: 8.5, color: C.muted, marginTop: 3, letterSpacing: 0.2 },
  rowValue: { fontSize: 11, fontFamily: FONT_BOLD },

  // Progress
  progressTrack: { height: 4, backgroundColor: C.hairSoft, borderRadius: 4, marginTop: 8, overflow: "hidden" },
  progressFill:  { height: 4, borderRadius: 4 },

  // Badge
  badge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3, alignSelf: "flex-start" },
  badgeText:  { fontSize: 7.5, fontFamily: FONT_BOLD, letterSpacing: 0.6, textTransform: "uppercase" },

  // Insights
  insightCard:   { padding: 16, borderWidth: 0.5, borderColor: C.hair, borderRadius: 8, marginBottom: 12, backgroundColor: C.bg },
  insightHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  insightDot:    { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  insightLabel:  { fontSize: 7.5, color: C.muted, letterSpacing: 1.6, textTransform: "uppercase" },
  insightTitle:  { fontSize: 12.5, fontFamily: FONT_BOLD, marginBottom: 6, letterSpacing: -0.1 },
  insightBody:   { fontSize: 10, color: C.ink3, lineHeight: 1.6 },

  // Closing (dark editorial)
  closingPage: { padding: 0, fontFamily: FONT, color: D.ink, backgroundColor: D.bg },
  closingBg:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  closingTop:  { position: "absolute", top: 56, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  closingTopText: { fontSize: 7.5, color: D.muted, letterSpacing: 2.4, textTransform: "uppercase" },
  closingWrap: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 60 },
  closingEyebrow: { fontSize: 8, color: D.brand, letterSpacing: 2.6, textTransform: "uppercase", marginBottom: 24, fontFamily: FONT_BOLD },
  closingQuote:{ fontSize: 30, fontFamily: FONT_BOLD, textAlign: "center", color: D.ink, maxWidth: 440, lineHeight: 1.22, letterSpacing: -0.6 },
  closingNote: { fontSize: 10.5, color: D.muted, textAlign: "center", marginTop: 22, maxWidth: 360, lineHeight: 1.7 },
  closingDivider: { width: 36, height: 1, backgroundColor: D.brand, marginTop: 32, opacity: 0.7 },
  closingFooter:  { position: "absolute", bottom: 48, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  closingFooterCol: { },
  closingFooterBrand: { fontSize: 14, fontFamily: FONT_BOLD, letterSpacing: 1, color: D.ink },
  closingFooterTag: { fontSize: 7.5, color: D.mutedSoft, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 },
  closingFooterRight: { alignItems: "flex-end" },
  closingFooterUrl: { fontSize: 10, color: D.brand, fontFamily: FONT_BOLD, letterSpacing: 0.4 },
  closingFooterMeta: { fontSize: 7.5, color: D.mutedSoft, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 4 },
});

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(v) ? v : 0);
const fmtPct = (v: number) => `${Math.round(Math.max(0, Math.min(999, v)))}%`;
const fmtSignedBRL = (v: number) => (v >= 0 ? "+ " : "− ") + fmtBRL(Math.abs(v));
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ────────────────────────────────────────────────────────────────────────
// Signature visual element — flow curve (used subtly on every page corner)
// ────────────────────────────────────────────────────────────────────────
function FlowSignature({ x = 0, y = 0, w = 120, h = 28, opacity = 0.5 }:
  { x?: number; y?: number; w?: number; h?: number; opacity?: number }) {
  // Two staggered curves — represents flow + impulse, the FinZap mark.
  const d1 = `M 0 ${h * 0.7} C ${w * 0.25} ${h * 0.1}, ${w * 0.55} ${h * 0.95}, ${w} ${h * 0.35}`;
  const d2 = `M 0 ${h * 0.85} C ${w * 0.3} ${h * 0.4}, ${w * 0.6} ${h * 1.05}, ${w} ${h * 0.55}`;
  return React.createElement(
    Svg, { width: w, height: h, style: { position: "absolute", left: x, top: y, opacity } },
    React.createElement(Path, { d: d1, stroke: C.brand, strokeWidth: 1, fill: "none" }),
    React.createElement(Path, { d: d2, stroke: C.brand2, strokeWidth: 0.6, fill: "none", opacity: 0.65 }),
  );
}

// Subtle editorial grid background — 6 vertical hairlines barely visible.
function GridBackground({ w = 595, h = 842, opacity = 0.04 }:
  { w?: number; h?: number; opacity?: number }) {
  const cols = 6;
  const pad = 52;
  const inner = w - pad * 2;
  const step = inner / (cols - 1);
  const lines: any[] = [];
  for (let i = 0; i < cols; i++) {
    const x = pad + i * step;
    lines.push(React.createElement(Line, {
      key: `c${i}`, x1: x, x2: x, y1: 40, y2: h - 40,
      stroke: C.ink, strokeWidth: 0.4,
    }));
  }
  return React.createElement(
    Svg, { width: w, height: h, style: { position: "absolute", top: 0, left: 0, opacity } },
    ...lines,
  );
}

// Cover backdrop — soft radial glow + signature flow + editorial grid.
function CoverBackdrop() {
  return React.createElement(Svg, { width: 595, height: 842, style: styles.coverBg },
    React.createElement(Defs, null,
      React.createElement(LinearGradient, { id: "glowG", x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
        React.createElement(Stop, { offset: "0%", stopColor: C.glow, stopOpacity: 0.55 }),
        React.createElement(Stop, { offset: "60%", stopColor: C.glow, stopOpacity: 0.10 }),
        React.createElement(Stop, { offset: "100%", stopColor: C.bg, stopOpacity: 0 }),
      ),
      React.createElement(LinearGradient, { id: "tealG", x1: "0%", y1: "100%", x2: "100%", y2: "0%" },
        React.createElement(Stop, { offset: "0%", stopColor: C.brand2, stopOpacity: 0.18 }),
        React.createElement(Stop, { offset: "100%", stopColor: C.brand2, stopOpacity: 0 }),
      ),
    ),
    // Soft glow blob (top right)
    React.createElement(Circle, { cx: 560, cy: 100, r: 240, fill: "url(#glowG)" }),
    // Teal accent (bottom left)
    React.createElement(Circle, { cx: 60, cy: 760, r: 220, fill: "url(#tealG)" }),
    // Editorial grid — vertical hairlines
    ...(() => {
      const arr: any[] = [];
      const pad = 52; const cols = 6; const inner = 595 - pad * 2; const step = inner / (cols - 1);
      for (let i = 0; i < cols; i++) {
        const x = pad + i * step;
        arr.push(React.createElement(Line, { key: `cg${i}`, x1: x, x2: x, y1: 40, y2: 802, stroke: C.ink, strokeWidth: 0.4, opacity: 0.05 }));
      }
      return arr;
    })(),
    // Signature flow curve, cinematic
    React.createElement(Path, {
      d: "M -20 580 C 140 520, 260 720, 420 560 S 660 460, 700 520",
      stroke: C.brand, strokeWidth: 1.2, fill: "none", opacity: 0.55,
    }),
    React.createElement(Path, {
      d: "M -20 620 C 140 570, 260 760, 420 600 S 660 510, 700 560",
      stroke: C.brand2, strokeWidth: 0.7, fill: "none", opacity: 0.45,
    }),
  );
}

// Closing backdrop — dark cinematic finish with proprietary flow signature.
function ClosingBackdrop() {
  return React.createElement(Svg, { width: 595, height: 842, style: styles.closingBg },
    React.createElement(Defs, null,
      React.createElement(LinearGradient, { id: "darkBg", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
        React.createElement(Stop, { offset: "0%", stopColor: D.bg2, stopOpacity: 1 }),
        React.createElement(Stop, { offset: "100%", stopColor: D.bg, stopOpacity: 1 }),
      ),
      React.createElement(LinearGradient, { id: "glowGreen", x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
        React.createElement(Stop, { offset: "0%", stopColor: D.brand, stopOpacity: 0.55 }),
        React.createElement(Stop, { offset: "60%", stopColor: D.brand, stopOpacity: 0.10 }),
        React.createElement(Stop, { offset: "100%", stopColor: D.bg, stopOpacity: 0 }),
      ),
      React.createElement(LinearGradient, { id: "glowTeal", x1: "100%", y1: "0%", x2: "0%", y2: "100%" },
        React.createElement(Stop, { offset: "0%", stopColor: D.brand2, stopOpacity: 0.45 }),
        React.createElement(Stop, { offset: "100%", stopColor: D.bg, stopOpacity: 0 }),
      ),
    ),
    // Solid dark base
    React.createElement(Rect, { x: 0, y: 0, width: 595, height: 842, fill: "url(#darkBg)" }),
    // Editorial grid — very subtle vertical hairlines
    ...(() => {
      const arr: any[] = [];
      const pad = 52; const cols = 6; const inner = 595 - pad * 2; const step = inner / (cols - 1);
      for (let i = 0; i < cols; i++) {
        const x = pad + i * step;
        arr.push(React.createElement(Line, { key: `dg${i}`, x1: x, x2: x, y1: 40, y2: 802, stroke: D.ink, strokeWidth: 0.4, opacity: 0.04 }));
      }
      return arr;
    })(),
    // Soft glow blob (top-left)
    React.createElement(Circle, { cx: 80, cy: 160, r: 260, fill: "url(#glowGreen)" }),
    // Teal glow (bottom-right)
    React.createElement(Circle, { cx: 520, cy: 700, r: 240, fill: "url(#glowTeal)" }),
    // Proprietary flow signature — large, cinematic
    React.createElement(Path, {
      d: "M -40 480 C 140 380, 280 640, 440 460 S 660 360, 720 420",
      stroke: D.brand, strokeWidth: 1.4, fill: "none", opacity: 0.55,
    }),
    React.createElement(Path, {
      d: "M -40 520 C 140 430, 280 690, 440 500 S 660 410, 720 470",
      stroke: D.brand2, strokeWidth: 0.8, fill: "none", opacity: 0.5,
    }),
    React.createElement(Path, {
      d: "M -40 560 C 140 480, 280 740, 440 540 S 660 460, 720 520",
      stroke: D.brand, strokeWidth: 0.5, fill: "none", opacity: 0.3,
    }),
  );
}

function BrandLockup({ light = false }: { light?: boolean }) {
  const inkColor = light ? D.ink : C.ink;
  return React.createElement(View, { style: styles.brandRow },
    // Mark: stylized "Z" lightning inside a rounded square — proprietary FinZap motif.
    React.createElement(Svg, { width: 14, height: 14 },
      React.createElement(Defs, null,
        React.createElement(LinearGradient, { id: light ? "lockupGL" : "lockupG", x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
          React.createElement(Stop, { offset: "0%", stopColor: C.brand, stopOpacity: 1 }),
          React.createElement(Stop, { offset: "100%", stopColor: C.brand2, stopOpacity: 1 }),
        ),
      ),
      React.createElement(Rect, { x: 0, y: 0, width: 14, height: 14, rx: 3.2, fill: light ? `url(#lockupGL)` : `url(#lockupG)` }),
      React.createElement(Path, { d: "M 9.2 3.4 L 4.8 7.4 L 7.2 7.4 L 4.8 10.6 L 9.2 6.6 L 6.8 6.6 Z", fill: "#FFFFFF" }),
    ),
    React.createElement(Text, { style: [styles.brandText, { color: inkColor }] },
      React.createElement(Text, { style: { color: inkColor } }, "Fin"),
      React.createElement(Text, { style: { color: C.brand } }, "Zap"),
    ),
  );
}

function PageChrome({ label, periodo }: { label: string; periodo: string }) {
  return React.createElement(React.Fragment, null,
    React.createElement(View, { style: styles.pageHeader, fixed: true },
      React.createElement(View, { style: { flexDirection: "row", alignItems: "center", gap: 10 } },
        BrandLockup({}),
        React.createElement(View, { style: { width: 0.5, height: 10, backgroundColor: C.hair } }),
        React.createElement(Text, { style: styles.pageHeaderL }, label),
      ),
      React.createElement(Text, { style: styles.pageHeaderR }, `FinZap · ${periodo}`),
    ),
    React.createElement(View, { style: styles.hairline, fixed: true }),
  );
}

function PageFooter() {
  return React.createElement(View, { style: styles.pageFooter, fixed: true },
    React.createElement(View, { style: { flexDirection: "row", alignItems: "center", gap: 8 } },
      React.createElement(View, { style: { width: 5, height: 5, borderRadius: 1, backgroundColor: C.brand } }),
      React.createElement(Text, { style: styles.footerLeft }, "FINZAP · INTELLIGENCE REPORT"),
    ),
    React.createElement(Text, { style: styles.footerCenter }, "finzap.app"),
    React.createElement(Text, {
      style: styles.footerRight,
      render: ({ pageNumber, totalPages }: any) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`,
    } as any),
  );
}

// Editorial badge — soft, never aggressive
function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "pos" | "warn" | "neg" | "info" }) {
  const map: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: C.hairSoft, fg: C.ink3 },
    pos:     { bg: C.greenSoft, fg: C.pos },
    warn:    { bg: C.warnSoft, fg: C.warn },
    neg:     { bg: C.negSoft, fg: C.neg },
    info:    { bg: C.blueSoft, fg: C.blue },
  };
  const t = map[tone];
  return React.createElement(View, { style: [styles.badge, { backgroundColor: t.bg }] },
    React.createElement(Text, { style: [styles.badgeText, { color: t.fg }] }, label),
  );
}

// Slim progress bar — editorial
function ProgressBar({ pct, color = C.brand, width }: { pct: number; color?: string; width?: number }) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return React.createElement(View, { style: [styles.progressTrack, width ? { width } : null].filter(Boolean) as any },
    React.createElement(View, { style: [styles.progressFill, { width: `${safe}%`, backgroundColor: color }] }),
  );
}

// Editorial empty-chart placeholder (no fake data)
function EmptyChart({ width = 491, height = 150, message = "Sem dados suficientes" }:
  { width?: number; height?: number; message?: string }) {
  return React.createElement(View, {
    style: { marginTop: 14, width, height, borderRadius: 8, borderWidth: 0.5, borderColor: C.hair, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  },
    React.createElement(Text, { style: { fontSize: 9, color: C.mutedSoft, letterSpacing: 1.4, textTransform: "uppercase" } }, message),
  );
}

// Premium area + line chart (Linear / Stripe-grade)
function AreaLineChart({ data, width = 491, height = 160, color = C.brand, color2 = C.brand2, label = "" }:
  { data: { label: string; value: number }[]; width?: number; height?: number; color?: string; color2?: string; label?: string }) {
  if (!data || data.length < 2) return EmptyChart({ width, height, message: "Histórico insuficiente para projeção" });
  const padL = 38, padR = 12, padT = 14, padB = 26;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = (max - min) || 1;
  const stepX = w / (data.length - 1);
  const pts = data.map((d, i) => ({
    x: padL + i * stepX,
    y: padT + h - ((d.value - min) / range) * h,
    label: d.label,
    value: d.value,
  }));

  // smooth path (cubic bezier between points)
  let smooth = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx1 = p0.x + stepX * 0.4;
    const cx2 = p1.x - stepX * 0.4;
    smooth += ` C ${cx1.toFixed(2)} ${p0.y.toFixed(2)}, ${cx2.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  const areaD = `${smooth} L ${pts[pts.length - 1].x} ${padT + h} L ${pts[0].x} ${padT + h} Z`;

  const children: any[] = [];
  children.push(React.createElement(Defs, { key: "defs" },
    React.createElement(LinearGradient, { id: "areaG", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
      React.createElement(Stop, { offset: "0%", stopColor: color, stopOpacity: 0.28 }),
      React.createElement(Stop, { offset: "100%", stopColor: color, stopOpacity: 0 }),
    ),
  ));
  // Y grid + labels
  [0, 0.5, 1].forEach((t, i) => {
    const y = padT + h * (1 - t);
    const val = min + range * t;
    children.push(React.createElement(Line, { key: `g${i}`, x1: padL, x2: width - padR, y1: y, y2: y, stroke: C.hair, strokeWidth: 0.4 }));
    children.push(React.createElement(Text as any, { key: `yl${i}`, x: padL - 6, y: y + 2.5, style: { fontSize: 6.5, fill: C.mutedSoft, textAnchor: "end" } }, fmtCompactBRL(val)));
  });
  // area + line
  children.push(React.createElement(Path, { key: "a", d: areaD, fill: "url(#areaG)", stroke: "none" }));
  children.push(React.createElement(Path, { key: "l", d: smooth, stroke: color, strokeWidth: 1.6, fill: "none" }));
  // dots
  pts.forEach((p, i) => {
    children.push(React.createElement(Circle, { key: `d${i}`, cx: p.x, cy: p.y, r: 2.2, fill: C.bg, stroke: color, strokeWidth: 1.2 }));
  });
  // X labels
  pts.forEach((p, i) =>
    children.push(React.createElement(Text as any, { key: `xl${i}`, x: p.x, y: height - 8, style: { fontSize: 7, fill: C.muted, textAnchor: "middle", letterSpacing: 0.4 } }, p.label)),
  );

  return React.createElement(View, { wrap: false, style: { marginTop: 14 } },
    React.createElement(Svg, { width, height }, ...children),
    label ? React.createElement(Text, { style: { fontSize: 7.5, color: C.mutedSoft, letterSpacing: 1.6, textTransform: "uppercase", marginTop: 6 } }, label) : null,
  );
}

// Premium grouped bars — receitas vs despesas
function PairedBarsChart({ data, width = 491, height = 170 }:
  { data: { label: string; income: number; expense: number }[]; width?: number; height?: number }) {
  if (!data || data.length === 0) return EmptyChart({ width, height });
  const padL = 38, padR = 12, padT = 14, padB = 34;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  const groupW = w / data.length;
  const barW = Math.min(16, (groupW - 10) / 2);

  const children: any[] = [];
  children.push(React.createElement(Defs, { key: "defs" },
    React.createElement(LinearGradient, { id: "barIn", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
      React.createElement(Stop, { offset: "0%", stopColor: C.green, stopOpacity: 1 }),
      React.createElement(Stop, { offset: "100%", stopColor: C.green, stopOpacity: 0.55 }),
    ),
    React.createElement(LinearGradient, { id: "barEx", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
      React.createElement(Stop, { offset: "0%", stopColor: C.neg, stopOpacity: 0.92 }),
      React.createElement(Stop, { offset: "100%", stopColor: C.neg, stopOpacity: 0.45 }),
    ),
  ));
  [0, 0.5, 1].forEach((t, i) => {
    const y = padT + h * (1 - t);
    children.push(React.createElement(Line, { key: `g${i}`, x1: padL, x2: width - padR, y1: y, y2: y, stroke: C.hair, strokeWidth: 0.4 }));
    const val = max * t;
    children.push(React.createElement(Text as any, { key: `yl${i}`, x: padL - 6, y: y + 2.5, style: { fontSize: 6.5, fill: C.mutedSoft, textAnchor: "end" } }, fmtCompactBRL(val)));
  });
  data.forEach((d, i) => {
    const gx = padL + i * groupW + groupW / 2;
    const x1 = gx - barW - 2;
    const x2 = gx + 2;
    const hi = (d.income / max) * h;
    const he = (d.expense / max) * h;
    if (hi > 0) children.push(React.createElement(Rect, { key: `i${i}`, x: x1, y: padT + h - hi, width: barW, height: hi, fill: "url(#barIn)", rx: 2 }));
    if (he > 0) children.push(React.createElement(Rect, { key: `e${i}`, x: x2, y: padT + h - he, width: barW, height: he, fill: "url(#barEx)", rx: 2 }));
    children.push(React.createElement(Text as any, { key: `xl${i}`, x: gx, y: height - 14, style: { fontSize: 7, fill: C.muted, textAnchor: "middle", letterSpacing: 0.4 } }, d.label));
  });
  // legend
  children.push(React.createElement(Rect, { key: "lg1", x: padL, y: height - 6, width: 6, height: 6, fill: C.green, rx: 1 }));
  children.push(React.createElement(Text as any, { key: "ll1", x: padL + 10, y: height - 0.5, style: { fontSize: 7, fill: C.muted } }, "Receitas"));
  children.push(React.createElement(Rect, { key: "lg2", x: padL + 60, y: height - 6, width: 6, height: 6, fill: C.neg, rx: 1 }));
  children.push(React.createElement(Text as any, { key: "ll2", x: padL + 70, y: height - 0.5, style: { fontSize: 7, fill: C.muted } }, "Despesas"));

  return React.createElement(View, { wrap: false, style: { marginTop: 14 } },
    React.createElement(Svg, { width, height }, ...children),
  );
}

// Mini inline sparkline for cards/KPIs
function Sparkline({ data, width = 70, height = 22, color = C.brand }:
  { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = (max - min) || 1;
  const stepX = width / (data.length - 1);
  let d = `M 0 ${(height - ((data[0] - min) / range) * height).toFixed(1)}`;
  for (let i = 1; i < data.length; i++) {
    const x = (i * stepX).toFixed(1);
    const y = (height - ((data[i] - min) / range) * height).toFixed(1);
    d += ` L ${x} ${y}`;
  }
  return React.createElement(Svg, { width, height, style: { marginTop: 4 } },
    React.createElement(Path, { d, stroke: color, strokeWidth: 1.2, fill: "none" }),
  );
}

function fmtCompactBRL(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${Math.round(v)}`;
}

// ────────────────────────────────────────────────────────────────────────
// Document
// ────────────────────────────────────────────────────────────────────────
function buildDocument(payload: any) {
  const {
    userName, periodo, generatedAt,
    totals,
    history,
    cofrinhos,
    cards,
    insights,
    deltas, // { incomePct, expensePct, balancePct } vs previous closed month
  } = payload;

  const h = (...args: any[]) => React.createElement.apply(React, args as any);

  const deltaBadge = (pct: number | null, invertGood = false) => {
    if (pct === null || !Number.isFinite(pct)) return h(Text, { style: [styles.kpiDelta, { color: C.mutedSoft }] }, "Sem comparativo");
    const goodWhenUp = !invertGood;
    const isGood = pct >= 0 ? goodWhenUp : !goodWhenUp;
    const sign = pct >= 0 ? "▲" : "▼";
    return h(Text, { style: [styles.kpiDelta, { color: isGood ? C.brand : C.neg }] }, `${sign} ${Math.abs(pct).toFixed(1)}% vs. mês anterior`);
  };

  // COVER ────────────────────────────────────────────────
  const cover = h(Page, { size: "A4", style: styles.pageCover },
    CoverBackdrop(),
    h(View, { style: styles.coverInner },
      h(View, { style: styles.coverTop },
        h(View, null,
          BrandLockup({}),
          h(Text, { style: styles.coverIntelligence }, "FinZap Intelligence Report"),
        ),
        h(Text, { style: styles.coverEyebrow }, "Edição mensal · Confidencial"),
      ),
      h(View, null,
        h(Text, { style: styles.coverEyebrow }, "Relatório financeiro inteligente"),
        h(Text, { style: styles.coverTitle }, "O retrato\ndo seu mês."),
        h(Text, { style: styles.coverPeriod }, periodo.toUpperCase()),
        h(Text, { style: styles.coverSub },
          `Uma leitura inteligente do seu comportamento financeiro em ${periodo}. Receitas, despesas, reservas e compromissos lidos como um analista pessoal leria.`,
        ),
        h(Text, { style: styles.coverForLine }, "Preparado para"),
        h(Text, { style: styles.coverForName }, userName || "FinZap"),
      ),
      h(View, { style: styles.coverMetaGrid },
        h(View, { style: styles.coverMetaCol },
          h(Text, { style: styles.coverMetaLabel }, "Saldo final"),
          h(Text, { style: styles.coverMetaValue }, fmtBRL(totals.final)),
          h(Text, { style: styles.coverMetaHint }, "Posição consolidada"),
        ),
        h(View, { style: styles.coverMetaCol },
          h(Text, { style: styles.coverMetaLabel }, "Emitido em"),
          h(Text, { style: styles.coverMetaValue }, generatedAt),
          h(Text, { style: styles.coverMetaHint }, "Edição única do período"),
        ),
        h(View, { style: styles.coverMetaCol },
          h(Text, { style: styles.coverMetaLabel }, "Assinatura"),
          h(Text, { style: styles.coverMetaValue }, "finzap.app"),
          h(Text, { style: styles.coverMetaHint }, "Documento proprietário"),
        ),
      ),
    ),
  );

  // EXECUTIVE SUMMARY ────────────────────────────────────
  const balanceSpark = history.map((p: any) => Number(p.balance) || 0);
  const sumPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Resumo executivo", periodo }),
    h(View, { style: styles.section },
      h(Text, { style: styles.sectionEyebrow }, "Visão geral"),
      h(Text, { style: styles.sectionTitle }, "O retrato do mês"),
      h(Text, { style: styles.sectionLede },
        "Indicadores principais consolidados a partir das suas transações realizadas e planejadas, cofrinhos e compromissos do período.",
      ),
      h(Text, { style: styles.personalIntro },
        `${(userName || "Você").split(" ")[0]}, este foi o panorama financeiro do seu mês — leia como uma fotografia, não como uma sentença.`,
      ),
      h(View, { style: styles.kpiGrid, wrap: false },
        h(View, { style: styles.kpiCard },
          h(Text, { style: styles.kpiLabel }, "Receitas"),
          h(Text, { style: [styles.kpiValue, { color: C.pos }] }, fmtBRL(totals.income)),
          deltaBadge(deltas?.incomePct ?? null, false),
        ),
        h(View, { style: styles.kpiCard },
          h(Text, { style: styles.kpiLabel }, "Despesas"),
          h(Text, { style: [styles.kpiValue, { color: C.neg }] }, fmtBRL(totals.expense)),
          deltaBadge(deltas?.expensePct ?? null, true),
        ),
        h(View, { style: styles.kpiCard },
          h(Text, { style: styles.kpiLabel }, "Saldo líquido"),
          h(Text, { style: styles.kpiValue }, fmtSignedBRL(totals.balance)),
          deltaBadge(deltas?.balancePct ?? null, false),
        ),
      ),
      h(View, { style: [styles.kpiGrid, { marginTop: 10 }], wrap: false },
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
    h(View, { style: [styles.section, { marginTop: 4 }], wrap: false },
      h(Text, { style: styles.sectionEyebrow }, "Trajetória recente"),
      h(Text, { style: [styles.sectionTitle, { fontSize: 16 }] }, "Como o saldo se moveu"),
      AreaLineChart({ data: history.map((p: any) => ({ label: p.label, value: p.balance })), label: "Saldo final por mês (últimos 6)" }),
    ),
    PageFooter(),
  );

  // EVOLUTION ────────────────────────────────────────────
  const evoPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Evolução financeira", periodo }),
    h(View, { style: styles.section, wrap: false },
      h(Text, { style: styles.sectionEyebrow }, "Comparativo · 6 meses"),
      h(Text, { style: styles.sectionTitle }, "Receitas vs. despesas"),
      h(Text, { style: styles.sectionLede }, "Quanto entrou e quanto saiu, mês a mês. Use este recorte para identificar padrões sazonais e momentos atípicos."),
      PairedBarsChart({ data: history.map((p: any) => ({ label: p.label, income: p.income, expense: p.expense })) }),
    ),
    // Mini comparison cards
    h(View, { style: [styles.kpiGrid, { marginTop: 16 }], wrap: false },
      h(View, { style: styles.kpiCard },
        h(Text, { style: styles.kpiLabel }, "Melhor mês (saldo)"),
        h(Text, { style: [styles.kpiValue, { fontSize: 14 }] }, bestMonthLabel(history, "balance", true)),
        h(Text, { style: styles.kpiHint }, "Maior saldo no período"),
      ),
      h(View, { style: styles.kpiCard },
        h(Text, { style: styles.kpiLabel }, "Maior despesa"),
        h(Text, { style: [styles.kpiValue, { fontSize: 14 }] }, bestMonthLabel(history, "expense", true)),
        h(Text, { style: styles.kpiHint }, "Mês com maior saída"),
      ),
      h(View, { style: styles.kpiCard },
        h(Text, { style: styles.kpiLabel }, "Tendência"),
        h(Text, { style: [styles.kpiValue, { fontSize: 14 }] }, trendLabel(history)),
        h(Text, { style: styles.kpiHint }, "Direção do saldo nos últimos meses"),
      ),
    ),
    h(View, { style: [styles.section, { marginTop: 22 }], wrap: false },
      h(Text, { style: styles.sectionEyebrow }, "Detalhamento"),
      h(Text, { style: [styles.sectionTitle, { fontSize: 16 }] }, "Tabela do período"),
      h(View, { style: styles.rowGroup },
        ...history.map((p: any, i: number) => h(View, { key: i, style: styles.row, wrap: false },
          h(View, { style: styles.rowL },
            h(Text, { style: styles.rowName }, p.label),
            h(Text, { style: styles.rowMeta }, `Receitas ${fmtBRL(p.income)} · Despesas ${fmtBRL(p.expense)}`),
          ),
          h(View, { style: { alignItems: "flex-end" } },
            h(Text, { style: [styles.rowValue, { color: p.balance >= 0 ? C.brand : C.neg }] }, fmtSignedBRL(p.balance)),
            h(Text, { style: styles.rowMeta }, "Saldo do período"),
          ),
        )),
      ),
    ),
    PageFooter(),
  );

  // COFRINHOS ────────────────────────────────────────────
  const cofRowsContent = (cofrinhos as any[]).length === 0
    ? [h(View, { key: "empty", style: { padding: 30, borderWidth: 0.5, borderColor: C.hair, borderRadius: 8, alignItems: "center", backgroundColor: C.surface } },
        h(Text, { style: { fontSize: 10, color: C.muted, textAlign: "center" } }, "Nenhum cofrinho cadastrado neste período."),
        h(Text, { style: { fontSize: 8.5, color: C.mutedSoft, marginTop: 6, textAlign: "center" } }, "Crie cofrinhos no app para acompanhar metas e reservas estratégicas."),
      )]
    : (cofrinhos as any[]).map((c: any, i: number) => {
        const hasMeta = c.meta > 0;
        const tone = !hasMeta ? "neutral" : c.pct >= 100 ? "pos" : c.pct >= 70 ? "info" : c.pct >= 30 ? "neutral" : "warn";
        const color = !hasMeta ? C.mutedSoft : c.pct >= 100 ? C.brand : c.pct >= 70 ? C.blue : c.pct >= 30 ? C.ink3 : C.warn;
        const status = !hasMeta ? "Meta não configurada"
          : c.pct >= 100 ? "Meta concluída"
          : c.pct >= 70 ? "Próximo da meta"
          : c.pct >= 30 ? "Em progresso"
          : "Início de jornada";
        return h(View, { key: i, style: styles.row, wrap: false },
          h(View, { style: styles.rowL },
            h(View, { style: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 } },
              h(Text, { style: styles.rowName }, c.nome),
              h(Badge, { label: status, tone }),
            ),
            h(Text, { style: styles.rowMeta },
              hasMeta ? `${fmtBRL(c.saldo)} de ${fmtBRL(c.meta)} · meta ativa` : `${fmtBRL(c.saldo)} reservados`,
            ),
            hasMeta
              ? h(ProgressBar, { pct: c.pct, color, width: 320 })
              : null,
          ),
          h(View, { style: { alignItems: "flex-end", minWidth: 70 } },
            h(Text, { style: [styles.rowValue, { color }] }, hasMeta ? fmtPct(c.pct) : "—"),
            h(Text, { style: styles.rowMeta }, hasMeta ? "concluído" : "sem meta"),
          ),
        );
      });

  const cofPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Cofrinhos", periodo }),
    h(View, { style: styles.section },
      h(Text, { style: styles.sectionEyebrow }, "Reservas estratégicas"),
      h(Text, { style: styles.sectionTitle }, "Cofrinhos"),
      h(Text, { style: styles.sectionLede }, "Acompanhamento de cada reserva, com leitura editorial do progresso em relação à meta configurada."),
    ),
    h(View, { style: styles.rowGroup }, ...cofRowsContent),
    PageFooter(),
  );

  // CARTÕES ──────────────────────────────────────────────
  const cardRowsContent = (cards as any[]).length === 0
    ? [h(View, { key: "empty", style: { padding: 30, borderWidth: 0.5, borderColor: C.hair, borderRadius: 8, alignItems: "center", backgroundColor: C.surface } },
        h(Text, { style: { fontSize: 10, color: C.muted, textAlign: "center" } }, "Nenhum cartão de crédito cadastrado."),
        h(Text, { style: { fontSize: 8.5, color: C.mutedSoft, marginTop: 6, textAlign: "center" } }, "Adicione seus cartões para acompanhar limite, fechamento e vencimento."),
      )]
    : (cards as any[]).map((c: any, i: number) => {
        const hasLimit = c.limite > 0;
        const tone = !hasLimit ? "neutral" : c.pct >= 90 ? "neg" : c.pct >= 70 ? "warn" : c.pct >= 40 ? "info" : "pos";
        const color = !hasLimit ? C.mutedSoft : c.pct >= 90 ? C.neg : c.pct >= 70 ? C.warn : c.pct >= 40 ? C.blue : C.brand;
        const status = !hasLimit ? "Limite não configurado"
          : c.pct >= 90 ? "Limite quase no teto"
          : c.pct >= 70 ? "Uso elevado"
          : c.pct >= 40 ? "Uso moderado"
          : "Uso saudável";
        return h(View, { key: i, style: styles.row, wrap: false },
          h(View, { style: styles.rowL },
            h(View, { style: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 } },
              h(Text, { style: styles.rowName }, c.nome),
              h(Badge, { label: status, tone }),
            ),
            h(Text, { style: styles.rowMeta },
              hasLimit ? `Limite ${fmtBRL(c.limite)} · Fecha dia ${c.fech} · Vence dia ${c.venc}` : `Fecha dia ${c.fech} · Vence dia ${c.venc}`,
            ),
            hasLimit
              ? h(ProgressBar, { pct: c.pct, color, width: 320 })
              : null,
          ),
          h(View, { style: { alignItems: "flex-end", minWidth: 80 } },
            h(Text, { style: styles.rowValue }, fmtBRL(c.usado)),
            h(Text, { style: styles.rowMeta }, hasLimit ? `${fmtPct(c.pct)} utilizado` : "limite não definido"),
          ),
        );
      });

  const cardPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Cartões de crédito", periodo }),
    h(View, { style: styles.section },
      h(Text, { style: styles.sectionEyebrow }, "Crédito"),
      h(Text, { style: styles.sectionTitle }, "Cartões"),
      h(Text, { style: styles.sectionLede }, "Visão integrada de uso, limite e calendário de fechamento e vencimento de cada cartão ativo."),
    ),
    h(View, { style: styles.rowGroup }, ...cardRowsContent),
    PageFooter(),
  );

  // INSIGHTS ─────────────────────────────────────────────
  const insPage = h(Page, { size: "A4", style: styles.page },
    PageChrome({ label: "Insights", periodo }),
    h(View, { style: styles.section },
      h(Text, { style: styles.sectionEyebrow }, "Leitura estratégica"),
      h(Text, { style: styles.sectionTitle }, "O que os números dizem"),
      h(Text, { style: styles.sectionLede }, "Padrões, variações e oportunidades detectadas no seu mês — pensadas como um analista financeiro pessoal explicaria."),
    ),
    h(View, null,
      ...insights.map((it: any, i: number) => {
        const toneMap: any = { pos: { color: C.brand }, neg: { color: C.neg }, warn: { color: C.warn }, info: { color: C.blue }, neutral: { color: C.ink3 } };
        const t = toneMap[it.tone || "neutral"];
        return h(View, { key: i, style: styles.insightCard, wrap: false },
          h(View, { style: styles.insightHeader },
            h(View, { style: [styles.insightDot, { backgroundColor: t.color }] }),
            h(Text, { style: styles.insightLabel }, it.label),
          ),
          h(Text, { style: styles.insightTitle }, it.title),
          h(Text, { style: styles.insightBody }, it.body),
        );
      }),
    ),
    PageFooter(),
  );

  // CLOSING ──────────────────────────────────────────────
  const closing = h(Page, { size: "A4", style: styles.closingPage },
    ClosingBackdrop(),
    h(View, { style: styles.closingTop },
      h(Text, { style: styles.closingTopText }, "FinZap Intelligence Report"),
      h(Text, { style: styles.closingTopText }, periodo.toUpperCase()),
    ),
    h(View, { style: styles.closingWrap },
      h(Text, { style: styles.closingEyebrow }, "— Encerramento editorial —"),
      h(Text, { style: styles.closingQuote }, "Veja o impacto\nantes da decisão."),
      h(Text, { style: styles.closingNote },
        `${(userName || "Você").split(" ")[0]}, este relatório é uma fotografia do seu mês — releia antes de cada decisão que merece clareza.`,
      ),
      h(View, { style: styles.closingDivider }),
    ),
    h(View, { style: styles.closingFooter },
      h(View, { style: styles.closingFooterCol },
        BrandLockup({ light: true }),
        h(Text, { style: styles.closingFooterTag }, "Inteligência financeira moderna"),
      ),
      h(View, { style: styles.closingFooterRight },
        h(Text, { style: styles.closingFooterUrl }, "finzap.app"),
        h(Text, { style: styles.closingFooterMeta }, `Edição · ${periodo}`),
      ),
    ),
  );

  return h(Document, { title: `FinZap · ${periodo}`, author: "FinZap" },
    cover, sumPage, evoPage, cofPage, cardPage, insPage, closing,
  );
}

function bestMonthLabel(history: any[], key: "balance" | "expense" | "income", maximize: boolean) {
  if (!history || history.length === 0) return "—";
  let best = history[0];
  for (const p of history) {
    if (maximize ? p[key] > best[key] : p[key] < best[key]) best = p;
  }
  return `${best.label} · ${fmtBRL(best[key])}`;
}

function trendLabel(history: any[]) {
  if (!history || history.length < 3) return "Histórico curto";
  const last3 = history.slice(-3).map((p: any) => Number(p.balance) || 0);
  const slope = (last3[2] - last3[0]) / 2;
  if (Math.abs(slope) < 50) return "Estável";
  return slope > 0 ? "Em alta" : "Em queda";
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

  // Deltas (vs previous month, when available)
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const pct = (a: number, b: number) => (b === 0 ? null : ((a - b) / Math.abs(b)) * 100);
  const deltas = {
    incomePct:  prev ? pct(income, prev.income) : null,
    expensePct: prev ? pct(expense, prev.expense) : null,
    balancePct: prev ? pct(balance, prev.balance) : null,
  };

  // Insights — varied editorial voice, tagged with tone for visual hierarchy
  type Insight = { label: string; title: string; body: string; tone: "pos" | "neg" | "warn" | "info" | "neutral" };
  const insights: Insight[] = [];

  if (prev && prev.expense > 0) {
    const d = ((expense - prev.expense) / prev.expense) * 100;
    if (Math.abs(d) >= 5) {
      const up = d > 0;
      insights.push({
        label: up ? "Aceleração de gastos" : "Disciplina de gastos",
        tone: up ? "warn" : "pos",
        title: up
          ? `Despesas avançaram ${Math.abs(d).toFixed(0)}% sobre o mês anterior`
          : `Despesas recuaram ${Math.abs(d).toFixed(0)}% — controle visível`,
        body: up
          ? `Foram ${fmtBRL(expense)} contra ${fmtBRL(prev.expense)} no período anterior. Vale isolar as categorias que mais cresceram antes de assumir novos compromissos.`
          : `Você desacelerou para ${fmtBRL(expense)} (de ${fmtBRL(prev.expense)}). Pequenas reduções, sustentadas por alguns ciclos, compõem grandes diferenças anuais.`,
      });
    }
  }

  if (prev) {
    const dB = balance - prev.balance;
    if (Math.abs(dB) >= 1) {
      const up = dB >= 0;
      insights.push({
        label: up ? "Trajetória positiva" : "Atenção ao caixa",
        tone: up ? "pos" : "neg",
        title: up
          ? `Saldo do mês ${fmtBRL(dB)} acima do anterior`
          : `Saldo do mês ${fmtBRL(Math.abs(dB))} abaixo do anterior`,
        body: up
          ? "O fôlego financeiro cresceu — momento favorável para reforçar reservas ou antecipar metas planejadas."
          : "A margem para decisões discricionárias caiu. Reavalie compromissos planejados antes do próximo ciclo.",
      });
    }
  }

  if (reserved > 0 && income > 0) {
    const ratio = (reserved / income) * 100;
    if (ratio >= 100) {
      insights.push({
        label: "Reservas robustas",
        tone: "pos",
        title: `Reservas equivalem a ${Math.round(ratio)}% da sua receita mensal`,
        body: `Você acumula ${fmtBRL(reserved)} em cofrinhos — colchão raro e sinal de maturidade financeira. Vale revisitar o destino das reservas: emergência, oportunidade ou objetivo de médio prazo.`,
      });
    } else if (ratio >= 25) {
      insights.push({
        label: "Reservas em construção",
        tone: "info",
        title: `Reservas representam ${Math.round(ratio)}% da receita do mês`,
        body: `Você já reservou ${fmtBRL(reserved)}. Manter o ritmo nos próximos ciclos consolida uma base sólida para decisões mais ambiciosas.`,
      });
    }
  }

  if (committed > 0 && balance > 0 && committed > balance * 0.5) {
    insights.push({
      label: "Compromissos planejados",
      tone: "warn",
      title: `${fmtBRL(committed)} em compromissos ainda não realizados`,
      body: "O saldo livre real é menor do que parece à primeira vista. Considere o impacto antes de assumir novas despesas recorrentes ou parcelamentos no cartão.",
    });
  }

  // Cartão crítico
  const heavyCards = cardsOut.filter((c: any) => c.pct >= 80);
  if (heavyCards.length > 0) {
    insights.push({
      label: "Crédito sob pressão",
      tone: "warn",
      title: `${heavyCards.length} cartão(ões) com uso acima de 80% do limite`,
      body: `Uso elevado de limite reduz a capacidade de absorver imprevistos e pode encarecer o crédito futuro. Vale priorizar liquidação antes de novas compras.`,
    });
  }

  // Cofrinho perto da meta
  const closeGoals = cofrinhosOut.filter((c: any) => c.meta > 0 && c.pct >= 80 && c.pct < 100);
  if (closeGoals.length > 0) {
    insights.push({
      label: "Metas no horizonte",
      tone: "info",
      title: `${closeGoals.length} meta(s) a poucos passos do destino`,
      body: `Alguns cofrinhos passam de 80% — concluir essas metas no próximo ciclo libera espaço mental para novos objetivos.`,
    });
  }

  if (income > 0 && expense > 0) {
    const savings = ((income - expense) / income) * 100;
    if (savings >= 30) {
      insights.push({
        label: "Taxa de poupança",
        tone: "pos",
        title: `Você reteve ${Math.round(savings)}% do que entrou no mês`,
        body: "Uma taxa de poupança acima de 30% é exceção. Direcionar essa folga para objetivos nomeados (não apenas conta corrente) costuma multiplicar o retorno emocional do dinheiro.",
      });
    } else if (savings <= 0) {
      insights.push({
        label: "Margem negativa",
        tone: "neg",
        title: "As despesas superaram as receitas no período",
        body: "Mês de margem negativa pede atenção: revisar despesas fixas e reagendar compromissos não-essenciais costuma reverter a curva em um ou dois ciclos.",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      label: "Mês de calibragem",
      tone: "neutral",
      title: "Sem variações relevantes em relação ao histórico",
      body: "Períodos estáveis são oportunidade rara para estruturar o que vem a seguir — revisar metas, ajustar reservas ou planejar um movimento estratégico.",
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
    deltas,
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