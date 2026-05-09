import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_SUBJECT = "mailto:christianpietromello079@gmail.com";
const VAPID_PUBLIC_KEY = "BFkJUOVv4zqJ66952R07dAL9LFzYfunNlPnOvTzN8jVd5c0ZWOWkNn4fcpL3Zca_BO3f1rFJXDAvzEdNr2wf3z0";

type SendPushBody = {
  user_id?: string;
  title?: string;
  body?: string;
  type?: string;
  broadcast?: boolean;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function decodeBase64Url(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }

  return bytes;
}

function encodeBase64Url(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function isValidEndpoint(endpoint?: string | null): boolean {
  if (!endpoint || endpoint.includes("permanently-removed.invalid")) return false;

  try {
    return new URL(endpoint).protocol === "https:";
  } catch {
    return false;
  }
}

async function importVapidKeysFromEnv(privateKey: string): Promise<CryptoKeyPair> {
  const rawPublic = decodeBase64Url(VAPID_PUBLIC_KEY);

  if (rawPublic.length !== 65 || rawPublic[0] !== 4) {
    throw new Error("Invalid VAPID public key");
  }

  const x = encodeBase64Url(rawPublic.slice(1, 33));
  const y = encodeBase64Url(rawPublic.slice(33, 65));

  return webpush.importVapidKeys({
    publicKey: { kty: "EC", crv: "P-256", x, y },
    privateKey: { kty: "EC", crv: "P-256", x, y, d: privateKey },
  });
}

async function describePushError(error: unknown): Promise<string> {
  if (error instanceof webpush.PushMessageError) {
    const body = await error.response.text();
    return `${error.response.status} ${body || error.response.statusText}`.trim();
  }

  if (error instanceof Error) return error.message;
  return String(error);
}

function respond(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authentication: require valid JWT for any caller ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return respond({ error: "Unauthorized" }, 401);
    }
    const jwt = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return respond({ error: "Unauthorized" }, 401);
    }
    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? "";
    const ADMIN_EMAIL = "christianpietromello079@gmail.com";
    const isAdmin = callerEmail === ADMIN_EMAIL;

    const { user_id, title, body, type, broadcast = false } = await req.json() as SendPushBody;

    if (!title || !body) {
      return respond({ error: "Missing title or body" }, 400);
    }

    if (!broadcast && !user_id) {
      return respond({ error: "Missing user_id for targeted push" }, 400);
    }

    // --- Authorization ---
    if (broadcast && !isAdmin) {
      return respond({ error: "Forbidden: broadcast requires admin" }, 403);
    }
    if (!broadcast && user_id && user_id !== callerId && !isAdmin) {
      return respond({ error: "Forbidden: cannot push to other users" }, 403);
    }

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth");

    if (!broadcast && user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error: subscriptionsError } = await query;
    if (subscriptionsError) throw subscriptionsError;

    const allSubscriptions = (subscriptions ?? []) as PushSubscriptionRow[];
    console.log(`[send-push] found subscriptions=${allSubscriptions.length} broadcast=${broadcast}`);

    let removed = 0;
    const validSubscriptions: PushSubscriptionRow[] = [];

    for (const sub of allSubscriptions) {
      if (!isValidEndpoint(sub.endpoint) || !sub.p256dh || !sub.auth) {
        console.warn(`[send-push] removing invalid subscription id=${sub.id} endpoint=${sub.endpoint}`);
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        removed++;
        continue;
      }

      validSubscriptions.push(sub);
    }

    if (validSubscriptions.length === 0) {
      return respond({
        sent: 0,
        total: 0,
        found: allSubscriptions.length,
        removed,
        message: "No subscriptions found",
      });
    }

    if (!broadcast && type && type !== "test" && user_id) {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { data: recent } = await supabase
        .from("notifications_log")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", type)
        .gte("sent_at", oneHourAgo)
        .limit(1);

      if (recent && recent.length > 0) {
        return respond({
          sent: 0,
          total: validSubscriptions.length,
          found: allSubscriptions.length,
          removed,
          message: "Duplicate prevented",
        });
      }
    }

    const appServer = await webpush.ApplicationServer.new({
      contactInformation: VAPID_SUBJECT,
      vapidKeys: await importVapidKeysFromEnv(vapidPrivateKey),
    });

    const payload = JSON.stringify({ title, body, url: "/app" });
    let sent = 0;
    const errors: string[] = [];

    for (const sub of validSubscriptions) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        });

        await subscriber.pushTextMessage(payload, {
          urgency: webpush.Urgency.High,
          ttl: 60,
        });

        sent++;
        console.log(`[send-push] sent subscription id=${sub.id}`);
      } catch (error) {
        const message = await describePushError(error);
        console.error(`[send-push] failed subscription id=${sub.id} error=${message}`);
        errors.push(message);

        const isGone = error instanceof webpush.PushMessageError &&
          (error.isGone() || error.response.status === 404);

        if (isGone) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
          console.warn(`[send-push] removed stale subscription id=${sub.id}`);
        }
      }
    }

    if (user_id) {
      const { error: logError } = await supabase.from("notifications_log").insert({
        user_id,
        type: type || "general",
        title,
        message: body,
      });

      if (logError) {
        console.error(`[send-push] failed to log notification error=${logError.message}`);
      }
    }

    return respond({
      sent,
      total: validSubscriptions.length,
      found: allSubscriptions.length,
      removed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[send-push] unexpected error=${message}`);
    return respond({ error: message }, 500);
  }
});
