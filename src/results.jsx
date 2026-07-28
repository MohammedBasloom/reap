/* =============================================================
   Results panel — all output views, tabbed.
   ============================================================= */
const { useState: useStateR, useMemo: useMemoR, useEffect: useEffectR } = React;
const { StackedArea, StackedBars, HBars, Tornado, Histogram, Waterfall, Donut, Sparkline } = window.Charts;
const { formatCurrency: fc, formatPct: fp, formatNumber: fn } = window.Feas;

/* ---------- KPI tile ---------- */

function KPI({ eyebrow, value, sub, tone = "default", spark, large = false }) {
  const tones = {
    default: "var(--fg-1)",
    positive: "var(--ad-success)",
    negative: "var(--ad-danger)",
    warning: "var(--ad-warning)",
    accent: "var(--ad-gold-600)",
  };
  return (
    <div style={{
      padding: large ? "20px 22px" : "16px 18px",
      border: "1px solid var(--border-1)",
      background: "var(--bg-1)",
      minHeight: large ? 130 : 100,
      display: "flex", flexDirection: "column", justifyContent: "space-between",
    }}>
      <div className="ad-eyebrow">{eyebrow}</div>
      <div>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: large ? 38 : 26,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: tones[tone],
          fontVariantNumeric: "tabular-nums",
          marginTop: 6,
        }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>{sub}</div>}
      </div>
      {spark && <div style={{ marginTop: 8 }}>{spark}</div>}
    </div>
  );
}

/* ---------- Summary panel ---------- */

function SummaryPanel({ result, input, scenarios }) {
  const k = result.kpi;
  const cf = result.cashflow;
  const monthLabel = (m) => m === null ? "—" : `${(m / 12).toFixed(1)} yrs`;

  // Build summary cashflow sparkline (cumulative)
  const cumNet = [];
  let cum = 0;
  for (const v of cf.net) { cum += v; cumNet.push(cum); }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Investment Committee · Summary</Eyebrow>
        <h2 style={{ fontSize: 28, marginTop: 6, color: "var(--fg-1)" }}>
          {(k.equityIRR ?? 0) > (input.discountRate || 0)
            ? "Project clears the hurdle"
            : "Project below hurdle — review assumptions"}
        </h2>
      </div>

      {/* Headline KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI eyebrow="Equity IRR" value={fp(k.equityIRR)} sub={`Hurdle ${fp(input.discountRate)}`}
             tone={(k.equityIRR ?? 0) >= (input.discountRate || 0) ? "positive" : "negative"} large />
        <KPI eyebrow="Equity NPV" value={fc(k.equityNPV)} sub={`@${fp(input.discountRate)} disc.`} large />
        <KPI eyebrow="Equity Multiple" value={k.equityROI == null ? "—" : `${(1 + k.equityROI).toFixed(2)}×`} sub={k.equityROI == null ? "No equity called — fully debt-funded" : `ROI ${fp(k.equityROI)}`} large />
        <KPI eyebrow="Payback (equity)" value={monthLabel(k.equityPayback)} sub={`Project ${monthLabel(k.projectPayback)}`} large />
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
        <KPI eyebrow="Profit (levered)" value={fc(k.profit)} tone={k.profit >= 0 ? "default" : "negative"} />
        <KPI eyebrow="Project IRR" value={fp(k.projectIRR)} sub="Unlevered" />
        <KPI eyebrow="Annual rent (stab.)" value={fc(k.totalGrossIncome)} sub="Gross, at stabilization" />
        <KPI eyebrow="Annual NOI (stab.)" value={fc(k.totalNOI)} sub={`OpEx ${fc(k.totalOpex)}`} />
        <KPI eyebrow="Peak debt" value={fc(k.peakDebt)} sub={`${fp(input.ltc)} LTC`} />
        <KPI eyebrow="Min DSCR" value={k.minDSCR ? `${k.minDSCR.toFixed(2)}×` : "—"} tone={(k.minDSCR ?? 0) < 1.2 ? "warning" : "default"} />
      </div>

      {/* Project facts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Cumulative Net Cashflow (Levered)</Eyebrow>
          <StackedArea
            months={cf.months}
            series={[
              { label: "Cost",    color: "var(--ad-danger)", values: cf.land.map((_, i) => cf.land[i] + cf.soft[i] + cf.construction[i] + cf.infra[i] + cf.contingency[i] + cf.selling[i] + cf.opex[i] + cf.interest[i]) },
              { label: "Revenue", color: "var(--ad-success)", opacity: 0.85, values: cf.sales.map((_, i) => cf.sales[i] + cf.rent[i] + cf.exit[i]) },
              { label: "Debt",    color: "var(--ad-navy-400)", opacity: 0.6, values: cf.debtDraw.map((_, i) => cf.debtDraw[i] + cf.debtRepay[i]) },
            ]}
            height={220}
            /* The line is the engine's levered (equity) cashflow, on the SAME
               labeled axis — matches the Cash Flow tab's cumulative equity.
               (Summing the display series would double-count interest: the
               Cost band carries P&L interest while debt repayments already
               carry the cash interest.) */
            cumulativeValues={cf.net}
            cumulativeOnPrimary
            formatY={(v) => v === 0 ? "0" : `${(v / 1e6).toFixed(0)}M`}
          />
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "var(--fg-3)" }}>
            <Legend color="var(--ad-danger)" label="Costs (incl. OpEx)" />
            <Legend color="var(--ad-success)" label="Sales + Rent + Exit" />
            <Legend color="var(--ad-navy-400)" label="Debt draw / repay" />
            <Legend color="var(--ad-navy-900)" label="Cumulative" line />
          </div>
        </div>

        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Massing</Eyebrow>
          <div style={{ marginTop: 16 }}>
            <FactRow label="Land area" value={`${fn(input.landArea)} m²`} />
            <FactRow label="Land allocated" value={fp(result.allocation.totalAllocationPct)} />
            <FactRow label="Total GFA" value={`${fn(k.gfa)} m²`} />
            <FactRow label="Total NSA" value={`${fn(k.nsa)} m²`} />
            <FactRow label="Total units" value={fn(k.totalUnits)} />
            {k.totalKeys > 0 && <FactRow label="Hotel keys" value={fn(k.totalKeys)} />}
            <FactRow label="Components" value={input.components.filter(c => c.enabled).length} />
          </div>
        </div>
      </div>

      {/* Scenario comparison strip */}
      {scenarios && (
        <div style={{ marginBottom: 16 }}>
          <Eyebrow>Scenario Range</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 10 }}>
            <ScenarioCard label="Downside" tone="negative" result={scenarios.downside} hurdle={input.discountRate} />
            <ScenarioCard label="Base" tone="default" result={scenarios.base} hurdle={input.discountRate} />
            <ScenarioCard label="Upside" tone="positive" result={scenarios.upside} hurdle={input.discountRate} />
          </div>
        </div>
      )}
    </div>
  );
}

function FactRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "8px 0", borderBottom: "1px solid var(--border-1)",
      fontSize: 13,
    }}>
      <span style={{ color: "var(--fg-3)" }}>{label}</span>
      <span className="tabnum" style={{ color: "var(--fg-1)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Legend({ color, label, line, dash, dot }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {dot ? (
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      ) : dash ? (
        <span style={{ width: 18, height: 0, borderTop: `2.5px dashed ${color}`, display: "inline-block", flexShrink: 0 }} />
      ) : line ? (
        <span style={{ width: 18, height: 2.5, background: color, display: "inline-block", flexShrink: 0 }} />
      ) : (
        <span style={{ width: 10, height: 10, background: color, display: "inline-block", flexShrink: 0 }} />
      )}
      {label}
    </span>
  );
}

function ScenarioCard({ label, tone, result, hurdle }) {
  const k = result.kpi;
  const irrTone = (k.equityIRR ?? 0) >= hurdle ? "positive" : "negative";
  return (
    <div style={{
      border: "1px solid var(--border-1)",
      borderLeft: `2px solid ${tone === "negative" ? "var(--ad-danger)" : tone === "positive" ? "var(--ad-success)" : "var(--ad-navy-800)"}`,
      padding: "14px 18px",
      background: "var(--bg-1)",
    }}>
      <div style={{
        fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--fg-3)", marginBottom: 8,
      }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--fg-3)" }}>Equity IRR</div>
          <div className="tabnum" style={{
            fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
            color: tone === "default" ? "var(--fg-1)" : tone === "positive" ? "var(--ad-success)" : "var(--ad-danger)"
          }}>{fp(k.equityIRR)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--fg-3)" }}>Profit</div>
          <div className="tabnum" style={{ fontSize: 16, fontWeight: 500, color: "var(--fg-1)" }}>{fc(k.profit)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--fg-3)" }}>NPV</div>
          <div className="tabnum" style={{ fontSize: 13, color: "var(--fg-2)" }}>{fc(k.equityNPV)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--fg-3)" }}>Payback</div>
          <div className="tabnum" style={{ fontSize: 13, color: "var(--fg-2)" }}>{k.equityPayback ? `${(k.equityPayback / 12).toFixed(1)} yrs` : "—"}</div>
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children }) {
  return <div style={{
    fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
    fontWeight: 500, color: "var(--fg-3)",
  }}>{children}</div>;
}

/* ---------- Cashflow panel ---------- */

function CashflowPanel({ result, input }) {
  const cf = result.cashflow;
  const months = cf.months;

  // Annual aggregation
  const years = Math.ceil(months.length / 12);
  const yearly = useMemoR(() => {
    const out = [];
    for (let y = 0; y < years; y++) {
      const slice = (arr) => arr.slice(y * 12, (y + 1) * 12).reduce((s, v) => s + v, 0);
      out.push({
        year: y,
        land: slice(cf.land),
        soft: slice(cf.soft),
        construction: slice(cf.construction),
        siteWork: slice(cf.siteWork),
        contingency: slice(cf.contingency),
        sales: slice(cf.sales),
        selling: slice(cf.selling),
        rent: slice(cf.rent),
        opex: slice(cf.opex),
        noi: slice(cf.noi),
        exit: slice(cf.exit),
        debtDraw: slice(cf.debtDraw),
        debtRepay: slice(cf.debtRepay),
        interest: slice(cf.interest),
        net: slice(cf.net),
        // Year-end retained project cash (undistributed surpluses)
        cashEnd: (cf.cashBalance || [])[Math.min((y + 1) * 12 - 1, cf.months.length - 1)] || 0,
      });
    }
    return out;
  }, [result]);

  // Chart-first presentation; each card can flip to the numeric table.
  const [projView, setProjView] = React.useState("chart");
  const [eqView, setEqView] = React.useState("chart");

  // Monthly project (unlevered) flow — all uses & revenues, no debt/interest.
  const projFlow = months.map((_, i) =>
    cf.land[i] + cf.soft[i] + cf.construction[i] + (cf.infra ? cf.infra[i] : 0) + cf.siteWork[i] +
    cf.contingency[i] + cf.selling[i] + cf.opex[i] + cf.sales[i] + cf.rent[i] + cf.exit[i]);

  const ViewToggle = ({ view, setView }) => (
    <div style={{ display: "flex", border: "1px solid var(--border-1)", flexShrink: 0 }}>
      {["chart", "table"].map((v, i) => (
        <button key={v} type="button" onClick={() => setView(v)} style={{
          padding: "5px 14px", cursor: "pointer", border: "none",
          borderInlineStart: i > 0 ? "1px solid var(--border-1)" : "none",
          background: view === v ? "var(--ad-navy-800)" : "transparent",
          color: view === v ? "white" : "var(--fg-2)",
          fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600,
          fontFamily: "var(--font-body)",
        }}>{v === "chart" ? "Chart" : "Table"}</button>
      ))}
    </div>
  );

  return (
    <div style={{ padding: 32 }}>
      <Eyebrow>Cashflow · annual & cumulative</Eyebrow>
      <h2 style={{ fontSize: 24, marginTop: 6, marginBottom: 20 }}>Project & equity cashflow over time</h2>

      <div style={{ border: "1px solid var(--border-1)", background: "var(--bg-1)", marginBottom: 24 }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Eyebrow>① Project cashflow (unlevered)</Eyebrow>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
              All project uses and revenues — before any debt activity.
            </div>
          </div>
          <ViewToggle view={projView} setView={setProjView} />
        </div>
        {projView === "chart" ? (
          <div style={{ padding: 24 }}>
            <StackedBars
              months={months}
              height={260}
              series={[
                { label: "Land",     color: "var(--ad-navy-900)", values: cf.land },
                { label: "Soft costs", color: "var(--ad-navy-700)", values: cf.soft },
                { label: "Construction", color: "var(--ad-navy-500)", values: cf.construction },
                { label: "Site work", color: "var(--ad-navy-400)", values: months.map((_, i) => cf.siteWork[i] + (cf.infra ? cf.infra[i] : 0)) },
                { label: "Contingency", color: "var(--ad-sand-700)", values: cf.contingency },
                { label: "Selling costs", color: "var(--ad-sand-500)", values: cf.selling },
                { label: "OpEx",     color: "var(--ad-sand-900)", values: cf.opex },
                { label: "Sales",    color: "var(--ad-success)", values: cf.sales },
                { label: "Rent / Lease income", color: "var(--ad-gold-500)", values: cf.rent },
                { label: "Exit value", color: "var(--ad-gold-600)", values: cf.exit },
              ]}
              cumulativeValues={projFlow}
              cumulativeOnPrimary
              formatY={v => v === 0 ? "0" : `${(v / 1e6).toFixed(0)}M`}
            />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <ProjectCashflowTable yearly={yearly} />
          </div>
        )}
      </div>

      <div style={{ border: "1px solid var(--border-1)", background: "var(--bg-1)", marginBottom: 24 }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Eyebrow>② Equity cashflow (levered)</Eyebrow>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
              Equity calls out, distributions in. Surplus cash is retained to fund later periods — it distributes only once no further contributions are needed.
            </div>
          </div>
          <ViewToggle view={eqView} setView={setEqView} />
        </div>
        {eqView === "chart" ? (
          <div style={{ padding: 24 }}>
            <StackedBars
              months={months}
              height={260}
              series={[
                { label: "Project cashflow", color: "var(--ad-navy-500)", values: projFlow },
                { label: "Debt draw", color: "var(--ad-navy-300)", values: cf.debtDraw },
                { label: "Debt repay", color: "var(--ad-danger)", opacity: 0.75, values: cf.debtRepay },
              ]}
              cumulativeValues={cf.net}
              cumulativeOnPrimary
              formatY={v => v === 0 ? "0" : `${(v / 1e6).toFixed(0)}M`}
            />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <EquityCashflowTable yearly={yearly} />
          </div>
        )}
      </div>

    </div>
  );
}

function ProjectCashflowTable({ yearly }) {
  let cumProject = 0;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
      <thead>
        <tr style={{ background: "var(--bg-2)" }}>
          <th style={thStyle}>Year</th>
          <th style={thStyleNum}>Land</th>
          <th style={thStyleNum}>Soft</th>
          <th style={thStyleNum}>Constr.</th>
          <th style={thStyleNum}>Site work</th>
          <th style={thStyleNum}>Cont.</th>
          <th style={thStyleNum}>Sales</th>
          <th style={thStyleNum}>Sell costs</th>
          <th style={thStyleNum}>Rent</th>
          <th style={thStyleNum}>OpEx</th>
          <th style={thStyleNum}>Exit</th>
          <th style={{ ...thStyleNum, background: "var(--ad-navy-50)" }}>Project CF</th>
          <th style={thStyleNum}>Cum.</th>
        </tr>
      </thead>
      <tbody>
        {yearly.map((y) => {
          const project = y.land + y.soft + y.construction + y.siteWork + y.contingency +
                          y.sales + y.selling + y.rent + y.opex + y.exit;
          cumProject += project;
          return (
            <tr key={y.year} style={{ borderBottom: "1px solid var(--border-2)" }}>
              <td style={tdStyle}>Y{y.year + 1}</td>
              <td style={tdNum(y.land)}>{y.land === 0 ? "—" : fc(y.land)}</td>
              <td style={tdNum(y.soft)}>{y.soft === 0 ? "—" : fc(y.soft)}</td>
              <td style={tdNum(y.construction)}>{y.construction === 0 ? "—" : fc(y.construction)}</td>
              <td style={tdNum(y.siteWork)}>{y.siteWork === 0 ? "—" : fc(y.siteWork)}</td>
              <td style={tdNum(y.contingency)}>{y.contingency === 0 ? "—" : fc(y.contingency)}</td>
              <td style={tdNum(y.sales)}>{y.sales === 0 ? "—" : fc(y.sales)}</td>
              <td style={tdNum(y.selling)}>{y.selling === 0 ? "—" : fc(y.selling)}</td>
              <td style={tdNum(y.rent)}>{y.rent === 0 ? "—" : fc(y.rent)}</td>
              <td style={tdNum(y.opex)}>{y.opex === 0 ? "—" : fc(y.opex)}</td>
              <td style={tdNum(y.exit)}>{y.exit === 0 ? "—" : fc(y.exit)}</td>
              <td style={{ ...tdNum(project), fontWeight: 600, background: "var(--ad-navy-50)" }}>{fc(project)}</td>
              <td style={{ ...tdNum(cumProject), color: cumProject < 0 ? "var(--ad-danger)" : "var(--ad-success)" }}>{fc(cumProject)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EquityCashflowTable({ yearly }) {
  let cumEquity = 0;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
      <thead>
        <tr style={{ background: "var(--bg-2)" }}>
          <th style={thStyle}>Year</th>
          <th style={thStyleNum}>Project CF</th>
          <th style={thStyleNum}><span style={{ color: "var(--ad-success)" }}>+ Debt draw</span></th>
          <th style={thStyleNum}><span style={{ color: "var(--ad-danger)" }}>− Debt repay</span></th>
          <th style={thStyleNum}>of which: interest</th>
          <th style={thStyleNum}>Retained cash (end)</th>
          <th style={{ ...thStyleNum, background: "var(--ad-navy-50)" }}>= Equity CF</th>
          <th style={thStyleNum}>Cum. equity</th>
        </tr>
      </thead>
      <tbody>
        {yearly.map((y) => {
          const project = y.land + y.soft + y.construction + y.siteWork + y.contingency +
                          y.sales + y.selling + y.rent + y.opex + y.exit;
          const equity = y.net;
          cumEquity += equity;
          return (
            <tr key={y.year} style={{ borderBottom: "1px solid var(--border-2)" }}>
              <td style={tdStyle}>Y{y.year + 1}</td>
              <td style={tdNum(project)}>{project === 0 ? "—" : fc(project)}</td>
              <td style={{ ...tdNum(y.debtDraw), color: y.debtDraw > 0 ? "var(--ad-success)" : "var(--fg-4)" }}>{y.debtDraw === 0 ? "—" : `+${fc(y.debtDraw).replace("SAR ", "")}`}</td>
              <td style={tdNum(y.debtRepay)}>{y.debtRepay === 0 ? "—" : fc(y.debtRepay)}</td>
              <td style={{ ...tdNum(y.interest), color: "var(--ad-gold-600)", fontSize: 11 }}>{y.interest === 0 ? "—" : fc(y.interest)}</td>
              <td style={{ ...tdNum(y.cashEnd), color: "var(--fg-2)", fontSize: 11 }}>{y.cashEnd < 0.5 ? "—" : fc(y.cashEnd)}</td>
              <td style={{ ...tdNum(equity), fontWeight: 600, background: "var(--ad-navy-50)" }}>{fc(equity)}</td>
              <td style={{ ...tdNum(cumEquity), color: cumEquity < 0 ? "var(--ad-danger)" : "var(--ad-success)" }}>{fc(cumEquity)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CapitalDeployedTable({ cf, yearly }) {
  // From the engine: equityInjected[m] = max(0, uses[m] - debtDraw[m])
  // We aggregate to years for clarity.
  const equityInjected = cf.equityInjected || [];
  const sliceSum = (arr, y) => arr.slice(y * 12, (y + 1) * 12).reduce((s, v) => s + v, 0);
  const horizon = cf.months.length;
  const years = Math.ceil(horizon / 12);

  let cumDebt = 0, cumEquity = 0, cumDeployed = 0;
  const rows = [];
  for (let y = 0; y < years; y++) {
    const debtDraw  = sliceSum(cf.debtDraw, y);
    const equityIn  = sliceSum(equityInjected, y);
    const debtRepay = sliceSum(cf.debtRepay, y);
    const deployed  = debtDraw + equityIn;
    cumDebt += debtDraw;
    cumEquity += equityIn;
    cumDeployed += deployed;
    if (Math.abs(deployed) < 0.5 && Math.abs(debtRepay) < 0.5) continue;
    rows.push({ y, debtDraw, equityIn, deployed, debtRepay, cumDebt, cumEquity, cumDeployed });
  }

  const totalDebt   = rows.reduce((s, r) => s + r.debtDraw, 0);
  const totalEquity = rows.reduce((s, r) => s + r.equityIn, 0);
  const totalRepay  = rows.reduce((s, r) => s + r.debtRepay, 0);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
      <thead>
        <tr style={{ background: "var(--bg-2)" }}>
          <th style={thStyle}>Year</th>
          <th style={thStyleNum}><span style={{ color: "var(--ad-navy-500)" }}>Debt draw</span></th>
          <th style={thStyleNum}><span style={{ color: "var(--ad-navy-900)" }}>Equity contribution</span></th>
          <th style={{ ...thStyleNum, background: "var(--ad-navy-50)" }}>Total deployed</th>
          <th style={thStyleNum}>Debt repay</th>
          <th style={thStyleNum}>Cum. debt drawn</th>
          <th style={thStyleNum}>Cum. equity contrib.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.y} style={{ borderBottom: "1px solid var(--border-2)" }}>
            <td style={tdStyle}>Y{r.y + 1}</td>
            <td style={{ ...tdNum(r.debtDraw), color: r.debtDraw > 0 ? "var(--ad-navy-500)" : "var(--fg-4)" }}>{r.debtDraw === 0 ? "—" : fc(r.debtDraw)}</td>
            <td style={{ ...tdNum(r.equityIn), color: r.equityIn > 0 ? "var(--ad-navy-900)" : "var(--fg-4)" }}>{r.equityIn === 0 ? "—" : fc(r.equityIn)}</td>
            <td style={{ ...tdNum(r.deployed), fontWeight: 600, background: "var(--ad-navy-50)" }}>{r.deployed === 0 ? "—" : fc(r.deployed)}</td>
            <td style={tdNum(r.debtRepay)}>{r.debtRepay === 0 ? "—" : fc(r.debtRepay)}</td>
            <td style={{ ...tdNum(r.cumDebt), color: "var(--fg-2)", fontSize: 11 }}>{fc(r.cumDebt)}</td>
            <td style={{ ...tdNum(r.cumEquity), color: "var(--fg-2)", fontSize: 11 }}>{fc(r.cumEquity)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: "var(--bg-2)", borderTop: "2px solid var(--border-strong)" }}>
          <td style={{ ...tdStyle, fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.12em", color: "var(--fg-2)" }}>Total</td>
          <td style={{ ...tdNum(totalDebt), fontWeight: 700, color: "var(--ad-navy-500)" }}>{fc(totalDebt)}</td>
          <td style={{ ...tdNum(totalEquity), fontWeight: 700, color: "var(--ad-navy-900)" }}>{fc(totalEquity)}</td>
          <td style={{ ...tdNum(totalDebt + totalEquity), fontWeight: 700, background: "var(--ad-navy-50)" }}>{fc(totalDebt + totalEquity)}</td>
          <td style={{ ...tdNum(totalRepay), fontWeight: 700 }}>{fc(totalRepay)}</td>
          <td colSpan={2} style={{ ...tdStyle, fontSize: 10, color: "var(--fg-4)", textAlign: "right" }}>Funds the uses = capital tab Sources</td>
        </tr>
      </tfoot>
    </table>
  );
}

const thStyle = { padding: "10px 12px", textAlign: "left", fontWeight: 500, fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)" };
const thStyleNum = { ...thStyle, textAlign: "right" };
const tdStyle = { padding: "8px 12px", color: "var(--fg-1)" };
const tdNum = (v) => ({
  padding: "8px 12px", textAlign: "right",
  color: v === 0 ? "var(--fg-4)" : v < 0 ? "var(--ad-danger)" : "var(--fg-1)",
  fontVariantNumeric: "tabular-nums",
});

/* ---------- Cost breakdown panel ---------- */

function CostPanel({ result, input }) {
  const k = result.kpi;
  const totalDev = k.devCostExFinance;
  const totalAll = totalDev + k.totalInterest + k.marketing + k.salesCommission + k.govFees;

  const donutData = [
    { label: "Land", value: k.landCost, color: "var(--ad-navy-900)" },
    { label: "Transfer fees", value: k.landTransferFees, color: "var(--ad-navy-700)" },
    { label: "Construction", value: k.constructionCost, color: "var(--ad-navy-500)" },
    { label: "Infrastructure", value: k.landInfraCost || 0, color: "var(--ad-navy-600)" },
    { label: "Site work", value: k.siteWorkCost - (k.landInfraCost || 0), color: "var(--ad-navy-400)" },
    { label: "Soft", value: k.softCosts, color: "var(--ad-navy-300)" },
    { label: "Contingency", value: k.contingency, color: "var(--ad-sand-500)" },
    { label: "Selling", value: k.marketing + k.salesCommission + k.govFees, color: "var(--ad-sand-300)" },
    { label: "Interest", value: k.totalInterest, color: "var(--ad-danger)" },
  ].filter(d => d.value > 0);

  const barData = donutData.map(d => ({ label: d.label, value: d.value, color: d.color }));

  const waterfallSteps = [
    { label: "Revenue", value: k.totalRevenue, type: "start" },
    { label: "−Land",   value: -(k.landCost + k.landTransferFees),    type: "delta" },
    { label: "−Constr.", value: -k.constructionCost, type: "delta" },
    { label: "−Infra",   value: -(k.landInfraCost || 0), type: "delta" },
    { label: "−Site",    value: -(k.siteWorkCost - (k.landInfraCost || 0)), type: "delta" },
    { label: "−Soft",    value: -k.softCosts, type: "delta" },
    { label: "−Cont.",   value: -k.contingency, type: "delta" },
    { label: "−Selling", value: -(k.marketing + k.salesCommission + k.govFees), type: "delta" },
    { label: "−Interest", value: -k.totalInterest, type: "delta" },
    { label: "Profit",   value: k.profit, type: "end" },
  ].filter(s => s.type !== "delta" || Math.abs(s.value) > 0.5);

  return (
    <div style={{ padding: 32 }}>
      <Eyebrow>Cost build-up</Eyebrow>
      <h2 style={{ fontSize: 24, marginTop: 6, marginBottom: 24 }}>Where the money goes</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Cost stack</Eyebrow>
          <div style={{ marginTop: 14 }}>
            <HBars data={barData} formatV={fc} height={Math.max(200, barData.length * 38)} />
          </div>
          <div style={{
            marginTop: 14, paddingTop: 12, borderTop: "2px solid var(--border-strong)",
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
          }}>
            <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600 }}>Total cost · all-in</span>
            <span className="tabnum" style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--ad-navy-900)" }}>{fc(totalAll)}</span>
          </div>
        </div>

        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Composition</Eyebrow>
          <div style={{ display: "flex", gap: 24, marginTop: 16, alignItems: "center" }}>
            <Donut data={donutData} size={180} thickness={22} />
            <div style={{ flex: 1 }}>
              {donutData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: i < donutData.length - 1 ? "1px solid var(--border-1)" : "none", fontSize: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, background: d.color, display: "inline-block" }} />
                    <span style={{ color: "var(--fg-2)" }}>{d.label}</span>
                  </span>
                  <span className="tabnum" style={{ color: "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>{fp(d.value / totalAll)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Units & revenue panel ---------- */

function ProgramPanel({ result, input }) {
  const k = result.kpi;
  const cf = result.cashflow;
  const totalSales = cf.sales.reduce((s, v) => s + v, 0);

  return (
    <div style={{ padding: 32 }}>
      <Eyebrow>Unit mix · sales velocity · NOI</Eyebrow>
      <h2 style={{ fontSize: 24, marginTop: 6, marginBottom: 24 }}>Program & revenue</h2>

      <div style={{ border: "1px solid var(--border-1)", background: "var(--bg-1)", marginBottom: 24 }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-1)" }}>
          <Eyebrow>Component table</Eyebrow>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg-2)" }}>
                <th style={thStyle}>Component</th>
                <th style={thStyle}>Mode</th>
                <th style={thStyleNum}>Land %</th>
                <th style={thStyleNum}>FAR</th>
                <th style={thStyleNum}>GFA</th>
                <th style={thStyleNum}>NSA</th>
                <th style={thStyleNum}>Units / Keys</th>
                <th style={thStyleNum}>Price / Rent</th>
                <th style={thStyleNum}>Exit cap</th>
                <th style={thStyleNum}>Exit value</th>
                <th style={thStyleNum}>Timing</th>
              </tr>
            </thead>
            <tbody>
              {result.components.filter(c => c.enabled).map((c) => {
                const isLease = c.mode === "lease";
                const basis = c.revenueBasis || "sqm";
                let priceLabel = "—";
                if (c.mode === "sale") {
                  if (basis === "sqm")  priceLabel = `${fn(c.pricePerSqm)} SAR/m²`;
                  if (basis === "unit") priceLabel = `${fn(c.pricePerUnit)} SAR/unit`;
                  if (basis === "key")  priceLabel = `${fn(c.pricePerKey)} SAR/key`;
                } else if (isLease) {
                  if (basis === "sqm")  priceLabel = `${fn(c.rentPerSqmYr)} SAR/m²·yr`;
                  if (basis === "unit") priceLabel = `${fn(c.rentPerUnitYr)} SAR/unit·yr`;
                  if (basis === "key")  priceLabel = `${fn(c.adr)} SAR ADR`;
                }
                const unitsKeys = basis === "key" ? `${fn(c.keys)} keys` : `${fn(c.units)} units`;
                const timing = c.mode === "sale"
                  ? `${c.salesPeriodMonths} mo sales`
                  : `${c.operatingPeriodMonths} mo hold`;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border-2)" }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ ...tdStyle, color: "var(--fg-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{c.mode}</td>
                    <td style={tdNum(c.allocationPct)}>{fp(c.allocationPct, 1)}</td>
                    <td style={tdNum(c.far)}>{(+c.far).toFixed(2)}</td>
                    <td style={tdNum(c.gfa)}>{fn(c.gfa)}</td>
                    <td style={tdNum(c.nsa)}>{fn(c.nsa)}</td>
                    <td style={tdNum(1)}>{unitsKeys}</td>
                    <td style={tdNum(1)}>{priceLabel}</td>
                    <td style={tdNum(c.exitCapRate)}>{isLease ? fp(c.exitCapRate, 2) : "—"}</td>
                    <td style={tdNum(c.exitValue)}>{c.exitValue ? fc(c.exitValue) : "—"}</td>
                    <td style={{ ...tdNum(1), fontSize: 11, color: "var(--fg-3)" }}>{timing}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Sales — annual</Eyebrow>
          <StackedBars
            months={cf.months}
            height={200}
            series={[
              { label: "Sales", color: "var(--ad-success)", values: cf.sales },
              /* Display-only: commission is charged pro-rata to sales in the
                 engine, so the monthly series is exactly sales × pct. The
                 cumulative line then shows sales net of commission. */
              { label: "Sales commission", color: "var(--ad-sand-900)", values: cf.sales.map(v => -(v * (+input.salesCommissionPct || 0))) },
            ]}
            formatY={v => `${(v / 1e6).toFixed(1)}M`}
          />
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px 12px", fontSize: 11, color: "var(--fg-3)", marginTop: 8 }}>
            <span>Total sales: <span style={{ color: "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>{fc(totalSales)}</span></span>
            <span>Net sales (after commission): <span style={{ color: "var(--fg-1)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fc(totalSales * (1 - (+input.salesCommissionPct || 0)))}</span></span>
            <span>Avg velocity: <span style={{ color: "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>{fc(totalSales / Math.max(1, cf.sales.filter(v=>v>0).length))}/mo</span></span>
          </div>
        </div>

        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Rent / lease income — annual</Eyebrow>
          <StackedBars
            months={cf.months}
            height={200}
            series={[
              { label: "Rent", color: "var(--ad-gold-500)", values: cf.rent },
              { label: "OpEx", color: "var(--ad-sand-900)", values: cf.opex },
            ]}
            formatY={v => `${(v / 1e6).toFixed(1)}M`}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-3)", marginTop: 8 }}>
            <span>Stab. gross: <span style={{ color: "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>{fc(k.totalGrossIncome)}/yr</span></span>
            <span>Stab. NOI: <span style={{ color: "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>{fc(k.totalNOI)}/yr</span></span>
            <span>Operating starts: <span style={{ color: "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>M{(input.predesignMonths || 0) + (input.constructionMonths || 0)}</span></span>
          </div>
        </div>
      </div>

      {result.components.filter(c => c.enabled && c.noi > 0).length > 0 && (
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)", marginTop: 24 }}>
          <Eyebrow>Annual rent income build-up by component</Eyebrow>
          <div style={{ marginTop: 16 }}>
            {result.components.filter(c => c.enabled && c.noi > 0).map((c, i) => {
              const maxGross = Math.max(...result.components.map(c2 => c2.grossIncome || 0));
              const ratio = (c.grossIncome || 0) / Math.max(1, maxGross);
              const noiRatio = (c.noi || 0) / Math.max(1, c.grossIncome || 1);
              return (
                <div key={c.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--fg-2)" }}>{c.name} <span style={{ color: "var(--fg-4)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginLeft: 6 }}>{c.mode}</span></span>
                    <span className="tabnum" style={{ color: "var(--fg-1)" }}>
                      <span style={{ color: "var(--ad-gold-500)" }}>{fc(c.grossIncome)}</span>
                      <span style={{ color: "var(--fg-3)", margin: "0 6px" }}>−</span>
                      <span style={{ color: "var(--ad-sand-900)" }}>{fc(c.opex)}</span>
                      <span style={{ color: "var(--fg-3)", margin: "0 6px" }}>→</span>
                      <span style={{ fontWeight: 600 }}>{fc(c.noi)}</span>
                      <span style={{ color: "var(--fg-3)", fontSize: 10, marginInlineStart: 6 }}>NOI / yr</span>
                    </span>
                  </div>
                  {/* Full bar length = gross income; the solid part is the NOI
                      kept, the hatched tail is the OpEx deducted (track colour
                      shows through the dashes). */}
                  <div style={{ height: 10, background: "var(--bg-3)", position: "relative" }}>
                    <div style={{ position: "absolute", insetInlineStart: 0, top: 0, height: "100%", width: `${ratio * noiRatio * 100}%`, background: "var(--ad-navy-800)" }} />
                    <div style={{
                      position: "absolute", insetInlineStart: `${ratio * noiRatio * 100}%`, top: 0, height: "100%",
                      width: `${ratio * (1 - noiRatio) * 100}%`,
                      backgroundImage: "repeating-linear-gradient(45deg, var(--ad-sand-700) 0, var(--ad-sand-700) 3px, transparent 3px, transparent 7px)",
                      border: "1px dashed var(--ad-sand-700)", boxSizing: "border-box",
                    }} />
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 18, fontSize: 10, color: "var(--fg-3)", marginTop: 6, flexWrap: "wrap" }}>
              <Legend color="var(--ad-navy-800)" label="NOI (after OpEx)" />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 12, height: 10, flexShrink: 0,
                  backgroundImage: "repeating-linear-gradient(45deg, var(--ad-sand-700) 0, var(--ad-sand-700) 3px, transparent 3px, transparent 7px)",
                  border: "1px dashed var(--ad-sand-700)", boxSizing: "border-box",
                }} />
                OpEx (deducted)
              </span>
              <span style={{ color: "var(--fg-4)" }}>Full bar = gross income</span>
            </div>
          </div>
        </div>
      )}

      {/* Whole-period totals — leasing NOI and net sales proceeds.
          Display-only: sums of the engine's monthly cashflow series. */}
      {(() => {
        const totalRentAll = cf.rent.reduce((a, v) => a + v, 0);
        const totalOpexAll = -cf.opex.reduce((a, v) => a + v, 0);
        const totalNOIAll = totalRentAll - totalOpexAll;
        const totalExitAll = cf.exit.reduce((a, v) => a + v, 0);
        const grossSalesAll = cf.sales.reduce((a, v) => a + v, 0);
        const commissionAll = grossSalesAll * (+input.salesCommissionPct || 0);
        const netSalesAll = grossSalesAll - commissionAll;
        if (totalRentAll <= 0 && grossSalesAll <= 0) return null;

        const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", fontSize: 13, borderBottom: "1px dashed var(--border-2)" };
        const totalRowStyle = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0 2px", fontSize: 15, fontWeight: 600 };

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
            {totalRentAll > 0 && (
              <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
                <Eyebrow>Leasing — whole-period totals</Eyebrow>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>All leasable components, over the full operating period</div>
                <div style={{ marginTop: 12 }}>
                  <div style={rowStyle}>
                    <span style={{ color: "var(--fg-2)" }}>Operating income (collected)</span>
                    <span className="tabnum" style={{ color: "var(--ad-gold-600)", fontWeight: 600 }}>{fc(totalRentAll)}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ color: "var(--fg-2)" }}>Operating expenses</span>
                    <span className="tabnum" style={{ color: "var(--ad-danger)" }}>− {fc(totalOpexAll)}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>Total NOI (whole period)</span>
                    <span className="tabnum" style={{ color: "var(--ad-navy-900)", fontWeight: 600 }}>{fc(totalNOIAll)}</span>
                  </div>
                  {totalExitAll > 0 && (
                    <div style={rowStyle}>
                      <span style={{ color: "var(--fg-2)" }}>Net exit proceeds</span>
                      <span className="tabnum" style={{ color: "var(--ad-gold-600)", fontWeight: 600 }}>+ {fc(totalExitAll)}</span>
                    </div>
                  )}
                  <div style={totalRowStyle}>
                    <span>Total (NOI + exit proceeds)</span>
                    <span className="tabnum" style={{ color: "var(--ad-navy-900)" }}>{fc(totalNOIAll + totalExitAll)}</span>
                  </div>
                </div>
              </div>
            )}
            {grossSalesAll > 0 && (
              <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
                <Eyebrow>Sales — total proceeds</Eyebrow>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>All sold components</div>
                <div style={{ marginTop: 12 }}>
                  <div style={rowStyle}>
                    <span style={{ color: "var(--fg-2)" }}>Gross sales</span>
                    <span className="tabnum" style={{ color: "var(--ad-success)", fontWeight: 600 }}>{fc(grossSalesAll)}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ color: "var(--fg-2)" }}>Sales commission</span>
                    <span className="tabnum" style={{ color: "var(--ad-danger)" }}>− {fc(commissionAll)}</span>
                  </div>
                  <div style={totalRowStyle}>
                    <span>Net sales proceeds</span>
                    <span className="tabnum" style={{ color: "var(--ad-navy-900)" }}>{fc(netSalesAll)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ---------- Sensitivity panel ---------- */

/* Numbered heading for the tornado blocks — same treatment as the Fund tab and
   the valuation result panels, so each chart announces itself. */
function SensHead({ n, title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, lineHeight: 1,
          padding: "4px 6px", borderRadius: 3, flexShrink: 0,
          background: "var(--ad-navy-800)", color: "#FFFFFF",
        }}>{String(n).padStart(2, "0")}</span>
        <h3 style={{
          margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--fg-1)",
        }}>{title}</h3>
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.55, marginTop: 5, maxWidth: 760 }}>{sub}</div>
      )}
    </div>
  );
}

function SensitivityPanel({ result, input }) {
  const drivers = [
    { key: "landPricePerSqm",        label: "Land price / m²" },
    { key: "interestRate",           label: "Interest rate" },
    { key: "ltc",                    label: "LTC" },
    { key: "softCostsPct",           label: "Soft costs %" },
    { key: "contingencyPct",         label: "Contingency %" },
    { key: "marketingPct",           label: "Marketing %" },
    { key: "salesCommissionPct",     label: "Sales commission" },
    { key: "govFeesPct",             label: "Gov / sales fees" },
    { key: "constructionMonths",     label: "Construction duration" },
  ];
  /* Per-component price/cost drivers.

     A Mixed-Use Building holds its price, rent, build cost and cap rate on its
     spaces rather than on itself, and its mode is "mixed" — so driving off the
     component alone would yield no revenue drivers at all and one dead build-
     cost driver pointing at a field the engine ignores. Walk the spaces
     instead; `patch()` already resolves nested paths like
     components[0].subs[1].rentPerSqmYr. */
  const pushUnitDrivers = (u, basePath, keyPrefix, label) => {
    if (u.costPerSqmGFA) {
      drivers.push({ key: `${keyPrefix}_buildcost`, label: `${label} build cost`, path: `${basePath}.costPerSqmGFA` });
    }
    if (u.mode === "sale") {
      if (u.pricePerSqm)  drivers.push({ key: `${keyPrefix}_psqm`,  label: `${label} price/m²`,   path: `${basePath}.pricePerSqm`  });
      if (u.pricePerUnit) drivers.push({ key: `${keyPrefix}_punit`, label: `${label} price/unit`, path: `${basePath}.pricePerUnit` });
      if (u.pricePerKey)  drivers.push({ key: `${keyPrefix}_pkey`,  label: `${label} price/key`,  path: `${basePath}.pricePerKey`  });
    }
    if (u.mode === "lease") {
      if (u.rentPerSqmYr)  drivers.push({ key: `${keyPrefix}_rsqm`,  label: `${label} rent/m²`,   path: `${basePath}.rentPerSqmYr`  });
      if (u.rentPerUnitYr) drivers.push({ key: `${keyPrefix}_runit`, label: `${label} rent/unit`, path: `${basePath}.rentPerUnitYr` });
      if (u.adr)           drivers.push({ key: `${keyPrefix}_adr`,   label: `${label} ADR`,       path: `${basePath}.adr`           });
      if (u.exitCapRate)   drivers.push({ key: `${keyPrefix}_cap`,   label: `${label} exit cap`,  path: `${basePath}.exitCapRate`   });
    }
  };

  input.components.forEach((c, i) => {
    if (!c.enabled) return;
    if (Array.isArray(c.subs)) {
      c.subs.forEach((s, j) => {
        if (s.enabled === false) return;
        pushUnitDrivers(s, `components[${i}].subs[${j}]`, `comp_${i}_sub_${j}`, `${c.name} — ${s.name}`);
      });
    } else {
      pushUnitDrivers(c, `components[${i}]`, `comp_${i}`, c.name);
    }
  });

  // One pass gives both metrics; each chart is sorted by its own impact.
  const tornado = useMemoR(() => Feas.tornado(input, drivers, 0.10), [input]);
  const tornadoProfit = useMemoR(
    () => tornado.slice().sort((a, b) => b.deltaProfit - a.deltaProfit),
    [tornado]);
  const chartH = (rows) => Math.max(220, 30 * Math.min(rows.length, 10) + 40);

  return (
    <div style={{ padding: 32 }}>
      <Eyebrow>Sensitivity</Eyebrow>
      <h2 style={{ fontSize: 24, marginTop: 6, marginBottom: 24 }}>What moves the needle</h2>

      {/* How to read a tornado — stated once, above both charts */}
      <div style={{
        padding: "14px 18px", marginBottom: 24, background: "var(--bg-1)",
        border: "1px solid var(--border-1)", borderInlineStart: "3px solid var(--ad-gold-500)",
        fontSize: 12.5, lineHeight: 1.7, color: "var(--fg-2)", maxWidth: 900,
      }}>
        {/* Kept as whole sentences, not fragments around inline markup — the
            translator matches complete strings, and Arabic reorders words. */}
        <div style={{ color: "var(--fg-1)", fontWeight: 600, marginBottom: 4 }}>How to read these charts</div>
        <div>Each driver is moved 10% above and 10% below the value you entered — one driver at a time, with every other assumption held fixed. The widest rows are the inputs your return depends on most.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 12, height: 12, background: "var(--ad-danger)", flexShrink: 0 }} />
            Weaker of the two results
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 12, height: 12, background: "var(--ad-success)", flexShrink: 0 }} />
            Stronger of the two results
          </span>
        </div>
      </div>

      <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)", marginBottom: 24 }}>
        <SensHead n={1} title="Equity IRR sensitivity"
          sub="How far the investors' return moves when each driver is flexed ±10%." />
        {/* With no equity called there is no equity IRR to flex — every bar
            would read 0.0%. Explain it instead of drawing an empty chart. */}
        {(result.kpi.totalEquity || 0) < 0.5 ? (
          <div style={{
            marginTop: 16, padding: "14px 18px", background: "var(--bg-2)",
            borderInlineStart: "3px solid var(--ad-gold-500)",
            fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.6,
          }}>
            <strong style={{ color: "var(--fg-1)" }}>No equity was called.</strong>{" "}
            Project income and the debt facility cover every funding need, so no investor cash is
            required and there is no equity IRR to measure — which is why shifting any driver leaves
            it unchanged. Use the profit sensitivity below to compare what moves the return.
          </div>
        ) : (
          <Tornado data={tornado.slice(0, 10)} height={chartH(tornado)} />
        )}
      </div>

      <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
        <SensHead n={2} title="Profit sensitivity"
          sub="How far net profit moves when each driver is flexed ±10%." />
        <Tornado
          data={tornadoProfit.slice(0, 10)}
          height={chartH(tornadoProfit)}
          loKey="profitLo" hiKey="profitHi" baseKey="baseProfit"
          format={fc}
          /* Bars use a compact, symbol-free number: currency strings carry
             bidi isolate marks that scramble inside the LTR-forced SVG. */
          formatBar={(v) => {
            const a = Math.abs(v), sign = v < 0 ? "-" : "";
            if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(2)}B`;
            if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)}M`;
            if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(0)}K`;
            return `${sign}${a.toFixed(0)}`;
          }}
          baseLabel="Base profit"
        />
      </div>
    </div>
  );
}

/* ---------- Monte Carlo panel ---------- */

function MonteCarloPanel({ input }) {
  const [trials, setTrials] = useStateR(400);
  const [tick, setTick] = useStateR(0);

  const mc = useMemoR(() => Feas.monteCarlo(input, trials), [input, trials, tick]);

  return (
    <div style={{ padding: 32 }}>
      <Eyebrow>Monte Carlo</Eyebrow>
      <h2 style={{ fontSize: 24, marginTop: 6, marginBottom: 24 }}>Probabilistic outcomes</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Trials</span>
        {[200, 400, 800, 1600].map(n => (
          <button key={n} onClick={() => setTrials(n)} style={{
            fontSize: 11, padding: "5px 12px", border: "1px solid var(--border-1)",
            background: trials === n ? "var(--ad-navy-800)" : "transparent",
            color: trials === n ? "white" : "var(--fg-2)",
            cursor: "pointer", letterSpacing: "0.08em", fontVariantNumeric: "tabular-nums",
          }}>{n}</button>
        ))}
        <button onClick={() => setTick(t => t + 1)} style={{
          fontSize: 11, padding: "5px 12px", border: "1px solid var(--border-1)",
          color: "var(--fg-2)", background: "transparent", cursor: "pointer", marginLeft: 12,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>↻ Re-run</button>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-3)" }}>
          Shocks: ±7% pricing · ±8% cost · ±2mo delay · ±5% occupancy
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <KPI eyebrow="P50 IRR" value={fp(mc.irrP50)} tone="default" />
        <KPI eyebrow="P10 → P90" value={`${fp(mc.irrP10)} → ${fp(mc.irrP90)}`} />
        <KPI eyebrow="Prob ≥ Hurdle" value={fp(mc.probAboveHurdle)} tone={mc.probAboveHurdle > 0.7 ? "positive" : mc.probAboveHurdle > 0.4 ? "warning" : "negative"} sub={`vs ${fp(input.discountRate)}`} />
        <KPI eyebrow="Prob loss" value={fp(1 - mc.probPositive)} tone={(1 - mc.probPositive) < 0.1 ? "positive" : "warning"} />
      </div>

      <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)", marginBottom: 16 }}>
        <Eyebrow>Equity IRR distribution</Eyebrow>
        <Histogram values={mc.irrs} bins={32} height={220} target={input.discountRate} formatX={v => fp(v, 0)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Equity NPV distribution</Eyebrow>
          <Histogram values={mc.npvs} bins={32} height={180} target={0} formatX={v => fc(v)} />
        </div>
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Levered profit distribution</Eyebrow>
          <Histogram values={mc.profits} bins={32} height={180} target={0} formatX={v => fc(v)} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Waterfall (debt + equity) panel ---------- */

function WaterfallPanel({ result, input }) {
  const cf = result.cashflow;
  const k = result.kpi;
  // Chart-first presentation with a Table flip, same as the Cash Flow tab.
  const [covView, setCovView] = React.useState("chart");
  const [usesView, setUsesView] = React.useState("chart");
  const [debtView, setDebtView] = React.useState("chart");

  return (
    <div style={{ padding: 32 }}>
      <Eyebrow>Capital structure</Eyebrow>
      <h2 style={{ fontSize: 24, marginTop: 6, marginBottom: 24 }}>Debt & equity waterfall</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <KPI eyebrow="Debt drawn" value={fc(k.debtDrawnTotal || 0)} sub={(() => {
          const facility = k.devCostExFinance * input.ltc;
          const peakPct = facility > 0 ? (k.peakDebt || 0) / facility : 0;
          // Revolver: repaid amounts re-open the facility, so gross draws can
          // exceed the cap — peak BALANCE vs cap is the meaningful usage.
          return `Facility ${fc(facility)} (${fp(input.ltc)} LTC) · peak balance ${fp(peakPct)} of cap`;
        })()} />
        <KPI eyebrow="Equity contributed" value={fc(k.totalEquity)} sub={`Total capital called${k.peakEquity && Math.abs(k.peakEquity - k.totalEquity) > 1 ? ` · peak ${fc(k.peakEquity)}` : ""}`} />
        <KPI eyebrow="Peak debt outstanding" value={fc(k.peakDebt)} sub="Max balance at any month" />
        <KPI eyebrow="Total interest paid" value={fc(k.totalInterest)} />
      </div>

      <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Eyebrow>Sources cover uses · over time</Eyebrow>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-2)", margin: "6px 0 14px" }}>
              Cumulative funding stack vs cumulative project spend
            </h3>
          </div>
          <ChartTableToggle view={covView} setView={setCovView} />
        </div>
        {covView === "chart" ? <CoverageChart cf={cf} k={k} /> : <CoverageYearTable cf={cf} />}
      </div>

      <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Eyebrow>Uses incurred · over time</Eyebrow>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-2)", margin: "6px 0 14px" }}>
              Cumulative spend broken down by category
            </h3>
          </div>
          <ChartTableToggle view={usesView} setView={setUsesView} />
        </div>
        {usesView === "chart" ? <UsesChart cf={cf} /> : <UsesYearTable cf={cf} />}
      </div>

      <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Eyebrow>Debt schedule · balance, draws & repayments</Eyebrow>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-2)", margin: "6px 0 14px" }}>
              Outstanding balance (top) · monthly draws and repayments (bottom)
            </h3>
          </div>
          <ChartTableToggle view={debtView} setView={setDebtView} />
        </div>
        {debtView === "chart" ? <DebtChart cf={cf} input={input} /> : <DebtScheduleTable cf={cf} input={input} k={k} />}
        <CashSweepTable cf={cf} />
      </div>

      <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
        <Eyebrow>Uses &amp; Sources</Eyebrow>
        <ReturnsSplit k={k} input={input} />
      </div>
    </div>
  );
}

/* ---------- Shared Chart/Table toggle (same pattern as the Cash Flow tab) ---------- */

function ChartTableToggle({ view, setView }) {
  return (
    <div style={{ display: "flex", border: "1px solid var(--border-1)", flexShrink: 0 }}>
      {["chart", "table"].map((v, i) => (
        <button key={v} type="button" onClick={() => setView(v)} style={{
          padding: "5px 14px", cursor: "pointer", border: "none",
          borderInlineStart: i > 0 ? "1px solid var(--border-1)" : "none",
          background: view === v ? "var(--ad-navy-800)" : "transparent",
          color: view === v ? "white" : "var(--fg-2)",
          fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600,
          fontFamily: "var(--font-body)",
        }}>{v === "chart" ? "Chart" : "Table"}</button>
      ))}
    </div>
  );
}

/* ---------- Yearly table twins of the Capital coverage charts ---------- */

function CoverageYearTable({ cf }) {
  const n = cf.months.length;
  const years = Math.ceil(n / 12);
  const slice = (arr, y) => (arr || []).slice(y * 12, (y + 1) * 12).reduce((s, v) => s + v, 0);
  let cumUses = 0;
  const rows = [];
  for (let y = 0; y < years; y++) {
    const equity = slice(cf.equityInjected, y);
    const uses = slice(cf.totalUses, y);
    const revenue = slice(cf.revenueApplied, y);
    // Same residual identity the chart uses: uses ≡ equity + debt + revenue
    const debt = Math.max(0, uses - equity - revenue);
    cumUses += uses;
    if (uses < 0.5 && equity < 0.5 && revenue < 0.5) continue;
    rows.push({ y, equity, debt, revenue, uses, cumUses });
  }
  const tot = rows.reduce((t, r) => ({ equity: t.equity + r.equity, debt: t.debt + r.debt, revenue: t.revenue + r.revenue, uses: t.uses + r.uses }), { equity: 0, debt: 0, revenue: 0, uses: 0 });
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
        <thead>
          <tr style={{ background: "var(--bg-2)" }}>
            <th style={thStyle}>Year</th>
            <th style={thStyleNum}>Equity injected</th>
            <th style={thStyleNum}>Debt drawn (incl. capitalised interest)</th>
            <th style={thStyleNum}>Revenue applied to costs</th>
            <th style={{ ...thStyleNum, background: "var(--ad-navy-50)" }}>Total uses</th>
            <th style={thStyleNum}>Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.y} style={{ borderBottom: "1px solid var(--border-2)" }}>
              <td style={tdStyle}>Y{r.y + 1}</td>
              <td style={{ ...tdNum(r.equity), color: r.equity > 0.5 ? "var(--ad-navy-900)" : "var(--fg-4)" }}>{r.equity > 0.5 ? fc(r.equity) : "—"}</td>
              <td style={{ ...tdNum(r.debt), color: r.debt > 0.5 ? "var(--ad-navy-500)" : "var(--fg-4)" }}>{r.debt > 0.5 ? fc(r.debt) : "—"}</td>
              <td style={{ ...tdNum(r.revenue), color: r.revenue > 0.5 ? "var(--ad-gold-600)" : "var(--fg-4)" }}>{r.revenue > 0.5 ? fc(r.revenue) : "—"}</td>
              <td style={{ ...tdNum(r.uses), fontWeight: 600, background: "var(--ad-navy-50)" }}>{fc(r.uses)}</td>
              <td style={{ ...tdNum(r.cumUses), color: "var(--fg-2)", fontSize: 11 }}>{fc(r.cumUses)}</td>
            </tr>
          ))}
          <tr style={{ background: "var(--bg-2)", borderTop: "2px solid var(--border-strong)" }}>
            <td style={{ ...tdStyle, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 10 }}>Total</td>
            <td style={{ ...tdNum(tot.equity), fontWeight: 700, color: "var(--ad-navy-900)" }}>{fc(tot.equity)}</td>
            <td style={{ ...tdNum(tot.debt), fontWeight: 700, color: "var(--ad-navy-500)" }}>{fc(tot.debt)}</td>
            <td style={{ ...tdNum(tot.revenue), fontWeight: 700, color: "var(--ad-gold-600)" }}>{fc(tot.revenue)}</td>
            <td style={{ ...tdNum(tot.uses), fontWeight: 700, background: "var(--ad-navy-50)" }}>{fc(tot.uses)}</td>
            <td style={tdStyle} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function UsesYearTable({ cf }) {
  const cats = cf.usesByCat || {};
  const n = cf.months.length;
  const years = Math.ceil(n / 12);
  const slice = (arr, y) => (arr || []).slice(y * 12, (y + 1) * 12).reduce((s, v) => s + v, 0);
  let cum = 0;
  const rows = [];
  for (let y = 0; y < years; y++) {
    const r = {
      y,
      land: slice(cats.land, y),
      construction: slice(cats.construction, y),
      siteWork: slice(cats.siteWork, y),
      soft: slice(cats.soft, y),
      contingency: slice(cats.contingency, y),
      selling: slice(cats.marketing, y),
      interest: slice(cats.interest, y),
    };
    r.total = r.land + r.construction + r.siteWork + r.soft + r.contingency + r.selling + r.interest;
    cum += r.total;
    r.cum = cum;
    if (r.total < 0.5) continue;
    rows.push(r);
  }
  const keys = ["land", "construction", "siteWork", "soft", "contingency", "selling", "interest", "total"];
  const tot = rows.reduce((t, r) => { keys.forEach(kk => t[kk] += r[kk]); return t; }, { land: 0, construction: 0, siteWork: 0, soft: 0, contingency: 0, selling: 0, interest: 0, total: 0 });
  const cell = (v, extra) => <td style={{ ...tdNum(v), ...(extra || {}) }}>{v > 0.5 ? fc(v) : "—"}</td>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
        <thead>
          <tr style={{ background: "var(--bg-2)" }}>
            <th style={thStyle}>Year</th>
            <th style={thStyleNum}>Land</th>
            <th style={thStyleNum}>Construction</th>
            <th style={thStyleNum}>Site work</th>
            <th style={thStyleNum}>Soft costs</th>
            <th style={thStyleNum}>Contingency</th>
            <th style={thStyleNum}>Selling costs</th>
            <th style={thStyleNum}>Interest</th>
            <th style={{ ...thStyleNum, background: "var(--ad-navy-50)" }}>Total uses</th>
            <th style={thStyleNum}>Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.y} style={{ borderBottom: "1px solid var(--border-2)" }}>
              <td style={tdStyle}>Y{r.y + 1}</td>
              {cell(r.land)}{cell(r.construction)}{cell(r.siteWork)}{cell(r.soft)}{cell(r.contingency)}{cell(r.selling)}{cell(r.interest)}
              <td style={{ ...tdNum(r.total), fontWeight: 600, background: "var(--ad-navy-50)" }}>{fc(r.total)}</td>
              <td style={{ ...tdNum(r.cum), color: "var(--fg-2)", fontSize: 11 }}>{fc(r.cum)}</td>
            </tr>
          ))}
          <tr style={{ background: "var(--bg-2)", borderTop: "2px solid var(--border-strong)" }}>
            <td style={{ ...tdStyle, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 10 }}>Total</td>
            {cell(tot.land, { fontWeight: 700 })}{cell(tot.construction, { fontWeight: 700 })}{cell(tot.siteWork, { fontWeight: 700 })}{cell(tot.soft, { fontWeight: 700 })}{cell(tot.contingency, { fontWeight: 700 })}{cell(tot.selling, { fontWeight: 700 })}{cell(tot.interest, { fontWeight: 700 })}
            <td style={{ ...tdNum(tot.total), fontWeight: 700, background: "var(--ad-navy-50)" }}>{fc(tot.total)}</td>
            <td style={tdStyle} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Coverage timeline (sources stack vs uses line) ---------- */

function CoverageChart({ cf, k }) {
  const W = 900, H = 280;
  const padL = 70, padR = 18, padT = 14, padB = 36;
  const months = cf.months;
  const horizon = months.length - 1;

  // Cumulative sources (stacked: equity, debt, revenue)
  const cumsum = (a) => { const o = new Array(a.length); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i] || 0; o[i] = s; } return o; };
  const cumEq  = cumsum(cf.equityInjected || []);
  const cumRev = cumsum(cf.revenueApplied || []);
  const cumUse = cumsum(cf.totalUses || []);
  // Debt cover (cost draws + capitalised interest) is the residual by
  // construction: uses − equity − revenue applied.
  const cumDb  = cumUse.map((v, i) => Math.max(0, v - cumEq[i] - cumRev[i]));

  // Stacked source totals at each month (eq + debt + revenue) ≡ cumUse.
  const max = Math.max(cumUse[horizon] || 1, 1);

  const x = (i) => padL + (i / Math.max(1, horizon)) * (W - padL - padR);
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);

  // Build stacked polygons (bottom → top: equity, debt, revenue)
  const stackArea = (lower, upper) => {
    const top = upper.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const bot = lower.map((v, i) => `${x(i)},${y(v)}`).reverse().join(" ");
    return `${top} ${bot}`;
  };
  const z = new Array(cumEq.length).fill(0);
  const eqTop = cumEq;
  const dbTop = cumEq.map((v, i) => v + cumDb[i]);
  const revTop = dbTop.map((v, i) => v + cumRev[i]);

  // Milestone markers
  const horizonYears = (horizon / 12);
  const ticks = [];
  for (let yr = 0; yr <= Math.ceil(horizonYears); yr++) {
    ticks.push({ m: yr * 12, label: `Y${yr}` });
  }

  // Find construction-end marker if cumUse jumps in a recognizable way
  // (use the predesign+construction midpoint of usage curve as a heuristic — skip)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block" }}>
        {/* Y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={padT + (1 - p) * (H - padT - padB)} y2={padT + (1 - p) * (H - padT - padB)}
              stroke="var(--border-1)" strokeWidth="0.5" />
            <text x={padL - 8} y={padT + (1 - p) * (H - padT - padB) + 3} textAnchor="end" fontSize="10" fill="var(--fg-3)"
              style={{ fontVariantNumeric: "tabular-nums" }}>
              {fc(max * p)}
            </text>
          </g>
        ))}

        {/* Stacked source areas */}
        <polygon points={stackArea(z, eqTop)}  fill="var(--ad-navy-900)" opacity="0.85" />
        <polygon points={stackArea(eqTop, dbTop)} fill="var(--ad-navy-500)" opacity="0.85" />
        <polygon points={stackArea(dbTop, revTop)} fill="var(--ad-gold-500)" opacity="0.75" />

        {/* Uses line on top */}
        <polyline
          fill="none" stroke="var(--ad-ink)" strokeWidth="1.5" strokeDasharray="3 3"
          points={cumUse.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        />

        {/* X year ticks */}
        {ticks.map((t, i) => t.m <= horizon && (
          <g key={i}>
            <line x1={x(t.m)} x2={x(t.m)} y1={padT} y2={H - padB} stroke="var(--border-1)" strokeWidth="0.5" strokeDasharray="2 4" />
            <text x={x(t.m)} y={H - 14} textAnchor="middle" fontSize="10" fill="var(--fg-3)">{t.label}</text>
            <text x={x(t.m)} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--fg-4)">M{t.m}</text>
          </g>
        ))}
      </svg>

      {/* Legend + totals */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 16, fontSize: 11 }}>
        <LegendChip color="var(--ad-navy-900)" label="Equity injected" value={cf.coverageTotals?.equity} />
        <LegendChip color="var(--ad-navy-500)" label="Debt drawn (incl. capitalised interest)" value={cf.coverageTotals?.debt} />
        <LegendChip color="var(--ad-gold-500)" label="Revenue applied" value={cf.coverageTotals?.revenue} />
        <LegendChip color="transparent" dashed label="Uses incurred (cumulative)" value={cumUse[horizon]} />
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--fg-3)" }}>
        Horizon auto-sized to <span className="tabnum" style={{ color: "var(--fg-1)", fontWeight: 500 }}>{horizon} months</span> ({(horizon / 12).toFixed(1)} yrs) — predesign + construction + sell-down / hold + tail.
      </div>
    </div>
  );
}

function LegendChip({ color, label, value, dashed }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 18, height: 10, background: color,
        border: dashed ? "1.5px dashed var(--ad-ink)" : "none",
      }} />
      <span style={{ color: "var(--fg-2)" }}>{label}</span>
      {value !== undefined && (
        <span className="tabnum" style={{ color: "var(--fg-1)", fontWeight: 500 }}>{fc(value)}</span>
      )}
    </div>
  );
}

function DebtChart({ cf, input }) {
  const W = 900, H = 340;
  const padL = 70, padR = 18, padT = 14, padB = 38;
  const months = cf.months;
  const horizon = months.length - 1;

  // Split chart into two vertical zones to avoid overlap:
  //   • top zone (60%) — outstanding balance area + line
  //   • bottom zone (35%) — monthly draws (up) and repayments (down) as bars
  const splitY = padT + (H - padT - padB) * 0.62;
  const gap = 18;
  const topPlot   = { y0: padT,        y1: splitY - gap / 2 };
  const botPlot   = { y0: splitY + gap / 2, y1: H - padB };
  const topH = topPlot.y1 - topPlot.y0;
  const botH = botPlot.y1 - botPlot.y0;
  const botMid = botPlot.y0 + botH / 2;

  // Scales
  const balance = cf.debtBalance;
  const draw    = cf.debtDraw;
  const repay   = cf.debtRepay; // negative numbers
  const interest = cf.interest || []; // negative numbers
  const balMax  = Math.max(1, ...balance);
  const flowMax = Math.max(1, ...draw, ...repay.map(v => -v));

  const x = (i) => padL + (i / Math.max(1, horizon)) * (W - padL - padR);
  const yBal = (v) => topPlot.y1 - (v / balMax) * topH;
  const yFlow = (v) => botMid - (v / flowMax) * (botH / 2);

  const innerW = W - padL - padR;
  const bw = Math.max(1.5, innerW / months.length * 0.75);

  // Year ticks
  const ticks = [];
  for (let yr = 0; yr <= Math.ceil(horizon / 12); yr++) {
    if (yr * 12 <= horizon) ticks.push({ m: yr * 12, label: `Y${yr}` });
  }

  // Y tick values for balance
  const balTicks = [0, balMax / 2, balMax];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block" }}>
        {/* ===== TOP ZONE — balance ===== */}
        {balTicks.map((v, i) => (
          <g key={`bt${i}`}>
            <line x1={padL} x2={W - padR} y1={yBal(v)} y2={yBal(v)} stroke="var(--border-1)" strokeWidth="0.5" strokeDasharray={v === 0 ? "0" : "2 3"} />
            <text x={padL - 8} y={yBal(v) + 3} textAnchor="end" fontSize="10" fill="var(--fg-3)" style={{ fontVariantNumeric: "tabular-nums" }}>{fc(v)}</text>
          </g>
        ))}
        {/* Balance area fill */}
        <polygon
          points={`${padL},${yBal(0)} ${balance.map((v, i) => `${x(i)},${yBal(v)}`).join(" ")} ${x(horizon)},${yBal(0)}`}
          fill="var(--ad-navy-500)" opacity="0.18"
        />
        <polyline fill="none" stroke="var(--ad-navy-800)" strokeWidth="1.6"
          points={balance.map((v, i) => `${x(i)},${yBal(v)}`).join(" ")} />
        <text x={padL} y={topPlot.y0 + 12} fontSize="10" fill="var(--fg-3)" style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>Outstanding balance</text>
        <text x={W - padR} y={topPlot.y0 + 12} textAnchor="end" fontSize="10" fill="var(--fg-3)" style={{ fontVariantNumeric: "tabular-nums" }}>
          Peak {fc(balMax)}
        </text>

        {/* Divider between zones */}
        <line x1={padL} x2={W - padR} y1={splitY} y2={splitY} stroke="var(--border-1)" strokeWidth="0.5" />

        {/* ===== BOTTOM ZONE — draws / repayments ===== */}
        {/* Zero line */}
        <line x1={padL} x2={W - padR} y1={botMid} y2={botMid} stroke="var(--ad-navy-300)" strokeWidth="1" />
        {/* Half tick guide lines */}
        <line x1={padL} x2={W - padR} y1={yFlow(flowMax / 2)} y2={yFlow(flowMax / 2)} stroke="var(--border-1)" strokeWidth="0.5" strokeDasharray="2 3" />
        <line x1={padL} x2={W - padR} y1={yFlow(-flowMax / 2)} y2={yFlow(-flowMax / 2)} stroke="var(--border-1)" strokeWidth="0.5" strokeDasharray="2 3" />
        <text x={padL - 8} y={yFlow(flowMax) + 3} textAnchor="end" fontSize="10" fill="var(--fg-3)" style={{ fontVariantNumeric: "tabular-nums" }}>+{fc(flowMax)}</text>
        <text x={padL - 8} y={botMid + 3} textAnchor="end" fontSize="10" fill="var(--fg-3)">0</text>
        <text x={padL - 8} y={yFlow(-flowMax) + 3} textAnchor="end" fontSize="10" fill="var(--fg-3)" style={{ fontVariantNumeric: "tabular-nums" }}>−{fc(flowMax)}</text>

        {/* Draw bars (up, navy) */}
        {draw.map((v, i) => v > 0 && (
          <rect key={`d${i}`} x={x(i) - bw / 2} y={yFlow(v)} width={bw} height={Math.max(0.5, botMid - yFlow(v))} fill="var(--ad-navy-500)" />
        ))}
        {/* Repayment bars (down, danger) */}
        {repay.map((v, i) => v < 0 && (
          <rect key={`r${i}`} x={x(i) - bw / 2} y={botMid} width={bw} height={Math.max(0.5, yFlow(v) - botMid)} fill="var(--ad-gold-600)" />
        ))}
        {/* Interest accrued — small tick marker (negative, slight) */}
        {interest.map((v, i) => v < 0 && Math.abs(v) > flowMax * 0.005 && (
          <line key={`i${i}`} x1={x(i)} x2={x(i)} y1={botMid} y2={Math.min(botPlot.y1, botMid + (Math.abs(v) / flowMax) * (botH / 2))}
            stroke="var(--ad-danger)" strokeWidth="0.8" opacity="0.6" />
        ))}

        <text x={padL} y={botPlot.y0 + 10} fontSize="10" fill="var(--fg-3)" style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>Monthly flows</text>

        {/* X axis (year markers, span both zones) */}
        {ticks.map((t, i) => (
          <g key={`x${i}`}>
            <line x1={x(t.m)} x2={x(t.m)} y1={padT} y2={H - padB} stroke="var(--border-1)" strokeWidth="0.4" strokeDasharray="2 4" opacity="0.7" />
            <text x={x(t.m)} y={H - 18} textAnchor="middle" fontSize="10" fill="var(--fg-3)">{t.label}</text>
            <text x={x(t.m)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--fg-4)">M{t.m}</text>
          </g>
        ))}
      </svg>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12, fontSize: 11 }}>
        <LegendChip color="var(--ad-navy-500)" label="Outstanding balance" />
        <LegendChip color="var(--ad-navy-500)" label="Draws (monthly)" />
        <LegendChip color="var(--ad-gold-600)" label="Principal repayment" />
        <LegendChip color="var(--ad-danger)"   label="Interest accrued" />
      </div>
    </div>
  );
}

/* ---------- Uses-by-category cumulative chart (mirror of CoverageChart) ---------- */

function UsesChart({ cf }) {
  const W = 900, H = 280;
  const padL = 70, padR = 18, padT = 14, padB = 36;
  const months = cf.months;
  const horizon = months.length - 1;
  const ubc = cf.usesByCat || {};

  const cumsum = (a) => { const o = new Array((a || []).length); let s = 0; for (let i = 0; i < (a || []).length; i++) { s += a[i] || 0; o[i] = s; } return o; };

  // Stack order (bottom → top) mirrors the typical cost narrative
  const layers = [
    { key: "land",         label: "Land + fees",     color: "var(--ad-navy-900)" },
    { key: "siteWork",     label: "Site work",        color: "var(--ad-navy-700)" },
    { key: "construction", label: "Construction",     color: "var(--ad-navy-500)" },
    { key: "soft",         label: "Soft costs",       color: "var(--ad-navy-300)" },
    { key: "contingency",  label: "Contingency",      color: "var(--ad-sand-700)" },
    { key: "marketing",    label: "Selling / mktg",   color: "var(--ad-sand-500)" },
    { key: "interest",     label: "Interest",         color: "var(--ad-gold-500)" },
  ].filter(l => ubc[l.key] && ubc[l.key].some(v => v));

  const cums = layers.map(l => cumsum(ubc[l.key]));
  // Stacked cumulative tops
  const tops = [];
  for (let li = 0; li < layers.length; li++) {
    const prev = li === 0 ? new Array(cums[0].length).fill(0) : tops[li - 1];
    tops.push(cums[li].map((v, i) => v + prev[i]));
  }
  const totalTop = tops[tops.length - 1] || [0];
  const max = Math.max(1, totalTop[horizon] || 1);

  const x = (i) => padL + (i / Math.max(1, horizon)) * (W - padL - padR);
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);

  const stackArea = (lower, upper) => {
    const top = upper.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const bot = lower.map((v, i) => `${x(i)},${y(v)}`).reverse().join(" ");
    return `${top} ${bot}`;
  };
  const z = new Array((tops[0] || []).length).fill(0);

  const ticks = [];
  for (let yr = 0; yr <= Math.ceil(horizon / 12); yr++) {
    if (yr * 12 <= horizon) ticks.push({ m: yr * 12, label: `Y${yr}` });
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={padT + (1 - p) * (H - padT - padB)} y2={padT + (1 - p) * (H - padT - padB)} stroke="var(--border-1)" strokeWidth="0.5" />
            <text x={padL - 8} y={padT + (1 - p) * (H - padT - padB) + 3} textAnchor="end" fontSize="10" fill="var(--fg-3)" style={{ fontVariantNumeric: "tabular-nums" }}>{fc(max * p)}</text>
          </g>
        ))}

        {layers.map((l, li) => (
          <polygon key={li} points={stackArea(li === 0 ? z : tops[li - 1], tops[li])} fill={l.color} opacity="0.88" />
        ))}

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={x(t.m)} x2={x(t.m)} y1={padT} y2={H - padB} stroke="var(--border-1)" strokeWidth="0.5" strokeDasharray="2 4" />
            <text x={x(t.m)} y={H - 14} textAnchor="middle" fontSize="10" fill="var(--fg-3)">{t.label}</text>
            <text x={x(t.m)} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--fg-4)">M{t.m}</text>
          </g>
        ))}
      </svg>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16, fontSize: 11 }}>
        {layers.map((l, i) => {
          const total = cums[i][horizon] || 0;
          return <LegendChip key={i} color={l.color} label={l.label} value={total} />;
        })}
      </div>
    </div>
  );
}

/* ---------- Yearly debt schedule table + repayment-driver note ---------- */

function DebtScheduleTable({ cf, input, k }) {
  const months = cf.months;
  const years = Math.ceil(months.length / 12);
  const rows = [];
  let openBal = 0;
  for (let yr = 0; yr < years; yr++) {
    const slice = (arr) => arr.slice(yr * 12, (yr + 1) * 12).reduce((s, v) => s + v, 0);
    const draw     = slice(cf.debtDraw);
    const repay    = -slice(cf.debtRepay);   // make positive
    const interest = -slice(cf.interest);    // make positive
    const endIdx   = Math.min(months.length - 1, (yr + 1) * 12 - 1);
    const closeBal = cf.debtBalance[endIdx] || 0;
    rows.push({ yr, openBal, draw, interest, repay, closeBal });
    openBal = closeBal;
  }

  const totDraw   = rows.reduce((s, r) => s + r.draw, 0);
  const totRepay  = rows.reduce((s, r) => s + r.repay, 0);
  const totInt    = rows.reduce((s, r) => s + r.interest, 0);

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: 16 }}>
        <Eyebrow>Annual debt schedule</Eyebrow>
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            <thead>
              <tr style={{ background: "var(--bg-2)" }}>
                <th style={thStyle}>Year</th>
                <th style={thStyleNum}>Opening balance</th>
                <th style={thStyleNum}>Drawn</th>
                <th style={thStyleNum}>Interest accrued</th>
                <th style={thStyleNum}>Repaid (principal + int.)</th>
                <th style={thStyleNum}>Closing balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.yr} style={{ borderBottom: "1px solid var(--border-2)" }}>
                  <td style={tdStyle}>Y{r.yr + 1}</td>
                  <td style={tdNum(r.openBal)}>{r.openBal ? fc(r.openBal) : "—"}</td>
                  <td style={{ ...tdNum(r.draw), color: r.draw > 0 ? "var(--ad-navy-800)" : "var(--fg-4)" }}>{r.draw ? fc(r.draw) : "—"}</td>
                  <td style={{ ...tdNum(r.interest), color: r.interest > 0 ? "var(--ad-danger)" : "var(--fg-4)" }}>{r.interest ? fc(r.interest) : "—"}</td>
                  <td style={{ ...tdNum(r.repay), color: r.repay > 0 ? "var(--ad-gold-600)" : "var(--fg-4)" }}>{r.repay ? fc(r.repay) : "—"}</td>
                  <td style={{ ...tdNum(r.closeBal), fontWeight: 600 }}>{r.closeBal ? fc(r.closeBal) : "—"}</td>
                </tr>
              ))}
              <tr style={{ background: "var(--bg-2)", borderTop: "2px solid var(--border-strong)" }}>
                <td style={{ ...tdStyle, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 10 }}>Total</td>
                <td style={tdNum(0)}>—</td>
                <td style={{ ...tdNum(totDraw), fontWeight: 600 }}>{fc(totDraw)}</td>
                <td style={{ ...tdNum(totInt), fontWeight: 600 }}>{fc(totInt)}</td>
                <td style={{ ...tdNum(totRepay), fontWeight: 600 }}>{fc(totRepay)}</td>
                <td style={tdNum(0)}>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        marginTop: 16, padding: "12px 16px",
        background: "var(--bg-2)",
        borderLeft: "3px solid var(--ad-navy-800)",
        fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55,
      }}>
        <span style={{
          textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600,
          color: "var(--fg-1)", fontSize: 10, display: "block", marginBottom: 4,
        }}>Funding order · Revenue → Debt → Equity</span>
        <strong style={{ color: "var(--fg-1)" }}>Each month's project income covers that month's costs first</strong> (off-plan sales, rent and exit proceeds fund land, construction, site, soft and contingency directly).
        Any shortfall is drawn from the facility — interest capitalises into the balance only when no project cash is available to pay it —
        up to the facility cap of <span className="tabnum" style={{ color: "var(--fg-1)", fontWeight: 500 }}>{fc(k.devCostExFinance * input.ltc)}</span> ({fp(input.ltc)} LTC)
        is reached. Equity is called only for what neither revenue nor debt could cover.
        Interest accrues monthly at <span className="tabnum" style={{ color: "var(--fg-1)", fontWeight: 500 }}>{fp(input.interestRate)}</span> on
        the outstanding balance. <strong style={{ color: "var(--fg-1)" }}>Surplus income</strong> —
        whatever remains after covering the month's own costs — pays interest in cash, then sweeps the principal immediately (repaid amounts re-open the facility for later draws), and is distributed to equity only once no further contributions are needed.
        Any residual balance at the project's natural exit month is force-cleared from exit proceeds.
      </div>
    </div>
  );
}

/* ---------- Cash-sweep table — where the principal repayment came from ---------- */

function CashSweepTable({ cf }) {
  const months = cf.months;
  const years = Math.ceil(months.length / 12);

  // Slice helpers
  const slice = (arr, yr) => arr.slice(yr * 12, (yr + 1) * 12).reduce((s, v) => s + v, 0);

  const rows = [];
  const horizonIdx = months.length - 1;
  for (let yr = 0; yr < years; yr++) {
    const sales    = slice(cf.sales, yr);
    const noi      = slice(cf.noi, yr);   // NOI = rent - opex (already net)
    const exit     = slice(cf.exit, yr);
    const cashIn   = sales + noi + exit;
    const intPaid  = slice(cf.interestPaid, yr);
    const principal = slice(cf.principalRepay, yr);
    const sweep    = intPaid + principal;
    // Actual distributions to equity that year — from the engine, not a
    // residual guess (income can also fund the year's own costs directly).
    const toEquity = slice(cf.distributions || [], yr);
    const cashEnd   = (cf.cashBalance || [])[Math.min((yr + 1) * 12 - 1, horizonIdx)] || 0;
    const cashStart = yr === 0 ? 0 : ((cf.cashBalance || [])[yr * 12 - 1] || 0);
    const retainedDelta = cashEnd - cashStart;
    // Income used on the year's own costs = what's left of the positive
    // cashflow after debt service, distributions and retention movements.
    const applied = Math.max(0, cashIn - sweep - toEquity - retainedDelta);
    // Skip rows with no activity at all
    if (cashIn <= 0.5 && sweep <= 0.5 && toEquity <= 0.5) continue;
    rows.push({ yr, sales, noi, exit, cashIn, applied, intPaid, principal, sweep, toEquity });
  }

  const totals = rows.reduce((t, r) => ({
    sales: t.sales + r.sales, noi: t.noi + r.noi, exit: t.exit + r.exit,
    cashIn: t.cashIn + r.cashIn, applied: t.applied + r.applied,
    intPaid: t.intPaid + r.intPaid, principal: t.principal + r.principal,
    sweep: t.sweep + r.sweep, toEquity: t.toEquity + r.toEquity,
  }), { sales: 0, noi: 0, exit: 0, cashIn: 0, applied: 0, intPaid: 0, principal: 0, sweep: 0, toEquity: 0 });

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: 16 }}>
        <Eyebrow>Cash applied to debt service — positive cashflow swept against the loan</Eyebrow>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6, marginBottom: 10, lineHeight: 1.5 }}>
          Each row shows the year's positive operating cashflow (sales + NOI + exit) and where it went: funding that year's own costs first, then interest, then the principal sweep — with distributions to equity only once no further contributions are needed.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            <thead>
              <tr style={{ background: "var(--bg-2)" }}>
                <th style={thStyle}>Year</th>
                <th style={thStyleNum}>Sales</th>
                <th style={thStyleNum}>NOI</th>
                <th style={thStyleNum}>Exit</th>
                <th style={thStyleNum}>Positive cashflow</th>
                <th style={thStyleNum}>→ Applied to costs</th>
                <th style={thStyleNum}>→ Interest paid</th>
                <th style={thStyleNum}>→ Principal repaid</th>
                <th style={thStyleNum}>Distributed to equity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.yr} style={{ borderBottom: "1px solid var(--border-2)" }}>
                  <td style={tdStyle}>Y{r.yr + 1}</td>
                  <td style={tdNum(r.sales)}>{r.sales ? fc(r.sales) : "—"}</td>
                  <td style={tdNum(r.noi)}>{r.noi ? fc(r.noi) : "—"}</td>
                  <td style={tdNum(r.exit)}>{r.exit ? fc(r.exit) : "—"}</td>
                  <td style={{ ...tdNum(r.cashIn), fontWeight: 600 }}>{r.cashIn ? fc(r.cashIn) : "—"}</td>
                  <td style={{ ...tdNum(r.applied), color: r.applied > 0.5 ? "var(--ad-navy-700)" : "var(--fg-4)" }}>{r.applied > 0.5 ? fc(r.applied) : "—"}</td>
                  <td style={{ ...tdNum(r.intPaid), color: r.intPaid > 0 ? "var(--ad-danger)" : "var(--fg-4)" }}>{r.intPaid ? fc(r.intPaid) : "—"}</td>
                  <td style={{ ...tdNum(r.principal), color: r.principal > 0 ? "var(--ad-gold-600)" : "var(--fg-4)" }}>{r.principal ? fc(r.principal) : "—"}</td>
                  <td style={{ ...tdNum(r.toEquity), color: r.toEquity > 0 ? "var(--ad-success)" : "var(--fg-4)", fontWeight: 600 }}>{r.toEquity ? fc(r.toEquity) : "—"}</td>
                </tr>
              ))}
              <tr style={{ background: "var(--bg-2)", borderTop: "2px solid var(--border-strong)" }}>
                <td style={{ ...tdStyle, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 10 }}>Total</td>
                <td style={{ ...tdNum(totals.sales), fontWeight: 600 }}>{totals.sales ? fc(totals.sales) : "—"}</td>
                <td style={{ ...tdNum(totals.noi), fontWeight: 600 }}>{totals.noi ? fc(totals.noi) : "—"}</td>
                <td style={{ ...tdNum(totals.exit), fontWeight: 600 }}>{totals.exit ? fc(totals.exit) : "—"}</td>
                <td style={{ ...tdNum(totals.cashIn), fontWeight: 700 }}>{fc(totals.cashIn)}</td>
                <td style={{ ...tdNum(totals.applied), fontWeight: 600, color: "var(--ad-navy-700)" }}>{totals.applied > 0.5 ? fc(totals.applied) : "—"}</td>
                <td style={{ ...tdNum(totals.intPaid), fontWeight: 600, color: "var(--ad-danger)" }}>{fc(totals.intPaid)}</td>
                <td style={{ ...tdNum(totals.principal), fontWeight: 600, color: "var(--ad-gold-600)" }}>{fc(totals.principal)}</td>
                <td style={{ ...tdNum(totals.toEquity), fontWeight: 700, color: "var(--ad-success)" }}>{fc(totals.toEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReturnsSplit({ k, input }) {
  // ----- USES: every dollar the project spends, over its life -----
  const usesItems = [
    { label: "Land + transfer fees", value: k.landCost + k.landTransferFees,            color: "var(--ad-navy-900)" },
    { label: "Construction",         value: k.constructionCost,                         color: "var(--ad-navy-700)" },
    { label: "Land infrastructure",  value: k.landInfraCost || 0,                       color: "var(--ad-navy-600)" },
    { label: "Site work",            value: k.siteWorkCost - (k.landInfraCost || 0),    color: "var(--ad-navy-500)" },
    { label: "Soft costs",           value: k.softCosts,                                color: "var(--ad-navy-300)" },
    { label: "Contingency",          value: k.contingency,                              color: "var(--ad-sand-700)" },
    { label: "Marketing",            value: k.marketing,                                color: "var(--ad-sand-500)" },
    { label: "Sales commission",     value: k.salesCommission,                          color: "var(--ad-sand-300)" },
    { label: "Government fees",      value: k.govFees,                                  color: "var(--ad-sand-200)" },
    { label: "Financing interest",   value: k.totalInterest,                            color: "var(--ad-gold-500)" },
  ].filter(i => i.value > 0.5);
  const totalUses = usesItems.reduce((s, i) => s + i.value, 0);

  // ----- SOURCES: tie to uses — equity (cash called), debt drawn, and
  //   revenue the project retained against costs (interest rolled past the
  //   facility cap, selling costs netted from receipts).
  const debtDrawn = k.debtDrawnTotal || 0;
  const equity = k.totalEquity;
  const revenueApplied = Math.max(0, totalUses - equity - debtDrawn);
  const sourcesItems = [
    { label: "Equity contributed",   value: equity,           color: "var(--ad-navy-900)" },
    { label: "Debt drawn",            value: debtDrawn,        color: "var(--ad-navy-500)" },
    { label: "Revenue applied",       value: revenueApplied,   color: "var(--ad-gold-500)" },
  ].filter(i => i.value > 0.5 || i.label === "Equity contributed");
  const totalSources = sourcesItems.reduce((s, i) => s + i.value, 0);

  // For visual balance, scale both columns to the same max so length ⇔ SAR.
  const scaleMax = Math.max(totalSources, totalUses, 1);
  const tie = Math.abs(totalSources - totalUses) < 1;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 16, alignItems: "start" }}>
        {/* Sources */}
        <div>
          <Eyebrow>Sources</Eyebrow>
          {sourcesItems.map(s => (
            <Bar key={s.label} label={s.label} value={s.value} max={scaleMax} color={s.color}
                 share={totalSources > 0 ? s.value / totalSources : 0} />
          ))}
          <TotalRow label="Total sources" value={totalSources} share={totalSources > 0 ? 1 : undefined} />
        </div>

        {/* Uses */}
        <div>
          <Eyebrow>Uses</Eyebrow>
          {usesItems.map(u => (
            <Bar key={u.label} label={u.label} value={u.value} max={scaleMax} color={u.color}
                 share={totalUses > 0 ? u.value / totalUses : 0} />
          ))}
          <TotalRow label="Total uses" value={totalUses} share={totalUses > 0 ? 1 : undefined} />
        </div>

      </div>

      {/* Balance check — confirms sources = uses */}
      <div style={{
        marginTop: 16, padding: "10px 14px",
        background: tie ? "rgba(46,125,91,0.06)" : "rgba(184,118,30,0.07)",
        border: `1px solid ${tie ? "var(--ad-success)" : "var(--ad-warning)"}`,
        borderLeftWidth: 3,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 11,
      }}>
        <span style={{
          textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600,
          color: tie ? "var(--ad-success)" : "var(--ad-warning)",
        }}>
          {tie ? "Balanced — Σ sources = Σ uses" : "Out of balance"}
        </span>
        <span className="tabnum" style={{ color: "var(--fg-2)" }}>
          {fc(totalSources)} <span style={{ color: "var(--fg-4)", margin: "0 6px" }}>=</span> {fc(totalUses)}
        </span>
      </div>
    </div>
  );
}

function TotalRow({ label, value, share }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 10,
      marginTop: 10, paddingTop: 8,
      borderTop: "1px solid var(--border-1)",
      fontSize: 11, fontWeight: 500,
    }}>
      <span style={{ textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--fg-2)" }}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, flexShrink: 0 }}>
        <span className="tabnum" style={{ color: "var(--fg-1)" }}>{fc(value)}</span>
        {share !== undefined && (
          <span className="tabnum" style={{ color: "var(--fg-3)", fontSize: 10, minWidth: 34, textAlign: "end" }}>
            {fp(share, 1)}
          </span>
        )}
      </span>
    </div>
  );
}

function Bar({ label, value, max, color, share }) {
  const pct = max > 0 ? value / max : 0;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: "var(--fg-2)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, flexShrink: 0 }}>
          <span className="tabnum" style={{ color: "var(--fg-1)" }}>{fc(value)}</span>
          {share !== undefined && (
            <span className="tabnum" style={{ color: "var(--fg-3)", fontSize: 10, minWidth: 34, textAlign: "end" }}>
              {fp(share, 1)}
            </span>
          )}
        </span>
      </div>
      <div style={{ height: 8, background: "var(--bg-3)" }}>
        <div style={{ height: "100%", background: color, width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

/* ---------- Risk panel ---------- */

function RiskPanel({ result, input }) {
  const k = result.kpi;
  const risks = result.risks;
  const tones = {
    success: { bg: "rgba(46,125,91,0.06)", border: "var(--ad-success)", color: "var(--ad-success)", label: "OK" },
    warning: { bg: "rgba(184,118,30,0.07)", border: "var(--ad-warning)", color: "var(--ad-warning)", label: "Watch" },
    danger:  { bg: "rgba(176,50,28,0.06)",  border: "var(--ad-danger)",  color: "var(--ad-danger)",  label: "Red Flag" },
  };

  const byLevel = { danger: [], warning: [], success: [] };
  risks.forEach(r => byLevel[r.level].push(r));

  return (
    <div style={{ padding: 32 }}>
      <Eyebrow>Diligence</Eyebrow>
      <h2 style={{ fontSize: 24, marginTop: 6, marginBottom: 24 }}>Risk register & red flags</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <KPI eyebrow="Red flags" value={byLevel.danger.length} tone={byLevel.danger.length > 0 ? "negative" : "positive"} />
        <KPI eyebrow="Watch items" value={byLevel.warning.length} tone={byLevel.warning.length > 0 ? "warning" : "positive"} />
        <KPI eyebrow="OK signals" value={byLevel.success.length} tone="positive" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...byLevel.danger, ...byLevel.warning, ...byLevel.success].map((r, i) => {
          const t = tones[r.level];
          return (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "100px 1fr", gap: 16,
              padding: "16px 20px", border: "1px solid var(--border-1)", borderLeft: `3px solid ${t.border}`,
              background: t.bg,
            }}>
              <div>
                <div style={{
                  fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                  color: t.color, fontWeight: 600,
                }}>{t.label}</div>
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, color: "var(--fg-1)" }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4 }}>{r.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        const dev = Math.max(1, k.devCostExFinance);
        const allInCost = k.totalCost + k.totalInterest;
        const facility = k.devCostExFinance * (input.ltc || 0);
        const cov = (result.cashflow && result.cashflow.coverageTotals) || { equity: 0, debt: 0, revenue: 0 };
        const funded = Math.max(1, cov.equity + cov.debt + cov.revenue);
        const groups = [
          {
            name: "Cost structure",
            note: "\"Development cost\" here = land + transfer fees + construction + site work and infrastructure + soft costs + contingency. It EXCLUDES financing interest and selling costs (marketing, sales commission, government fees). It is also the base for the debt facility (LTC × development cost).",
            rows: [
              { label: "Land as % of dev cost", value: fp(k.landCost / dev), ok: (k.landCost / dev) < 0.30,
                note: "Land's share of development cost. Much above 30% and the deal is land-heavy, which squeezes the margin." },
              { label: "Construction as % of dev cost", value: fp(k.constructionCost / dev), ok: true,
                note: "Hard construction as a share of development cost — normally the largest single line." },
              { label: "Soft costs & contingency", value: fp((k.softCosts + k.contingency) / dev), ok: ((k.softCosts + k.contingency) / dev) < 0.25,
                note: "Design, permits, management and the risk buffer, as a share of development cost." },
              { label: "Build cost per m² GFA", value: k.gfa > 0 ? `${fn((k.constructionCost + k.siteWorkCost) / k.gfa)} SAR/m²` : "—", ok: true,
                note: "All-in construction and site work per m² of built area — compare it against local benchmarks." },
            ],
          },
          {
            name: "Profitability",
            rows: [
              /* Same definitions as the Returns tab: levered profit over
                 revenue, and over ALL-IN cost (incl. financing interest). */
              { label: "Margin on revenue", value: k.totalRevenue > 0 ? fp(k.profit / k.totalRevenue) : "—", ok: (k.profit / Math.max(1, k.totalRevenue)) > 0.12,
                note: "Profit after financing as a share of total revenue. Under ~12% leaves little room for error." },
              { label: "Margin on cost", value: allInCost > 0 ? fp(k.profit / allInCost) : "—", ok: (k.profit / Math.max(1, allInCost)) > 0.15,
                note: "Profit after financing over all-in cost including interest — the return on every riyal spent." },
              { label: "Revenue per m² sellable / leasable", value: k.nsa > 0 ? `${fn(k.totalRevenue / k.nsa)} SAR/m²` : "—", ok: true,
                note: "Total revenue per m² of saleable or leasable area — a quick sanity check against market pricing." },
            ],
          },
          {
            name: "Financing & liquidity",
            rows: [
              { label: "Interest / dev cost", value: fp(k.totalInterest / dev), ok: (k.totalInterest / dev) < 0.10,
                note: "Total financing interest as a share of development cost (land, construction, site work, soft costs and contingency — interest itself is not in that base). High values point to heavy leverage or a long build." },
              { label: "Peak debt vs facility", value: facility > 0 ? fp((k.peakDebt || 0) / facility) : "—", ok: facility <= 0 || (k.peakDebt || 0) / facility < 1.001,
                note: "Highest loan balance against the facility cap. At 100% the facility is fully used, with no headroom left." },
              { label: "Equity share of funding", value: fp(cov.equity / funded), ok: true,
                note: "Share of project spending funded by investor cash, rather than by debt or by sales and rental income." },
              { label: "Min DSCR", value: k.minDSCR ? `${k.minDSCR.toFixed(2)}×` : "—", ok: k.minDSCR === null || k.minDSCR >= 1.2,
                note: "Lowest ratio of operating cash to debt service in any month. Lenders usually want at least 1.2×." },
            ],
          },
        ];
        return (
          <div style={{ marginTop: 24, padding: 20, border: "1px solid var(--border-1)", background: "var(--bg-2)" }}>
            <Eyebrow>Quick diagnostics</Eyebrow>
            {groups.map((g) => (
              <div key={g.name} style={{ marginTop: 16 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7,
                  fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600,
                  color: "var(--fg-1)", paddingInlineStart: 8,
                  borderInlineStart: "3px solid var(--ad-gold-500)", marginBottom: 8,
                }}>
                  {g.name}
                  {g.note && (
                    <span
                      title={g.note}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                        border: "1px solid var(--ad-gold-500)", color: "var(--ad-gold-600)",
                        fontSize: 9, fontWeight: 700, lineHeight: 1, cursor: "help", letterSpacing: 0,
                      }}
                    >!</span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "2px 32px", fontSize: 12 }}>
                  {g.rows.map((r) => <Diag key={r.label} {...r} />)}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

function Diag({ label, value, ok, note }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: "1px dashed var(--border-1)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--fg-2)", minWidth: 0 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        {note && (
          <span
            title={note}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
              border: "1px solid var(--ad-gold-500)", color: "var(--ad-gold-600)",
              fontSize: 9, fontWeight: 700, lineHeight: 1, cursor: "help",
            }}
          >!</span>
        )}
      </span>
      <span className="tabnum" style={{
        color: ok ? "var(--fg-1)" : "var(--ad-warning)",
        fontWeight: 500, flexShrink: 0,
      }}>{value}</span>
    </div>
  );
}

/* ---------- Returns panel ---------- */

function ReturnsPanel({ result, input }) {
  const k = result.kpi;
  const cf = result.cashflow;
  const monthLabel = (m) => m === null ? "—" : `${(m / 12).toFixed(1)} yrs`;

  // Cumulative equity (net) cashflow — shows when payback hits
  const cumEquity = [];
  let cum = 0;
  for (const v of cf.net) { cum += v; cumEquity.push(cum); }
  // Cumulative project (unlevered, gross) cashflow
  const cumProject = [];
  cum = 0;
  for (const v of cf.gross) { cum += v; cumProject.push(cum); }

  const hurdle = input.discountRate || 0;
  const irrTone = (k.equityIRR ?? 0) >= hurdle ? "positive" : "negative";
  const equityMultiple = k.totalEquity > 0 ? 1 + (k.profit / k.totalEquity) : null;
  const projectMultiple = k.totalCost > 0 ? 1 + (k.profitUnlevered / k.totalCost) : 0;

  // Chart payback marker: the engine's payback needs a dip below zero. When
  // no equity is ever at risk (cumulative never negative), mark break-even —
  // the first month cash actually reaches equity.
  let paybackMarker = k.equityPayback;
  if (paybackMarker == null && cumEquity.every(v => v > -0.5)) {
    const i = cumEquity.findIndex(v => v > 0.5);
    if (i >= 0) paybackMarker = i;
  }

  return (
    <div style={{ padding: 32 }}>
      <Eyebrow>Returns</Eyebrow>
      <h2 style={{ fontSize: 28, marginTop: 6, marginBottom: 20, fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg-1)" }}>
        Levered vs unlevered, multiples, payback and profit decomposition
      </h2>

      {/* Headline 2x2 — Equity vs Project */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Equity (levered) */}
        <div style={{
          border: "1px solid var(--border-1)", borderTop: "3px solid var(--ad-navy-900)",
          background: "var(--bg-1)", padding: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <Eyebrow>Equity · Levered</Eyebrow>
            {/* With zero equity called, IRR-vs-hurdle is meaningless — show a
                neutral badge instead of a false "below hurdle". */}
            {(k.totalEquity || 0) < 0.5 && k.equityIRR == null ? (
              <span style={{
                fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--fg-3)", fontWeight: 600,
              }}>No equity called</span>
            ) : (
              <span style={{
                fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
                color: irrTone === "positive" ? "var(--ad-success)" : "var(--ad-danger)",
                fontWeight: 600,
              }}>
                {irrTone === "positive" ? "Clears hurdle" : "Below hurdle"}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <ReturnsMetric eyebrow="IRR" value={fp(k.equityIRR)} sub={`Hurdle ${fp(hurdle)}`} tone={irrTone} />
            <ReturnsMetric eyebrow="NPV" value={fc(k.equityNPV)} sub={`@${fp(hurdle)} disc.`} tone={k.equityNPV >= 0 ? "positive" : "negative"} />
            <ReturnsMetric eyebrow="Multiple" value={equityMultiple == null ? "—" : `${equityMultiple.toFixed(2)}×`} sub={k.equityROI == null ? "No equity called" : `ROI ${fp(k.equityROI)}`} />
            <ReturnsMetric eyebrow="Payback" value={monthLabel(k.equityPayback)} sub="Cum. equity ≥ 0" />
          </div>
        </div>
        {/* Project (unlevered) */}
        <div style={{
          border: "1px solid var(--border-1)", borderTop: "3px solid var(--ad-sand-700)",
          background: "var(--bg-1)", padding: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <Eyebrow>Project · Unlevered</Eyebrow>
            <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-3)" }}>
              Property fundamentals
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <ReturnsMetric eyebrow="IRR" value={fp(k.projectIRR)} sub="No debt assumption" />
            <ReturnsMetric eyebrow="NPV" value={fc(k.projectNPV)} sub={`@${fp(hurdle)} disc.`} />
            <ReturnsMetric eyebrow="Multiple" value={`${projectMultiple.toFixed(2)}×`} sub={`ROI ${fp(k.projectROI)}`} />
            <ReturnsMetric eyebrow="Payback" value={monthLabel(k.projectPayback)} sub="Cum. project ≥ 0" />
          </div>
        </div>
      </div>

      {/* Two-column: cumulative cashflow chart + profit waterfall */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Cumulative cashflow — equity vs project</Eyebrow>
          <CumulativeCashflowChart
            months={cf.months}
            equityCum={cumEquity}
            projectCum={cumProject}
            equityPayback={paybackMarker}
            projectPayback={k.projectPayback}
            horizon={k.horizonMonths}
          />
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "var(--fg-3)", flexWrap: "wrap" }}>
            <Legend color="var(--ad-navy-900)" label="Equity (levered)" line />
            <Legend color="var(--ad-gold-500)" label="Project (unlevered)" dash />
            <Legend color="var(--ad-success)" label="Payback (equity)" dot />
          </div>
        </div>
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <Eyebrow>Profit decomposition (after financing)</Eyebrow>
          <ProfitWaterfall k={k} />
        </div>
      </div>

      {/* Revenue → Profit waterfall (moved from Cost tab) */}
      <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)", marginBottom: 24 }}>
        <Eyebrow>Revenue → Profit waterfall</Eyebrow>
        <Waterfall steps={[
          { label: "Revenue",  value: k.totalRevenue, type: "start" },
          { label: "−Land",    value: -(k.landCost + k.landTransferFees), type: "delta" },
          { label: "−Constr.", value: -k.constructionCost, type: "delta" },
          { label: "−Infra",   value: -(k.landInfraCost || 0), type: "delta" },
          { label: "−Site",    value: -(k.siteWorkCost - (k.landInfraCost || 0)), type: "delta" },
          { label: "−Soft",    value: -k.softCosts, type: "delta" },
          { label: "−Cont.",   value: -k.contingency, type: "delta" },
          { label: "−Selling", value: -(k.marketing + k.salesCommission + k.govFees), type: "delta" },
          { label: "−Interest",value: -k.totalInterest, type: "delta" },
          { label: "Profit",   value: k.profit, type: "end" },
        ].filter(s => s.type !== "delta" || Math.abs(s.value) > 0.5)} height={260} formatY={v => `${(v / 1e6).toFixed(0)}M`} />
      </div>
    </div>
  );
}

function ReturnsMetric({ eyebrow, value, sub, tone = "default" }) {
  const colors = {
    default: "var(--fg-1)",
    positive: "var(--ad-success)",
    negative: "var(--ad-danger)",
  };
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 500 }}>{eyebrow}</div>
      <div className="tabnum" style={{
        fontSize: 26, fontFamily: "var(--font-display)", fontWeight: 600,
        letterSpacing: "-0.02em", marginTop: 4,
        color: colors[tone],
      }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function CumulativeCashflowChart({ months, equityCum, projectCum, equityPayback, projectPayback, horizon }) {
  const W = 600, H = 220;
  const padL = 40, padR = 12, padT = 12, padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const len = months.length;
  const allValues = [...equityCum, ...projectCum, 0];
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 1;
  const x = (i) => padL + (i / Math.max(1, len - 1)) * innerW;
  const y = (v) => padT + (1 - (v - minV) / range) * innerH;

  const path = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  const fmtY = (v) => {
    const a = Math.abs(v);
    if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    if (a >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toFixed(0);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, marginTop: 12 }}>
      {/* Zero baseline */}
      <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--border-2)" strokeWidth="1" />
      {/* Y-axis labels */}
      <text x={padL - 6} y={y(maxV) + 4} textAnchor="end" style={{ fontSize: 9, fill: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>{fmtY(maxV)}</text>
      <text x={padL - 6} y={y(0) + 4} textAnchor="end" style={{ fontSize: 9, fill: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>0</text>
      <text x={padL - 6} y={y(minV) + 4} textAnchor="end" style={{ fontSize: 9, fill: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>{fmtY(minV)}</text>
      {/* X-axis ticks at each year */}
      {Array.from({ length: Math.floor(horizon / 12) + 1 }, (_, i) => i * 12).map((m) => (
        <g key={m}>
          <line x1={x(m)} x2={x(m)} y1={H - padB} y2={H - padB + 3} stroke="var(--border-2)" />
          <text x={x(m)} y={H - padB + 14} textAnchor="middle" style={{ fontSize: 9, fill: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>{`Y${m/12}`}</text>
        </g>
      ))}
      {/* Project line — light gold, long dashes: clearly distinct from the
          dark solid equity line */}
      <path d={path(projectCum)} fill="none" stroke="var(--ad-gold-500)" strokeWidth="2" strokeDasharray="7 5" />
      {/* Equity line */}
      <path d={path(equityCum)} fill="none" stroke="var(--ad-navy-900)" strokeWidth="2.5" />
      {/* Payback marker — green milestone dot, not another line colour */}
      {equityPayback !== null && equityPayback < len && (
        <g>
          <line x1={x(equityPayback)} x2={x(equityPayback)} y1={padT} y2={H - padB} stroke="var(--ad-success)" strokeWidth="1" strokeDasharray="2 3" />
          <circle cx={x(equityPayback)} cy={y(0)} r="4.5" fill="var(--ad-success)" stroke="#FFFFFF" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

function ProfitWaterfall({ k }) {
  // Revenue → Costs → Interest → Profit
  const items = [
    { label: "Total revenue",   value: k.totalRevenue,   color: "var(--ad-success)", sign: "+" },
    { label: "Project costs",   value: -k.totalCost,     color: "var(--ad-danger)",  sign: "−" },
    { label: "Finance interest", value: -k.totalInterest, color: "var(--ad-gold-600)", sign: "−" },
    { label: "Net profit",      value: k.profit,         color: k.profit >= 0 ? "var(--ad-navy-900)" : "var(--ad-danger)", sign: "=", bold: true },
  ];
  const max = Math.max(...items.map(i => Math.abs(i.value)), 1);
  return (
    <div style={{ marginTop: 16 }}>
      {items.map((it, i) => {
        const pct = (Math.abs(it.value) / max) * 100;
        return (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: it.bold ? "var(--fg-1)" : "var(--fg-2)", fontWeight: it.bold ? 600 : 400 }}>
                <span style={{ display: "inline-block", width: 14, color: it.color, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{it.sign}</span>
                {it.label}
              </span>
              <span className="tabnum" style={{ color: it.bold ? "var(--fg-1)" : "var(--fg-2)", fontWeight: it.bold ? 700 : 500 }}>{fc(it.value)}</span>
            </div>
            <div style={{ height: 10, background: "var(--bg-3)", border: "1px solid var(--border-1)" }}>
              <div style={{ height: "100%", background: it.color, width: `${pct}%`, opacity: it.bold ? 1 : 0.8 }} />
            </div>
          </div>
        );
      })}
      <div style={{
        marginTop: 14, padding: "10px 14px", background: "var(--ad-navy-50)",
        display: "flex", justifyContent: "space-between", fontSize: 11,
      }}>
        <span style={{ color: "var(--fg-3)" }}>Margin on revenue</span>
        <span className="tabnum" style={{ color: "var(--ad-navy-900)", fontWeight: 600 }}>
          {k.totalRevenue > 0 ? fp(k.profit / k.totalRevenue) : "—"}
        </span>
      </div>
      <div style={{
        marginTop: 6, padding: "10px 14px", background: "var(--ad-navy-50)",
        display: "flex", justifyContent: "space-between", fontSize: 11,
      }}>
        <span style={{ color: "var(--fg-3)" }}>Margin on cost</span>
        <span className="tabnum" style={{ color: "var(--ad-navy-900)", fontWeight: 600 }}>
          {(k.totalCost + k.totalInterest) > 0 ? fp(k.profit / (k.totalCost + k.totalInterest)) : "—"}
        </span>
      </div>
    </div>
  );
}

function ProjectToEquityBridge({ cf }) {
  const horizon = cf.months.length;
  const years = Math.ceil(horizon / 12);
  const sliceSum = (arr, y) => arr.slice(y * 12, (y + 1) * 12).reduce((s, v) => s + v, 0);

  const rows = [];
  let cumProject = 0;
  let cumEquity = 0;
  for (let y = 0; y < years; y++) {
    const project   = sliceSum(cf.gross, y);
    const debtDraw  = sliceSum(cf.debtDraw, y);
    const debtRepay = sliceSum(cf.debtRepay, y);  // already negative
    const equity    = sliceSum(cf.net, y);
    cumProject += project;
    cumEquity  += equity;
    if (Math.abs(project) < 0.5 && Math.abs(equity) < 0.5 && Math.abs(debtDraw) < 0.5) continue;
    rows.push({ y, project, debtDraw, debtRepay, equity, cumProject, cumEquity });
  }

  const fTh = {
    padding: "10px 14px", textAlign: "left", fontWeight: 500,
    fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.12em",
    textTransform: "uppercase", color: "var(--fg-3)",
  };
  const fThR = { ...fTh, textAlign: "right" };
  const fTd = { padding: "8px 14px", color: "var(--fg-1)", fontFamily: "var(--font-mono)", fontSize: 12 };
  const fTdR = (v, opts = {}) => ({
    padding: "8px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12,
    color: v === 0 ? "var(--fg-4)" : v < 0 ? "var(--ad-danger)" : opts.positiveTone || "var(--fg-1)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: opts.bold ? 600 : 400,
    background: opts.bg || "transparent",
  });

  // Totals row
  const totalProject  = rows.reduce((s, r) => s + r.project, 0);
  const totalDraw     = rows.reduce((s, r) => s + r.debtDraw, 0);
  const totalRepay    = rows.reduce((s, r) => s + r.debtRepay, 0);
  const totalEquity   = rows.reduce((s, r) => s + r.equity, 0);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "var(--bg-2)" }}>
          <th style={fTh}>Year</th>
          <th style={fThR}>Project CF<br /><span style={{ fontSize: 9, fontWeight: 400, color: "var(--fg-4)", letterSpacing: "0.06em" }}>unlevered</span></th>
          <th style={fThR}><span style={{ color: "var(--ad-success)" }}>+ Debt draw</span></th>
          <th style={fThR}><span style={{ color: "var(--ad-danger)" }}>− Debt repay</span></th>
          <th style={fThR} title="Equity CF = Project CF + Debt draw + Debt repay (incl. interest)">
            = Equity CF<br /><span style={{ fontSize: 9, fontWeight: 400, color: "var(--fg-4)", letterSpacing: "0.06em" }}>levered</span>
          </th>
          <th style={fThR}>Cum. equity</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.y} style={{ borderBottom: "1px solid var(--border-2)" }}>
            <td style={fTd}>Y{r.y + 1}</td>
            <td style={fTdR(r.project)}>{r.project === 0 ? "—" : fc(r.project)}</td>
            <td style={fTdR(r.debtDraw, { positiveTone: "var(--ad-success)" })}>{r.debtDraw === 0 ? "—" : `+${fc(r.debtDraw).replace("SAR ", "")}`}</td>
            <td style={fTdR(r.debtRepay)}>{r.debtRepay === 0 ? "—" : fc(r.debtRepay)}</td>
            <td style={fTdR(r.equity, { bold: true, bg: "var(--ad-navy-50)" })}>{fc(r.equity)}</td>
            <td style={fTdR(r.cumEquity, { positiveTone: "var(--ad-success)" })}>{fc(r.cumEquity)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ background: "var(--bg-2)", borderTop: "2px solid var(--border-strong)" }}>
          <td style={{ ...fTd, fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.12em", color: "var(--fg-2)" }}>Total</td>
          <td style={fTdR(totalProject, { bold: true })}>{fc(totalProject)}</td>
          <td style={fTdR(totalDraw, { bold: true, positiveTone: "var(--ad-success)" })}>{`+${fc(totalDraw).replace("SAR ", "")}`}</td>
          <td style={fTdR(totalRepay, { bold: true })}>{fc(totalRepay)}</td>
          <td style={fTdR(totalEquity, { bold: true, bg: "var(--ad-navy-50)" })}>{fc(totalEquity)}</td>
          <td style={{ ...fTd, textAlign: "right", color: "var(--fg-4)", fontSize: 10 }}>= profit</td>
        </tr>
      </tfoot>
    </table>
  );
}

/* ---------- Scenarios panel ---------- */

function ScenariosPanel({ scenarios, input }) {
  if (!scenarios) return null;
  const rows = [
    ["Equity IRR", "equityIRR", fp],
    ["Equity NPV", "equityNPV", fc],
    ["Project IRR", "projectIRR", fp],
    ["Equity ROI", "equityROI", fp],
    ["Profit (levered)", "profit", fc],
    ["Profit (unlevered)", "profitUnlevered", fc],
    ["Peak debt", "peakDebt", fc],
    ["Peak equity", "totalEquity", fc],
    ["Total interest", "totalInterest", fc],
    ["Min DSCR", "minDSCR", v => v ? `${v.toFixed(2)}×` : "—"],
    ["Equity payback (mo)", "equityPayback", v => v ? `${v}` : "—"],
  ];

  return (
    <div style={{ padding: 32 }}>
      <Eyebrow>Scenario comparison</Eyebrow>
      <h2 style={{ fontSize: 24, marginTop: 6, marginBottom: 24 }}>Down · Base · Up</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <ScenarioCard label="Downside" tone="negative" result={scenarios.downside} hurdle={input.discountRate} />
        <ScenarioCard label="Base" tone="default" result={scenarios.base} hurdle={input.discountRate} />
        <ScenarioCard label="Upside" tone="positive" result={scenarios.upside} hurdle={input.discountRate} />
      </div>

      <div style={{ border: "1px solid var(--border-1)", background: "var(--bg-1)", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-1)" }}>
          <Eyebrow>Side-by-side</Eyebrow>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-2)" }}>
              <th style={thStyle}>Metric</th>
              <th style={{ ...thStyleNum, color: "var(--ad-danger)" }}>Downside</th>
              <th style={thStyleNum}>Base</th>
              <th style={{ ...thStyleNum, color: "var(--ad-success)" }}>Upside</th>
              <th style={thStyleNum}>Δ Range</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, key, fmt]) => {
              const dv = scenarios.downside.kpi[key];
              const bv = scenarios.base.kpi[key];
              const uv = scenarios.upside.kpi[key];
              return (
                <tr key={key} style={{ borderBottom: "1px solid var(--border-2)" }}>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{label}</td>
                  <td style={tdNum(dv)}>{fmt(dv)}</td>
                  <td style={tdNum(bv)}>{fmt(bv)}</td>
                  <td style={tdNum(uv)}>{fmt(uv)}</td>
                  <td style={{ ...tdNum(uv - dv), color: "var(--fg-3)" }}>
                    {typeof bv === "number" && typeof uv === "number" && typeof dv === "number" ? fmt(uv - dv) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, padding: "16px 20px", background: "var(--bg-2)", fontSize: 12, color: "var(--fg-2)" }}>
        <strong style={{ color: "var(--fg-1)" }}>Scenario assumptions:</strong> Downside shifts pricing −10%, construction +10%, and adds 3-month delay. Upside shifts pricing +10%, construction −5%, removes 2 months. Base = your inputs.
      </div>
    </div>
  );
}

window.Panels = { SummaryPanel, CashflowPanel, CostPanel, ProgramPanel, ReturnsPanel, SensitivityPanel, MonteCarloPanel, WaterfallPanel, RiskPanel, ScenariosPanel };
