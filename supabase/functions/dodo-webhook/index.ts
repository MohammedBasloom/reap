/* =============================================================
   REAP — Dodo Payments webhook.

   The ONLY thing that may grant a paid plan. The browser can read its own
   subscription row and cannot write any row, so entitlement can only ever
   arrive here, from Dodo, over a signed request.

   Signature verification is not optional and not a formality: without it this
   endpoint is a public URL that hands out subscriptions to anyone who can
   POST JSON at it. Dodo signs with the Standard Webhooks scheme —
     signed content = `${webhook-id}.${webhook-timestamp}.${raw body}`
     signature      = base64(HMAC-SHA256(secret, signed content))
   and the secret is base64 after its "whsec_" prefix.

   Two details that are easy to get wrong and are handled below:
     · the RAW body must be signed, not a re-serialised object — JSON.stringify
       of a parsed body reorders nothing but may change spacing, and any
       difference breaks the HMAC;
     · the comparison is constant-time, so the endpoint does not leak the
       expected signature one byte at a time through response timing.

   Deploy — note the flag, this endpoint is called by Dodo, not by a signed-in
   user, so Supabase must not require a JWT:
     supabase functions deploy dodo-webhook --no-verify-jwt
   Secrets:
     supabase secrets set DODO_WEBHOOK_SECRET=whsec_...
   ============================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Which Dodo statuses count as "you may export". Anything not on this list —
   on_hold, paused, cancelled, expired, failed — drops the account to free at
   the next event, which is the behaviour we want: access follows payment. */
const PAID_STATUSES = new Set(["active", "trialing"]);

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verify(raw: string, headers: Headers, secret: string): Promise<boolean> {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) return false;

  /* Replay window. A signature stays valid forever otherwise, so a captured
     request could be replayed to re-activate a cancelled subscription. */
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${raw}`));
  const expected = new Uint8Array(mac);

  /* The header carries one or more space-separated "v1,<base64>" values —
     more than one during a secret rotation. Any match is a pass. */
  for (const part of sigHeader.split(" ")) {
    const b64 = part.startsWith("v1,") ? part.slice(3) : part;
    let given: Uint8Array;
    try {
      given = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } catch { continue; }
    if (timingSafeEqual(expected, given)) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("DODO_WEBHOOK_SECRET");
  if (!secret) {
    console.error("dodo-webhook: DODO_WEBHOOK_SECRET is unset — refusing every event");
    return new Response("Not configured", { status: 500 });
  }

  const raw = await req.text();
  if (!(await verify(raw, req.headers, secret))) {
    console.warn("dodo-webhook: rejected an unsigned or stale request");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

  const type: string = event?.type ?? "";
  if (!type.startsWith("subscription.")) {
    // Payments and refunds are acknowledged so Dodo stops retrying, but they
    // do not move entitlement — only the subscription events do.
    return new Response("ok", { status: 200 });
  }

  const d = event.data ?? {};
  const userId = d?.metadata?.user_id;
  const subscriptionId = d?.subscription_id ?? null;

  /* No user id means the checkout was not started by this app, or metadata was
     lost. Fall back to the subscription id, which later events for an already
     recorded subscription will still carry. Nothing is guessed from an email:
     matching a payer to an account by address would let someone claim another
     person's plan by paying with their address. */
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const paid = PAID_STATUSES.has(String(d?.status ?? "").toLowerCase());
  const row = {
    plan: paid ? "pro" : "free",
    status: String(d?.status ?? "unknown"),
    dodo_subscription_id: subscriptionId,
    dodo_customer_id: d?.customer?.customer_id ?? null,
    current_period_end: d?.next_billing_date ?? null,
    last_event: type,
    updated_at: new Date().toISOString(),
  };

  let error = null;
  if (userId) {
    ({ error } = await admin.from("subscriptions").upsert({ user_id: userId, ...row }, { onConflict: "user_id" }));
  } else if (subscriptionId) {
    ({ error } = await admin.from("subscriptions").update(row).eq("dodo_subscription_id", subscriptionId));
  } else {
    console.warn("dodo-webhook: event has neither metadata.user_id nor subscription_id", type);
    return new Response("ok", { status: 200 });
  }

  if (error) {
    // A 500 makes Dodo retry, which is what we want for a transient DB fault.
    console.error("dodo-webhook: write failed", error);
    return new Response("Write failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
