import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLUGGY_BASE = "https://api.pluggy.ai";

async function getPluggyApiKey(): Promise<string> {
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Pluggy credentials not configured");
  const res = await fetch(`${PLUGGY_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) throw new Error(`Pluggy auth failed: ${res.status}`);
  return (await res.json()).apiKey as string;
}

async function pluggyGet(apiKey: string, path: string) {
  const res = await fetch(`${PLUGGY_BASE}${path}`, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) throw new Error(`Pluggy GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function ensureMonth(supabaseAdmin: any, userId: string, dateStr: string) {
  const d = new Date(dateStr);
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  return { month, year };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const itemId = body.itemId as string | undefined;
    if (!itemId) {
      return new Response(JSON.stringify({ error: "itemId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = await getPluggyApiKey();

    // 1. Item info (bank)
    const item = await pluggyGet(apiKey, `/items/${itemId}`);
    const bankName = item?.connector?.name ?? "Banco";
    const bankLogo = item?.connector?.imageUrl ?? null;

    // 2. Accounts
    const accountsResp = await pluggyGet(apiKey, `/accounts?itemId=${itemId}`);
    const accounts = accountsResp.results ?? [];

    let totalImported = 0;

    for (const acc of accounts) {
      // upsert connected_account
      await admin.from("connected_accounts").upsert({
        user_id: userId,
        pluggy_item_id: itemId,
        pluggy_account_id: acc.id,
        bank_name: bankName,
        bank_logo: bankLogo,
        account_type: acc.type ?? acc.subtype ?? null,
        account_number: acc.number ?? null,
        balance: Number(acc.balance ?? 0),
        status: "active",
        last_sync: new Date().toISOString(),
      }, { onConflict: "user_id,pluggy_account_id" });

      // 3. Transactions (last 90 days)
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const fromStr = since.toISOString().slice(0, 10);
      const txResp = await pluggyGet(apiKey, `/transactions?accountId=${acc.id}&from=${fromStr}&pageSize=200`);
      const txs = txResp.results ?? [];

      for (const t of txs) {
        const dateStr = (t.date ?? "").slice(0, 10);
        if (!dateStr) continue;
        const { month, year } = ensureMonth(admin, userId, dateStr);

        // ensure month exists
        let { data: monthRow } = await admin.from("months")
          .select("id, status").eq("user_id", userId).eq("month", month).eq("year", year).maybeSingle();
        if (!monthRow) {
          const ins = await admin.from("months").insert({
            user_id: userId, month, year, status: "draft", initial_balance: 0,
          }).select("id, status").single();
          monthRow = ins.data;
        }
        if (!monthRow || monthRow.status === "closed") continue;

        const amountAbs = Math.abs(Number(t.amount ?? 0));
        const type = Number(t.amount) < 0 ? "expense" : "income";

        // dedupe via unique index (user_id, source, external_id)
        const { error: insErr } = await admin.from("transactions").insert({
          user_id: userId,
          month_id: monthRow.id,
          type,
          name: (t.description ?? "Transação").slice(0, 200),
          amount: amountAbs,
          date: dateStr,
          status: "realized",
          source: "open_finance" as any,
          external_id: String(t.id),
          provider: "pluggy",
          sync_status: "synced" as any,
          category: t.category ?? null,
          impacta_saldo: false,
          origem: "open_finance",
          cofrinho_id: null as any,
        } as any);
        if (!insErr) totalImported++;
      }
    }

    return new Response(JSON.stringify({ ok: true, imported: totalImported, accounts: accounts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});