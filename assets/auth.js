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

    async signOut() {
      this.clearGuest();
      await sb.auth.signOut();
      window.location.href = "index.html";
    },
  };
})();
