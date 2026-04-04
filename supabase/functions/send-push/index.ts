import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Minimal web-push implementation for Deno using Web Crypto
const VAPID_SUBJECT = "mailto:christianpietromello079@gmail.com";

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  // For web push we need the web-push protocol.
  // Use a lightweight approach: call the push endpoint with VAPID JWT auth
  const jwt = await createVapidJwt(subscription.endpoint, vapidPublicKey, vapidPrivateKey);

  // Encrypt the payload using the subscription keys
  const encrypted = await encryptPayload(payload, subscription.p256dh, subscription.auth);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
    },
    body: encrypted,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Push failed: ${response.status} ${text}`);
  }
  return response;
}

async function createVapidJwt(endpoint: string, publicKey: string, privateKey: string) {
  const audience = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 86400, sub: VAPID_SUBJECT };

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const keyData = base64UrlDecode(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Note: raw import doesn't work for ECDSA private keys directly.
  // We need to use JWK format instead.
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: privateKey,
    x: publicKey.substring(0, 43), // first 32 bytes base64url
    y: publicKey.substring(43), // remaining bytes
  };

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigB64 = arrayToBase64Url(new Uint8Array(signature));
  return `${unsignedToken}.${sigB64}`;
}

async function encryptPayload(payload: string, p256dhKey: string, authKey: string) {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Import subscriber's public key
  const subscriberPubKeyRaw = base64UrlDecode(p256dhKey);
  const subscriberPubKey = await crypto.subtle.importKey(
    "raw",
    subscriberPubKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPubKey },
    localKeyPair.privateKey,
    256
  );

  const authSecret = base64UrlDecode(authKey);
  const localPubKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPubKeyBytes = new Uint8Array(localPubKeyRaw);

  // HKDF for IKM
  const ikm = await hkdfExtractAndExpand(
    new Uint8Array(sharedSecret),
    authSecret,
    concatBuffers(
      new TextEncoder().encode("WebPush: info\0"),
      subscriberPubKeyRaw,
      localPubKeyBytes
    ),
    32
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive content encryption key and nonce
  const cek = await hkdfExtractAndExpand(ikm, salt, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExtractAndExpand(ikm, salt, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  // Encrypt
  const key = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const paddedPayload = concatBuffers(new Uint8Array([2, 0]), new TextEncoder().encode(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, paddedPayload);

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = new ArrayBuffer(4);
  new DataView(rs).setUint32(0, 4096);

  return concatBuffers(
    salt,
    new Uint8Array(rs),
    new Uint8Array([65]),
    localPubKeyBytes,
    new Uint8Array(encrypted)
  );
}

async function hkdfExtractAndExpand(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
  const infoKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = new Uint8Array(await crypto.subtle.sign("HMAC", infoKey, concatBuffers(info, new Uint8Array([1]))));
  return result.slice(0, length);
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function arrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function concatBuffers(...buffers: (Uint8Array | ArrayBuffer)[]): Uint8Array {
  const arrays = buffers.map((b) => new Uint8Array(b));
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, type } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing user_id, title, or body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidPublicKey = "BFkJUOVv4zqJ66952R07dAL9LFzYfunNlPnOvTzN8jVd5c0ZWOWkNn4fcpL3Zca_BO3f1rFJXDAvzEdNr2wf3z0";

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's push subscriptions
    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subErr) throw subErr;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate (same type in last hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recent } = await supabase
      .from("notifications_log")
      .select("id")
      .eq("user_id", user_id)
      .eq("type", type || "general")
      .gte("sent_at", oneHourAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Duplicate prevented" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body, url: "/app" });
    let sent = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );
        sent++;
      } catch (e) {
        errors.push(e.message);
        // Remove invalid subscription
        if (e.message.includes("410") || e.message.includes("404")) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    // Log notification
    await supabase.from("notifications_log").insert({
      user_id,
      type: type || "general",
      title,
      message: body,
    });

    return new Response(JSON.stringify({ sent, errors: errors.length > 0 ? errors : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
