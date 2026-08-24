/* =============================================================
   REAP — Real Estate Valuation platform (guided wizard)
   Sales comparison · Income · Cost → reconciled market value.
   Written for non-specialists: every input carries a hint and a
   realistic default.
   ============================================================= */
const { useState, useMemo, useEffect } = React;
const V = window.Val;
const fc = V.formatCurrency, fn = V.formatNumber, fp = V.formatPct;
// Localized currency mark (matches fc's "ر.س" in Arabic). Ranges follow the
// reading direction: Arabic lists low→high right-to-left, English left-to-right.
// (Each fc() token is already internally bidi-isolated by the formatter.)
const curSym = () => (window.I18N && I18N.lang === "ar") ? "ر.س" : "SAR";
// Units built inside template strings bypass the dictionary — localize explicitly.
const sqm = () => (window.I18N ? I18N.t("m²") : "m²");
const ISO = {
  direction: (window.I18N && I18N.lang === "ar") ? "rtl" : "ltr",
  unicodeBidi: "isolate", display: "inline-block", whiteSpace: "nowrap",
};

const STORAGE_KEY = "reap_val_v1";

/* ---------- Default inputs ---------- */
const blankComp = () => ({ price: "", area: "", monthsAgo: 0, locationAdj: 0, conditionAdj: 0, otherAdj: 0 });

/* Everything past the property itself starts empty, the same as the modeling
   platform. A valuation that arrives pre-filled with a rent, a cap rate and a
   build cost produces a number before anyone has looked at a single one of
   them — and here the number is the entire deliverable. Each step is passed by
   typing it or by taking its default, and the value is not shown until they
   have all been passed. */
function defaultInput(type = "apartment") {
  /* Land carries no building, so neither the income nor the cost approach can
     be run on it — comparable sales is the only method left. A weighting with
     one method in it is 100% by arithmetic, not by judgement, so it is set
     here rather than asked for. */
  const landOnly = !!V.PROPERTY_TYPES[type].landOnly;
  return {
    name: (window.I18N && I18N.lang === "ar") ? "تقييم جديد" : "New Valuation",
    property: { type, city: "", district: "", landArea: null, builtArea: null, age: null, condition: "good" },
    sales: { comps: [blankComp(), blankComp(), blankComp()], marketTrendPctYr: null },
    income: { rentBasis: "perSqm", rentPerSqmYr: null, annualRent: null, vacancyPct: null, opexPct: null, capRate: null },
    cost: { landPricePerSqm: null, buildCostPerSqm: null, economicLifeYrs: null, obsolescencePct: null },
    weights: landOnly ? { sales: 1, income: 0, cost: 0 } : { sales: null, income: null, cost: null },
    stepsDone: {},
  };
}

/* ---------- The guided valuation ----------
   Land is valued on comparables alone — there is no building to rent out or
   rebuild — so income and cost drop out of the walk rather than sitting there
   unanswerable, and weighting goes with them: asking someone to weight a
   single method is asking them to confirm that one equals one. Land is a
   two-step walk. */
function valSteps(input) {
  const isLand = !!V.PROPERTY_TYPES[input.property.type].landOnly;
  const all = [
    { key: "property", cta: false, title: "Describe the property",
      body: "Type, city and district, the areas being valued, and — for a building — its age and condition." },
    /* No shortcut. Comparables are evidence of what actually sold, not an
       assumption with a sensible default; inventing three would be inventing
       the market the valuation rests on. */
    { key: "comps", cta: false, title: "Enter comparable sales",
      body: "Three to five recent sales of similar properties, with the adjustment each one needs." },
    { key: "income", cta: true, title: "Set the rental income",
      body: "Rent, vacancy, operating costs and the cap rate an investor would apply." },
    { key: "cost", cta: true, title: "Set the rebuild cost",
      body: "Land rate and build cost per m², the economic life, and any obsolescence." },
    { key: "weights", cta: true, title: "Weight the approaches",
      body: "How much comparable sales, income and cost each count toward the final figure." },
  ];
  return isLand
    ? all.filter((s) => s.key !== "income" && s.key !== "cost" && s.key !== "weights")
    : all;
}

function valStepDone(input, key) {
  const seen = input.stepsDone || {};
  const isLand = !!V.PROPERTY_TYPES[input.property.type].landOnly;
  switch (key) {
    case "property":
      return !!input.property.city && (isLand
        ? (+input.property.landArea || 0) > 0
        : (+input.property.builtArea || 0) > 0);
    /* At least one comparable carrying both a price and an area — a row with
       only one of the two cannot be reduced to a rate and contributes nothing. */
    case "comps":
      return (input.sales.comps || []).some((c) => (+c.pricePerSqm || 0) > 0 || ((+c.price || 0) > 0 && (+c.area || 0) > 0));
    /* Read the model, not a visit log. These were sticky flags, so a step
       stayed answered for the rest of the session however the figures changed
       afterwards — clear the cap rate on a valued property and the result went
       on standing there, computed from a blank the engine reads as zero, with
       nothing to say so. */
    case "income": case "cost": case "weights":
      return valStepFilled(input, key);
    default:
      return !!seen[key];
  }
}

function valGuide(input) {
  const steps = valSteps(input).map((s) => Object.assign({}, s, { done: valStepDone(input, s.key) }));
  return {
    steps,
    doneCount: steps.filter((s) => s.done).length,
    total: steps.length,
    allDone: steps.every((s) => s.done),
    currentIdx: steps.findIndex((s) => !s.done),
  };
}

/* What each step's "use default inputs" writes — the same market-typical
   figures the platform used to open with, now taken deliberately.

   This map is also what "is the step answered?" is measured against, so the
   button and the test cannot disagree about which figures the step is
   responsible for. Naming them twice is how a step ends up closed with one of
   its fields still empty. */
const VAL_STEP_GROUP = { income: "income", cost: "cost", weights: "weights" };

function valStepValues(input, key) {
  const t = V.PROPERTY_TYPES[input.property.type];
  const d = t.defaults;
  if (key === "income") {
    return { rentPerSqmYr: d.rentPerSqmYr, vacancyPct: d.vacancyPct, opexPct: d.opexPct, capRate: d.capRate };
  }
  if (key === "cost") {
    return { landPricePerSqm: 1200, buildCostPerSqm: d.buildCostPerSqm,
             economicLifeYrs: d.economicLifeYrs || 60, obsolescencePct: 0 };
  }
  if (key === "weights") return Object.assign({}, t.weights);
  return null;
}

function valStepDefaults(input, key) {
  const vals = valStepValues(input, key);
  if (!vals) return {};
  const g = VAL_STEP_GROUP[key];
  return { [g]: Object.assign({}, input[g], vals) };
}

/* Answered means the figures are actually there — not that the step was
   visited once. A zero is an answer (no obsolescence, no weight on cost); only
   an empty box is not. */
function valStepFilled(input, key) {
  const vals = valStepValues(input, key);
  if (!vals) return false;
  const cur = input[VAL_STEP_GROUP[key]] || {};
  return Object.keys(vals).every((f) => {
    const v = cur[f];
    return v !== null && v !== undefined && v !== "" && !isNaN(+v);
  });
}

/* ---------- Small UI atoms (brand-consistent) ---------- */
function NumInput({ value, onChange, placeholder, disabled }) {
  const [draft, setDraft] = useState(null);
  const fmt = (v) => (v === null || v === undefined || v === "" || isNaN(+v)) ? "" : (+v).toLocaleString("en-US", { maximumFractionDigits: 6 });
  return (
    <input
      className="field-input mono"
      type="text" inputMode="decimal"
      placeholder={placeholder}
      disabled={disabled}
      value={draft !== null ? draft : fmt(value)}
      onChange={(e) => {
        const raw = e.target.value;
        if (!/^[-\d.,\s]*$/.test(raw)) return;
        setDraft(raw);
        const parsed = parseFloat(raw.replace(/[,\s]/g, ""));
        onChange(isNaN(parsed) ? 0 : parsed);
      }}
      onFocus={() => setDraft(fmt(value))}
      onBlur={() => setDraft(null)}
    />
  );
}

function Field({ label, suffix, hint, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span>{label}</span>
        {suffix && <span style={{ color: "var(--fg-4)", fontSize: 10 }}>{suffix}</span>}
      </div>
      {children}
      {hint && <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 3, lineHeight: 1.45 }}>{hint}</div>}
    </label>
  );
}

function Row({ cols = 2, children }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginTop: 12 }}>{children}</div>;
}

/* Section header bands — same treatment as the modeling page's sidebar, so a
   user moving between the two platforms reads them the same way: tinted band,
   gold accent when open, numbered badge and a full-size title. */
const BAND_STYLE = {
  width: "100%", boxSizing: "border-box",
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 24px", background: "var(--bg-2)", border: "none",
  textAlign: "start", fontFamily: "inherit",
};

function BandLabel({ n, title, open = true }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, lineHeight: 1,
        padding: "4px 6px", borderRadius: 3, flexShrink: 0,
        background: open ? "var(--ad-navy-800)" : "var(--bg-3)",
        color: open ? "#FFFFFF" : "var(--fg-3)",
      }}>{String(n).padStart(2, "0")}</span>
      <span style={{
        fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{title}</span>
    </span>
  );
}

/* `sec` names the step this section answers, so the guide can walk the panel
   to it. data-open lets it check before clicking — the income, cost and
   weighting sections all start collapsed, and clicking one already open would
   shut the thing it came to reveal. */
function Section({ n, title, sub, children, defaultOpen = true, sec }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-sec={sec || undefined} data-open={open ? "1" : "0"}
         style={{ borderTop: "1px solid var(--border-strong)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          ...BAND_STYLE, cursor: "pointer",
          borderInlineStart: `3px solid ${open ? "var(--ad-gold-500)" : "transparent"}`,
          transition: "border-color var(--t-fast) var(--ease-out)",
        }}
      >
        <BandLabel n={n} title={title} open={open} />
        <span style={{
          fontSize: 12, color: "var(--fg-3)", flexShrink: 0,
          transition: "transform 200ms var(--ease-out)",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        }}>▾</span>
      </button>
      {open && (
        /* Breathing room under the band, and the explainer leads the content */
        <div style={{ padding: "18px 24px 24px" }}>
          {sub && <div style={{ fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.55, marginBottom: 14 }}>{sub}</div>}
          {children}
        </div>
      )}
    </div>
  );
}

function PctInput({ value, onChange }) {
  return <NumInput value={value === null || value === undefined ? "" : +((+value) * 100).toFixed(4)} onChange={(v) => onChange(v / 100)} />;
}

/* ---------- App ---------- */
/* Collapse control. The chevron points the way the panel travels, which is
   toward the inline-start edge — LEFT in English, RIGHT in Arabic — so the
   glyph is mirrored under RTL by .sideToggle in tokens.css. */
function SideToggle({ open, onToggle, floating }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="sideToggle"
      title={open ? "Collapse the panel" : "Expand the panel"}
      aria-label={open ? "Collapse the panel" : "Expand the panel"}
      aria-expanded={open ? "true" : "false"}
      style={{
        width: 26, height: 26, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border-1)", background: "var(--bg-1)",
        color: "var(--fg-2)", cursor: "pointer", borderRadius: 2, padding: 0,
        /* Floating over the fields, it needs to lift off the page. */
        ...(floating ? { boxShadow: "0 2px 10px -2px rgba(10,26,54,0.35)" } : null),
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
           style={{ transform: open ? "none" : "rotate(180deg)" }} aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  );
}

function ValApp() {
  // Whether the panel has been scrolled far enough that its header — and with
  // it the collapse control — has left the view.
  const [scrolledDeep, setScrolledDeep] = useState(false);
  /* Always open on arrival; collapsing lasts for this visit only. Remembering
     it across visits meant landing on a 46px rail with the inputs hidden
     before the user had asked for that. See the note in app.jsx. */
  const [sideOpen, setSideOpen] = useState(true);
  const [input, setInput] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s); } catch (e) {}
    return defaultInput();
  });
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState([]);
  const [saveState, setSaveState] = useState("");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(input)); } catch (e) {}
  }, [input]);

  useEffect(() => {
    reapAuth.getUser().then((u) => { setUser(u); if (u) loadSavedList(u); });
  }, []);

  const result = useMemo(() => V.runValuation(input), [input]);
  const sens = useMemo(() => V.sensitivity(input), [input]);

  /* Editing anything under income, cost or weights passes that step — the walk
     asks that the driver be looked at, not that a particular button be used to
     look at it. The first path segment is the step, which is why the input is
     shaped in those groups. Marking only ever adds. */
  const upd = (path, value) => {
    setInput((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let o = next;
      for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
      o[keys[keys.length - 1]] = value;
      const step = keys[0];
      if ((step === "income" || step === "cost" || step === "weights") && !(next.stepsDone || {})[step]) {
        next.stepsDone = Object.assign({}, next.stepsDone, { [step]: true });
      }
      return next;
    });
  };

  const markValStep = (key) => setInput((prev) => (
    (prev.stepsDone || {})[key] ? prev
      : Object.assign({}, prev, { stepsDone: Object.assign({}, prev.stepsDone, { [key]: true }) })
  ));
  const applyValDefaults = (key) => setInput((prev) => Object.assign({}, prev,
    valStepDefaults(prev, key),
    { stepsDone: Object.assign({}, prev.stepsDone, { [key]: true }) }));

  /* ---------- Walk the panel to the step ----------
     Same behaviour as the modeling platform: once per step change, never on
     scroll, so the panel stays where the user puts it in between. Income,
     cost and weighting all start collapsed here, which makes the expand step
     matter more than it does on the other platform. */
  const currentValStep = (() => {
    const g = valGuide(input);
    /* The walk engages whenever the guide is the thing on screen, which is the
       same condition the main panel renders it on — including the case where a
       finished valuation lost one of its figures and the guide came back. */
    if (input.showResults && g.allDone) return null;
    const s = g.steps.find((x) => !x.done);
    return s ? s.key : null;
  })();
  /* One implementation, two callers: the automatic walk to the current step,
     and a click on any step title in the guide. Returns the pending timeout so
     an effect can cancel it if the step changes underneath. */
  const walkToValSection = (key) => {
    if (!key) return null;
    const target = document.querySelector(`[data-sec="${key}"]`);
    if (!target) return null;
    const scroller = target.closest("aside");
    if (!scroller) return null;
    if (target.getAttribute("data-open") === "0") {
      const header = target.querySelector("button");
      if (header) header.click();
    }
    return window.setTimeout(() => {
      const top = scroller.scrollTop
        + (target.getBoundingClientRect().top - scroller.getBoundingClientRect().top);
      scroller.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
    }, 140);
  };

  useEffect(() => {
    if (!currentValStep || !sideOpen) return;
    const id = walkToValSection(currentValStep);
    return () => { if (id) window.clearTimeout(id); };
  }, [currentValStep, sideOpen]);

  /* Clicking a step title asks for that section by name — any step, finished
     or not, so the guide reads as a table of contents rather than a one-way
     march. A collapsed panel holds no sections in the DOM at all, so a click
     opens it first and defers the lookup a frame, or there would be nothing
     to scroll to. Same event the modeling platform uses. */
  useEffect(() => {
    const onWalk = (e) => {
      const key = e && e.detail;
      if (!key) return;
      if (!sideOpen) setSideOpen(true);
      window.setTimeout(() => walkToValSection(key), 0);
    };
    window.addEventListener("feas:walkTo", onWalk);
    return () => window.removeEventListener("feas:walkTo", onWalk);
  });

  const changeType = (type) => {
    setInput((prev) => {
      const fresh = defaultInput(type);
      // keep what the user already typed about the property itself
      fresh.name = prev.name;
      fresh.property.city = prev.property.city;
      fresh.property.district = prev.property.district;
      fresh.property.landArea = prev.property.landArea;
      fresh.property.builtArea = prev.property.builtArea;
      fresh.property.age = prev.property.age;
      fresh.property.condition = prev.property.condition;
      fresh.sales = prev.sales;
      return fresh;
    });
  };

  async function loadSavedList(u) {
    const { data } = await sb.from("valuations").select("id,name,updated_at").order("updated_at", { ascending: false }).limit(10);
    setSaved(data || []);
  }
  /* Printing is how a valuation leaves the session, so it takes the same
     account gate the modeling report does. A signed-in user never sees the
     prompt — the gate resolves true and the dialog opens as before. */
  async function printReport() {
    if (window.reapGate) {
      const ok = await window.reapGate.requireAccount({
        title: I18N.t("Sign in to print your valuation"),
        body: I18N.t("Printing produces a document that leaves this session, so it needs an account behind it. Your inputs are kept while you sign in, and you are brought straight back here."),
      });
      if (!ok) return;
    }
    window.print();
  }

  async function saveToCloud() {
    if (!user) return;
    setSaveState("saving");
    const payload = { user_id: user.id, name: input.name || "Untitled valuation", inputs: input, results: { finalValue: result.reconciliation.finalValue, low: result.reconciliation.low, high: result.reconciliation.high }, updated_at: new Date().toISOString() };
    const { error } = await sb.from("valuations").insert(payload);
    setSaveState(error ? "error" : "saved");
    if (!error) loadSavedList(user);
    setTimeout(() => setSaveState(""), 2500);
  }
  async function loadSavedItem(id) {
    const { data } = await sb.from("valuations").select("inputs").eq("id", id).single();
    if (data && data.inputs) setInput(data.inputs);
  }

  const typeDef = V.PROPERTY_TYPES[input.property.type];
  const isLand = !!typeDef.landOnly;
  const guide = valGuide(input);
  const r = result.reconciliation;

  return (
    <div style={{
      display: "grid",
      /* Not transitioned — animating this track held the old width and the
         panel never actually shrank. See the note in app.jsx. */
      gridTemplateColumns: sideOpen ? "minmax(380px, 460px) 1fr" : "46px 1fr",
      gridTemplateRows: "auto 1fr auto",
      gridTemplateAreas: `"header header" "side main" "footer footer"`,
      height: "100vh", background: "var(--bg-2)", fontFamily: "var(--font-body)",
    }}>
      {/* ===== HEADER ===== */}
      <header style={{
        gridArea: "header", display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center",
        padding: "14px 28px", background: "var(--ad-navy-900)", color: "white",
        borderBottom: "1px solid var(--ad-navy-700)", gap: 24,
      }}>
        <BrandMark platform="Valuation" />
        <div style={{ paddingInlineStart: 40, minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", display: "flex", gap: 12 }}>
            <span>{input.property.city || "—"}</span><span style={{ opacity: 0.4 }}>·</span><span>{typeDef.label}</span>
          </div>
          <div className="editable-name-wrap on-dark" style={{ marginTop: 2 }} title="Click to rename">
            <input
              className="editable-name on-dark"
              value={input.name}
              onChange={(e) => upd("name", e.target.value)}
              style={{ fontSize: 15, fontWeight: 500, color: "white", fontFamily: "var(--font-body)", flex: 1, padding: "1px 2px" }}
            />
            <svg className="pencil" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "flex-end" }}>
          <div style={{ textAlign: "end" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Market value</div>
            <div className="tabnum" style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, marginTop: 2, color: "#c9d8f0" }}>
              {r.finalValue > 0 ? fc(r.finalValue) : "—"}
            </div>
          </div>
          <span style={{ height: 28, width: 1, background: "rgba(255,255,255,0.14)" }} />
          <div style={{ textAlign: "end" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Range</div>
            <div className="tabnum" style={{ fontSize: 12, marginTop: 4, color: "rgba(255,255,255,0.8)" }}>
              {r.finalValue > 0 ? <span style={ISO}>{fc(r.low)} – {fc(r.high)}</span> : "—"}
            </div>
          </div>
          <span style={{ height: 28, width: 1, background: "rgba(255,255,255,0.14)" }} />
          <LangToggle />
          <UserMenu
            table="valuations"
            itemNoun="valuation"
            currentName={input.name}
            getCurrent={() => input}
            onLoad={(inputs) => setInput(inputs)}
          />
        </div>
      </header>

      {/* ===== SIDEBAR (wizard) ===== */}
      {!sideOpen && (
        /* Collapsed: a rail carrying the toggle and a vertical label. The
           fields are unmounted, not hidden — a 46px column cannot usefully
           hold half-rendered inputs. */
        <aside style={{
          gridArea: "side", borderInlineEnd: "1px solid var(--border-1)",
          background: "var(--bg-1)", overflow: "hidden", minWidth: 0,
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 14, gap: 14,
        }}>
          <SideToggle open={false} onToggle={() => setSideOpen(true)} />
          <span style={{
            writingMode: "vertical-rl", transform: "rotate(180deg)",
            fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--fg-3)", fontWeight: 600, whiteSpace: "nowrap",
          }}>Inputs</span>
        </aside>
      )}
      {sideOpen && (
      <aside
        onScroll={e => {
          const deep = e.currentTarget.scrollTop > 120;
          if (deep !== scrolledDeep) setScrolledDeep(deep);
        }}
        style={{ gridArea: "side", borderInlineEnd: "1px solid var(--border-1)", background: "var(--bg-1)", overflowY: "auto", minWidth: 0 }}
      >
        {/* Once the header has scrolled away the collapse control follows the
            reader down, so collapsing from deep in the inputs does not mean
            scrolling all the way back up to reach one button. Zero-height and
            sticky, so it costs no layout; flex-end is the panel's inner edge in
            both directions; and it only appears after 120px so that at rest it
            cannot cover the Reset button beside it. */}
        {scrolledDeep && (
          <div style={{
            position: "sticky", top: 0, zIndex: 5, height: 0,
            display: "flex", justifyContent: "flex-end", pointerEvents: "none",
          }}>
            <div style={{ padding: "10px 12px", pointerEvents: "auto" }}>
              <SideToggle open={true} onToggle={() => setSideOpen(false)} floating />
            </div>
          </div>
        )}
        {/* Section 01 isn't collapsible, but wears the same band as 02+ */}
        <div style={{ ...BAND_STYLE, borderInlineStart: "3px solid var(--ad-gold-500)" }}>
          <BandLabel n="01" title="Property" />
          <button
            type="button"
            onClick={() => { if (confirm(I18N.t("Start a fresh valuation?"))) setInput(defaultInput(input.property.type)); }}
            style={{
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              background: "none", border: "1px solid var(--border-1)", cursor: "pointer",
              color: "var(--fg-3)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "4px 9px", fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>↺</span>
            Reset
          </button>
          <SideToggle open={true} onToggle={() => setSideOpen(false)} />
        </div>
        {/* Step 01 is not a <Section> — it has no collapsing band — so it
            carries the anchor itself and is always open. */}
        <div data-sec="property" data-open="1" style={{ padding: "18px 24px 14px" }}>
          <div style={{ fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.55 }}>
            Tell us what you're valuing. Everything else pre-fills with realistic market defaults you can refine later.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 14 }}>
            {Object.entries(V.PROPERTY_TYPES).map(([key, t]) => (
              <button key={key} onClick={() => changeType(key)} style={{
                padding: "10px 4px", cursor: "pointer", textAlign: "center",
                border: input.property.type === key ? "1px solid var(--ad-navy-800)" : "1px solid var(--border-1)",
                background: input.property.type === key ? "var(--ad-navy-50)" : "var(--bg-1)",
              }}>
                <div style={{ fontSize: 15, color: "var(--ad-navy-700)" }}>{t.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3 }}>{t.label}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 6 }}>{typeDef.blurb}</div>
          <Row cols={2}>
            <Field label="City"><input className="field-input" value={input.property.city} placeholder="e.g. Riyadh" onChange={(e) => upd("property.city", e.target.value)} /></Field>
            <Field label="District"><input className="field-input" value={input.property.district} placeholder="e.g. Al Malqa" onChange={(e) => upd("property.district", e.target.value)} /></Field>
          </Row>
          <Row cols={2}>
            {!isLand && <Field label="Built-up area" suffix="m²" hint="Total covered floor area of the building (GFA).">
              <NumInput value={input.property.builtArea} onChange={(v) => upd("property.builtArea", v)} /></Field>}
            <Field label="Land area" suffix="m²" hint={isLand ? "Plot size being valued." : "Plot size (villas / commercial). Apartments: leave 0."}>
              <NumInput value={input.property.landArea} onChange={(v) => upd("property.landArea", v)} /></Field>
            {isLand && <div />}
          </Row>
          {!isLand && (
            <Row cols={2}>
              <Field label="Building age" suffix="years"><NumInput value={input.property.age} onChange={(v) => upd("property.age", v)} /></Field>
              <Field label="Condition" hint="Affects how much value the building has lost with age.">
                <select className="field-input" value={input.property.condition} onChange={(e) => upd("property.condition", e.target.value)}>
                  {Object.entries(V.CONDITIONS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                </select>
              </Field>
            </Row>
          )}
        </div>

        {/* --- Comparables --- */}
        <Section n="02" sec="comps" title="Comparable sales" sub="The market approach — what did similar properties actually sell for?">
          <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5, marginBottom: 6 }}>
            Find 3–5 recent sales of similar properties (ask agents, or check Ministry of Justice / Aqar transaction records).
            Then adjust each one: <em>“compared to my property, was that one better or worse?”</em> Better comp → negative %, worse comp → positive %.
          </div>
          {input.sales.comps.map((c, i) => (
            <div key={i} style={{ border: "1px solid var(--border-1)", padding: 12, marginTop: 10, background: "var(--bg-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: "var(--fg-3)" }}>Comparable {i + 1}</span>
                {input.sales.comps.length > 1 && (
                  <button onClick={() => upd("sales.comps", input.sales.comps.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)" }}>×</button>
                )}
              </div>
              <Row cols={3}>
                <Field label="Sale price" suffix="SAR"><NumInput value={c.price} onChange={(v) => upd(`sales.comps.${i}.price`, v)} /></Field>
                {/* Named for what it must actually be, not just "Area".

                    The approach divides the comparable's price by THIS number
                    to get a price per m², then multiplies that by the
                    subject's own area — built-up area for a building, plot
                    area for bare land. So the two have to be measured the same
                    way; a plot size entered against a flat's built-up area
                    silently values the property on the wrong basis and nothing
                    on screen would say so.

                    The label follows the property type for the same reason,
                    and matches the wording used for the subject in step 01. */}
                <Field
                  label={isLand ? "Comparable land area" : "Comparable built-up area"}
                  suffix="m²"
                  hint={isLand
                    ? "Plot size of the comparable — the same basis as the subject."
                    : "Covered floor area (GFA) of the comparable — the same basis as the subject."}
                >
                  <NumInput value={c.area} onChange={(v) => upd(`sales.comps.${i}.area`, v)} />
                </Field>
                <Field label="Sold" suffix="months ago"><NumInput value={c.monthsAgo} onChange={(v) => upd(`sales.comps.${i}.monthsAgo`, v)} /></Field>
              </Row>
              <Row cols={3}>
                <Field label="Location adj." suffix="%" hint="Comp in a better spot? use −5. Worse? +5."><PctInput value={c.locationAdj} onChange={(v) => upd(`sales.comps.${i}.locationAdj`, v)} /></Field>
                <Field label="Condition adj." suffix="%"><PctInput value={c.conditionAdj} onChange={(v) => upd(`sales.comps.${i}.conditionAdj`, v)} /></Field>
                <Field label="Other adj." suffix="%" hint="Size, view, street width…"><PctInput value={c.otherAdj} onChange={(v) => upd(`sales.comps.${i}.otherAdj`, v)} /></Field>
              </Row>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            {input.sales.comps.length < 6 && (
              <button className="btn" onClick={() => upd("sales.comps", [...input.sales.comps, blankComp()])}>+ Add comparable</button>
            )}
            <div style={{ flex: 1 }} />
          </div>
          <Row cols={2}>
            <Field label="Market trend" suffix="% / yr" hint="How fast prices are rising in this area. Older sales get uplifted by this rate.">
              <PctInput value={input.sales.marketTrendPctYr} onChange={(v) => upd("sales.marketTrendPctYr", v)} /></Field>
          </Row>
        </Section>

        {/* --- Income --- */}
        {!isLand && (
          <Section n="03" sec="income" title="Rental income" sub="The income approach — what is the property worth as an investment?" defaultOpen={false}>
            <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5, marginBottom: 6 }}>
              {/* One plain string, no interpolation. Splicing the property type
                  into the sentence produced a key no dictionary could hold, so
                  the whole line stayed in English on an Arabic page — and it
                  read "typical for a apartments" into the bargain. The type is
                  named in the section heading directly above. */}
              Even if you won't rent it out, this shows what an investor would pay. The defaults are typical for this property type — adjust them to your market knowledge.
            </div>
            <Row cols={2}>
              <Field label="Rent basis">
                <select className="field-input" value={input.income.rentBasis} onChange={(e) => upd("income.rentBasis", e.target.value)}>
                  <option value="perSqm">SAR per m² per year</option>
                  <option value="total">Total SAR per year</option>
                </select>
              </Field>
              {input.income.rentBasis === "perSqm" ? (
                <Field label="Market rent" suffix="SAR/m²·yr"><NumInput value={input.income.rentPerSqmYr} onChange={(v) => upd("income.rentPerSqmYr", v)} /></Field>
              ) : (
                <Field label="Annual rent" suffix="SAR/yr"><NumInput value={input.income.annualRent} onChange={(v) => upd("income.annualRent", v)} /></Field>
              )}
            </Row>
            <Row cols={3}>
              <Field label="Vacancy" suffix="%" hint="Share of time the property sits empty."><PctInput value={input.income.vacancyPct} onChange={(v) => upd("income.vacancyPct", v)} /></Field>
              <Field label="Operating costs" suffix="%" hint="Maintenance, management, utilities — as % of collected rent."><PctInput value={input.income.opexPct} onChange={(v) => upd("income.opexPct", v)} /></Field>
              <Field label="Cap rate" suffix="%" hint="The yield investors demand. Higher risk → higher rate → lower value."><PctInput value={input.income.capRate} onChange={(v) => upd("income.capRate", v)} /></Field>
            </Row>
          </Section>
        )}

        {/* --- Cost --- */}
        {!isLand && (
          <Section n="04" sec="cost" title="Rebuild cost" sub="The cost approach — land plus what it would cost to rebuild, minus wear." defaultOpen={false}>
            <Row cols={2}>
              {typeDef.usesLand ? (
                <Field label="Land price" suffix="SAR/m²"
                  hint={(+input.property.landArea > 0)
                    ? "What similar empty plots sell for in this district."
                    : "Set the land area in step 01 — land value = plot size × this price."}>
                  <NumInput value={input.cost.landPricePerSqm} onChange={(v) => upd("cost.landPricePerSqm", v)} /></Field>
              ) : (
                <Field label="Land share" hint="Apartments don't own a plot — a land share (~15% of building value) is included automatically.">
                  <input className="field-input" value="~15%" disabled /></Field>
              )}
              {/* A hint is a prop, so it cannot be split into elements the way
                  a sentence can — the prose half is translated by hand and the
                  rate appended, rather than building one interpolated string
                  the dictionary can never match. */}
              <Field label="Build cost" suffix="SAR/m²"
                     hint={`${window.I18N ? I18N.t("Typical for this property type") : "Typical for this property type"}: ~${fn(typeDef.defaults.buildCostPerSqm)}`}>
                <NumInput value={input.cost.buildCostPerSqm} onChange={(v) => upd("cost.buildCostPerSqm", v)} /></Field>
            </Row>
            <Row cols={2}>
              <Field label="Economic life" suffix="years" hint="How long this type of building stays useful (usually 45–60).">
                <NumInput value={input.cost.economicLifeYrs} onChange={(v) => upd("cost.economicLifeYrs", v)} /></Field>
              <Field label="Obsolescence" suffix="%" hint="Extra value loss from outdated design or a declining area. Usually 0.">
                <PctInput value={input.cost.obsolescencePct} onChange={(v) => upd("cost.obsolescencePct", v)} /></Field>
            </Row>
          </Section>
        )}

        {/* --- Weights --- */}
        {/* On land the section states the weighting instead of asking for it.
            There is one method available, so the only valid answer is 100% —
            an editable field there would invite a number that cannot be right
            and would have to be corrected back. */}
        {isLand ? (
          <Section n="03" title="Final weighting" sub="How much each approach counts toward the final value." defaultOpen={false}>
            <div style={{ fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.6 }}>
              Land carries no building to rent out or rebuild, so comparable sales is the only
              approach available — it takes the full weight.
            </div>
            <div style={{
              marginTop: 10, padding: "10px 12px", background: "var(--bg-2)",
              border: "1px solid var(--border-1)", display: "flex",
              alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 12, color: "var(--fg-1)", fontWeight: 600 }}>Comparable sales</span>
              <span className="tabnum" style={{ fontSize: 13, fontWeight: 700, color: "var(--ad-navy-700)" }}>100%</span>
            </div>
          </Section>
        ) : (
        <Section n="05" sec="weights" title="Final weighting" sub="How much each approach counts toward the final value." defaultOpen={false}>
          <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5, marginBottom: 8 }}>
            {/* Three plain string children rather than one interpolated line.
                Each is a key the dictionary can hold, and the middle one is a
                conditional between two literals — also translatable — so the
                sentence survives in Arabic instead of falling back to English
                wholesale. */}
            <span>We pre-weight by property type following professional practice — this type leans on </span>
            <span>{typeDef.weights.sales >= 0.5 ? "comparable sales" : "rental income"}</span>
            <span>. Adjust if you trust one approach more.</span>
          </div>
          <Row cols={3}>
            <Field label="Sales comp." suffix="%"><PctInput value={input.weights.sales} onChange={(v) => upd("weights.sales", v)} /></Field>
            <Field label="Income" suffix="%"><PctInput value={input.weights.income} onChange={(v) => upd("weights.income", v)} /></Field>
            <Field label="Cost" suffix="%"><PctInput value={input.weights.cost} onChange={(v) => upd("weights.cost", v)} /></Field>
          </Row>
        </Section>
        )}

        {/* --- Save / account --- */}
        <div style={{ borderTop: "1px solid var(--border-1)", padding: "18px 24px 28px" }}>
          {user ? (
            <>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" onClick={saveToCloud} disabled={saveState === "saving"}>
                  {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save to my account"}
                </button>
                <button className="btn" onClick={() => { if (confirm(I18N.t("Start a fresh valuation?"))) setInput(defaultInput(input.property.type)); }}>New</button>
                <button className="btn no-print" onClick={printReport}>Print</button>
              </div>
              {saveState === "error" && <div style={{ fontSize: 11, color: "var(--ad-danger)", marginTop: 8 }}>Could not save — please try again.</div>}
              {saved.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600 }}>My saved valuations</div>
                  {saved.map((s) => (
                    <button key={s.id} onClick={() => loadSavedItem(s.id)} style={{
                      display: "block", width: "100%", textAlign: "start", padding: "8px 10px", marginTop: 6,
                      border: "1px solid var(--border-1)", background: "var(--bg-2)", cursor: "pointer", fontSize: 12,
                    }}>
                      <span style={{ fontWeight: 500 }}>{s.name}</span>
                      <span style={{ color: "var(--fg-4)", fontSize: 10, float: "right" }}>{new Date(s.updated_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5 }}>
              You're exploring as a guest — nothing is saved.{" "}
              <a href="index.html" style={{ color: "var(--ad-navy-700)", fontWeight: 600 }}>Create a free account</a> to save valuations.
              <div style={{ marginTop: 10 }}><button className="btn no-print" onClick={printReport}>Print report</button></div>
            </div>
          )}
        </div>
      </aside>
      )}

      {/* ===== MAIN (results) ===== */}
      <main style={{ gridArea: "main", overflowY: "auto", background: "var(--bg-2)" }}>
        {/* Opening the result is a decision the user makes once; KEEPING it
            open depends on the walk still being complete. Emptying a field
            afterwards reopens the guide on the step that lost its answer,
            rather than leaving a valuation on screen that is quietly being
            computed from a blank. */}
        {input.showResults && guide.allDone
          ? <ValResults result={result} sens={sens} input={input} />
          : <ValBuildGuide guide={guide} onUseDefaults={applyValDefaults}
                           onShowResults={() => setInput((p) => Object.assign({}, p, { showResults: true }))} />}
      </main>

      <ValFooter />
    </div>
  );
}

/* ---------- The guided build, before any figure is shown ----------
   Same shape as the modeling platform's, and deliberately so: a valuer moving
   between the two should not have to learn a second way of being walked
   through a model. */
function ValBuildGuide({ guide, onUseDefaults, onShowResults }) {
  const { steps, doneCount, total, currentIdx, allDone } = guide;
  return (
    <div style={{ padding: "56px 48px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
                    fontWeight: 500, color: "var(--fg-3)" }}>
        {doneCount ? "Building your valuation" : "Getting started"}
      </div>
      <h2 style={{ fontSize: 32, fontFamily: "var(--font-display)", fontWeight: 600,
                   letterSpacing: "-0.02em", color: "var(--fg-1)", marginTop: 8 }}>
        {doneCount ? "Keep going — the value opens when the walk is done."
                   : "Start with the property, then the evidence."}
      </h2>
      <p style={{ fontSize: 15, color: "var(--fg-2)", marginTop: 12, maxWidth: 640, lineHeight: 1.55 }}>
        Each step below moves the final figure. Set it in the panel, or take the market-typical
        default and move on — either way you will have seen it. Nothing is valued until the last
        step is answered.
      </p>

      <div style={{ marginTop: 32, padding: "22px 26px 8px",
                    border: "1px solid var(--border-1)", background: "var(--bg-1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
                        fontWeight: 500, color: "var(--fg-3)" }}>How to build your valuation</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 84, height: 4, background: "var(--bg-3)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${(doneCount / total) * 100}%`, height: "100%",
                            background: "var(--ad-success)", borderRadius: 999,
                            transition: "width 420ms var(--ease-out)" }} />
            </div>
            <span className="tabnum" style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>
              {doneCount}/{total}
            </span>
          </div>
        </div>
        {steps.map((s, i) => (
          <ValStepRow key={s.key} n={i + 1} index={i} last={i === steps.length - 1}
                      current={i === currentIdx} stepKey={s.key} title={s.title} body={s.body} done={s.done}
                      onUseDefaults={s.cta && i === currentIdx ? () => onUseDefaults(s.key) : null} />
        ))}
      </div>

      <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={onShowResults} disabled={!allDone}
                style={{ padding: "12px 26px", fontSize: 12.5, opacity: allDone ? 1 : 0.45,
                         cursor: allDone ? "pointer" : "not-allowed" }}>
          Show the result
        </button>
        <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
          {allDone ? <span>Every step is answered — open the valuation.</span>
            : <>
                <span className="tabnum" style={{ fontWeight: 600, color: "var(--fg-2)" }}>{total - doneCount}</span>
                {" "}<span>still to answer</span>
              </>}
        </span>
      </div>
    </div>
  );
}

function ValStepRow({ n, stepKey, title, body, done, index, last, current, onUseDefaults }) {
  const DOT = 26;
  return (
    <div className={`reap-step${current ? " is-current" : ""}`}
         style={{ display: "flex", gap: 14, position: "relative",
                  paddingBottom: last ? 16 : 20, animationDelay: `${index * 70}ms` }}>
      {!last && (
        <span style={{ position: "absolute", insetInlineStart: (DOT - 2) / 2, top: DOT + 2, bottom: 0,
                       width: 2, background: "var(--border-1)" }}>
          {done && <span className="reap-line-fill" style={{ position: "absolute", inset: 0, background: "var(--ad-success)" }} />}
        </span>
      )}
      <span className="reap-dot" style={{
        flexShrink: 0, width: DOT, height: DOT, borderRadius: "50%",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, zIndex: 1,
        background: done ? "var(--ad-success)" : current ? "var(--ad-gold-500)" : "var(--bg-1)",
        color: done || current ? "#FFFFFF" : "var(--fg-3)",
        border: done || current ? "none" : "1px solid var(--border-strong)",
      }}>{done ? "✓" : n}</span>
      <div style={{ minWidth: 0, paddingTop: 3 }}>
        {/* The title is the way back into the panel — an answer given early is
            the one most worth re-reading, so finished steps stay reachable. */}
        <div style={{ marginBottom: 3 }}>
          <button
            type="button"
            className="reap-step-title"
            title="Open this section in the assumptions panel"
            onClick={() => window.dispatchEvent(new CustomEvent("feas:walkTo", { detail: stepKey }))}
            style={{ fontSize: 13.5, fontWeight: 600,
                     color: done ? "var(--fg-3)" : "var(--fg-1)" }}>{title}</button>
        </div>
        <div className="reap-body" style={{ fontSize: 12, lineHeight: 1.55,
                                            color: done ? "var(--fg-4)" : "var(--fg-2)" }}>{body}</div>
        {onUseDefaults && (
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={onUseDefaults} style={{ padding: "6px 12px", fontSize: 11 }}>
              Use default inputs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Results panel ---------- */
function ValResults({ result, sens, input }) {
  const r = result.reconciliation;
  const s = result.sales;
  const inc = result.income;
  const cost = result.cost;
  const hasValue = r.finalValue > 0;
  const typeDef = result.property.typeDef;

  return (
    <div style={{ padding: 32 }}>
      {/* Print-only report header */}
      <div className="print-only" style={{ marginBottom: 26, borderBottom: "3px solid var(--ad-navy-900)", paddingBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AscentMark size={24} color="var(--ad-navy-900)" />
              <span style={{ fontFamily: "'Ador Hairline', system-ui, sans-serif", fontSize: 26, fontWeight: 500, letterSpacing: "0.16em", color: "var(--ad-navy-900)" }}>REAP</span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fg-3)", marginTop: 4 }}>Real Estate Valuation Report</div>
          </div>
          <div style={{ textAlign: "end", fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--fg-1)" }}>{input.name}</div>
            <div>{typeDef.label}{input.property.city ? ` · ${input.property.city}` : ""}{input.property.district ? ` · ${input.property.district}` : ""}</div>
            <div>{new Date().toLocaleDateString(
              (window.I18N && I18N.lang === "ar") ? "ar-SA-u-nu-latn" : "en-GB",
              { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
        </div>
      </div>

      <div className="ad-eyebrow">Valuation summary · {typeDef.label}{input.property.city ? ` · ${input.property.city}` : ""}</div>
      <h2 style={{ fontSize: 28, marginTop: 6, marginBottom: 20, fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "-0.02em" }}>
        {hasValue ? "Indicated market value" : "Add your first comparable sale to see a value."}
      </h2>

      {/* Headline */}
      <div className="val-kpis" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ padding: "22px 24px", background: "var(--ad-navy-900)", color: "white" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>Final market value</div>
          <div className="tabnum" style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 8, color: "#E8D9B8" }}>
            {hasValue ? fc(r.finalValue) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 6 }}>
            {hasValue ? <>{"Likely range "}<span style={ISO}>{fc(r.low)} – {fc(r.high)} (±{(r.rangePct * 100).toFixed(0)}%)</span></> : "Waiting for inputs"}
          </div>
        </div>
        <KPI eyebrow={`Value per m² (${result.property.typeDef.landOnly ? "land" : "built"})`} value={hasValue ? `${fn(r.perSqm)} ${curSym()}` : "—"} sub={`${fn(r.areaBasis)} ${I18N.t("m² basis")}`} />
        <KPI eyebrow="Approaches used" value={r.entries.filter((e) => e.value > 0).length} sub={r.divergence > 0 ? `${(r.divergence * 100).toFixed(0)}% divergence` : "—"} />
      </div>

      {/* Build-ups for all three approaches, read side by side under one heading */}
      <Panel n="01" title="The three approaches in detail"
        sub="The workings behind each indicated value — the same three columns a valuer would set out.">
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${1 + (inc ? 1 : 0) + (cost ? 1 : 0)}, minmax(0, 1fr))`,
          gap: 26,
        }}>
          {/* Sales comparison — one row per comp, then the median × area */}
          <div>
            <ApproachHead title="Sales comparison" />
            {s.compCount === 0 ? (
              <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.6, paddingTop: 8 }}>
                No comparables entered yet — add them in the sidebar (step 02).
              </div>
            ) : (
              <>
                {s.comps.map((c, i) => (
                  <LedgerRow
                    key={i}
                    label={`Comparable ${i + 1}`}
                    note={`${fn(c.price)} / ${fn(c.area)} ${sqm()} · ${fp(c.totalAdjPct)}`}
                    value={fn(c.adjustedPpsqm)}
                    tone={Math.abs(c.totalAdjPct) > 0.25 ? "var(--ad-warning)" : undefined}
                  />
                ))}
                <LedgerRow label="Median adjusted" value={`${fn(s.medianPpsqm)} ${curSym()}/${sqm()}`} strong />
                <LedgerRow label={`× ${fn(s.subjectArea)} ${sqm()}`} value={fc(s.indicatedValue)} final />
              </>
            )}
          </div>

          {inc && (
            <div>
              <ApproachHead title="Income capitalisation" />
              <LedgerRow label="Potential gross rent" value={fc(inc.pgi)} />
              <LedgerRow label={`− Vacancy (${fp(inc.vacancy, 0)})`} value={fc(-(inc.pgi - inc.egi))} muted />
              <LedgerRow label={`− Operating costs (${fp(inc.opexPct, 0)})`} value={fc(-inc.opex)} muted />
              <LedgerRow label="Net operating income" value={fc(inc.noi)} strong />
              <LedgerRow label={`÷ Cap rate ${fp(inc.capRate)}`} value={fc(inc.indicatedValue)} final />
            </div>
          )}

          {cost && (
            <div>
              <ApproachHead title="Cost approach" />
              <LedgerRow label="Land value" value={fc(cost.landValue)} />
              <LedgerRow label="Replacement cost (new)" value={fc(cost.replacementCost)} />
              <LedgerRow label={`− Depreciation (${fp(cost.physicalDep, 0)} · eff. age ${cost.effectiveAge.toFixed(0)} yrs)`} value={fc(-(cost.replacementCost - cost.depreciatedCost))} muted />
              <LedgerRow label="Depreciated building value" value={fc(cost.depreciatedCost)} strong />
              <LedgerRow label="Land + building" value={fc(cost.indicatedValue)} final />
            </div>
          )}
        </div>
      </Panel>

      {/* Reconciliation — how the three indicated values are weighted into one */}
      <Panel n="02" title="Weighting the three approaches" sub="Professional valuations triangulate from independent angles — then weight them into one number.">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-2)" }}>
              <th style={th}>Approach</th><th style={th}>In plain words</th>
              <th style={thR}>Indicated value</th><th style={thR}>Weight</th><th style={thR}>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {[
              { key: "sales", label: "Sales comparison", plain: "What similar properties sold for, adjusted to match yours", value: s.indicatedValue },
              inc ? { key: "income", label: "Income capitalisation", plain: "What an investor would pay for the rent it can earn", value: inc.indicatedValue } : null,
              cost ? { key: "cost", label: "Cost approach", plain: "Land value + rebuild cost, minus age & wear", value: cost.indicatedValue } : null,
            ].filter(Boolean).map((row) => {
              const entry = r.entries.find((e) => e.key === row.key) || { normWeight: 0 };
              return (
                <tr key={row.key} style={{ borderBottom: "1px solid var(--border-2)" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{row.label}</td>
                  <td style={{ ...td, color: "var(--fg-3)", fontSize: 12 }}>{row.plain}</td>
                  <td style={tdR}><span className="tabnum">{row.value > 0 ? fc(row.value) : "—"}</span></td>
                  <td style={tdR}><span className="tabnum">{fp(entry.normWeight, 0)}</span></td>
                  <td style={tdR}>
                    <div style={{ display: "inline-block", width: 120, height: 10, background: "var(--bg-3)", border: "1px solid var(--border-1)", verticalAlign: "middle" }}>
                      <div style={{ height: "100%", width: `${entry.normWeight * 100}%`, background: "var(--ad-navy-700)" }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      {/* Sensitivity */}
      {hasValue && (
        <Panel n="03" title="What moves the value" sub="Final value if each key input turns out 10% better or worse.">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border-2)" }}><th style={th}>Driver</th><th style={thR}>Downside</th><th style={thR}>Base</th><th style={thR}>Upside</th></tr></thead>
            <tbody>
              {sens.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-2)" }}>
                  <td style={td}>{row.label}</td>
                  <td style={tdR}><span className="tabnum" style={{ color: "var(--ad-danger)" }}>{fc(row.low)}</span></td>
                  <td style={tdR}><span className="tabnum">{fc(row.base)}</span></td>
                  <td style={tdR}><span className="tabnum" style={{ color: "var(--ad-success)" }}>{fc(row.high)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Quality checks */}
      <Panel n="04" title="Quality checks" sub="Automatic review of your inputs against professional practice.">
        {result.checks.map((c, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, padding: "10px 14px", marginBottom: 8, alignItems: "flex-start",
            background: c.level === "danger" ? "color-mix(in oklab, var(--ad-danger) 7%, var(--bg-1))"
              : c.level === "warning" ? "color-mix(in oklab, var(--ad-warning) 8%, var(--bg-1))"
              : "color-mix(in oklab, var(--ad-success) 7%, var(--bg-1))",
            border: "1px solid var(--border-1)",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
              background: c.level === "danger" ? "var(--ad-danger)" : c.level === "warning" ? "var(--ad-warning)" : "var(--ad-success)",
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 2, lineHeight: 1.5 }}>{c.detail}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 12, lineHeight: 1.5 }}>
          This tool follows the three internationally recognised valuation approaches (IVS), but is an indicative
          estimate — not a substitute for an accredited valuer (Taqeem) report where one is legally required.
        </div>
      </Panel>
    </div>
  );
}

function KPI({ eyebrow, value, sub }) {
  return (
    <div style={{ padding: "18px 20px", border: "1px solid var(--border-1)", background: "var(--bg-1)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div className="ad-eyebrow">{eyebrow}</div>
      <div>
        <div className="tabnum" style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 6 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* Result panels carry the same numbered heading as the modeling page's Fund
   tab, so each block announces itself instead of whispering an eyebrow.
   `n` is optional — the nested build-up panels are detail, not top-level steps. */
function Panel({ n, title, sub, tight, children }) {
  return (
    <div className="val-panel" style={{ border: "1px solid var(--border-1)", background: "var(--bg-1)", padding: tight ? "18px 20px" : "22px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: sub ? 5 : 14 }}>
        {n && (
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, lineHeight: 1,
            padding: "4px 6px", borderRadius: 3, flexShrink: 0,
            background: "var(--ad-navy-800)", color: "#FFFFFF",
          }}>{String(n).padStart(2, "0")}</span>
        )}
        <h3 style={{
          margin: 0, fontSize: tight ? 13 : 14, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--fg-1)",
        }}>{title}</h3>
      </div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.55, marginBottom: 14, maxWidth: 760 }}>{sub}</div>}
      {children}
    </div>
  );
}

/* Column heading inside the grouped approaches panel. */
function ApproachHead({ title }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
      color: "var(--ad-navy-700)", paddingBottom: 8, marginBottom: 2,
      borderBottom: "2px solid var(--ad-navy-800)",
    }}>{title}</div>
  );
}

/* `note` carries the evidence under a label (the sales column uses it for each
   comp's raw price and area); `tone` colours the figure for outliers. */
function LedgerRow({ label, value, note, tone, muted, strong, final }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10,
      padding: "7px 0", fontSize: 12.5,
      borderBottom: final ? "none" : "1px solid var(--border-2)",
      borderTop: final ? "2px solid var(--border-strong)" : "none",
      marginTop: final ? 4 : 0, paddingTop: final ? 10 : 7,
      color: muted ? "var(--fg-3)" : "var(--fg-1)", fontWeight: strong || final ? 600 : 400,
    }}>
      <span style={{ minWidth: 0 }}>
        {label}
        {note && <span style={{ display: "block", fontSize: 10.5, color: "var(--fg-4)", fontWeight: 400, marginTop: 2 }}>{note}</span>}
      </span>
      <span className="tabnum" style={{ flexShrink: 0, color: tone || "inherit" }}>{value}</span>
    </div>
  );
}

const th = { padding: "8px 10px", textAlign: "start", fontWeight: 500, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)" };
const thR = { ...th, textAlign: "end" };
const td = { padding: "9px 10px" };
const tdR = { ...td, textAlign: "end" };

function ValFooter() {
  return (
    <footer className="no-print" style={{
      gridArea: "footer", display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
      padding: "8px 28px", background: "var(--ad-navy-900)", borderTop: "1px solid var(--ad-navy-700)",
      color: "rgba(255,255,255,0.7)", fontSize: 12,
    }}>
      <span>Developed by <a className="byline-link" href="https://mohbaslom.com/" target="_blank" rel="noopener noreferrer">Mohammed Basloom</a></span>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="tel:+966558793201" className="tabnum" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>+966 55 879 3201</a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="mailto:info@reapinsights.com" title="info@reapinsights.com" aria-label="Email" style={{ display: "inline-flex", color: "rgba(255,255,255,0.75)" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.24l-8 5-8-5V6.4l8 5 8-5v1.84z" /></svg>
      </a>
      <a href="https://linkedin.com/in/mohammedbasloom1" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn" style={{ display: "inline-flex", color: "rgba(255,255,255,0.75)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
      </a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="privacy.html" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Privacy Policy</a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="terms.html" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Terms of Use</a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="disclaimer.html" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Disclaimer</a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <span style={{
        fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600,
        color: "var(--ad-gold-400)", border: "1px solid rgba(201,168,97,0.45)",
        borderRadius: 2, padding: "3px 8px", whiteSpace: "nowrap",
      }}>Beta v2.0</span>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <span style={{ color: "rgba(255,255,255,0.5)" }}>© 2026 REAP. All rights reserved.</span>
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ValApp />);
