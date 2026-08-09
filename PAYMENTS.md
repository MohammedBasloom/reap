# Payments — setup runbook (Paddle Billing)

Two plans:

| Plan | Price | Build & save | Export / print |
|---|---|---|---|
| Free | — | unlimited | ✗ |
| Pro  | $9.99 / month | unlimited | unlimited |

The code is written and tested. What remains needs credentials, so it has to
be done by the account owner.

---

## 0. Rotate the leaked API key — first, and regardless of everything else

A **live** Paddle API key (`pdl_live_apikey_…`) was pasted into a chat
transcript. Treat it as public: **revoke it in the Paddle dashboard now.**

Live means real money. Anyone holding that key can charge cards, issue
refunds, and read customer records on the production account.

Nothing in this repository contains it — `git log -S` confirms it never
entered the history, and no working file holds it.

**And you do not need to replace it for this feature.** See below.

---

## 1. The API key is not used anywhere in this integration

This is worth stating plainly, because it is the unusual and welcome part of
Paddle's model.

| Credential | Format | Where it lives | Used here? |
|---|---|---|---|
| Client-side token | `live_…` / `test_…` | `assets/config.js`, shipped to browsers | **yes** |
| Webhook secret | `pdl_ntfset_…` | Supabase secrets | **yes** |
| **API key** | `pdl_…_apikey_…` | nowhere | **no** |

Paddle's checkout opens from the browser using the client-side token, which
their documentation states is safe to publish — it can open a checkout and
preview a price and nothing else. The webhook authenticates with its own
signing secret. The API key is only needed to call Paddle's REST API, which
REAP never does.

So: revoke the leaked key and simply do not issue a replacement unless some
later feature needs one.

---

## 2. Database

Run `supabase/schema/subscriptions.sql` in the Supabase SQL editor.

One row per user, RLS on, a select policy for the owner, and **no write policy
at all** — so no browser can grant itself a plan whatever it sends. Only the
webhook writes, running as the service role, which bypasses RLS.

---

## 3. Paddle dashboard

1. **Catalog → Products** — create a product, then a **recurring price** at
   **$9.99 / month**. Copy the price id (`pri_…`).
2. **Developer tools → Authentication** — copy the **client-side token**
   (`test_…` in sandbox, `live_…` in production). This is *not* the API key.
3. **Developer tools → Notifications** — add a destination:
   `https://vysnmyuzkzcickyfgshl.supabase.co/functions/v1/paddle-webhook`
   Subscribe it to the `subscription.*` events. Copy the signing secret
   (`pdl_ntfset_…`).
4. **Checkout → Website approval** — Paddle requires your domain to be
   approved before a live checkout will open. Add `reapinsights.com`.

Do all of this in **sandbox** first. Paddle keeps sandbox and production
entirely separate, with different tokens and different dashboards.

---

## 4. Fill in the public config

In `assets/config.js`:

```js
PADDLE_CLIENT_TOKEN: "test_...",   // or live_... in production
PADDLE_PRICE_ID:     "pri_...",
PADDLE_ENV:          "sandbox",    // "production" when live
```

These are public by design and belong in the repository. **Do not put the API
key here** — the file is served to every visitor and this repository is
public.

---

## 5. Supabase secret + deploy

```bash
supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
```

```bash
supabase functions deploy paddle-webhook --no-verify-jwt
```

`--no-verify-jwt` is required and is **not** a hole: Paddle calls the endpoint
without a Supabase token, and the function verifies Paddle's own signature
instead. Without the flag Supabase would reject every event before the
function ran.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform —
do not set them.

---

## 6. Turn the paywall on

In `assets/signin-gate.js`, inside `requireExport`:

```js
const PAYWALL_ENABLED = true;
```

That is the whole switch. It is `false` today so that nobody is sent to a
checkout that cannot complete.

---

## 7. Test before going live

- Free account → Export → upgrade prompt appears.
- Upgrade → Paddle overlay opens over the page.
- Pay with a Paddle sandbox card.
- `subscriptions` gains a row: `plan = 'pro'`, `status = 'active'`.
- Reload → Export opens the report.
- **Cancel in Paddle → the row flips to `free` and Export is blocked again.**
  Granting access is the easy half; withdrawing it is where these leak.

Then confirm the webhook refuses a forgery — POST to it with no
`Paddle-Signature` header and expect **401**. If it returns 200, stop: the
signing secret is unset and that URL is granting subscriptions to anyone who
finds it.

---

## What is and is not enforced

`reapAuth.getPlan()` decides what the UI offers. It is **not** the security
boundary — anyone can change what it returns in their own devtools, and what
that buys is a report generated in their own browser from their own numbers.

The boundary is the database: a user cannot write their own plan, so they
cannot obtain anything a server would honour. If reports ever move
server-side, re-check entitlement there.
