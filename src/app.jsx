/* =============================================================
   Main app — assembles sidebar, results dashboard, and state.
   ============================================================= */
const { useState, useMemo, useEffect, useRef } = React;

/* ---------- Default deal — land & assumptions only. User picks components. ---------- */
const SAMPLE_INPUT = {
  projectName: (window.I18N && I18N.lang === "ar") ? "دراسة فرصة جديدة" : "New Opportunity Assessment",
  location: "—",
  projectType: "",

  // Land — intentionally blank: the user sets the site first.
  landArea: null, // m²
  landPricePerSqm: null, // SAR
  landTransferFeesPct: 0.05, // 5% transfer / gov
  // Tenure: "own" buys the land; "lease" pays ground rent and no RETT.
  landTenure: "own",
  landRentPerSqmYr: null, // SAR/m²/yr — blank until the user sets a rent
  landRentEscalationYears: 5, // rent review every 5 years
  landRentEscalationPct: 0.05, // stepping up 5% at each review
  landType: "net", // "net" (serviced) | "raw" (needs infrastructure)
  developablePct: 0.70, // raw only: share of gross land the program can build on
  landInfraCostPerSqm: 0, // SAR/m² on gross land — roads, utilities (raw or net)

  /* Timing, loadings and financing all start blank. They used to arrive
     pre-filled, which meant a feasibility could be produced without anyone
     having looked at the schedule or the gearing — the numbers were there, so
     nobody went to check them. They are written by "use default inputs" on
     their step, or typed. Safe to leave empty because the dashboards are
     gated behind the walk: by the time anything is displayed every one of
     these has a value, and the engine coerces a null to zero rather than
     throwing on the way there. */
  // Timing (project-level)
  predesignMonths: null,
  constructionMonths: null,
  preSalesStartMonth: null,
  horizonMonths: null,

  // General costs (project-level %s)
  softCostsPct: null,
  contingencyPct: null,
  marketingPct: null,
  salesCommissionPct: null,
  govFeesPct: null,

  // Financing
  ltc: null,
  interestRate: null,

  // Valuation
  discountRate: null,

  // Fund structure (optional — disabled by default)
  fund: {
    enabled: false,
    lpEquityPct: 0.85,         // Limited Partners / cash investors
    devEquityPct: 0.10,        // Developer co-invest
    gpEquityPct: 0.05,         // GP / fund manager co-invest
    subscriptionFeePct: 0.01,  // % of each equity call — paid to GP on subscription
    assetMgmtFeePctYr: 0.015,  // annual % of unreturned equity — paid to GP
    developmentFeePct: 0.03,   // % of construction + site cost — paid to Developer
    preferredReturnPct: 0.08,  // compounded hurdle IRR before promote kicks in
    promoteSplit: 0.20,        // performance fee — GP's share of profit above pref
  },

  // No components by default — user picks from the program tiles.
  components: []
};

// v5: fresh visitors (and anyone with a pre-v5 saved session) start with an
// empty program — no components selected until the user picks from the tiles.
const STORAGE_KEY = "ad_feas_v5";

/* ---------- The guided build ----------
   The dashboards used to appear the moment one component was picked, which
   meant most of the model was never looked at: the timing, the cost loadings,
   the gearing and the hurdle all carried defaults nobody had seen, and a
   number came out anyway. That is a fine demo and a bad feasibility — the
   figure is only worth what the assumptions behind it are worth.

   So the results are held back until every required step has been passed
   through, and each step is passed either by editing it or by pressing "use
   default inputs" on it. Accepting a default is a decision; inheriting one
   silently is not, and the whole point of the walk is that the driver has
   been seen once.

   What this does NOT do is blank the fields. The engine takes months, rates
   and percentages straight into arithmetic, and a null reaches the cashflow
   as NaN — emptying them would mean null-guarding calc.js throughout, which
   is a change to the calculation engine in service of a UI flow. The fields
   keep their values; what changed is that a value is not treated as answered
   until someone has looked at it. */
const STEP_FIELDS = {
  land: ["landArea", "landPricePerSqm", "landTransferFeesPct", "landTenure",
         "landRentPerSqmYr", "landRentEscalationYears", "landRentEscalationPct",
         "landType", "developablePct", "landInfraCostPerSqm"],
  timing: ["predesignMonths", "constructionMonths", "preSalesStartMonth", "horizonMonths",
           "softCostsPct", "contingencyPct", "marketingPct", "salesCommissionPct", "govFeesPct"],
  finance: ["ltc", "interestRate", "discountRate"],
};
/* Which step owns a given top-level field, so editing anything in the sidebar
   marks its step without every input having to know it is part of a walk. */
const FIELD_STEP = (() => {
  const m = {};
  Object.keys(STEP_FIELDS).forEach((step) => STEP_FIELDS[step].forEach((f) => { m[f] = step; }));
  return m;
})();
window.REAP_FIELD_STEP = FIELD_STEP;

/* The values "use default inputs" writes. Deliberately the same numbers the
   model has always opened with — the button is a shortcut past a decision,
   not a different model. */
const STEP_DEFAULTS = {
  timing: {
    predesignMonths: 12, constructionMonths: 36, preSalesStartMonth: 14, horizonMonths: 120,
    softCostsPct: 0.10, contingencyPct: 0.05, marketingPct: 0.025,
    salesCommissionPct: 0.025, govFeesPct: 0.025,
  },
  finance: { ltc: 0.55, interestRate: 0.075, discountRate: 0.10 },
};

const STEP_LIST = [
  { key: "land",      required: true,  cta: false, title: "Set the land",
    body: "Area, price per m², transfer fees — and whether the site is serviced or raw." },
  /* No shortcut here on purpose. What gets built is the one thing the platform
     cannot guess for you, and a default program would put a scheme on the
     site that nobody chose. */
  { key: "program",   required: true,  cta: false, title: "Choose your program",
    body: "Pick component tiles — villas, townhouses, apartments, retail, office, hotel." },
  { key: "allocate",  required: true,  cta: true,  title: "Allocate the land",
    body: "An allocation panel appears under the tiles as soon as you pick a component — give each one its share (%) of the site." },
  { key: "tune",      required: true,  cta: true,  title: "Tune each component",
    body: "Massing, build cost and efficiency, then sale price or rent and how long it sells or operates." },
  { key: "timing",    required: true,  cta: true,  title: "Set timing & general costs",
    body: "Pre-construction, construction and sales start — then soft costs, contingency, marketing and fees." },
  { key: "finance",   required: true,  cta: true,  title: "Set financing & targets",
    body: "Loan-to-cost and interest rate, and the hurdle rate the equity IRR is judged against." },
  { key: "fund",      required: false, cta: true,  title: "Fund structure",
    body: "Optional. Split the equity between LP, developer and GP, set the preferred return and the promote." },
];

/* Has this component still got blanks in it?

   A component arrives from the picker with every preset assumption nulled, and
   they are filled either by typing or by "use default inputs" — which only
   refills what that component's own preset supplies. So the honest test for
   "tuned" is: nothing the defaults button would fill is still empty. A villa
   is not held open waiting for a rent it has no field for, and a component
   added before any of this existed already carries values and reads as done. */
function compTuned(c) {
  const keys = window.REAP_PRESET_ASSUMPTIONS;
  const preset = (window.COMPONENT_PRESETS || {})[c.kind];
  // Without the sidebar's lists loaded there is nothing to check against, and
  // guessing would reopen the step on every component. Treat as answered.
  if (!keys || !preset) return true;
  return keys.every((k) => preset[k] === undefined || (c[k] !== null && c[k] !== undefined));
}

/* A step is done when its own evidence says so. Land priced, a component
   picked, the site divided, each component filled in — all read the model
   directly, because none of them can be faked by a default: the picker blanks
   every assumption it hands over. The remaining steps arrive with values in
   them, so they need a deliberate act, recorded on input.stepsDone.

   Tune reads the model for a specific reason. It used to be a sticky flag, so
   a model that had been through the walk stayed "tuned" for ever — add a
   component to a finished scheme and the guide reopened to ask for its share
   of the land (that test is live) while never once asking for the assumptions
   behind it, which had just been blanked. The two questions are now asked on
   the same terms. */
function stepDone(input, key) {
  const seen = input.stepsDone || {};
  const comps = (input.components || []).filter((c) => c.enabled !== false);
  switch (key) {
    case "land":
      return (+input.landArea || 0) > 0 && (
        (input.landTenure || "own") === "lease"
          ? (+input.landRentPerSqmYr || 0) > 0
          : (+input.landPricePerSqm || 0) > 0
      );
    case "program":  return comps.length > 0;
    /* Every component, not the total. A scheme where one building holds the
       whole site and a second holds nothing sums to 100% and is still an
       unanswered question — the second one would just contribute nothing and
       say so nowhere. */
    case "allocate": return comps.length > 0 && comps.every((c) => (+c.allocationPct || 0) > 0);
    case "tune":     return comps.length > 0 && comps.every(compTuned);
    default:         return !!seen[key];
  }
}
/* "Optional" describes the fund structure, not the step. Running one is a
   choice; being asked is not — skipping is an answer and it closes the step
   like any other, so the walk cannot be finished by leaving the last question
   unread. Every step counts toward the total for that reason. */
function guideState(input) {
  const steps = STEP_LIST.map((s) => Object.assign({}, s, { done: stepDone(input, s.key) }));
  return {
    steps,
    doneCount: steps.filter((s) => s.done).length,
    total: steps.length,
    allDone: steps.every((s) => s.done),
    currentIdx: steps.findIndex((s) => !s.done),
  };
}
window.REAP_GUIDE = { stepDone, guideState, STEP_DEFAULTS, STEP_LIST };

function App() {
  /* The panel always opens with the page, and collapsing is a deliberate act
     for the session you are in.

     It used to remember the choice across visits, which meant someone who had
     collapsed it once came back to a 46px rail and no assumptions in sight —
     the inputs are the point of arriving here, so hiding them before the user
     has asked is the wrong default. Collapse is a reading aid, not a setting. */
  const [sideOpen, setSideOpen] = useState(true);
  const [input, setInput] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate sessions saved with the old placeholder defaults.
        if (parsed.projectName === "Project Details") parsed.projectName = SAMPLE_INPUT.projectName;
        if (parsed.projectType === "Mixed-use") parsed.projectType = "";
        return parsed;
      }
    } catch (e) {}
    return SAMPLE_INPUT;
  });
  const [tab, setTab] = useState("summary");

  // Persist
  useEffect(() => {
    try {localStorage.setItem(STORAGE_KEY, JSON.stringify(input));} catch (e) {}
  }, [input]);

  // Run feasibility live
  const result = useMemo(() => Feas.runFeasibility(input), [input]);
  const scenarios = useMemo(() => Feas.buildScenarios(input, 0.10), [input]);
  const waterfall = useMemo(() => Feas.runWaterfall(input, result), [input, result]);

  // Reset & export listeners
  useEffect(() => {
    const onReset = () => {
      if (confirm(I18N.t("Reset all inputs and clear program components?"))) setInput(SAMPLE_INPUT);
    };
    /* "feas:export" is no longer handled here. It used to switch to Summary
       and print the dashboard; it now opens the report builder, which listens
       for the event itself and renders a real document instead. */
    window.addEventListener("feas:reset", onReset);
    return () => {
      window.removeEventListener("feas:reset", onReset);
    };
  }, []);

  const baseTabs = [
  { id: "summary", label: "Summary", n: "01" },
  { id: "cost", label: "Cost", n: "02" },
  { id: "program", label: "Program & Revenue", n: "03" },
  { id: "cashflow", label: "Cash flow", n: "04" },
  { id: "waterfall", label: "Capital", n: "05" },
  { id: "returns", label: "Returns", n: "06" },
  { id: "sensitivity", label: "Sensitivity", n: "07" },
  { id: "scenarios", label: "Scenarios", n: "08" },
  { id: "monteCarlo", label: "Monte Carlo", n: "09" },
  { id: "risk", label: "Risk", n: "10" }];

  const fundEnabled = !!(input.fund && input.fund.enabled);
  const tabs = fundEnabled
    ? [...baseTabs, { id: "fund", label: "Fund", n: "11" }]
    : baseTabs;

  // If fund got disabled while user was on fund tab, kick them back to summary
  useEffect(() => {
    if (!fundEnabled && tab === "fund") setTab("summary");
  }, [fundEnabled, tab]);

  // Turning fund structure on quietly appends an 11th tab — announce it, and
  // badge the tab until the user has actually visited it.
  const [fundToast, setFundToast] = useState(false);
  const [fundSeen, setFundSeen] = useState(false);
  const prevFundEnabled = useRef(fundEnabled);
  useEffect(() => {
    if (fundEnabled && !prevFundEnabled.current) {
      setFundSeen(false);
      setFundToast(true);
    }
    if (!fundEnabled) setFundToast(false);
    prevFundEnabled.current = fundEnabled;
  }, [fundEnabled]);
  useEffect(() => {
    if (tab === "fund") { setFundSeen(true); setFundToast(false); }
  }, [tab]);
  useEffect(() => {
    if (!fundToast) return;
    const id = setTimeout(() => setFundToast(false), 9000);
    return () => clearTimeout(id);
  }, [fundToast]);


  const k = result.kpi;
  const irrTone = (k.equityIRR ?? 0) >= (input.discountRate || 0) ? "positive" : "negative";
  const hasComponents = (input.components || []).filter((c) => c.enabled).length > 0;

  /* Marking a step is idempotent and never clears one — a walk only ever moves
     forward, and re-editing a field the user already answered must not throw
     them back to the guide mid-session. */
  const markStep = (key) => setInput((prev) => (
    (prev.stepsDone || {})[key]
      ? prev
      : Object.assign({}, prev, { stepsDone: Object.assign({}, prev.stepsDone, { [key]: true }) })
  ));
  const applyStepDefaults = (key) => {
    if (key === "program") { window.dispatchEvent(new CustomEvent("feas:defaultProgram")); return; }
    if (key === "allocate") { window.dispatchEvent(new CustomEvent("feas:evenAllocation")); return; }
    /* The component assumptions live on the components, so filling them has to
       happen where the presets are. Marking the step is still done here — the
       sidebar's own edit-marking would catch it anyway, but only if the patch
       actually changed something, and a scheme already tuned by hand would
       leave the step open forever. */
    if (key === "tune") {
      window.dispatchEvent(new CustomEvent("feas:defaultComponents"));
      markStep("tune");
      return;
    }
    /* Taking the default on the fund step means running one, so it switches
       the structure on as well as filling it — otherwise the button would
       claim to set up a waterfall and leave it disabled. */
    if (key === "fund") {
      setInput((prev) => Object.assign({}, prev, {
        fund: Object.assign({}, SAMPLE_INPUT.fund, prev.fund, { enabled: true }),
        stepsDone: Object.assign({}, prev.stepsDone, { fund: true }),
      }));
      return;
    }
    setInput((prev) => Object.assign({}, prev, STEP_DEFAULTS[key] || {}, {
      stepsDone: Object.assign({}, prev.stepsDone, { [key]: true }),
    }));
  };
  const guide = guideState(input);

  return (
    <div style={{
      display: "grid",
      /* Collapsed, the panel keeps a narrow rail so the toggle stays reachable
         — it does not disappear. The column is what animates; the sidebar
         itself just stops rendering its fields.

         NOT transitioned. Animating grid-template-columns held the OLD width
         indefinitely: the rail rendered correctly inside a column still 460px
         wide, so the panel looked collapsed but took the same room. It is not
         an interpolation the browser will run between these track values —
         minmax() and clamp() both failed the same way — and the width snapping
         is a fair price for the collapse actually working. */
      gridTemplateColumns: sideOpen ? "minmax(380px, 460px) 1fr" : "46px 1fr",
      gridTemplateRows: "auto 1fr auto",
      gridTemplateAreas: `
        "header header"
        "side  main"
        "footer footer"
      `,
      height: "100vh",
      background: "var(--bg-2)",
      fontFamily: "var(--font-body)"
    }}>
      {/* HEADER */}
      <header style={{
        gridArea: "header",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        padding: "14px 28px",
        background: "var(--ad-navy-900)",
        color: "var(--fg-onDark)",
        borderBottom: "1px solid var(--ad-navy-700)",
        gap: 24, textAlign: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <BrandMark platform="Financial Modeling" />
        </div>

        <div style={{ textAlign: "start", paddingInlineStart: 40, minWidth: 0 }}>
          <div style={{
            fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
            display: "flex", gap: 12
          }}>
            <span>{input.location || "—"}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{input.projectType || "—"}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2, letterSpacing: "-0.01em" }}>
            {input.projectName}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 18 }}>
          {hasComponents ?
          <>
              <HeaderStat label="Equity IRR" value={Feas.formatPct(k.equityIRR)}
            tone={irrTone === "positive" ? "ok" : "bad"} />
              <Divider />
              <HeaderStat label="NPV" value={Feas.formatCurrency(k.equityNPV)} />
              <Divider />
              <HeaderStat label="Profit" value={Feas.formatCurrency(k.profit)}
            tone={k.profit >= 0 ? "ok" : "bad"} />
              <Divider />
              <HeaderStat label="Total cost" value={Feas.formatCurrency((k.totalCost || 0) + (k.totalInterest || 0))} />
              <Divider />
              <HeaderStat label="Equity req." value={Feas.formatCurrency(k.totalEquity)} sub="Total capital called" />
            </> :

          <div style={{
            fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)", fontWeight: 500
          }}>
              Awaiting program selection
            </div>
          }
          <LangToggle />
          <UserMenu
            table="assessments"
            itemNoun="model"
            currentName={input.projectName}
            getCurrent={() => input}
            onLoad={(inputs) => setInput(inputs)}
          />
        </div>
      </header>

      <Sidebar input={input} setInput={setInput} open={sideOpen} onToggle={() => setSideOpen(v => !v)} />

      <main style={{
        gridArea: "main",
        background: "var(--bg-2)",
        overflowY: "auto",
        position: "relative"
      }}>
        {/* Print-only report header */}
        <div className="print-only" style={{ margin: "0 0 26px", borderBottom: "3px solid var(--ad-navy-900)", paddingBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AscentMark size={24} color="var(--ad-navy-900)" />
                <span style={{ fontFamily: "'Ador Hairline', system-ui, sans-serif", fontSize: 26, fontWeight: 500, letterSpacing: "0.16em", color: "var(--ad-navy-900)" }}>REAP</span>
              </div>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fg-3)", marginTop: 4 }}>Feasibility Study Report</div>
            </div>
            <div style={{ textAlign: "end", fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--fg-1)" }}>{input.projectName}</div>
              <div>{[input.location, input.projectType].filter(Boolean).join(" · ") || "—"}</div>
              <div>{new Date().toLocaleDateString(
                (window.I18N && I18N.lang === "ar") ? "ar-SA-u-nu-latn" : "en-GB",
                { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          </div>
          {hasComponents && (
            <div style={{ display: "flex", gap: 28, marginTop: 12, fontSize: 11.5 }}>
              <span>Equity IRR <b className="tabnum">{Feas.formatPct(k.equityIRR)}</b></span>
              <span>NPV <b className="tabnum">{Feas.formatCurrency(k.equityNPV)}</b></span>
              <span>Profit <b className="tabnum">{Feas.formatCurrency(k.profit)}</b></span>
              <span>Total cost <b className="tabnum">{Feas.formatCurrency((k.totalCost || 0) + (k.totalInterest || 0))}</b></span>
              <span>Equity req. <b className="tabnum">{Feas.formatCurrency(k.totalEquity)}</b></span>
            </div>
          )}
        </div>

        {/* Tab nav */}
        <div className="no-print" style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "var(--bg-1)",
          borderBottom: "1px solid var(--border-1)",
          display: "flex",
          padding: "0 32px",
          overflowX: "auto"
        }}>
          {tabs.map((t) =>
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "16px 0",
              marginInlineEnd: 28,
              background: "none", border: "none",
              cursor: "pointer",
              position: "relative",
              color: tab === t.id ? "var(--fg-1)" : "var(--fg-3)",
              fontFamily: "var(--font-body)",
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              display: "flex", alignItems: "center", gap: 8,
              whiteSpace: "nowrap"
            }}>

              <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 400,
              color: tab === t.id ? "var(--ad-gold-600)" : "var(--fg-4)"
            }}>{t.n}</span>
              {t.label}
              {t.id === "fund" && !fundSeen &&
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--ad-gold-600)", marginInlineStart: -2,
              animation: "reap-dot-pulse 1.8s ease-in-out infinite"
            }} />
            }
              {tab === t.id &&
            <span style={{
              position: "absolute", bottom: -1, left: 0, right: 0,
              height: 2, background: "var(--ad-navy-800)"
            }} />
            }
            </button>
          )}
        </div>

        <div>
          {/* Pressing "show the result" is remembered, but it does not survive
              the model ceasing to be complete. Removing the last component
              from the allocation panel used to leave the dashboards up,
              computing a whole feasibility from nothing and reporting zeros as
              though they were an answer. The walk reappears at the step that
              came undone, and the results return on their own once it is
              answered again — no second press. */}
          {!(input.showResults && guide.allDone) ?
          <BuildGuide input={input} guide={guide} onUseDefaults={applyStepDefaults} onMark={markStep}
                      onShowResults={() => setInput((p) => Object.assign({}, p, { showResults: true }))} /> :

          <>
              {tab === "summary" && <Panels.SummaryPanel result={result} input={input} scenarios={scenarios} />}
              {tab === "cost" && <Panels.CostPanel result={result} input={input} />}
              {tab === "program" && <Panels.ProgramPanel result={result} input={input} />}
              {tab === "waterfall" && <Panels.WaterfallPanel result={result} input={input} />}
              {tab === "cashflow" && <Panels.CashflowPanel result={result} input={input} />}
              {tab === "returns" && <Panels.ReturnsPanel result={result} input={input} />}
              {tab === "sensitivity" && <Panels.SensitivityPanel result={result} input={input} />}
              {tab === "scenarios" && <Panels.ScenariosPanel scenarios={scenarios} input={input} />}
              {tab === "monteCarlo" && <Panels.MonteCarloPanel input={input} />}
              {tab === "risk" && <Panels.RiskPanel result={result} input={input} />}
              {tab === "fund" && fundEnabled && <FundPanel result={result} waterfall={waterfall} input={input} />}
            </>
          }
        </div>
      </main>

      {fundToast &&
      <FundTabToast onOpen={() => setTab("fund")} onClose={() => setFundToast(false)} />
      }

      {/* Report builder. Renders nothing until "feas:export" fires, and
          portals itself out of the app when it does. */}
      <Report.ReportHost
        input={input}
        result={result}
        scenarios={scenarios}
        waterfall={waterfall} />

      <AppFooter />
    </div>);

}

/* Toast announcing the Fund tab that appears when fund structuring is enabled. */
function FundTabToast({ onOpen, onClose }) {
  return (
    <div className="no-print reap-toast" style={{
      position: "fixed", bottom: 56, insetInlineEnd: 28, zIndex: 90,
      width: 340, maxWidth: "calc(100vw - 56px)",
      background: "var(--ad-navy-900)", color: "white",
      border: "1px solid var(--ad-navy-700)",
      borderInlineStart: "3px solid var(--ad-gold-600)",
      boxShadow: "0 18px 40px rgba(11,25,44,0.28)",
      padding: "16px 18px",
    }}>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          position: "absolute", top: 10, insetInlineEnd: 10,
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.55)", fontSize: 16, lineHeight: 1, padding: 4,
        }}>×</button>

      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--ad-gold-600)", marginBottom: 6,
      }}>New tab unlocked</div>

      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
        Fund tab is now available
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.78)", marginBottom: 12 }}>
        Fund structuring is on, so tab 11 · Fund has been added — capital calls, the distribution waterfall, fees and returns for each party.
      </div>

      <button
        onClick={onOpen}
        style={{
          background: "var(--ad-gold-600)", color: "var(--ad-navy-900)",
          border: "none", cursor: "pointer",
          padding: "8px 14px", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase",
          fontFamily: "var(--font-body)",
        }}>Open the Fund tab</button>
    </div>
  );
}

/* Release marker — bump the label here when the version changes. */
const VER_BADGE = {
  fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600,
  color: "var(--ad-gold-400)", border: "1px solid rgba(201,168,97,0.45)",
  borderRadius: 2, padding: "3px 8px", whiteSpace: "nowrap",
};

function AppFooter() {
  const iconLink = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, color: "rgba(255,255,255,0.75)",
  };
  return (
    <footer className="no-print" style={{
      gridArea: "footer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
      padding: "8px 28px",
      background: "var(--ad-navy-900)",
      borderTop: "1px solid var(--ad-navy-700)",
      color: "rgba(255,255,255,0.7)",
      fontSize: 12,
    }}>
      <span>Developed by <span style={{ color: "white", fontWeight: 600 }}>Mohammed Basloom</span></span>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="tel:+966558793201" className="tabnum" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
        +966 55 879 3201
      </a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="mailto:info@reapinsights.com" title="info@reapinsights.com" aria-label="Email" style={iconLink}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.24l-8 5-8-5V6.4l8 5 8-5v1.84z" />
        </svg>
      </a>
      <a href="https://linkedin.com/in/mohammedbasloom1" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn" style={iconLink}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="privacy.html" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Privacy Policy</a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="terms.html" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Terms of Use</a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <a href="disclaimer.html" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Disclaimer</a>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <span style={VER_BADGE}>Beta v2.0</span>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.18)" }} />
      <span style={{ color: "rgba(255,255,255,0.5)" }}>© 2026 REAP. All rights reserved.</span>
    </footer>
  );
}

function BuildGuide({ input, guide, onUseDefaults, onMark, onShowResults }) {
  const landArea = +input.landArea || 0;
  const landPrice = +input.landPricePerSqm || 0;
  const isLeasehold = (input.landTenure || "own") === "lease";
  const hasLand = guide.steps[0].done;
  const totalLandCost = isLeasehold ? 0 : landArea * landPrice;
  const totalLandIn = isLeasehold ? 0 : totalLandCost * (1 + (input.landTransferFeesPct || 0));

  const { steps, doneCount, total, currentIdx } = guide;

  return (
    <div style={{ padding: "56px 48px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{
        fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
        fontWeight: 500, color: "var(--fg-3)"
      }}>{hasLand ? "Building your model" : "Getting started"}</div>
      <h2 style={{
        fontSize: 32, fontFamily: "var(--font-display)", fontWeight: 600,
        letterSpacing: "-0.02em", color: "var(--fg-1)", marginTop: 8
      }}>
        {hasLand
          ? "Keep going — the results open when the walk is done."
          : "Start by setting your land, then build the program."}
      </h2>
      <p style={{ fontSize: 15, color: "var(--fg-2)", marginTop: 12, maxWidth: 660, lineHeight: 1.55 }}>
        Every step below is a driver of the answer. Set it yourself in the panel, or take the
        default and move on — either way you will have seen it once. Nothing is calculated until
        the last required step is passed.
      </p>

      {hasLand && (
        <div style={{
          marginTop: 32, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12
        }}>
          <FactTile label="Land area" value={`${Feas.formatNumber(landArea)} m²`} />
          <FactTile label="Land price" value={`${Feas.formatNumber(landPrice)} SAR/m²`} />
          <FactTile label="Land cost" value={Feas.formatCurrency(totalLandCost)} />
          <FactTile label="Land in (w/ fees)" value={Feas.formatCurrency(totalLandIn)} accent />
        </div>
      )}

      <div style={{
        marginTop: 32, padding: "22px 26px 8px",
        border: "1px solid var(--border-1)", background: "var(--bg-1)"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, marginBottom: 18
        }}>
          <div style={{
            fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
            fontWeight: 500, color: "var(--fg-3)"
          }}>How to build your model</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 84, height: 4, background: "var(--bg-3)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                width: `${(doneCount / total) * 100}%`, height: "100%",
                background: "var(--ad-success)", borderRadius: 999,
                transition: "width 420ms var(--ease-out)"
              }} />
            </div>
            <span className="tabnum" style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>
              {doneCount}/{total}
            </span>
          </div>
        </div>
        <div>
          {steps.map((s, i) => (
            <StepRow
              key={s.key}
              n={i + 1}
              index={i}
              last={i === steps.length - 1}
              current={i === currentIdx}
              stepKey={s.key}
              title={s.title}
              body={s.body}
              done={s.done}
              optional={!s.required}
              /* The shortcut is offered on the step the walk has reached — on
                 an earlier row it would be a way past the walk, which is the
                 thing the walk exists to prevent.

                 The optional step is the exception: it is never what the walk
                 is waiting on, so it would otherwise only become "current"
                 at the moment the last required step completes and the guide
                 closes — its buttons would be unreachable for the entire
                 session. It offers itself throughout instead. */
              onUseDefaults={s.cta && (i === currentIdx || (!s.required && !s.done)) ? () => onUseDefaults(s.key) : null}
              onSkip={!s.required && !s.done ? () => onMark(s.key) : null}
            />
          ))}
        </div>
      </div>

      {/* The results are opened deliberately, not sprung the instant the last
          step closes. Until every step is answered the button says which one
          is still outstanding rather than just refusing — a disabled control
          with no reason attached is the most annoying thing on a form. */}
      <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          onClick={onShowResults}
          disabled={!guide.allDone}
          style={{ padding: "12px 26px", fontSize: 12.5, opacity: guide.allDone ? 1 : 0.45,
                   cursor: guide.allDone ? "pointer" : "not-allowed" }}>
          Show the result
        </button>
        {/* The count is kept out of the sentence: an interpolated string is
            one key the dictionary can never match, so it would sit in English
            on an Arabic page. */}
        <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
          {guide.allDone
            ? <span>Every step is answered — open the dashboards.</span>
            : <>
                <span className="tabnum" style={{ fontWeight: 600, color: "var(--fg-2)" }}>
                  {guide.total - guide.doneCount}
                </span>
                {" "}
                <span>still to answer</span>
              </>}
        </span>
      </div>
    </div>);

}

function StepRow({ n, stepKey, title, body, done, index, last, current, onUseDefaults, onSkip, optional }) {
  const DOT = 26;
  return (
    <div
      className={`reap-step${current ? " is-current" : ""}`}
      style={{ display: "flex", gap: 14, position: "relative", paddingBottom: last ? 16 : 20, animationDelay: `${index * 70}ms` }}>
      {/* Connector to the next step — filled green once this one is done */}
      {!last && (
        <span style={{
          position: "absolute", insetInlineStart: (DOT - 2) / 2, top: DOT + 2, bottom: 0,
          width: 2, background: "var(--border-1)"
        }}>
          {done && <span className="reap-line-fill" style={{ position: "absolute", inset: 0, background: "var(--ad-success)" }} />}
        </span>
      )}
      <span
        className="reap-dot"
        style={{
          flexShrink: 0, width: DOT, height: DOT, borderRadius: "50%",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, zIndex: 1,
          background: done ? "var(--ad-success)" : current ? "var(--ad-gold-500)" : "var(--bg-1)",
          color: done || current ? "#FFFFFF" : "var(--fg-3)",
          border: done || current ? "none" : "1px solid var(--border-strong)"
        }}>{done ? "✓" : n}</span>
      <div style={{ minWidth: 0, paddingTop: 3 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3
        }}>
          {/* The title is the way back into the panel. A finished step is not
              a closed one — an answer given early is the one most worth
              re-reading — so every row stays reachable, done or not. */}
          <button
            type="button"
            className="reap-step-title"
            title="Open this section in the assumptions panel"
            onClick={() => window.dispatchEvent(new CustomEvent("feas:walkTo", { detail: stepKey }))}
            style={{
              fontSize: 13.5, fontWeight: 600,
              color: done ? "var(--fg-3)" : "var(--fg-1)"
            }}>{title}</button>
          {optional && (
            <span style={{
              fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
              color: "var(--fg-4)", border: "1px solid var(--border-1)",
              borderRadius: 999, padding: "1px 7px"
            }}>Optional</span>
          )}
        </div>
        <div className="reap-body" style={{
          fontSize: 12, lineHeight: 1.55,
          color: done ? "var(--fg-4)" : "var(--fg-2)"
        }}>{body}</div>

        {(onUseDefaults || onSkip) && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {onUseDefaults && (
              <button className="btn" onClick={onUseDefaults} style={{ padding: "6px 12px", fontSize: 11 }}>
                Use default inputs
              </button>
            )}
            {onSkip && (
              <button className="btn" onClick={onSkip} style={{ padding: "6px 12px", fontSize: 11, borderStyle: "dashed" }}>
                Skip — no fund structure
              </button>
            )}
          </div>
        )}
      </div>
    </div>);

}
function FactTile({ label, value, accent }) {
  return (
    <div style={{
      padding: "14px 16px",
      border: "1px solid var(--border-1)",
      background: accent ? "var(--ad-navy-50)" : "var(--bg-1)"
    }}>
      <div style={{
        fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--fg-3)", fontWeight: 500
      }}>{label}</div>
      <div className="tabnum" style={{
        fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600,
        letterSpacing: "-0.01em", color: accent ? "var(--ad-navy-900)" : "var(--fg-1)",
        marginTop: 6
      }}>{value}</div>
    </div>);

}

function Step({ n, title, body }) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ad-gold-600)",
        letterSpacing: "0.06em", marginBottom: 6
      }}>{n}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>{body}</div>
    </div>);

}

function HeaderStat({ label, value, tone }) {
  const colors = {
    ok: "#a8d6b8",
    bad: "#e7a99c"
  };
  return (
    <div style={{ textAlign: "end", minWidth: 0 }}>
      <div style={{
        fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap"
      }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em",
        color: tone ? colors[tone] : "white",
        fontVariantNumeric: "tabular-nums",
        marginTop: 2, whiteSpace: "nowrap"
      }}>{value}</div>
    </div>);

}

function Divider() {
  return <span style={{ height: 28, width: 1, background: "rgba(255,255,255,0.14)" }} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
