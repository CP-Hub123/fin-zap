import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-scheduler-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // The orchestrator RPC is fully idempotent: it only touches users with
  // stale cofrinhos or due recurrences and uses ON CONFLICT DO NOTHING /
  // duplicate guards. Unauthenticated calls produce no side effects beyond
  // a no-op, so the Supabase gateway (apikey) is sufficient as the gate.

  const supabase = createClient(supabaseUrl, serviceKey);

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