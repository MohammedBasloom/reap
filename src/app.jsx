/* =============================================================
   Main app — assembles sidebar, results dashboard, and state.
   ============================================================= */
const { useState, useMemo, useEffect, useRef } = React;

/* ---------- Default deal — land & assumptions only. User picks components. ---------- */
const SAMPLE_INPUT = {
  projectName: (window.I18N && I18N.lang === "ar") ? "دراسة فرصة جديدة" : "New Opportunity Assessment",
  location: "—",
  projectType: "",

  // Land
  landArea: 100000, // m²
  landPricePerSqm: 1250, // SAR
  landTransferFeesPct: 0.03, // 3% transfer / gov
  landType: "net", // "net" (serviced) | "raw" (needs infrastructure)
  developablePct: 0.70, // raw only: share of gross land the program can build on
  landInfraCostPerSqm: 0, // SAR/m² on gross land — roads, utilities (raw or net)

  // Timing (project-level)
  predesignMonths: 12,
  constructionMonths: 36,
  preSalesStartMonth: 14,
  horizonMonths: 120,

  // General costs (project-level %s)
  softCostsPct: 0.12,
  contingencyPct: 0.07,
  marketingPct: 0.025,
  salesCommissionPct: 0.025,
  govFeesPct: 0.025,

  // Financing
  ltc: 0.55,
  interestRate: 0.0625,

  // Valuation
  discountRate: 0.10,

  // Fund structure (optional — disabled by default)
  fund: {
    enabled: false,
    lpEquityPct: 0.85,         // Limited Partners / cash investors
    devEquityPct: 0.10,        // Developer co-invest
    gpEquityPct: 0.05,         // GP / fund manager co-invest
    acquisitionFeePct: 0.01,   // % of total project cost — paid to GP at close
    assetMgmtFeePctYr: 0.015,  // annual % of unreturned equity — paid to GP
    developmentFeePct: 0.03,   // % of construction + site cost — paid to Developer
    preferredReturnPct: 0.08,  // compounded hurdle IRR before promote kicks in
    catchUpEnabled: true,      // GP catch-up after pref
    catchUpPct: 1.00,          // 100% = full catch-up; 50% = 50/50 catch-up
    promoteSplit: 0.20,        // performance fee — GP's share after catch-up
  },

  // No components by default — user picks from the program tiles.
  components: []
};

// v5: fresh visitors (and anyone with a pre-v5 saved session) start with an
// empty program — no components selected until the user picks from the tiles.
const STORAGE_KEY = "ad_feas_v5";

function App() {
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
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

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
    const onExport = () => {
      // The PDF report is always the Summary view — switch to it, print,
      // then return the user to the tab they were on.
      const prev = tabRef.current;
      setTab("summary");
      setTimeout(() => {
        window.print();
        setTab(prev);
      }, 350);
    };
    window.addEventListener("feas:reset", onReset);
    window.addEventListener("feas:export", onExport);
    return () => {
      window.removeEventListener("feas:reset", onReset);
      window.removeEventListener("feas:export", onExport);
    };
  }, []);

  const baseTabs = [
  { id: "summary", label: "Summary", n: "01" },
  { id: "cost", label: "Cost", n: "02" },
  { id: "program", label: "Program & Revenue", n: "03" },
  { id: "waterfall", label: "Capital", n: "04" },
  { id: "cashflow", label: "Cash flow", n: "05" },
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


  const k = result.kpi;
  const irrTone = (k.equityIRR ?? 0) >= (input.discountRate || 0) ? "positive" : "negative";
  const hasComponents = (input.components || []).filter((c) => c.enabled).length > 0;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(380px, 460px) 1fr",
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

        <div style={{ textAlign: "left", paddingLeft: 40, minWidth: 0 }}>
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
              <HeaderStat label="Total cost" value={Feas.formatCurrency(k.devCostExFinance + (k.totalInterest || 0) + (k.marketing || 0) + (k.salesCommission || 0) + (k.govFees || 0))} />
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

      <Sidebar input={input} setInput={setInput} />

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
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "0.04em", color: "var(--ad-navy-900)" }}>REAP</div>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fg-3)", marginTop: 2 }}>Feasibility Study Report</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--fg-1)" }}>{input.projectName}</div>
              <div>{[input.location, input.projectType].filter(Boolean).join(" · ") || "—"}</div>
              <div>{new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          </div>
          {hasComponents && (
            <div style={{ display: "flex", gap: 28, marginTop: 12, fontSize: 11.5 }}>
              <span>Equity IRR <b className="tabnum">{Feas.formatPct(k.equityIRR)}</b></span>
              <span>NPV <b className="tabnum">{Feas.formatCurrency(k.equityNPV)}</b></span>
              <span>Profit <b className="tabnum">{Feas.formatCurrency(k.profit)}</b></span>
              <span>Total cost <b className="tabnum">{Feas.formatCurrency(k.devCostExFinance + (k.totalInterest || 0) + (k.marketing || 0) + (k.salesCommission || 0) + (k.govFees || 0))}</b></span>
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
              marginRight: 28,
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
          {!hasComponents ?
          <DashboardEmptyState input={input} /> :

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

      <AppFooter />
    </div>);

}

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
      <a href="mailto:moh.baslom@gmail.com" title="moh.baslom@gmail.com" aria-label="Email" style={iconLink}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.24l-8 5-8-5V6.4l8 5 8-5v1.84z" />
        </svg>
      </a>
      <a href="https://linkedin.com/in/mohammedbasloom1" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn" style={iconLink}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
    </footer>
  );
}

function DashboardEmptyState({ input }) {
  const totalLandCost = (input.landArea || 0) * (input.landPricePerSqm || 0);
  const totalLandIn = totalLandCost * (1 + (input.landTransferFeesPct || 0));
  return (
    <div style={{ padding: "64px 48px", maxWidth: 880, margin: "0 auto" }}>
      <div style={{
        fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
        fontWeight: 500, color: "var(--fg-3)"
      }}>Awaiting program</div>
      <h2 style={{
        fontSize: 32, fontFamily: "var(--font-display)", fontWeight: 600,
        letterSpacing: "-0.02em", color: "var(--fg-1)", marginTop: 8
      }}>
        Select your program components to model the deal.
      </h2>
      <p style={{ fontSize: 15, color: "var(--fg-2)", marginTop: 12, maxWidth: 620, lineHeight: 1.5 }}>
        Land is set. Now pick from the program tiles in the sidebar — villas, apartments, retail, hotel —
        and the cashflow, cost stack, sensitivity and risk views will populate from your selection.
      </p>

      <div style={{
        marginTop: 36, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12
      }}>
        <FactTile label="Land area" value={`${Feas.formatNumber(input.landArea || 0)} m²`} />
        <FactTile label="Land price" value={`${Feas.formatNumber(input.landPricePerSqm || 0)} SAR/m²`} />
        <FactTile label="Land cost" value={Feas.formatCurrency(totalLandCost)} />
        <FactTile label="Land in (w/ fees)" value={Feas.formatCurrency(totalLandIn)} accent />
      </div>

      <div style={{
        marginTop: 36, padding: "20px 24px",
        border: "1px solid var(--border-1)", background: "var(--bg-1)"
      }}>
        <div style={{
          fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
          fontWeight: 500, color: "var(--fg-3)", marginBottom: 12
        }}>What happens next</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          <Step n="01" title="Pick components" body="From the sidebar tiles. Each adds an instance to your program." />
          <Step n="02" title="Tune & allocate" body="Set land share, FAR, pricing. Rename anything generic (e.g. ‘Villa’ → ‘Beachfront Villas’)." />
          <Step n="03" title="Read the dashboard" body="Cashflow, cost stack, sensitivity, Monte Carlo, scenarios, and risk register populate live." />
        </div>
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
    <div style={{ textAlign: "right", minWidth: 0 }}>
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
