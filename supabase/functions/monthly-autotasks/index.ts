import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-scheduler-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const schedulerSecret = Deno.env.get("SCHEDULER_SECRET") ?? "";

  const supabase = createClient(supabaseUrl, serviceKey);

  // Bootstrap: keep private.app_config.scheduler_secret in sync with the
  // current SCHEDULER_SECRET env var so the Postgres cron job can read it.
  // Runs BEFORE the auth check so a first unauthenticated call seeds the DB.
  if (schedulerSecret) {
    try {
      await supabase.schema("private").from("app_config").upsert(
        { key: "scheduler_secret", value: schedulerSecret, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    } catch (e) {
      console.warn("monthly-autotasks: failed to sync scheduler_secret", e);
    }
  }

  // Auth: SCHEDULER_SECRET must be configured AND match the request header.
  const headerSecret = req.headers.get("x-scheduler-secret") ?? "";
  if (!schedulerSecret || headerSecret !== schedulerSecret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data, error } = await supabase.rpc("run_monthly_autotasks");
    if (error) throw error;

    // Log success (best-effort, scoped to admin user if available)
    const summary = data as Record<string, unknown> | null;
    console.log("monthly-autotasks completed", summary);

    return new Response(JSON.stringify({ ok: true, summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("monthly-autotasks error", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});