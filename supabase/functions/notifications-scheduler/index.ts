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

    // ---- 6. Contextual intelligence (1x/week, Mondays 9h SP) ----
    const isMondayMorning = dowSP === "Mon" && hourSP === 9;
    if (isMondayMorning) {
      const isoWeek = `${today.getFullYear()}-W${Math.ceil(((today.getTime() - new Date(today.getFullYear(),0,1).getTime())/86400000 + new Date(today.getFullYear(),0,1).getDay()+1)/7)}`;
      // 6a. Future card commitment dropping
      const { data: cards } = await supabase.from("credit_cards").select("id, user_id, nome").eq("ativo", true);
      const userCardMap = new Map<string, Array<{ id: string; nome: string }>>();
      for (const c of cards ?? []) {
        const arr = userCardMap.get(c.user_id) ?? [];
        arr.push({ id: c.id, nome: c.nome });
        userCardMap.set(c.user_id, arr);
      }
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const monthAfter = new Date(today.getFullYear(), today.getMonth() + 2, 1);
      for (const [uid, userCards] of userCardMap) {
        // Sum installments for next month vs the one after
        const { data: m1 } = await supabase.from("months").select("id").eq("user_id", uid).eq("month", nextMonth.getMonth()+1).eq("year", nextMonth.getFullYear()).maybeSingle();
        const { data: m2 } = await supabase.from("months").select("id").eq("user_id", uid).eq("month", monthAfter.getMonth()+1).eq("year", monthAfter.getFullYear()).maybeSingle();
        if (!m1?.id || !m2?.id) continue;
        const { data: t1 } = await supabase.from("transactions").select("amount").eq("month_id", m1.id).eq("origem", "cartao");
        const { data: t2 } = await supabase.from("transactions").select("amount").eq("month_id", m2.id).eq("origem", "cartao");
        const sum1 = (t1 ?? []).reduce((s, t) => s + Number(t.amount), 0);
        const sum2 = (t2 ?? []).reduce((s, t) => s + Number(t.amount), 0);
        if (sum1 > 0 && sum2 < sum1 * 0.7) {
          await dispatch({
            user_id: uid,
            title: "💳 Seu cartão ficará mais leve",
            body: `Seu compromisso com cartões cai de ${brl(sum1)} para ${brl(sum2)} no mês seguinte.`,
            type: "card_lighter_ahead",
            category: "insight",
            priority: "low",
            url: "/app/cartoes",
            dedupe_key: `card_lighter:${uid}:${isoWeek}`,
          });
        }
      }

      // 6b. Next week has higher expense concentration
      const next7Start = new Date(today);
      next7Start.setDate(today.getDate() + 1);
      const next7End = new Date(today);
      next7End.setDate(today.getDate() + 7);
      const next14End = new Date(today);
      next14End.setDate(today.getDate() + 14);

      const { data: schedRecur } = await supabase
        .from("recurring_transactions")
        .select("user_id, valor, tipo, proxima_execucao")
        .eq("ativo", true)
        .eq("tipo", "despesa")
        .gte("proxima_execucao", ymd(next7Start))
        .lte("proxima_execucao", ymd(next14End));

      const concByUser: Record<string, { wk1: number; wk2: number }> = {};
      for (const r of schedRecur ?? []) {
        const slot = (r.proxima_execucao as string) <= ymd(next7End) ? "wk1" : "wk2";
        concByUser[r.user_id] ??= { wk1: 0, wk2: 0 };
        concByUser[r.user_id][slot] += Number(r.valor);
      }
      for (const [uid, c] of Object.entries(concByUser)) {
        if (c.wk1 > 0 && c.wk1 >= c.wk2 * 1.5 && c.wk1 > 200) {
          await dispatch({
            user_id: uid,
            title: "📅 Semana com mais saídas à frente",
            body: `A próxima semana concentra ${brl(c.wk1)} em despesas previstas. Vale revisar com calma.`,
            type: "week_concentration",
            category: "insight",
            priority: "low",
            url: "/app/planejamento",
            dedupe_key: `week_conc:${uid}:${isoWeek}`,
          });
        }
      }

      // 6c. Current month is calmer than typical
      const { data: allMonths } = await supabase
        .from("months")
        .select("id, user_id, month, year")
        .eq("status", "closed")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(2000);
      const userClosed: Record<string, string[]> = {};
      for (const m of allMonths ?? []) {
        userClosed[m.user_id] ??= [];
        if (userClosed[m.user_id].length < 3) userClosed[m.user_id].push(m.id);
      }
      for (const [uid, ids] of Object.entries(userClosed)) {
        if (ids.length < 2) continue;
        const { data: pastTx } = await supabase.from("transactions").select("amount, month_id").in("month_id", ids).eq("type", "expense");
        const totalsByMonth: Record<string, number> = {};
        for (const t of pastTx ?? []) {
          totalsByMonth[t.month_id] = (totalsByMonth[t.month_id] ?? 0) + Number(t.amount);
        }
        const past = Object.values(totalsByMonth);
        if (!past.length) continue;
        const avgPast = past.reduce((s, n) => s + n, 0) / past.length;
        const { data: curMonth } = await supabase.from("months").select("id").eq("user_id", uid).eq("month", today.getMonth()+1).eq("year", today.getFullYear()).maybeSingle();
        if (!curMonth?.id) continue;
        const { data: curTx } = await supabase.from("transactions").select("amount").eq("month_id", curMonth.id).eq("type", "expense");
        const curTotal = (curTx ?? []).reduce((s, t) => s + Number(t.amount), 0);
        const dayOfMonth = today.getDate();
        const lastDay = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
        const projected = curTotal * (lastDay / Math.max(dayOfMonth, 1));
        if (avgPast > 0 && projected < avgPast * 0.8 && curTotal > 0) {
          await dispatch({
            user_id: uid,
            title: "🌿 Mês mais equilibrado que o habitual",
            body: `Seu ritmo de gastos está cerca de ${Math.round((1 - projected/avgPast) * 100)}% abaixo da sua média recente.`,
            type: "month_calmer",
            category: "insight",
            priority: "low",
            url: "/app",
            dedupe_key: `calmer:${uid}:${monthKey}`,
          });
        }
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