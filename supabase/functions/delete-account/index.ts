// Edge function: deletes the authenticated user's account and all related data.
// Verifies the caller's JWT, then uses the service-role key to wipe data + auth user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  // Identify caller via their JWT
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const uid = userData.user.id;

  // Body confirmation
  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  if ((body.confirm ?? "").trim().toUpperCase() !== "EXCLUIR") {
    return json({ error: "Confirmação inválida" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ─────────────────────────────────────────────────────────────
  // Stripe cancellation (preparatory architecture).
  // Runs only when STRIPE_SECRET_KEY is configured AND the user
  // has linked stripe ids on their subscription record. Until
  // payments are enabled this block is a graceful no-op.
  // ─────────────────────────────────────────────────────────────
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  let stripeCancelled = false;
  let stripeCustomerDeleted = false;
  try {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", uid)
      .maybeSingle();

    if (STRIPE_SECRET_KEY && sub) {
      const stripeFetch = (path: string, init: RequestInit = {}) =>
        fetch(`https://api.stripe.com/v1${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
            ...(init.headers ?? {}),
          },
        });

      // 1) Cancel active subscription immediately (no future charges)
      if (sub.stripe_subscription_id) {
        const r = await stripeFetch(
          `/subscriptions/${sub.stripe_subscription_id}`,
          { method: "DELETE" },
        );
        // 404 = already gone; treat as success. Other errors are non-fatal
        // because we still want to wipe local data per LGPD.
        stripeCancelled = r.ok || r.status === 404;
        if (!stripeCancelled) {
          console.warn("Stripe subscription cancel failed", r.status, await r.text());
        }
      }

      // 2) Delete the customer (unlinks payment methods, prevents future invoices)
      if (sub.stripe_customer_id) {
        const r = await stripeFetch(
          `/customers/${sub.stripe_customer_id}`,
          { method: "DELETE" },
        );
        stripeCustomerDeleted = r.ok || r.status === 404;
        if (!stripeCustomerDeleted) {
          console.warn("Stripe customer delete failed", r.status, await r.text());
        }
      }
    }
  } catch (e) {
    // Never block account deletion on Stripe errors.
    console.warn("Stripe cleanup error (non-fatal)", e);
  }

  // Delete user-owned rows. Order chosen to respect dependencies.
  // Each table is filtered by user_id (or via month_id for budget_plans/monthly_closures).
  try {
    // Child tables first
    await admin.from("transactions").delete().eq("user_id", uid);
    await admin.from("credit_card_purchases").delete().eq("user_id", uid);
    await admin.from("credit_cards").delete().eq("user_id", uid);
    await admin.from("recurring_transactions").delete().eq("user_id", uid);
    await admin.from("cofrinho_closures").delete().eq("user_id", uid);
    await admin.from("cofrinhos").delete().eq("user_id", uid);

    // months / closures
    const { data: months } = await admin.from("months").select("id").eq("user_id", uid);
    const monthIds = (months ?? []).map((m: { id: string }) => m.id);
    if (monthIds.length) {
      await admin.from("budget_plans").delete().in("month_id", monthIds);
      await admin.from("monthly_closures").delete().in("month_id", monthIds);
    }
    await admin.from("months").delete().eq("user_id", uid);

    // Categories, notifications, prefs, push, connected accounts, bug reports, logs
    await admin.from("categories").delete().eq("user_id", uid);
    await admin.from("notifications_log").delete().eq("user_id", uid);
    await admin.from("notification_preferences").delete().eq("user_id", uid);
    await admin.from("push_subscriptions").delete().eq("user_id", uid);
    await admin.from("connected_accounts").delete().eq("user_id", uid);
    await admin.from("bug_report_screenshots").delete().eq("user_id", uid);
    await admin.from("bug_reports").delete().eq("user_id", uid);
    await admin.from("activity_logs").delete().eq("user_id", uid);

    // Cancel/remove subscription (Stripe customer unlink prepared for the future)
    await admin
      .from("subscriptions")
      .update({ status: "cancelled", expires_at: new Date().toISOString() })
      .eq("user_id", uid);
    await admin.from("subscriptions").delete().eq("user_id", uid);

    // Profile
    await admin.from("profiles").delete().eq("id", uid);

    // Finally, delete the auth user (invalidates all sessions)
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      console.error("auth.admin.deleteUser failed", delErr.message);
      return json({ error: "Falha ao remover conta" }, 500);
    }

    return json({
      success: true,
      stripe: { cancelled: stripeCancelled, customer_deleted: stripeCustomerDeleted },
    });
  } catch (e) {
    console.error("delete-account error", e);
    return json({ error: "Erro ao excluir conta" }, 500);
  }
});