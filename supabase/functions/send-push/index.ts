import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VAPID_SUBJECT = "mailto:christianpietromello079@gmail.com";
const VAPID_PUBLIC_KEY =
  "BFkJUOVv4zqJ66952R07dAL9LFzYfunNlPnOvTzN8jVd5c0ZWOWkNn4fcpL3Zca_BO3f1rFJXDAvzEdNr2wf3z0";

// ── helpers ──────────────────────────────────────────────────────────

function b64url(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  const a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a;
}

function concat(...bufs: (Uint8Array | ArrayBuffer)[]): Uint8Array {
  const arrays = bufs.map((b) => new Uint8Array(b));
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const r = new Uint8Array(len);
  let o = 0;
  for (const a of arrays) { r.set(a, o); o += a.length; }
  return r;
}

// ── VAPID JWT (ES256) ────────────────────────────────────────────────

async function makeVapidJwt(
  endpoint: string,
  vapidPrivateKeyB64: string,
): Promise<string> {
  const aud = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ aud, exp: now + 86400, sub: VAPID_SUBJECT })));
  const unsigned = `${header}.${payload}`;

  // Decode the raw 65-byte uncompressed public key to extract x, y
  const pubRaw = b64urlDecode(VAPID_PUBLIC_KEY); // 65 bytes: 0x04 || x(32) || y(32)
  const x = b64url(pubRaw.slice(1, 33));
  const y = b64url(pubRaw.slice(33, 65));

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: vapidPrivateKeyB64, x, y },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sigDer = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)),
  );

  // Web Crypto returns raw r||s (64 bytes) for P-256
  return `${unsigned}.${b64url(sigDer)}`;
}

// ── Payload encryption (aes128gcm) ───────────────────────────────────

async function encryptPayload(
  plaintext: string,
  p256dhB64: string,
  authB64: string,
): Promise<Uint8Array> {
  const subscriberPub = b64urlDecode(p256dhB64);
  const authSecret = b64urlDecode(authB64);

  const localKP = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const subKey = await crypto.subtle.importKey("raw", subscriberPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: subKey }, localKP.privateKey, 256));
  const localPub = new Uint8Array(await crypto.subtle.exportKey("raw", localKP.publicKey));

  // IKM via HKDF
  const ikm = await hkdf(shared, authSecret, concat(new TextEncoder().encode("WebPush: info\0"), subscriberPub, localPub), 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const padded = concat(new Uint8Array([2, 0]), new TextEncoder().encode(plaintext));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  const rs = new ArrayBuffer(4);
  new DataView(rs).setUint32(0, 4096);

  return concat(salt, new Uint8Array(rs), new Uint8Array([65]), localPub, encrypted);
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const k1 = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", k1, ikm));
  const k2 = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const out = new Uint8Array(await crypto.subtle.sign("HMAC", k2, concat(info, new Uint8Array([1]))));
  return out.slice(0, len);
}

// ── Send one push ────────────────────────────────────────────────────

async function sendOne(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPrivKey: string,
): Promise<void> {
  const jwt = await makeVapidJwt(sub.endpoint, vapidPrivKey);
  const body = await encryptPayload(payload, sub.p256dh, sub.auth);

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
    },
    body,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${t}`);
  } else {
    await res.text(); // consume body
  }
}

// ── Main handler ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, type, broadcast } = await req.json();

    if (!title || !body) {
      return respond({ error: "Missing title or body" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch subscriptions: broadcast=true → all users, otherwise just user_id
    let query = sb.from("push_subscriptions").select("*");
    if (!broadcast && user_id) {
      query = query.eq("user_id", user_id);
    }
    const { data: subs, error: subErr } = await query;
    if (subErr) throw subErr;

    if (!subs || subs.length === 0) {
      return respond({ sent: 0, total: 0, message: "No subscriptions found" });
    }

    // Skip dedup for test/broadcast notifications
    if (type && type !== "test" && user_id) {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { data: recent } = await sb
        .from("notifications_log")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", type)
        .gte("sent_at", oneHourAgo)
        .limit(1);
      if (recent && recent.length > 0) {
        return respond({ sent: 0, total: subs.length, message: "Duplicate prevented" });
      }
    }

    const payload = JSON.stringify({ title, body, url: "/app" });
    let sent = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        await sendOne(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPrivateKey,
        );
        sent++;
      } catch (e) {
        const msg = (e as Error).message || String(e);
        errors.push(msg);
        if (msg.includes("410") || msg.includes("404")) {
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    // Log notification
    if (user_id) {
      await sb.from("notifications_log").insert({
        user_id,
        type: type || "general",
        title,
        message: body,
      });
    }

    return respond({ sent, total: subs.length, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    return respond({ error: (err as Error).message }, 500);
  }
});

function respond(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
