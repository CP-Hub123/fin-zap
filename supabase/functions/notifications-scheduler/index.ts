import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PushArgs = {
  user_id: string;
  title: string;
  body: string;
  type: string;
  category: string;
  priority?: "low" | "normal" | "high" | "critical";
  url?: string;
  dedupe_key: string;
};

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const dispatched: string[] = [];
  const errors: string[] = [];

  async function dispatch(args: PushArgs) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ ...args, internal: true }),
      });
      const json = await res.json().catch(() => ({}));
      dispatched.push(`${args.dedupe_key}:${res.status}`);
      return json;
    } catch (e) {
      errors.push(`${args.dedupe_key}:${(e as Error).message}`);
    }
  }

  try {
    const today = new Date();
    const todayStr = ymd(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = ymd(tomorrow);
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const hourSP = parseInt(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false,
    }).format(today), 10);
    const dowSP = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(today);
    const isSundayEvening = dowSP === "Sun" && hourSP === 19;
    const isMorning = hourSP === 8;

    // ---- 1. Recurring transactions due tomorrow / today ----
    const { data: recurring } = await supabase
      .from("recurring_transactions")
      .select("user_id, nome, valor, tipo, proxima_execucao, ativo")
      .eq("ativo", true)
      .in("proxima_execucao", [todayStr, tomorrowStr]);

    for (const r of recurring ?? []) {
      const isToday = r.proxima_execucao === todayStr;
      const when = isToday ? "hoje" : "amanhã";
      const dedupe = `recurring:${r.user_id}:${r.nome}:${r.proxima_execucao}`;
      await dispatch({
        user_id: r.user_id,
        title: isToday ? "📅 Vence hoje" : "📅 Vence amanhã",
        body: `${r.nome} (${brl(Number(r.valor))}) ${when}.`,
        type: "recurring_due",
        category: r.tipo === "receita" ? "recorrencia" : "vencimento",
        priority: isToday ? "high" : "normal",
        url: "/app",
        dedupe_key: dedupe,
      });
    }

    // ---- 2. Budget thresholds (current month, per category) ----
    const { data: months } = await supabase
      .from("months")
      .select("id, user_id, month, year")
      .eq("month", today.getMonth() + 1)
      .eq("year", today.getFullYear());

    for (const m of months ?? []) {
      const { data: plans } = await supabase
        .from("budget_plans")
        .select("category, planned_amount")
        .eq("month_id", m.id);
      if (!plans?.length) continue;

      const { data: txs } = await supabase
        .from("transactions")
        .select("category, amount, type")
        .eq("month_id", m.id)
        .eq("type", "expense");

      const spent: Record<string, number> = {};
      for (const t of txs ?? []) {
        const k = t.category || "Outros";
        spent[k] = (spent[k] ?? 0) + Number(t.amount);
      }

      for (const p of plans) {
        const planned = Number(p.planned_amount);
        if (planned <= 0) continue;
        const used = spent[p.category] ?? 0;
        const pct = used / planned;
        const thresholds: Array<[number, string, string, "high" | "critical"]> = [
          [1.0, "🚨 Orçamento estourado", `Você ultrapassou o orçamento de ${p.category}.`, "critical"],
          [0.8, "🔴 80% do orçamento", `Você já usou 80% do orçamento de ${p.category}.`, "high"],
          [0.5, "⚠️ 50% do orçamento", `Você já usou metade do orçamento de ${p.category}.`, "normal" as any],
        ];
        for (const [t, title, body, prio] of thresholds) {
          if (pct >= t) {
            await dispatch({
              user_id: m.user_id,
              title,
              body: `${body} (${brl(used)} de ${brl(planned)})`,
              type: `budget_${Math.round(t * 100)}`,
              category: t >= 1 ? "alerta" : "insight",
              priority: prio,
              url: "/app",
              dedupe_key: `budget:${m.user_id}:${p.category}:${monthKey}:${Math.round(t * 100)}`,
            });
            break;
          }
        }
      }
    }

    // ---- 3. Cofrinho milestones ----
    const { data: cofrinhos } = await supabase
      .from("cofrinhos")
      .select("id, user_id, nome, saldo, meta_valor")
      .gt("meta_valor", 0);
    for (const c of cofrinhos ?? []) {
      const pct = Number(c.saldo) / Number(c.meta_valor);
      const milestones = [0.25, 0.5, 0.75, 1.0];
      for (const m of [...milestones].reverse()) {
        if (pct >= m) {
          const isDone = m >= 1;
          await dispatch({
            user_id: c.user_id,
            title: isDone ? "🎉 Meta concluída" : `🐷 ${Math.round(m * 100)}% da meta`,
            body: isDone
              ? `Cofrinho “${c.nome}” atingiu a meta de ${brl(Number(c.meta_valor))}!`
              : `Você está a ${brl(Number(c.meta_valor) - Number(c.saldo))} da meta “${c.nome}”.`,
            type: "cofrinho_milestone",
            category: "cofrinho",
            priority: isDone ? "high" : "normal",
            url: "/app",
            dedupe_key: `cofrinho:${c.id}:${Math.round(m * 100)}`,
          });
          break;
        }
      }
    }

    // ---- 4. Daily reminder (8h SP) ----
    if (isMorning) {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("lembrete_diario", true);
      for (const p of prefs ?? []) {
        await dispatch({
          user_id: p.user_id,
          title: "☀️ Bom dia",
          body: "Confira suas finanças e mantenha o controle do dia.",
          type: "daily_reminder",
          category: "lembrete_diario",
          url: "/app",
          dedupe_key: `daily:${p.user_id}:${todayStr}`,
        });
      }
    }

    // ---- 5. Weekly summary (Sunday 19h SP) ----
    if (isSundayEvening) {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("resumo_semanal", true);
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      for (const p of prefs ?? []) {
        const { data: txs } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("user_id", p.user_id)
          .gte("date", ymd(weekStart))
          .lte("date", todayStr);
        const totalIn = (txs ?? []).filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
        const totalOut = (txs ?? []).filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        await dispatch({
          user_id: p.user_id,
          title: "📊 Resumo da semana",
          body: `Entrou ${brl(totalIn)} • Saiu ${brl(totalOut)} • Saldo ${brl(totalIn - totalOut)}.`,
          type: "weekly_summary",
          category: "resumo_semanal",
          url: "/app",
          dedupe_key: `weekly:${p.user_id}:${todayStr}`,
        });
      }
    }

    return new Response(JSON.stringify({ dispatched, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scheduler] error=${message}`);
    return new Response(JSON.stringify({ error: message, dispatched, errors }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});