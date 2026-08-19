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

    /* Gate an app page: resolves with { user }, otherwise sends the visitor
       back to the landing page to sign in.

       A guest used to be let through here. That put someone inside a
       workspace that saves nothing and exports nothing, which reads as the
       product being broken rather than as a trial — and it was reachable by
       typing the URL, so the landing page could not close it on its own. Any
       stale guest flag left in a browser is cleared on the way past, or those
       sessions would keep their access after the door was shut. */
    async requireAuth() {
      const session = await this.getSession();
      if (session) return { user: session.user };
      this.clearGuest();
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

    async signOut() {
      this.clearGuest();
      await sb.auth.signOut();
      window.location.href = "index.html";
    },
  };
})();
