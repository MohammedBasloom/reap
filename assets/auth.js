/* REAP — shared auth helpers (Supabase). Load after vendor/supabase.js + assets/config.js. */
(function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.REAP_CONFIG;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.sb = sb;

  const GUEST_KEY = "reap_guest";

  window.reapAuth = {
    client: sb,

    isGuest() {
      try { return sessionStorage.getItem(GUEST_KEY) === "1"; } catch (e) { return false; }
    },
    enterGuest() {
      try { sessionStorage.setItem(GUEST_KEY, "1"); } catch (e) {}
    },
    clearGuest() {
      try { sessionStorage.removeItem(GUEST_KEY); } catch (e) {}
    },

    async getSession() {
      const { data } = await sb.auth.getSession();
      return data.session || null;
    },

    async getUser() {
      const session = await this.getSession();
      return session ? session.user : null;
    },

    /* Gate an app page: resolves with { user } or { guest: true },
       otherwise redirects to the landing page. */
    async requireAuth() {
      const session = await this.getSession();
      if (session) return { user: session.user };
      if (this.isGuest()) return { guest: true };
      window.location.href = "index.html";
      return new Promise(() => {}); // halt caller while redirecting
    },

    async signUp(fullName, email, password) {
      return sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          // Resolve against the current page so it works at a domain root
          // (reapapp.netlify.app) and under a subpath (user.github.io/reap).
          emailRedirectTo: new URL("index.html", window.location.href).href,
        },
      });
    },

    async signIn(email, password) {
      return sb.auth.signInWithPassword({ email, password });
    },

    /* Sends the branded reset email; the link returns the user to the
       landing page with a recovery token, where they set a new password. */
    async resetPassword(email) {
      return sb.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("index.html", window.location.href).href,
      });
    },

    async updatePassword(newPassword) {
      return sb.auth.updateUser({ password: newPassword });
    },

    /* ---------- Entitlement ----------
       Reads the caller's own subscription row. RLS allows a user to select
       their own row and nothing else, and grants no write policy at all, so
       this is a read of something only the webhook can have set.

       It is NOT the security boundary. Anyone can edit what this returns in
       their own devtools; what that buys them is a report generated in their
       own browser from their own numbers. The boundary that matters is on the
       row itself — a user cannot write a plan, so they cannot obtain anything
       the server would honour.

       Fails closed: no session, no row, or a query error all read as "free". */
    async getPlan() {
      const user = await this.getUser();
      if (!user) return null;                      // guest — not signed in at all
      try {
        const { data, error } = await sb
          .from("subscriptions")
          .select("plan,status,current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error || !data) return "free";
        if (data.plan !== "pro" || data.status !== "active") return "free";
        // A period end in the past means the last renewal did not happen and
        // no cancellation event arrived either. Treat it as lapsed.
        if (data.current_period_end && new Date(data.current_period_end) < new Date()) return "free";
        return "pro";
      } catch (e) {
        return "free";
      }
    },

    /* Opens Paddle's checkout overlay.

       NO SERVER CALL, AND NO SECRET. Paddle's checkout runs on the public
       client-side token — the one prefixed live_ or test_, which their docs
       state plainly is safe to publish. It can open a checkout and preview a
       price and nothing else. The API KEY, the value carrying "apikey_" in
       the middle, is a different credential entirely and must never appear
       here; it is not needed anywhere in this integration.

       user_id travels as customData. Paddle copies it onto the subscription
       when one is created, so it survives to every later renewal and
       cancellation event — it is the only join between a Paddle subscription
       and a REAP account, and the webhook refuses to guess if it is missing. */
    async startCheckout() {
      const user = await this.getUser();
      if (!user) return { error: { message: "Sign in first." } };

      const cfg = window.REAP_CONFIG || {};
      if (!window.Paddle || !cfg.PADDLE_CLIENT_TOKEN || !cfg.PADDLE_PRICE_ID) {
        return { error: { message: "Checkout is not configured yet." } };
      }

      try {
        if (!this._paddleReady) {
          if (cfg.PADDLE_ENV === "sandbox") window.Paddle.Environment.set("sandbox");
          window.Paddle.Initialize({ token: cfg.PADDLE_CLIENT_TOKEN });
          this._paddleReady = true;
        }
        window.Paddle.Checkout.open({
          items: [{ priceId: cfg.PADDLE_PRICE_ID, quantity: 1 }],
          customer: { email: user.email },
          customData: { user_id: user.id },
          settings: {
            displayMode: "overlay",
            locale: (window.I18N && window.I18N.lang === "ar") ? "ar" : "en",
          },
        });
        // The overlay opens over this page; nothing navigates away.
        return { opened: true };
      } catch (e) {
        return { error: { message: "Could not open checkout." } };
      }
    },

    async signOut() {
      this.clearGuest();
      await sb.auth.signOut();
      window.location.href = "index.html";
    },
  };
})();
