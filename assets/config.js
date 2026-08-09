/* REAP — client configuration (publishable values only; safe to ship). */
window.REAP_CONFIG = {
  SUPABASE_URL: "https://vysnmyuzkzcickyfgshl.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_btM85aJNA97lsdK2JfywBw_TU7qdyk-",

  /* ---------- Paddle ----------
     Both of these are PUBLIC by design and belong in the shipped bundle.

     PADDLE_CLIENT_TOKEN is the client-side token — the one prefixed live_ or
     test_. Paddle's documentation states it is safe to publish; it can open a
     checkout and preview a price, and nothing more.

     WHAT MUST NEVER GO HERE is the API key — the value with "apikey_" in the
     middle, e.g. pdl_live_apikey_… That one can charge cards, issue refunds
     and read customer records. It is not needed anywhere in this integration:
     the checkout runs on the token below, and the webhook authenticates with
     its own signing secret held in Supabase.

     Empty until configured. startCheckout() reports "not configured yet"
     rather than opening a broken overlay, and the paywall is switched off in
     signin-gate.js meanwhile. */
  PADDLE_CLIENT_TOKEN: "",
  PADDLE_PRICE_ID: "",
  PADDLE_ENV: "sandbox", // "sandbox" while testing, "production" when live
};
