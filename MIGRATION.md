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
| GitHub push credential | Windows Credential Manager | ❌ sign in again |
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

If the target folder already exists and is **not empty** — e.g. `D:\REAP`
already holding a `.claude/` directory — `git clone` refuses. Populate it in
place instead; this keeps whatever is already there:

```bash
cd /d/REAP && git init -b main && git remote add origin https://github.com/MohammedBasloom/reap.git && git fetch origin && git checkout -B main --track origin/main
```

Then set the commit identity, which a fresh Git install does not have:

```bash
git config --global user.name "Mohammed Basloom" && git config --global user.email "moh.baslom@gmail.com"
```

### b. Sign in to GitHub

Deploying is a plain `git push`. Git Credential Manager (bundled with Git for
Windows) holds the credential — **no token file is needed.**

```bash
git push origin main
```

The first push opens a GitHub window: choose **Sign in with your browser** and
approve. The credential is stored in Windows Credential Manager and survives
reboots. Nothing lands in a plaintext file and nothing expires.

A personal access token still works if you prefer one — `deploy-github.ps1`
reads `.github-token` (gitignored, never commit it). If you go that route,
tick the **`repo`** scope: it sits between the Expiration dropdown and the
Generate button and is easy to scroll past. A scopeless token still
authenticates successfully against `/user`, so it looks valid right up until
the push fails with `403 Permission denied`. Check the token's scope line on
github.com/settings/tokens reads `repo` before trusting it.

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
git add -A && git commit -m "your message" && git push origin main
```

Pushing to `main` auto-deploys Cloudflare Pages (~20–30 s measured) and the
GitHub Pages mirror. `deploy-github.ps1 -Message "..."` does the same thing but
requires `.github-token`; its extra API calls only ever created the repo and
enabled Pages, both long since done.

### e. Leave `_redirects` alone

Cloudflare Pages serves **every** committed file, so without it this guide, the
`README`, the `.ps1` scripts and `brand-assets/` are all publicly readable on
the live domain. `_redirects` 301s them to the homepage.

Pages accepts only **301/302/303/307/308** there. A `404` rule is parsed,
deployed, and silently ignored — it will look like it worked and will not.

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

- `.github-token` (no longer needed at all — see 2b), `.netlify-token`,
  `.mcp.json` — regenerate instead, never copy
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
