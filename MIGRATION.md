# Moving REAP to a new machine

Everything needed to build, run and deploy REAP is in this repository. Only
secrets are excluded — those are recreated on the new machine, never copied.

---

## 1. What lives where

| Thing | Where it lives | Travels with `git clone`? |
|---|---|---|
| Site code, assets, brand kit, email templates | this repo | ✅ yes |
| Dev server + deploy scripts (`serve.ps1`, `deploy-github.ps1`) | this repo | ✅ yes |
| Dev-server port config (`.claude/launch.json`) | this repo | ✅ yes |
| GitHub token (`.github-token`) | local file, gitignored | ❌ recreate |
| Live site, DNS, email routing | Cloudflare account | ❌ account login |
| Users, saved valuations | Supabase account | ❌ account login |
| Outbound email | Resend account | ❌ account login |

**Nothing about the running product depends on the old machine.** The live site
is served by Cloudflare from this repo; the database is Supabase. Losing the
laptop does not take the site down.

---

## 2. On the new machine

### a. Get the code

```bash
git clone https://github.com/MohammedBasloom/reap.git
cd reap
```

### b. Recreate the GitHub token

Deploys push with a personal access token read from a local file.

1. GitHub → Settings → Developer settings → Personal access tokens →
   **Tokens (classic)** → Generate new token, scope **`repo`**.
2. Save it as the **only line** of `.github-token` in the repo root.

That file is gitignored and must never be committed.

### c. Check the dev-server port

`.claude/launch.json` uses port **8322** and a relative script path, so the repo
works from any folder. Port 8321 was abandoned because it sits in a Windows
*excluded port range* on the old machine. Confirm the port is free
on the new one:

```bash
netsh interface ipv4 show excludedportrange protocol=tcp
```

If 8322 is listed as excluded, pick another and update both `port` and the
`-Port` argument in `.claude/launch.json`.

### d. Run and deploy

```bash
powershell -File serve.ps1 -Port 8322
```

```bash
powershell -File deploy-github.ps1 -Message "your message"
```

Pushing to `main` auto-deploys Cloudflare Pages (~30–60 s).

---

## 3. Accounts to have access to

These are the real dependencies — none of them live on the old machine, but you
need the logins.

| Service | Account | What it holds |
|---|---|---|
| **GitHub** | `MohammedBasloom` | repo `reap` — the source of truth |
| **Cloudflare** | `Forluv.99@gmail.com` | Pages project `reapapp`, DNS for `reapinsights.com`, Email Routing (`info@` → Gmail), and the `RESEND_API_KEY` env var |
| **Supabase** | project ref `vysnmyuzkzcickyfgshl` (region `ap-south-1`) | user accounts, saved valuations |
| **Resend** | domain `reapinsights.com` verified | transactional email + contact-form relay |

Make sure each has a recovery email/phone you will still control, and that 2FA
is not tied to an authenticator app that only exists on the old device. **Do this
before wiping the old machine** — losing Cloudflare access means losing the
domain and the live site.

---

## 4. Do NOT copy

- `.github-token`, `.netlify-token`, `.mcp.json` — regenerate instead
- `build/` — disposable compiled output, regenerated on demand
- `.claude/settings.local.json` — per-device permission grants

---

## 5. Optional: keep the assistant's project memory

Claude Code's notes about this project live outside the repo at:

```
C:\Users\<you>\.claude\projects\D--REAP\memory\
```

Copy that folder to the same path on the new machine to retain context about
hosting, deploy flow and open items. Purely a convenience — nothing depends on it.
