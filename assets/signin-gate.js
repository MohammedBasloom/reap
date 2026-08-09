/* =============================================================
   REAP — sign-in gate for actions a guest cannot take.

   Guests are allowed all the way into both platforms: they can build a
   scheme, price it and read every result. What they cannot do is take a
   document away — a report carries a cover, a company name and a
   confidentiality marking, and it is the one output that leaves the session
   and gets sent to someone. That needs an account behind it.

   The auth form itself lives on the landing page and is not duplicated here.
   This asks, then hands off to index.html with the view to open and the page
   to come back to, which the landing page's existing pendingApp machinery
   already knows how to finish.

   Vanilla rather than React: both platforms load it, one is a React app and
   the other is too, but the gate has to work the same in both and neither
   should have to mount a component to ask a yes/no question.

   Load after assets/auth.js and assets/i18n.js.
   ============================================================= */
(function () {
  const T = (s) => (window.I18N && window.I18N.t ? window.I18N.t(s) : s);

  /* The platform pages carry no modal styles of their own, so the gate brings
     its own — injected once, on first use, rather than on every page load
     that never opens it. Colours come from tokens.css, which both pages
     already load. */
  let styleInjected = false;
  function ensureStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const s = document.createElement("style");
    s.id = "reap-gate-style";
    s.textContent = `
.rg-back {
  position: fixed; inset: 0; z-index: 9500;
  background: rgba(10,26,54,0.55);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.rg-modal {
  background: var(--bg-1); color: var(--fg-1);
  width: min(440px, 100%);
  border: 1px solid var(--border-1);
  box-shadow: 0 30px 70px -20px rgba(10,26,54,0.55);
  padding: 26px 28px 22px; position: relative;
  font-family: var(--font-body);
}
.rg-eyebrow {
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ad-gold-600); font-weight: 700;
}
.rg-modal h3 {
  font-family: var(--font-display); font-size: 21px; font-weight: 600;
  letter-spacing: -0.01em; margin: 6px 0 0; color: var(--fg-1);
}
.rg-modal p { font-size: 13px; line-height: 1.65; color: var(--fg-2); margin: 12px 0 0; }
.rg-actions { display: flex; gap: 8px; margin-top: 22px; flex-wrap: wrap; }
.rg-btn {
  flex: 1; min-width: 130px; padding: 11px 14px; cursor: pointer;
  font-family: var(--font-body); font-size: 11.5px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  border: 1px solid var(--border-2); background: var(--bg-1); color: var(--fg-1);
  transition: background 160ms var(--ease-out), border-color 160ms var(--ease-out);
}
.rg-btn:hover { background: var(--bg-2); border-color: var(--border-strong); }
.rg-btn.primary { background: var(--ad-navy-900); border-color: var(--ad-navy-900); color: #fff; }
.rg-btn.primary:hover { background: var(--ad-navy-800); border-color: var(--ad-navy-800); }
.rg-cancel {
  display: block; width: 100%; margin-top: 14px; text-align: center;
  background: none; border: none; cursor: pointer;
  font-size: 12px; color: var(--fg-3); text-decoration: underline;
  font-family: var(--font-body);
}
.rg-cancel:hover { color: var(--fg-1); }
.rg-price {
  display: flex; align-items: baseline; gap: 8px;
  margin-top: 18px; padding: 12px 14px;
  background: var(--bg-2); border-inline-start: 3px solid var(--ad-gold-500);
}
.rg-price b { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--fg-1); }
.rg-price span { font-size: 12px; color: var(--fg-3); }
.rg-msg { font-size: 12px; color: var(--fg-3); margin-top: 10px; min-height: 16px; }
.rg-msg.err { color: var(--ad-danger); }
@media print { .rg-back { display: none !important; } }
`;
    document.head.appendChild(s);
  }

  /* index.html?auth=login&next=model.html — the landing page reads both and
     reopens the modal in the right view, then routes back here once the
     session exists. Derived from the current path rather than passed in, so
     it stays right whether the page was served as /model or /model.html. */
  function currentPage() {
    const last = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    return last ? last + ".html" : "";
  }
  function goToAuth(view) {
    const next = currentPage();
    const q = "?auth=" + view + (next ? "&next=" + encodeURIComponent(next) : "");
    window.location.href = "index.html" + q;
  }

  function showModal(opts) {
    ensureStyle();
    return new Promise((resolve) => {
      const back = document.createElement("div");
      back.className = "rg-back";
      back.innerHTML = `
<div class="rg-modal" role="dialog" aria-modal="true">
  <div class="rg-eyebrow"></div>
  <h3></h3>
  <p></p>
  <div class="rg-actions">
    <button class="rg-btn primary" data-act="signup"></button>
    <button class="rg-btn" data-act="login"></button>
  </div>
  <button class="rg-cancel" data-act="cancel"></button>
</div>`;
      back.querySelector(".rg-eyebrow").textContent = T("Account required");
      back.querySelector("h3").textContent = opts.title || T("Sign in to export your report");
      back.querySelector("p").textContent = opts.body ||
        T("Exporting produces a branded document with your company on the cover — so it needs an account behind it. Your work is kept while you sign in, and you are brought straight back here.");
      back.querySelector('[data-act="signup"]').textContent = T("Create free account");
      back.querySelector('[data-act="login"]').textContent = T("Sign in");
      back.querySelector('[data-act="cancel"]').textContent = T("Not now — keep working");

      const close = (result) => {
        document.removeEventListener("keydown", onKey);
        back.remove();
        resolve(result);
      };
      const onKey = (e) => { if (e.key === "Escape") close(false); };

      back.addEventListener("click", (e) => {
        const act = e.target.getAttribute && e.target.getAttribute("data-act");
        if (act === "signup") { goToAuth("signup"); return; }
        if (act === "login") { goToAuth("login"); return; }
        if (act === "cancel" || e.target === back) close(false);
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(back);
      back.querySelector('[data-act="signup"]').focus();
    });
  }

  /* The upgrade prompt. Same shell as the sign-in modal, different question:
     the user IS signed in, they simply have not paid for the thing they just
     asked for. */
  function showUpgrade(opts) {
    ensureStyle();
    return new Promise((resolve) => {
      const back = document.createElement("div");
      back.className = "rg-back";
      back.innerHTML = `
<div class="rg-modal" role="dialog" aria-modal="true">
  <div class="rg-eyebrow"></div>
  <h3></h3>
  <p></p>
  <div class="rg-price"><b></b><span></span></div>
  <div class="rg-actions">
    <button class="rg-btn primary" data-act="buy"></button>
  </div>
  <div class="rg-msg" data-role="msg"></div>
  <button class="rg-cancel" data-act="cancel"></button>
</div>`;
      back.querySelector(".rg-eyebrow").textContent = T("Upgrade required");
      back.querySelector("h3").textContent = opts.title || T("Exporting is a paid feature");
      back.querySelector("p").textContent = opts.body ||
        T("Your free account keeps every model and valuation you build, with no limit. Exporting the finished document is part of the paid plan.");
      back.querySelector(".rg-price b").textContent = "$9.99";
      back.querySelector(".rg-price span").textContent = T("per month — unlimited exports");
      const buy = back.querySelector('[data-act="buy"]');
      buy.textContent = T("Upgrade");
      back.querySelector('[data-act="cancel"]').textContent = T("Not now — keep working");
      const msgEl = back.querySelector('[data-role="msg"]');

      const close = (result) => {
        document.removeEventListener("keydown", onKey);
        back.remove();
        resolve(result);
      };
      const onKey = (e) => { if (e.key === "Escape") close(false); };

      back.addEventListener("click", async (e) => {
        const act = e.target.getAttribute && e.target.getAttribute("data-act");
        if (act === "buy") {
          buy.disabled = true;
          msgEl.textContent = T("Opening checkout…");
          const { url, error } = await window.reapAuth.startCheckout();
          if (url) { window.location.href = url; return; }   // leaving the page
          buy.disabled = false;
          msgEl.textContent = error ? error.message : T("Could not start checkout.");
          msgEl.classList.add("err");
          return;
        }
        if (act === "cancel" || e.target === back) close(false);
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(back);
      buy.focus();
    });
  }

  window.reapGate = {
    /* Resolves true when the action may proceed. A signed-in user never sees
       the modal; a guest sees it and gets false unless they leave to sign in,
       in which case this page is being navigated away from anyway. */
    async requireAccount(opts) {
      try {
        const user = await window.reapAuth.getUser();
        if (user) return true;
      } catch (e) {
        // No session to read is the same answer as no session.
      }
      return showModal(opts || {});
    },

    /* Two gates in sequence, and the order matters: a guest is asked to sign
       in, not to buy something for an account they do not have yet. Only once
       there is an account does the question become which plan it is on.

       THE SECOND GATE IS CURRENTLY OFF. Billing is built but not switched on:
       the Dodo product, the webhook and the Supabase secrets are not yet
       configured, so asking anyone to pay would send them to a checkout that
       cannot complete. Until then export needs an account and nothing more.

       To turn billing on, set this to true — that is the whole switch. Every
       other piece is already in place and tested: getPlan(), startCheckout(),
       the upgrade modal below, the subscriptions table and both edge
       functions. See PAYMENTS.md for what has to be configured first. */
    async requireExport(opts) {
      const PAYWALL_ENABLED = false;

      const ok = await this.requireAccount(opts);
      if (!ok) return false;
      if (!PAYWALL_ENABLED) return true;

      let plan = "free";
      try { plan = await window.reapAuth.getPlan(); } catch (e) { plan = "free"; }
      if (plan === "pro") return true;
      return showUpgrade(opts || {});
    },
  };
})();
