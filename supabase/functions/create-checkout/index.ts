/* =============================================================
   REAP — create a Dodo Payments checkout session.

   WHY THIS EXISTS AT ALL. REAP is a static site: index.html and the two
   platform pages are served as files, and everything in assets/ reaches the
   browser verbatim. A payment API key placed anywhere in that bundle is a key
   handed to every visitor — readable in devtools, and in this project's case
   also committed to a public GitHub repository. So the key lives here, in a
   Supabase Edge Function, and the browser never sees it.

   The browser calls this with its Supabase session token. The function
   establishes WHO is asking from that token rather than trusting a user id in
   the request body — otherwise anyone could buy a subscription for, or more
   to the point attach one to, somebody else's account.

   Deploy:
     supabase functions deploy create-checkout
   Secrets it needs (set them once, never commit them):
     supabase secrets set DODO_API_KEY=...
     supabase secrets set DODO_PRODUCT_ID=...
     supabase secrets set DODO_MODE=test          # or "live"
     supabase secrets set SITE_URL=https://www.reapinsights.com
   ============================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("DODO_API_KEY");
  const productId = Deno.env.get("DODO_PRODUCT_ID");
  if (!apiKey || !productId) {
    // Deliberately vague to the caller, explicit in the logs: a
    // misconfiguration is our problem, not something to describe to a browser.
    console.error("create-checkout: DODO_API_KEY or DODO_PRODUCT_ID is unset");
    return json({ error: "Checkout is not configured yet." }, 500);
  }

  /* Identify the caller from their token. The anon key plus the caller's
     Authorization header means getUser() resolves the signed-in user and
     nothing else — a forged or expired token simply yields none. */
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: "Sign in first." }, 401);

  const base = Deno.env.get("DODO_MODE") === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
  const site = Deno.env.get("SITE_URL") ?? "https://www.reapinsights.com";

  try {
    const res = await fetch(`${base}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: {
          email: user.email,
          name: (user.user_metadata?.full_name as string) ?? undefined,
        },
        /* The webhook has no other way to know which REAP account paid.
           Dodo's customer id is created at checkout, so metadata is the only
           thing that crosses from here to the webhook — it is the join key,
           and everything downstream depends on it being right. */
        metadata: { user_id: user.id },
        return_url: `${site}/model.html?checkout=done`,
        allowed_payment_method_types: ["credit", "debit"],
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("dodo /checkouts failed", res.status, body);
      return json({ error: "Could not start checkout." }, 502);
    }
    if (!body.checkout_url) {
      console.error("dodo /checkouts returned no checkout_url", body);
      return json({ error: "Could not start checkout." }, 502);
    }
    return json({ checkout_url: body.checkout_url });
  } catch (e) {
    console.error("create-checkout threw", e);
    return json({ error: "Could not start checkout." }, 502);
  }
});
