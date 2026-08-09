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

    /* Starts checkout. The key never touches the browser — the edge function
       holds it and returns a URL to send the user to. */
    async startCheckout() {
      const session = await this.getSession();
      if (!session) return { error: { message: "Sign in first." } };
      const url = `${SUPABASE_URL}/functions/v1/create-checkout`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "content-type": "application/json",
          },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.checkout_url) {
          return { error: { message: body.error || "Could not start checkout." } };
        }
        return { url: body.checkout_url };
      } catch (e) {
        return { error: { message: "Could not reach the payment service." } };
      }
    },

    async signOut() {
      this.clearGuest();
      await sb.auth.signOut();
      window.location.href = "index.html";
    },
  };
})();
