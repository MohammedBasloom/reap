/* =============================================================
   REAP — Paddle Billing webhook.

   The ONLY thing that may grant a paid plan. The browser can read its own
   subscription row and cannot write any row, so entitlement can only ever
   arrive here, from Paddle, over a signed request.

   NOTE WHAT IS ABSENT: the Paddle API key. Paddle's checkout runs entirely on
   the public client-side token, so nothing in this integration needs the
   secret key — not the checkout, not this webhook, which authenticates with
   the endpoint's own signing secret instead. The API key is only required for
   calling Paddle's REST API, which REAP does not do.

   Signature verification is not a formality: without it this endpoint is a
   public URL that hands out subscriptions to anyone who can POST JSON at it.
   Paddle signs as:
     header        Paddle-Signature: ts=<unix>;h1=<hex>
     signed payload `${ts}:${raw body}`
     signature      HMAC-SHA256, hex

   The RAW body must be signed, not a re-serialised object: Paddle's own docs
   are explicit that any reformatting changes the payload and breaks the match.

   Deploy — Paddle calls this without a Supabase token, so JWT checking must
   be off; the signature check above is what authenticates it:
     supabase functions deploy paddle-webhook --no-verify-jwt
   Secret:
     supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
   ============================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Which Paddle statuses count as "you may export". `trialing` is included so a
   trial is usable; everything else — past_due, paused, canceled — drops the
   account to free at the next event, which is the behaviour we want: access
   follows payment. */
const PAID_STATUSES = new Set(["active", "trialing"]);

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const hexToBytes = (hex: string) => {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i] = byte;
  }
  return out;
};

async function verify(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;

  let ts = "", h1 = "";
  for (const part of header.split(";")) {
    const [k, v] = part.split("=");
    if (k === "ts") ts = v;
    if (k === "h1") h1 = v;
  }
  if (!ts || !h1) return false;

  /* Replay window. Without it a captured request stays valid forever and
     could be replayed to re-activate a cancelled subscription. Five minutes
     rather than Paddle's own five-second SDK default: their tolerance assumes
     a local handler, and an edge function behind a cold start can legitimately
     take longer than that to run. */
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${raw}`));
  const given = hexToBytes(h1);
  if (!given) return false;
  return timingSafeEqual(new Uint8Array(mac), given);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("PADDLE_WEBHOOK_SECRET");
  if (!secret) {
    console.error("paddle-webhook: PADDLE_WEBHOOK_SECRET is unset — refusing every event");
    return new Response("Not configured", { status: 500 });
  }

  const raw = await req.text();
  if (!(await verify(raw, req.headers.get("Paddle-Signature"), secret))) {
    console.warn("paddle-webhook: rejected an unsigned or stale request");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

  const type: string = event?.event_type ?? "";
  if (!type.startsWith("subscription.")) {
    // Transactions and adjustments are acknowledged so Paddle stops retrying,
    // but they do not move entitlement — only subscription events do.
    return new Response("ok", { status: 200 });
  }

  const d = event.data ?? {};
  /* customData passed at checkout is copied onto the subscription by Paddle,
     so it survives from the moment the user clicked Upgrade through to every
     later renewal or cancellation event. It is the only join between a Paddle
     subscription and a REAP account.

     Nothing is matched on email: letting a payer claim an account by paying
     with its address would be an account-takeover route, not a convenience. */
  const userId = d?.custom_data?.user_id;
  const subscriptionId = d?.id ?? null;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const status = String(d?.status ?? "unknown").toLowerCase();
  const paid = PAID_STATUSES.has(status);
  const row = {
    plan: paid ? "pro" : "free",
    status,
    paddle_subscription_id: subscriptionId,
    paddle_customer_id: d?.customer_id ?? null,
    // Prefer the billing period end; fall back to the next billing date.
    current_period_end: d?.current_billing_period?.ends_at ?? d?.next_billed_at ?? null,
    last_event: type,
    updated_at: new Date().toISOString(),
  };

  let error = null;
  if (userId) {
    ({ error } = await admin.from("subscriptions").upsert({ user_id: userId, ...row }, { onConflict: "user_id" }));
  } else if (subscriptionId) {
    // A later event for an already-recorded subscription still identifies it.
    ({ error } = await admin.from("subscriptions").update(row).eq("paddle_subscription_id", subscriptionId));
  } else {
    console.warn("paddle-webhook: event has neither custom_data.user_id nor id", type);
    return new Response("ok", { status: 200 });
  }

  if (error) {
    // A 500 makes Paddle retry, which is what we want for a transient fault.
    console.error("paddle-webhook: write failed", error);
    return new Response("Write failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
