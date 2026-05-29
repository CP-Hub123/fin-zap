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
  const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");

  // Authenticate caller: accept either the service-role key (cron) or a shared scheduler secret.
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerSecret = req.headers.get("x-scheduler-secret") ?? "";
  const isAuthorized =
    (bearer && bearer === serviceKey) ||
    (schedulerSecret && headerSecret === schedulerSecret);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let dispatchedCount = 0;
  let errorCount = 0;
  let cappedCount = 0;

  // Per-run daily cap tracker (max 2 non-critical pushes / 24h / user).
  // Critical alerts (orçamento estourado, vencimentos hoje, alerta) bypass the cap.
  const DAILY_CAP = 2;
  const dailyCounts = new Map<string, number>();
  const cap24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Per-user preferences cache (for quiet hours + timezone).
  type PrefRow = {
    quiet_hours_start: number;
    quiet_hours_end: number;
    timezone: string | null;
  };
  const prefsCache = new Map<string, PrefRow | null>();
  async function loadPrefs(userId: string): Promise<PrefRow | null> {
    if (prefsCache.has(userId)) return prefsCache.get(userId)!;
    const { data } = await supabase
      .from("notification_preferences")
      .select("quiet_hours_start, quiet_hours_end, timezone")
      .eq("user_id", userId)
      .maybeSingle();
    const row = (data as PrefRow | null) ?? null;
    prefsCache.set(userId, row);
    return row;
  }

  function isInQuietHours(prefs: PrefRow | null): boolean {
    if (!prefs) return false;
    const tz = prefs.timezone || "America/Sao_Paulo";
    const hourLocal = parseInt(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()),
      10,
    );
    const s = prefs.quiet_hours_start ?? 22;
    const e = prefs.quiet_hours_end ?? 7;
    if (s === e) return false;
    // Crossing midnight (e.g. 22 → 7)
    if (s > e) return hourLocal >= s || hourLocal < e;
    return hourLocal >= s && hourLocal < e;
  }

  async function loadDailyCount(userId: string): Promise<number> {
    if (dailyCounts.has(userId)) return dailyCounts.get(userId)!;
    const { count } = await supabase
      .from("notifications_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("priority", "critical")
      .gte("sent_at", cap24hStart);
    const n = count ?? 0;
    dailyCounts.set(userId, n);
    return n;
  }

  async function dispatch(args: PushArgs) {
    const isCritical = args.priority === "critical" || args.category === "alerta";
    if (!isCritical) {
      const prefs = await loadPrefs(args.user_id);
      if (isInQuietHours(prefs)) {
        cappedCount++;
        console.log(`[scheduler] quiet_hours user=${args.user_id} type=${args.type}`);
        return;
      }
    }
    if (!isCritical) {
      const n = await loadDailyCount(args.user_id);
      if (n >= DAILY_CAP) {
        cappedCount++;
        console.log(`[scheduler] cap_hit user=${args.user_id} count=${n} type=${args.type}`);
        return;
      }
    }
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
      if (res.ok) {
        const sent = Number((json as any)?.sent ?? 0);
        if (sent > 0 || !isCritical) {
          dailyCounts.set(args.user_id, (dailyCounts.get(args.user_id) ?? 0) + 1);
        }
        dispatchedCount++;
      } else {
        errorCount++;
      }
      return json;
    } catch (e) {
      errorCount++;
      console.error(`[scheduler] dispatch failed: ${(e as Error).message}`);
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
        title: isToday ? "Vence hoje" : "Vence amanhã",
        body: `${r.nome} — ${brl(Number(r.valor))} ${when}. Confirme para manter sua previsão precisa.`,
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
          [1.0, "Orçamento de " + p.category + " ultrapassado", `O planejado para ${p.category} foi superado neste mês.`, "critical"],
          [0.8, "80% do orçamento de " + p.category, `Você já utilizou a maior parte do planejado para ${p.category}.`, "high"],
          [0.5, "Metade do orçamento de " + p.category, `Você cruzou metade do planejado para ${p.category}.`, "normal" as any],
        ];
        for (const [t, title, body, prio] of thresholds) {
          if (pct >= t) {
            await dispatch({
              user_id: m.user_id,
              title,
              body: `${body} (${brl(used)} de ${brl(planned)}).`,
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
            title: isDone ? "Meta concluída" : `${Math.round(m * 100)}% da meta`,
            body: isDone
              ? `O cofrinho “${c.nome}” atingiu a meta de ${brl(Number(c.meta_valor))}.`
              : `Faltam ${brl(Number(c.meta_valor) - Number(c.saldo))} para a meta de “${c.nome}”.`,
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

    // ---- 4. Daily reminder — legacy explicit opt-in (8h SP) ----
    if (isMorning) {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("lembrete_diario", true);
      for (const p of prefs ?? []) {
        await dispatch({
          user_id: p.user_id,
          title: "Bom dia",
          body: "Um momento curto com o FinZap mantém sua previsão alinhada ao seu dia.",
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
          title: "Resumo da semana",
          body: `Entrou ${brl(totalIn)} · Saiu ${brl(totalOut)} · Saldo ${brl(totalIn - totalOut)}.`,
          type: "weekly_summary",
          category: "resumo_semanal",
          url: "/app",
          dedupe_key: `weekly:${p.user_id}:${todayStr}`,
        });
      }
    }

    // ---- 7. Ritmo Financeiro & Atualização contextual (once / day, 9h SP) ----
    // Reads only users with at least one transaction ever; computes precision proxy
    // based on time since the last registered movement. Sends at most one signal
    // per user per week, respecting the per-user daily cap above.
    const isRhythmHour = hourSP === 9;
    if (isRhythmHour) {
      const isoWeek = `${today.getFullYear()}-W${Math.ceil(
        ((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000 +
          new Date(today.getFullYear(), 0, 1).getDay() + 1) / 7,
      )}`;

      // Pull rhythm-eligible users (opt-in by default).
      const { data: rhythmPrefs } = await supabase
        .from("notification_preferences")
        .select("user_id, ritmo_financeiro, atualizacao_diaria");

      for (const p of rhythmPrefs ?? []) {
        const uid = p.user_id;

        // Last transaction recorded (by created_at, not date — we want activity).
        const { data: lastTxRow } = await supabase
          .from("transactions")
          .select("created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!lastTxRow?.created_at) continue; // novos usuários — nada a sinalizar

        const lastTs = new Date(lastTxRow.created_at as string).getTime();
        const daysSince = Math.floor((today.getTime() - lastTs) / 86400000);

        // Activity in last 14 days (dias com pelo menos 1 movimento)
        const since14 = new Date(today.getTime() - 14 * 86400000).toISOString();
        const { data: recent14 } = await supabase
          .from("transactions")
          .select("created_at")
          .eq("user_id", uid)
          .gte("created_at", since14)
          .limit(500);
        const activeDays = new Set(
          (recent14 ?? []).map((t: any) => (t.created_at as string).slice(0, 10)),
        ).size;

        // —— Atualização contextual (ritmo caindo) ——
        // Only fires when the system genuinely loses visibility.
        if (p.atualizacao_diaria) {
          if (daysSince >= 7) {
            await dispatch({
              user_id: uid,
              title: "O FinZap perdeu visibilidade",
              body: "Seus dados podem não refletir seu momento atual. Atualize quando puder — sua previsão volta ao normal.",
              type: "rhythm_outdated",
              category: "atualizacao_diaria",
              priority: "normal",
              url: "/app",
              dedupe_key: `rhythm_outdated:${uid}:${isoWeek}`,
            });
            continue;
          }
          if (daysSince >= 4) {
            await dispatch({
              user_id: uid,
              title: "Seu nível de previsibilidade caiu",
              body: "Sem movimentos recentes, o FinZap fica menos preciso. Registrar devolve nitidez ao seu panorama.",
              type: "rhythm_attention",
              category: "atualizacao_diaria",
              priority: "low",
              url: "/app",
              dedupe_key: `rhythm_attention:${uid}:${isoWeek}`,
            });
            continue;
          }
        }

        // —— Ritmo Financeiro (reforço positivo, 1x / semana, segundas) ——
        if (p.ritmo_financeiro && dowSP === "Mon" && daysSince <= 2 && activeDays >= 5) {
          await dispatch({
            user_id: uid,
            title: "Ritmo consistente",
            body: "Você manteve uma boa previsibilidade nos últimos dias. Suas projeções estão sólidas.",
            type: "rhythm_consistent",
            category: "ritmo_financeiro",
            priority: "low",
            url: "/app",
            dedupe_key: `rhythm_consistent:${uid}:${isoWeek}`,
          });
        }
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

    return new Response(JSON.stringify({ dispatched: dispatchedCount, errors: errorCount, capped: cappedCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scheduler] error=${message}`);
    return new Response(JSON.stringify({ error: "Internal error", dispatched: dispatchedCount, errors: errorCount, capped: cappedCount }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});