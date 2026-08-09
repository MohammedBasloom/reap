# Payments — setup runbook

Two plans:

| Plan | Price | Build & save models | Export / print |
|---|---|---|---|
| Free | — | unlimited | ✗ |
| Pro  | $9.99 / month | unlimited | unlimited |

The code is in place. What remains needs credentials, so it has to be done by
the account owner.

---

## 0. Rotate the API key first

A Dodo API key was pasted into a chat transcript during this work. Treat it as
public: **revoke it in the Dodo dashboard and issue a new one** before doing
anything below. Nothing in this repository contains it, and nothing should —
`git log -S` confirms it never entered the history.

The key is a bearer credential for the payments API. Anyone holding it can
create charges, read customer records and issue refunds against the account.

---

## 1. Why the key cannot go in the front end

REAP is a static site. `index.html`, `model.html`, `valuation.html` and
everything under `assets/` are served as files and arrive in the browser
readable — and this repository is public on GitHub, so anything committed is
readable without even visiting the site.

So the key lives in Supabase Edge Function secrets, and the browser never
holds it. The browser can only ask a function to start a checkout, and only
for the account whose token it presents.

---

## 2. Database

Run `supabase/schema/subscriptions.sql` in the Supabase SQL editor.

It creates one row per user with RLS on, a select policy for the owner, and
**no write policy at all** — so no browser can grant itself a plan. Only the
webhook, which runs with the service role and bypasses RLS, can write.

---

## 3. Dodo dashboard

1. Create a **subscription product** at $9.99/month. Copy its product id.
2. Add a webhook endpoint pointing at:
   `https://vysnmyuzkzcickyfgshl.supabase.co/functions/v1/dodo-webhook`
3. Subscribe it to the `subscription.*` events.
4. Copy the webhook signing secret (`whsec_…`).

---

## 4. Supabase secrets

```bash
supabase secrets set DODO_API_KEY=<the NEW key from step 0>
supabase secrets set DODO_PRODUCT_ID=<product id from step 3>
supabase secrets set DODO_WEBHOOK_SECRET=<whsec_... from step 3>
supabase secrets set DODO_MODE=test
supabase secrets set SITE_URL=https://www.reapinsights.com
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
injected by the platform — do not set them.

Keep `DODO_MODE=test` until a test card has been through the whole flow. Then
set it to `live` and swap in the live key.

---

## 5. Deploy the functions

```bash
supabase functions deploy create-checkout
supabase functions deploy dodo-webhook --no-verify-jwt
```

The `--no-verify-jwt` on the webhook is required and is **not** a security
hole: Dodo calls it without a Supabase token, and the function verifies Dodo's
own signature instead. Without the flag, Supabase would reject every event
before the function ran.

---

## 6. Test before going live

- Sign in on a free account, hit Export → the upgrade prompt appears.
- Click Upgrade → Dodo checkout opens.
- Pay with a Dodo test card.
- Check `subscriptions` has a row with `plan = 'pro'`, `status = 'active'`.
- Reload and hit Export → the report opens.
- Cancel the subscription in Dodo → the row flips to `free` and Export is
  blocked again.

Confirm the webhook rejects a forged request too — POST to the endpoint with
no `webhook-signature` header and expect **401**. If it returns 200, stop:
the signing secret is not set and the endpoint is granting plans to anyone.

---

## What is and is not enforced

The browser check (`reapAuth.getPlan()`) decides what the UI offers. It is
**not** the security boundary — anyone can change what it returns in their own
devtools, and what that buys is a report generated in their own browser from
their own numbers.

The boundary that matters is the database: a user cannot write their own plan,
so they cannot obtain anything a server would honour. If reports ever move
server-side, the entitlement must be re-checked there.
