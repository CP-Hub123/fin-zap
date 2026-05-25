import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_SUBJECT = "mailto:christianpietromello079@gmail.com";
const VAPID_PUBLIC_KEY = "BAYXMjrgg8HMIunCShXbeLZLKNZDvKUT0hTgk_wAUl6GZ8mmHKWKQpI-gnf38dcts56K0XFRTjWf38cs2KizJ70";
const ADMIN_EMAIL = "christianpietromello079@gmail.com";

type SendPushBody = {
  user_id?: string;
  title?: string;
  body?: string;
  type?: string;
  category?: string;
  priority?: "low" | "normal" | "high" | "critical";
  url?: string;
  dedupe_key?: string;
  broadcast?: boolean;
  internal?: boolean; // when called by the scheduler with service-role
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
  device_info?: Record<string, unknown> | null;
};

type Prefs = {
  user_id: string;
  cartoes: boolean;
  saldo_orcamento: boolean;
  vencimentos: boolean;
  recorrencias: boolean;
  metas_cofrinhos: boolean;
  insights: boolean;
  alertas_criticos: boolean;
  sistema_novidades: boolean;
  lembrete_diario: boolean;
  resumo_semanal: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
  timezone: string;
};

const CATEGORY_TO_PREF: Record<string, keyof Prefs | null> = {
  cartao: "cartoes",
  cartoes: "cartoes",
  fechamento: "cartoes",
  limite: "cartoes",
  vencimento: "vencimentos",
  recorrencia: "recorrencias",
  saldo: "saldo_orcamento",
  orcamento: "saldo_orcamento",
  saldo_orcamento: "saldo_orcamento",
  cofrinho: "metas_cofrinhos",
  meta: "metas_cofrinhos",
  insight: "insights",
  alerta: "alertas_criticos",
  sistema: "sistema_novidades",
  novidade: "sistema_novidades",
  founders: "sistema_novidades",
  lembrete_diario: "lembrete_diario",
  resumo_semanal: "resumo_semanal",
  test: null,
  general: null,
};

function decodeBase64Url(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function encodeBase64Url(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

const VALID_HOSTS = /\.(googleapis\.com|mozilla\.com|windows\.com|apple\.com|push\.services|gotify|wpush)/i;

function isValidEndpoint(endpoint?: string | null): boolean {
  if (!endpoint || endpoint.includes("permanently-removed.invalid")) return false;
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:") return false;
    return VALID_HOSTS.test(u.hostname) || u.hostname.includes("push");
  } catch { return false; }
}

async function importVapidKeysFromEnv(privateKey: string): Promise<CryptoKeyPair> {
  const rawPublic = decodeBase64Url(VAPID_PUBLIC_KEY);
  if (rawPublic.length !== 65 || rawPublic[0] !== 4) throw new Error("Invalid VAPID public key");
  const x = encodeBase64Url(rawPublic.slice(1, 33));
  const y = encodeBase64Url(rawPublic.slice(33, 65));
  const keys = await webpush.importVapidKeys({
    publicKey: { kty: "EC", crv: "P-256", x, y },
    privateKey: { kty: "EC", crv: "P-256", x, y, d: privateKey },
  });
  const probe = new TextEncoder().encode("finzap-vapid-key-check");
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, probe);
  const validPair = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, keys.publicKey, signature, probe);
  if (!validPair) throw new Error("VAPID key mismatch: VAPID_PRIVATE_KEY does not match the public key used by the app");
  return keys;
}

async function describePushError(error: unknown): Promise<string> {
  if (error instanceof webpush.PushMessageError) {
    const body = await error.response.text();
    return `${error.response.status} ${body || error.response.statusText}`.trim();
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function isAuthOrVapidError(error: unknown, message: string): boolean {
  const status = error instanceof webpush.PushMessageError ? error.response.status : 0;
  return status === 401 || status === 403 || /invalid jwt|vapid|unauthorized|permission denied/i.test(message);
}

function hasCurrentVapidKey(sub: PushSubscriptionRow): boolean {
  const key = sub.device_info?.vapid_public_key;
  return typeof key !== "string" || key === VAPID_PUBLIC_KEY;
}

function respond(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isInQuietHours(prefs: Prefs | null): boolean {
  if (!prefs) return false;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: prefs.timezone || "America/Sao_Paulo",
      hour: "numeric", hour12: false,
    });
    const hour = parseInt(fmt.format(new Date()), 10);
    const s = prefs.quiet_hours_start;
    const e = prefs.quiet_hours_end;
    if (s === e) return false;
    return s < e ? (hour >= s && hour < e) : (hour >= s || hour < e);
  } catch { return false; }
}

function categoryAllowed(category: string | undefined, prefs: Prefs | null): boolean {
  if (!category || !prefs) return true;
  const key = CATEGORY_TO_PREF[category];
  if (!key) return true;
  return Boolean((prefs as any)[key]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stage = { current: "init" as string };
  const setStage = (s: string) => { stage.current = s; console.log(`[send-push] stage=${s}`); };

  try {
    setStage("load_env");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const envCheck = {
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_ANON_KEY: !!anonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
      VAPID_PRIVATE_KEY: !!vapidPrivateKey,
      VAPID_PRIVATE_KEY_length: vapidPrivateKey?.length ?? 0,
      VAPID_PUBLIC_KEY_length: VAPID_PUBLIC_KEY.length,
    };
    console.log(`[send-push] env=${JSON.stringify(envCheck)}`);
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return respond({ stage: "load_env", error: "Missing Supabase env vars", env: envCheck }, 500);
    }
    if (!vapidPrivateKey) {
      return respond({ stage: "load_env", error: "VAPID_PRIVATE_KEY missing", env: envCheck }, 500);
    }

    setStage("parse_body");
    const body = (await req.json()) as SendPushBody;
    console.log(`[send-push] body=${JSON.stringify({ ...body, body: body.body ? "[redacted]" : undefined })}`);
    const { title, body: messageBody, type = "general", category, priority = "normal", url, dedupe_key, broadcast = false, internal = false } = body;
    let { user_id } = body;

    if (!title || !messageBody) return respond({ stage: "parse_body", error: "Missing title or body" }, 400);

    // ---- Auth ----
    setStage("auth");
    let isAdmin = false;
    let callerId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    // Internal call: scheduler uses service role bearer + internal flag
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const isInternalCall = internal && bearer && bearer === serviceKey;

    if (!isInternalCall) {
      if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Unauthorized" }, 401);
      const jwt = authHeader.replace("Bearer ", "");
      const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
      if (userError || !userData?.user) return respond({ error: "Unauthorized" }, 401);
      callerId = userData.user.id;
      isAdmin = (userData.user.email ?? "") === ADMIN_EMAIL;

      if (broadcast && !isAdmin) return respond({ error: "Forbidden: broadcast requires admin" }, 403);
      if (!broadcast && user_id && user_id !== callerId && !isAdmin) {
        return respond({ error: "Forbidden: cannot push to other users" }, 403);
      }
      if (!broadcast && !user_id) user_id = callerId;
    } else {
      if (!broadcast && !user_id) return respond({ stage: "auth", error: "Missing user_id" }, 400);
    }

    setStage("init_supabase_client");
    const supabase = createClient(supabaseUrl, serviceKey);

    setStage("validate_vapid");
    try {
      await importVapidKeysFromEnv(vapidPrivateKey);
      console.log("[send-push] vapid=ok");
    } catch (vapidError) {
      const message = vapidError instanceof Error ? vapidError.message : String(vapidError);
      console.error(`[send-push] vapid_validation_failed error=${message}`);
      return respond({
        stage: "validate_vapid",
        error: "VAPID configuration error",
      }, 500);
    }

    // ---- Resolve target users ----
    setStage("resolve_targets");
    const targetUserIds: string[] = [];
    if (broadcast) {
      const { data: subs } = await supabase.from("push_subscriptions").select("user_id");
      const set = new Set<string>();
      (subs ?? []).forEach((s: any) => set.add(s.user_id));
      set.forEach((u) => targetUserIds.push(u));
    } else if (user_id) {
      targetUserIds.push(user_id);
    }

    let totalSent = 0;
    let totalFound = 0;
    let totalRemoved = 0;
    let skippedPrefs = 0;
    let skippedDedupe = 0;
    let skippedQuiet = 0;

    for (const uid of targetUserIds) {
      setStage(`user:${uid}:prefs`);
      // Preferences
      const { data: prefsRow } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      const prefs = (prefsRow as Prefs | null) ?? null;

      const isCritical = priority === "critical" || category === "alerta";
      // Diagnostic/test pushes must always be delivered — they bypass user preferences and quiet hours.
      const bypassPrefs = isCritical || category === "test" || type === "test";

      if (!bypassPrefs && !categoryAllowed(category, prefs)) {
        console.warn(`[send-push] skip user=${uid} reason=preferences category=${category}`);
        skippedPrefs++; continue;
      }
      if (!bypassPrefs && isInQuietHours(prefs)) {
        console.warn(`[send-push] skip user=${uid} reason=quiet_hours tz=${prefs?.timezone} start=${prefs?.quiet_hours_start} end=${prefs?.quiet_hours_end}`);
        skippedQuiet++; continue;
      }

      // Dedupe (by dedupe_key) — DB unique index will also protect
      if (dedupe_key) {
        const { data: existing } = await supabase
          .from("notifications_log")
          .select("id")
          .eq("user_id", uid)
          .eq("dedupe_key", dedupe_key)
          .limit(1);
        if (existing && existing.length > 0) { skippedDedupe++; continue; }
      }

      // Insert log first to get id (for click tracking)
      const { data: logRow, error: logError } = await supabase
        .from("notifications_log")
        .insert({
          user_id: uid,
          type,
          title,
          message: messageBody,
          dedupe_key: dedupe_key ?? null,
          action_url: url ?? null,
          category: category ?? null,
          priority,
        })
        .select("id")
        .single();

      if (logError) {
        // Likely dedupe collision (unique index)
        if (logError.code === "23505") { skippedDedupe++; continue; }
        console.error(`[send-push] log insert failed user=${uid} error=${logError.message}`);
        continue;
      }

      // Subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth, failure_count, device_info")
        .eq("user_id", uid);
      const all = (subscriptions ?? []) as PushSubscriptionRow[];
      totalFound += all.length;

      const valid: PushSubscriptionRow[] = [];
      for (const sub of all) {
        if (!isValidEndpoint(sub.endpoint) || !sub.p256dh || !sub.auth || !hasCurrentVapidKey(sub)) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          totalRemoved++;
          console.warn(`[send-push] removed invalid subscription id=${sub.id} user=${uid} reason=invalid-or-vapid-mismatch`);
        } else {
          valid.push(sub);
        }
      }

      if (valid.length === 0) {
        console.warn(`[send-push] user=${uid} no_valid_subscriptions found=${all.length}`);
        continue;
      }

      setStage(`user:${uid}:build_app_server`);
      const appServer = await webpush.ApplicationServer.new({
        contactInformation: VAPID_SUBJECT,
        vapidKeys: await importVapidKeysFromEnv(vapidPrivateKey),
      });

      const payload = JSON.stringify({
        title,
        body: messageBody,
        url: url ?? "/app",
        type,
        category: category ?? null,
        priority,
        dedupe_key: dedupe_key ?? null,
        notification_id: logRow.id,
      });

      let userSent = 0;
      let lastError: string | null = null;

      for (const sub of valid) {
        setStage(`user:${uid}:send:${sub.id}`);
        try {
          const subscriber = appServer.subscribe({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          });
          const endpointHost = (() => { try { return new URL(sub.endpoint).host; } catch { return "invalid"; } })();
          console.log(`[send-push] sending user=${uid} sub=${sub.id} host=${endpointHost}`);
          await subscriber.pushTextMessage(payload, {
            urgency: isCritical ? webpush.Urgency.High : webpush.Urgency.Normal,
            ttl: isCritical ? 600 : 3600,
          });
          userSent++;
          console.log(`[send-push] delivered user=${uid} sub=${sub.id}`);
          await supabase
            .from("push_subscriptions")
            .update({ failure_count: 0, last_seen_at: new Date().toISOString(), last_error: null })
            .eq("id", sub.id);
        } catch (error) {
          const message = await describePushError(error);
          lastError = message;
          const status = error instanceof webpush.PushMessageError ? error.response.status : 0;
          const isGone = error instanceof webpush.PushMessageError && (error.isGone() || status === 404);
          const isAuthMismatch = isAuthOrVapidError(error, message);
          const stack = error instanceof Error ? error.stack : undefined;
          console.warn(`[send-push] delivery_failed user=${uid} sub=${sub.id} status=${status || "n/a"} auth_or_vapid=${isAuthMismatch} gone=${isGone} error=${message}${stack ? `\nstack=${stack}` : ""}`);
          if (isGone || isAuthMismatch || (sub.failure_count ?? 0) >= 2) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            totalRemoved++;
          } else {
            await supabase
              .from("push_subscriptions")
              .update({ failure_count: (sub.failure_count ?? 0) + 1, last_error: message })
              .eq("id", sub.id);
          }
        }
      }

      totalSent += userSent;

      await supabase
        .from("notifications_log")
        .update({
          delivered_at: userSent > 0 ? new Date().toISOString() : null,
          error: userSent === 0 ? lastError : null,
        })
        .eq("id", logRow.id);
    }

    setStage("done");
    return respond({
      sent: totalSent,
      found: totalFound,
      removed: totalRemoved,
      skipped: { preferences: skippedPrefs, dedupe: skippedDedupe, quiet_hours: skippedQuiet },
      users: targetUserIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[send-push] unexpected stage=${stage.current} error=${message}${stack ? `\nstack=${stack}` : ""}`);
    return respond({ error: "Internal server error" }, 500);
  }
});