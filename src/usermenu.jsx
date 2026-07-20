/* =============================================================
   REAP — shared account menu (top-right of both platforms).
   Guest: prompts to sign in. Signed-in: profile editing, save
   current work to the account, load saved items, log out.
   Requires: vendor/supabase.js + assets/auth.js loaded first.
   ============================================================= */
const { useState: useStateU, useEffect: useEffectU, useRef: useRefU } = React;

function UserMenu({ table, itemNoun, currentName, getCurrent, onLoad }) {
  const [open, setOpen] = useStateU(false);
  const [user, setUser] = useStateU(null);
  const [fullName, setFullName] = useStateU("");
  const [items, setItems] = useStateU([]);
  const [busy, setBusy] = useStateU("");
  const boxRef = useRefU(null);

  useEffectU(() => {
    reapAuth.getUser().then((u) => {
      setUser(u);
      if (u) {
        sb.from("profiles").select("full_name").eq("id", u.id).single()
          .then(({ data }) => setFullName((data && data.full_name) || ""));
        refreshItems();
      }
    });
  }, []);

  useEffectU(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function refreshItems() {
    const { data } = await sb.from(table).select("id,name,updated_at").order("updated_at", { ascending: false }).limit(8);
    setItems(data || []);
  }
  async function saveProfile() {
    setBusy("profile");
    await sb.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    setBusy("profileDone");
    setTimeout(() => setBusy(""), 1800);
  }
  async function saveCurrent() {
    setBusy("save");
    const { error } = await sb.from(table).insert({
      user_id: user.id,
      name: currentName || `Untitled ${itemNoun}`,
      inputs: getCurrent(),
      updated_at: new Date().toISOString(),
    });
    if (!error) await refreshItems();
    setBusy(error ? "saveError" : "saveDone");
    setTimeout(() => setBusy(""), 2200);
  }
  async function loadItem(id) {
    const { data } = await sb.from(table).select("inputs").eq("id", id).single();
    if (data && data.inputs) { onLoad(data.inputs); setOpen(false); }
  }
  async function deleteItem(e, id) {
    e.stopPropagation();
    if (!confirm(I18N.t("Delete this saved item?"))) return;
    await sb.from(table).delete().eq("id", id);
    refreshItems();
  }

  const initial = user
    ? ((fullName || user.email || "?").trim()[0] || "?").toUpperCase()
    : null;

  const panelStyle = {
    position: "absolute", top: "calc(100% + 10px)", insetInlineEnd: 0, zIndex: 60,
    width: 300, background: "var(--bg-1)", color: "var(--fg-1)",
    border: "1px solid var(--border-1)", boxShadow: "var(--shadow-lg)",
    padding: "18px 20px", textAlign: "left",
  };
  const label = { fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600 };

  return (
    <div ref={boxRef} style={{ position: "relative" }} className="no-print">
      <button
        onClick={() => setOpen(!open)}
        title={user ? (user.email || "Account") : "Account"}
        aria-label="Account menu"
        style={{
          width: 36, height: 36, borderRadius: "50%", cursor: "pointer",
          border: "1px solid rgba(255,255,255,0.35)",
          background: user ? "var(--ad-gold-500)" : "transparent",
          color: user ? "var(--ad-navy-900)" : "white",
          fontWeight: 700, fontSize: 14, display: "inline-flex",
          alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)",
        }}
      >
        {user ? initial : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        )}
      </button>

      {open && !user && (
        <div style={panelStyle}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>You're browsing as a guest</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6, lineHeight: 1.5 }}>
            Create a free account to save your work and access it from any device.
          </div>
          <a href="index.html" className="btn btn-primary" style={{ display: "block", textAlign: "center", marginTop: 14, textDecoration: "none" }}>
            Sign in / create account
          </a>
        </div>
      )}

      {open && user && (
        <div style={panelStyle}>
          <div style={label}>Signed in as</div>
          <div style={{ fontSize: 12.5, marginTop: 3, color: "var(--fg-2)", wordBreak: "break-all" }}>{user.email}</div>

          <div style={{ ...label, marginTop: 14 }}>Full name</div>
          <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
            <input className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ flex: 1 }} />
            <button className="btn" onClick={saveProfile} disabled={busy === "profile"} style={{ padding: "6px 12px" }}>
              {busy === "profileDone" ? "✓" : "Save"}
            </button>
          </div>

          <div style={{ borderTop: "1px solid var(--border-1)", margin: "16px 0 12px" }} />
          <button className="btn btn-primary" onClick={saveCurrent} disabled={busy === "save"} style={{ width: "100%" }}>
            {busy === "save" ? "Saving…" : busy === "saveDone" ? "Saved ✓" : `Save current ${itemNoun}`}
          </button>
          {busy === "saveError" && <div style={{ fontSize: 11, color: "var(--ad-danger)", marginTop: 6 }}>Could not save — try again.</div>}

          {items.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={label}>My saved {itemNoun}s</div>
              <div style={{ maxHeight: 180, overflowY: "auto", marginTop: 6 }}>
                {items.map((it) => (
                  <div key={it.id} onClick={() => loadItem(it.id)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginTop: 4,
                    border: "1px solid var(--border-1)", background: "var(--bg-2)", cursor: "pointer", fontSize: 12,
                  }}>
                    <span style={{ flex: 1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                    <span style={{ color: "var(--fg-4)", fontSize: 10 }}>{new Date(it.updated_at).toLocaleDateString()}</span>
                    <span onClick={(e) => deleteItem(e, it.id)} title="Delete" style={{ color: "var(--fg-4)", padding: "0 2px" }}>×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border-1)", margin: "14px 0 12px" }} />
          <button className="btn" onClick={() => reapAuth.signOut()} style={{ width: "100%" }}>Log out</button>
        </div>
      )}
    </div>
  );
}

/* Language toggle — globe icon, swaps AR/EN and reloads. */
function LangToggle() {
  const isAr = window.I18N && I18N.lang === "ar";
  return (
    <button
      className="no-print"
      onClick={() => I18N.setLang(isAr ? "en" : "ar")}
      title={isAr ? "Switch to English" : "التبديل إلى العربية"}
      aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
      style={{
        background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50%",
        color: "white", cursor: "pointer", width: 36, height: 36,
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm7.93 9h-3.02a15.9 15.9 0 0 0-1.4-5.02A8.01 8.01 0 0 1 19.93 11zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14A8.1 8.1 0 0 1 4 12c0-.69.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h3.02c.35 1.77 1.03 3.5 1.4 5.02A8.01 8.01 0 0 1 5.08 16zm3.02-8H5.08a8.01 8.01 0 0 1 4.42-5.02A15.9 15.9 0 0 0 8.1 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 7.02c.37-1.52 1.05-3.25 1.4-5.02h3.02a8.01 8.01 0 0 1-4.42 5.02zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
      </svg>
    </button>
  );
}

/* The Ascent — REAP mark: three arches rising to the right. */
function AscentMark({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size * 1.13} height={size} viewBox="4 16 88 78" fill={color} aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <path d="M10 88 V67 C10 60.9 14.9 56 21 56 C27.1 56 32 60.9 32 67 V88 Z" />
      <path d="M37 88 V51 C37 44.9 41.9 40 48 40 C54.1 40 59 44.9 59 51 V88 Z" />
      <path d="M64 88 V33 C64 26.9 68.9 22 75 22 C81.1 22 86 26.9 86 33 V88 Z" />
    </svg>
  );
}

/* Brand lockup — Ascent mark + REAP wordmark (Ador Hairline). Links home. */
function BrandMark({ platform }) {
  return (
    <a href="index.html" title="Back to home" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap" }}>
      <AscentMark size={26} color="white" />
      <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: "'Ador Hairline', system-ui, sans-serif", fontSize: 22, fontWeight: 500, letterSpacing: "0.16em", color: "white" }}>REAP</span>
        <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>{platform}</span>
      </span>
    </a>
  );
}

window.UserMenu = UserMenu;
window.BrandMark = BrandMark;
window.AscentMark = AscentMark;
window.LangToggle = LangToggle;
