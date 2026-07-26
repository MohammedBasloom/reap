/* =============================================================
   Fund Waterfall panel — LP / Developer / GP
   Shows: capital stack, returns by party, distribution buckets,
   fee breakdown, annual party-by-party cashflow table.
   ============================================================= */
const { useMemo: useMemoF } = React;
const { formatCurrency: fcF, formatPct: fpF, formatNumber: fnF } = window.Feas;

const FUND_COLORS = {
  lp: "var(--ad-navy-700)",
  dev: "var(--ad-sand-700)",
  gp: "var(--ad-gold-600)",
};
const FUND_LABELS = { lp: "LP · Cash investors", dev: "Developer", gp: "GP · Fund manager" };

function FundEyebrow({ children }) {
  return <div style={{
    fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
    fontWeight: 500, color: "var(--fg-3)",
  }}>{children}</div>;
}

function FundPanel({ result, waterfall, input }) {
  if (!waterfall || !waterfall.enabled) return null;

  const w = waterfall;
  const totals = w.totals;
  const fund = input.fund || {};
  const fundLifeYears = (w.fundLifeMonths || w.horizon) / 12;
  const projectHorizonYears = (result.kpi.horizonMonths || 0) / 12;
  const horizonExceedsFund = projectHorizonYears > fundLifeYears + 0.04; // > ~½ month gap

  // Top KPIs
  const totalEquity = w.contributions.total;
  const totalFees = w.fees.acquisition + w.fees.assetMgmt + w.fees.development;
  const totalDistributed = totals.lp.distributed + totals.dev.distributed + totals.gp.distributed;

  return (
    <div style={{ padding: 32 }}>
      <FundEyebrow>Fund Waterfall · LP · Developer · GP</FundEyebrow>
      <h2 style={{ fontSize: 28, marginTop: 6, marginBottom: 8, fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg-1)" }}>
        How the cash splits between cash investors, the developer and the fund manager
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, fontSize: 11, color: "var(--fg-3)", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, background: "var(--ad-navy-700)", display: "inline-block" }} />
          Fund life
          <strong style={{ color: "var(--fg-1)", fontWeight: 600, marginLeft: 4 }}>{fundLifeYears.toFixed(1)} yrs</strong>
          <span style={{ color: "var(--fg-4)" }}>· from first call to final exit</span>
        </span>
        {horizonExceedsFund && (
          <span style={{
            padding: "3px 10px", background: "color-mix(in oklab, var(--ad-warning) 12%, transparent)",
            color: "var(--ad-warning)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600,
          }}>
            Project horizon pinned to {projectHorizonYears.toFixed(1)} yrs — fund closes at exit; no fees accrue past Y{fundLifeYears.toFixed(1)}
          </span>
        )}
      </div>

      {/* Headline KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <FundKPI eyebrow="Total equity" value={fcF(totalEquity)} sub={`LP ${fpF(w.splits.lp,0)} · Dev ${fpF(w.splits.dev,0)} · GP ${fpF(w.splits.gp,0)}`} large />
        <FundKPI eyebrow="Total distributed" value={fcF(totalDistributed)} sub="Across all three parties" large />
        <FundKPI eyebrow="GP promote earned" value={fcF(w.buckets.promoteToGP)} sub={`${fpF(fund.promoteSplit, 0)} performance fee`} tone="accent" large />
        <FundKPI eyebrow="Total fees" value={fcF(totalFees)} sub={`Acq + asset mgmt + dev`} large />
      </div>

      {/* Party returns - three big cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <PartyCard
          who="lp" label="LP · Cash investors"
          contrib={totals.lp.contributed} dist={totals.lp.distributed} profit={totals.lp.profit}
          irr={totals.lp.irr} moic={totals.lp.moic} hurdle={fund.preferredReturnPct}
          fees={0}
          note="Pref + pro-rata of residuals after promote"
        />
        <PartyCard
          who="dev" label="Developer"
          contrib={totals.dev.contributed} dist={totals.dev.distributed} profit={totals.dev.profit}
          irr={totals.dev.irr} moic={totals.dev.moic} hurdle={fund.preferredReturnPct}
          fees={w.fees.development}
          note={`Dev fee ${fcF(w.fees.development)} + co-invest returns`}
        />
        <PartyCard
          who="gp" label="GP · Fund manager"
          contrib={totals.gp.contributed} dist={totals.gp.distributed} profit={totals.gp.profit}
          irr={totals.gp.irr} moic={totals.gp.moic} hurdle={fund.preferredReturnPct}
          fees={w.fees.acquisition + w.fees.assetMgmt}
          note={`Acq + mgmt ${fcF(w.fees.acquisition + w.fees.assetMgmt)} · promote ${fcF(w.buckets.promoteToGP)}`}
          accent
        />
      </div>

      {/* Fund-level Sources & Uses — distinct from the Capital tab's project-level
          S&U. Here, Sources are broken out BY PARTY (LP/Dev/GP/Debt) and Uses
          include the fund fees (acq, AM, dev) that the project ledger omits. */}
      <div style={{ border: "1px solid var(--border-1)", background: "var(--bg-1)", marginBottom: 24 }}>
        <div style={{ padding: "14px 24px 0" }}>
          <FundEyebrow>Fund-level Sources & Uses</FundEyebrow>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, marginBottom: 4 }}>
            Who funded the spend (equity by party, debt, and revenue the project retained) → where it went
            (project costs <em>and</em> fund fees). Cash basis — the Capital tab shows the project-level
            accounting ledger, which excludes fund fees.
          </div>
        </div>
        <SourcesUsesTable w={w} result={result} fund={fund} />
      </div>

      {/* Two-column: capital stack + distribution buckets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 24, marginBottom: 24 }}>
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <FundEyebrow>Equity contributions</FundEyebrow>
          <CapitalStack w={w} />
        </div>
        <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)" }}>
          <FundEyebrow>Distribution waterfall — buckets</FundEyebrow>
          <BucketBars w={w} fund={fund} />
        </div>
      </div>

      {/* Fee breakdown */}
      <div style={{ border: "1px solid var(--border-1)", padding: 24, background: "var(--bg-1)", marginBottom: 24 }}>
        <FundEyebrow>Fees collected</FundEyebrow>
        <FeeTable w={w} fund={fund} />
      </div>

      {/* Annual cashflow table */}
      <div style={{ border: "1px solid var(--border-1)", background: "var(--bg-1)" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-1)" }}>
          <FundEyebrow>Annual cashflow by party</FundEyebrow>
        </div>
        <div style={{ overflowX: "auto" }}>
          <AnnualPartyTable w={w} />
        </div>
      </div>
    </div>
  );
}

/* ---------- KPI tile ---------- */

function FundKPI({ eyebrow, value, sub, tone = "default", large = false }) {
  const tones = {
    default: "var(--fg-1)",
    accent: "var(--ad-gold-600)",
    positive: "var(--ad-success)",
    negative: "var(--ad-danger)",
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
          fontSize: large ? 30 : 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: tones[tone],
          fontVariantNumeric: "tabular-nums",
          marginTop: 6,
        }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ---------- Party card ---------- */

function PartyCard({ who, label, contrib, dist, profit, irr, moic, hurdle, fees, note, accent }) {
  const color = FUND_COLORS[who];
  const irrClears = irr !== null && irr >= (hurdle || 0);
  return (
    <div style={{
      border: "1px solid var(--border-1)",
      borderTop: `3px solid ${color}`,
      background: accent ? "var(--ad-navy-50)" : "var(--bg-1)",
      padding: "18px 20px",
    }}>
      <div style={{
        fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--fg-3)", fontWeight: 600,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ width: 10, height: 10, background: color, display: "inline-block" }} />
        {label}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>IRR</div>
          <div className="tabnum" style={{
            fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600,
            letterSpacing: "-0.02em",
            color: irr === null ? "var(--fg-3)" : irrClears ? "var(--ad-success)" : "var(--ad-danger)",
          }}>{irr === null ? "—" : fpF(irr)}</div>
          <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 2 }}>vs {fpF(hurdle || 0)} pref</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>MOIC</div>
          <div className="tabnum" style={{
            fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600,
            letterSpacing: "-0.02em", color: "var(--fg-1)",
          }}>{moic ? `${moic.toFixed(2)}×` : "—"}</div>
          <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 2 }}>Multiple on invested</div>
        </div>
      </div>

      <div style={{
        marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--border-1)",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11,
      }}>
        <div style={{ color: "var(--fg-3)" }}>Contributed</div>
        <div className="tabnum" style={{ color: "var(--fg-1)", textAlign: "right" }}>{fcF(contrib)}</div>
        <div style={{ color: "var(--fg-3)" }}>Distributed</div>
        <div className="tabnum" style={{ color: "var(--fg-1)", textAlign: "right" }}>{fcF(dist)}</div>
        {fees > 0 && (
          <>
            <div style={{ color: "var(--fg-3)" }}>(of which fees)</div>
            <div className="tabnum" style={{ color: "var(--ad-gold-600)", textAlign: "right" }}>{fcF(fees)}</div>
          </>
        )}
        <div style={{ color: "var(--fg-3)", fontWeight: 600 }}>Net profit</div>
        <div className="tabnum" style={{ color: profit >= 0 ? "var(--ad-success)" : "var(--ad-danger)", textAlign: "right", fontWeight: 600 }}>{fcF(profit)}</div>
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: "var(--fg-3)", lineHeight: 1.4, fontStyle: "italic" }}>
        {note}
      </div>
    </div>
  );
}

/* ---------- Capital stack (vertical stacked bar) ---------- */

function CapitalStack({ w }) {
  const total = w.contributions.total || 1;
  const items = [
    { who: "lp",  label: "LP",        value: w.contributions.lp,  color: FUND_COLORS.lp },
    { who: "dev", label: "Developer", value: w.contributions.dev, color: FUND_COLORS.dev },
    { who: "gp",  label: "GP",        value: w.contributions.gp,  color: FUND_COLORS.gp },
  ];
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", height: 220, gap: 16 }}>
        <div style={{ width: 60, display: "flex", flexDirection: "column", justifyContent: "space-between",
          fontSize: 9, color: "var(--fg-3)", textAlign: "right", paddingRight: 8 }}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{fcF(total)}</span>
          <span>50%</span>
          <span>0</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid var(--border-1)", background: "var(--bg-2)" }}>
          {items.map((it, i) => {
            const pct = (it.value / total) * 100;
            return (
              <div key={it.who} style={{
                height: `${pct}%`, background: it.color, position: "relative",
                borderBottom: i < items.length - 1 ? "1px solid white" : "none",
                display: "flex", alignItems: "center", padding: "0 12px",
                color: "white", fontSize: 12, fontWeight: 500,
                minHeight: pct > 0 ? 22 : 0,
              }}>
                {pct > 6 && (
                  <span style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>
                    {it.label} <span style={{ opacity: 0.7, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(1)}%</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {items.map((it) => (
          <div key={it.who} style={{
            display: "flex", justifyContent: "space-between", padding: "6px 0",
            borderBottom: "1px solid var(--border-1)", fontSize: 12,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, background: it.color }} />
              <span style={{ color: "var(--fg-2)" }}>{it.label}</span>
            </span>
            <span className="tabnum" style={{ color: "var(--fg-1)", fontWeight: 500 }}>{fcF(it.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Distribution bucket bars ---------- */

function BucketBars({ w, fund }) {
  const b = w.buckets;
  const totalProfit = b.preferredReturn + b.promoteToGP + b.proRataResidual;
  const items = [
    { label: "1 · Return of capital",        value: b.returnOfCapital, color: "var(--ad-navy-300)", note: "Pro-rata to whoever contributed cash (LP + Dev + GP co-invest)" },
    { label: `2 · Preferred return (${fpF(fund.preferredReturnPct, 0)} compounded)`, value: b.preferredReturn, color: "var(--ad-navy-700)", note: "Pro-rata to all equity on unreturned capital balances" },
    { label: `3 · Performance fee → GP (${fpF(fund.promoteSplit, 0)})`, value: b.promoteToGP, color: "var(--ad-gold-600)", note: `${fpF(fund.promoteSplit, 0)} of remaining distributions — the GP's promote / carry` },
    { label: `3b · Pro-rata to investors (${fpF(1 - fund.promoteSplit, 0)})`, value: b.proRataResidual, color: "var(--ad-sand-700)", note: "Remaining distribution pro-rata to LP + Developer (cash contributors only). GP is rewarded via promote." },
  ];
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div style={{ marginTop: 16 }}>
      {items.map((it, i) => {
        const pct = (it.value / max) * 100;
        return (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: "var(--fg-2)" }}>{it.label}</span>
              <span className="tabnum" style={{ color: "var(--fg-1)", fontWeight: 500 }}>{fcF(it.value)}</span>
            </div>
            <div style={{ height: 14, background: "var(--bg-3)", border: "1px solid var(--border-1)" }}>
              <div style={{ height: "100%", background: it.color, width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 3 }}>{it.note}</div>
          </div>
        );
      })}

      <div style={{
        marginTop: 16, padding: "10px 14px", background: "var(--ad-navy-50)",
        display: "flex", justifyContent: "space-between", fontSize: 11,
      }}>
        <span style={{ color: "var(--fg-2)", fontWeight: 500 }}>Profit above ROC → GP take-home {totalProfit > 0 ? fpF(b.promoteToGP / totalProfit, 0) : "—"}</span>
        <span className="tabnum" style={{ color: "var(--ad-navy-900)", fontWeight: 600 }}>{fcF(totalProfit)}</span>
      </div>
    </div>
  );
}

/* ---------- Fund-level Sources & Uses ledger ----------
   Investor/fund view. Sources are broken out BY PARTY so the LP/Dev/GP
   commitments are visible alongside the debt facility; Uses surface the
   three fund fees that the project-level S&U (Capital tab) doesn't show. */

function SourcesUsesTable({ w, result, fund }) {
  const k = result.kpi;
  const debtDrawn = k.debtDrawnTotal || 0;
  const sources = [
    { label: "LP commitment",           sub: "Cash investors (limited partners)", who: "LP",        value: w.contributions.lp,  color: FUND_COLORS.lp,   pct: w.splits.lp },
    { label: "Developer commitment",    sub: "Co-invest from the developer",      who: "Developer", value: w.contributions.dev, color: FUND_COLORS.dev,  pct: w.splits.dev },
    { label: "GP co-invest",            sub: "Fund manager's own capital",         who: "GP",        value: w.contributions.gp,  color: FUND_COLORS.gp,   pct: w.splits.gp },
    { label: "Debt facility drawn",     sub: `${fpF(k.devCostExFinance > 0 ? debtDrawn / k.devCostExFinance : 0, 1)} effective LTC · senior facility`, who: "Lender", value: debtDrawn, color: "var(--ad-navy-300)", isDebt: true },
  ].filter(s => s.value > 0.5);
  const totalEquity = w.contributions.total;

  // Uses — project costs split out, then fund fees.
  const projectUses = [
    { label: "Land + transfer fees",  value: k.landCost + k.landTransferFees, color: "var(--ad-navy-900)" },
    { label: "Construction",          value: k.constructionCost,              color: "var(--ad-navy-700)" },
    { label: "Land infrastructure",   value: k.landInfraCost || 0,            color: "var(--ad-navy-600)" },
    { label: "Site work",             value: k.siteWorkCost - (k.landInfraCost || 0), color: "var(--ad-navy-500)" },
    { label: "Soft costs",            value: k.softCosts,                     color: "var(--ad-navy-300)" },
    { label: "Contingency",           value: k.contingency,                   color: "var(--ad-sand-500)" },
    { label: "Marketing + selling",   value: (k.marketing||0) + (k.salesCommission||0) + (k.govFees||0), color: "var(--ad-sand-700)" },
    { label: "Financing interest",    value: k.totalInterest,                 color: "var(--ad-gold-500)" },
  ].filter(u => u.value > 0.5);
  const projectTotal = projectUses.reduce((s, u) => s + u.value, 0);

  const fundFees = [
    { label: "Acquisition fee",       value: w.fees.acquisition, recipient: "GP",        color: FUND_COLORS.gp,  rate: `${fpF(fund.acquisitionFeePct, 2)} of project cost · one-time` },
    { label: "Asset management fee",  value: w.fees.assetMgmt,   recipient: "GP",        color: FUND_COLORS.gp,  rate: `${fpF(fund.assetMgmtFeePctYr, 2)}/yr on unreturned equity` },
    { label: "Development fee",       value: w.fees.development, recipient: "Developer", color: FUND_COLORS.dev, rate: `${fpF(fund.developmentFeePct, 2)} of construction cost · S-curve` },
  ].filter(u => u.value > 0.5);
  const feesTotal = fundFees.reduce((s, u) => s + u.value, 0);

  const totalUses = projectTotal + feesTotal;

  // Capital calls are CASH-basis (net monthly shortfall), so part of the uses
  // is funded by revenue the project retains along the way (pre-sales during
  // construction, operating income, exit proceeds swept to costs/debt). Show
  // it as its own source so the ledger ties without inflating equity.
  const equityAndDebt = sources.reduce((s, r) => s + r.value, 0);
  const revenueApplied = Math.max(0, totalUses - equityAndDebt);
  if (revenueApplied > 0.5) {
    sources.push({
      label: "Revenue applied to costs",
      sub: "Pre-sales & operating cash retained by the project",
      who: "Project", value: revenueApplied, color: "var(--ad-gold-500)", isRevenue: true,
    });
  }
  const totalSources = equityAndDebt + revenueApplied;
  const diff = totalSources - totalUses;
  const tie = Math.abs(diff) < 1000; // SAR; tolerate < 1k rounding

  const cellL = { padding: "9px 14px", color: "var(--fg-1)", verticalAlign: "top" };
  const cellR = { ...cellL, textAlign: "right", whiteSpace: "nowrap" };
  const subRow = { padding: "10px 14px", background: "var(--bg-2)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1.15fr", borderTop: "1px solid var(--border-1)" }}>
      {/* === SOURCES === */}
      <div>
        <div style={subRow}>Sources · capital raised</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-2)" }}>
              <th style={{ ...cellL, fontWeight: 500, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-3)" }}>Party</th>
              <th style={{ ...cellR, fontWeight: 500, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-3)" }}>Amount</th>
              <th style={{ ...cellR, fontWeight: 500, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-3)", width: 90 }}>% of total</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border-2)" }}>
                <td style={cellL}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, background: s.color, display: "inline-block", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>{s.sub}</div>
                    </div>
                  </div>
                </td>
                <td style={{ ...cellR, fontWeight: 500 }}><span className="tabnum">{fcF(s.value)}</span></td>
                <td style={cellR}><span className="tabnum" style={{ color: "var(--fg-3)" }}>{fpF(s.value / Math.max(1, totalSources), 1)}</span></td>
              </tr>
            ))}
            {/* Equity subtotal */}
            <tr style={{ borderBottom: "1px solid var(--border-2)", background: "var(--bg-2)" }}>
              <td style={{ ...cellL, fontSize: 11, color: "var(--fg-2)", paddingLeft: 36 }}>Subtotal · equity</td>
              <td style={{ ...cellR, fontSize: 11, color: "var(--fg-2)" }}><span className="tabnum">{fcF(totalEquity)}</span></td>
              <td style={{ ...cellR, fontSize: 11, color: "var(--fg-3)" }}><span className="tabnum">{fpF(totalEquity / Math.max(1, totalSources), 1)}</span></td>
            </tr>
            <tr style={{ background: "var(--ad-navy-50)", borderTop: "2px solid var(--border-strong)" }}>
              <td style={{ ...cellL, fontWeight: 700, color: "var(--ad-navy-900)" }}>Total sources</td>
              <td style={{ ...cellR, fontWeight: 700, color: "var(--ad-navy-900)", fontSize: 14, fontFamily: "var(--font-display)" }}><span className="tabnum">{fcF(totalSources)}</span></td>
              <td style={{ ...cellR, fontWeight: 700, color: "var(--ad-navy-900)" }}><span className="tabnum">100.0%</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Vertical divider */}
      <div style={{ background: "var(--border-1)" }} />

      {/* === USES === */}
      <div>
        <div style={subRow}>Uses · where the capital went</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-2)" }}>
              <th style={{ ...cellL, fontWeight: 500, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-3)" }}>Item</th>
              <th style={{ ...cellL, fontWeight: 500, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-3)", width: 90 }}>Recipient</th>
              <th style={{ ...cellR, fontWeight: 500, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-3)" }}>Amount</th>
              <th style={{ ...cellR, fontWeight: 500, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-3)", width: 80 }}>% of total</th>
            </tr>
          </thead>
          <tbody>
            {/* Project section */}
            <tr><td colSpan={4} style={{ padding: "8px 14px 4px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600 }}>Project costs</td></tr>
            {projectUses.map((u, i) => (
              <tr key={`p${i}`} style={{ borderBottom: "1px solid var(--border-2)" }}>
                <td style={cellL}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, background: u.color, display: "inline-block", flexShrink: 0 }} />
                    <span>{u.label}</span>
                  </div>
                </td>
                <td style={{ ...cellL, fontSize: 11, color: "var(--fg-3)" }}>Contractors</td>
                <td style={cellR}><span className="tabnum">{fcF(u.value)}</span></td>
                <td style={cellR}><span className="tabnum" style={{ color: "var(--fg-3)" }}>{fpF(u.value / Math.max(1, totalUses), 1)}</span></td>
              </tr>
            ))}
            <tr style={{ borderBottom: "1px solid var(--border-2)", background: "var(--bg-2)" }}>
              <td style={{ ...cellL, fontSize: 11, color: "var(--fg-2)", paddingLeft: 36 }}>Subtotal · project</td>
              <td style={{ ...cellL, fontSize: 11, color: "var(--fg-3)" }}>—</td>
              <td style={{ ...cellR, fontSize: 11, color: "var(--fg-2)" }}><span className="tabnum">{fcF(projectTotal)}</span></td>
              <td style={{ ...cellR, fontSize: 11, color: "var(--fg-3)" }}><span className="tabnum">{fpF(projectTotal / Math.max(1, totalUses), 1)}</span></td>
            </tr>

            {/* Fund fees section — what makes this different from the Capital tab */}
            <tr><td colSpan={4} style={{ padding: "10px 14px 4px 14px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ad-gold-600)", fontWeight: 600 }}>Fund fees · the GP & Developer take</td></tr>
            {fundFees.length === 0 && (
              <tr><td colSpan={4} style={{ ...cellL, fontSize: 11, color: "var(--fg-4)", fontStyle: "italic", paddingLeft: 14 }}>No fund fees configured.</td></tr>
            )}
            {fundFees.map((u, i) => (
              <tr key={`f${i}`} style={{ borderBottom: "1px solid var(--border-2)" }}>
                <td style={cellL}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, background: u.color, display: "inline-block", flexShrink: 0 }} />
                    <div>
                      <div>{u.label}</div>
                      <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>{u.rate}</div>
                    </div>
                  </div>
                </td>
                <td style={{ ...cellL, fontSize: 11 }}>
                  <span style={{ padding: "2px 6px", background: u.color, color: "white", fontSize: 10, letterSpacing: "0.06em", fontWeight: 600 }}>{u.recipient}</span>
                </td>
                <td style={cellR}><span className="tabnum" style={{ color: "var(--ad-gold-600)", fontWeight: 500 }}>{fcF(u.value)}</span></td>
                <td style={cellR}><span className="tabnum" style={{ color: "var(--fg-3)" }}>{fpF(u.value / Math.max(1, totalUses), 1)}</span></td>
              </tr>
            ))}
            {feesTotal > 0 && (
              <tr style={{ borderBottom: "1px solid var(--border-2)", background: "var(--bg-2)" }}>
                <td style={{ ...cellL, fontSize: 11, color: "var(--fg-2)", paddingLeft: 36 }}>Subtotal · fees</td>
                <td style={{ ...cellL, fontSize: 11, color: "var(--fg-3)" }}>—</td>
                <td style={{ ...cellR, fontSize: 11, color: "var(--ad-gold-600)", fontWeight: 500 }}><span className="tabnum">{fcF(feesTotal)}</span></td>
                <td style={{ ...cellR, fontSize: 11, color: "var(--fg-3)" }}><span className="tabnum">{fpF(feesTotal / Math.max(1, totalUses), 1)}</span></td>
              </tr>
            )}

            <tr style={{ background: "var(--ad-navy-50)", borderTop: "2px solid var(--border-strong)" }}>
              <td style={{ ...cellL, fontWeight: 700, color: "var(--ad-navy-900)" }}>Total uses</td>
              <td style={cellL}></td>
              <td style={{ ...cellR, fontWeight: 700, color: "var(--ad-navy-900)", fontSize: 14, fontFamily: "var(--font-display)" }}><span className="tabnum">{fcF(totalUses)}</span></td>
              <td style={{ ...cellR, fontWeight: 700, color: "var(--ad-navy-900)" }}><span className="tabnum">100.0%</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Balance check — full width */}
      <div style={{
        gridColumn: "1 / -1",
        borderTop: "1px solid var(--border-1)",
        padding: "12px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: tie ? "color-mix(in oklab, var(--ad-success) 6%, var(--bg-1))" : "color-mix(in oklab, var(--ad-warning) 8%, var(--bg-1))",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: tie ? "var(--ad-success)" : "var(--ad-warning)",
          }} />
          <span style={{ fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: tie ? "var(--ad-success)" : "var(--ad-warning)" }}>
            {tie ? "Balanced · Σ sources = Σ uses" : "Out of balance"}
          </span>
          {!tie && (
            <span style={{ color: "var(--fg-3)", fontStyle: "italic" }}>
              {diff > 0 ? `Sources exceed uses by ${fcF(diff)}` : `Uses exceed sources by ${fcF(-diff)}`}
            </span>
          )}
        </div>
        <div className="tabnum" style={{ fontSize: 13, color: "var(--fg-2)", fontFamily: "var(--font-display)", fontWeight: 500 }}>
          {fcF(totalSources)} <span style={{ color: "var(--fg-4)", margin: "0 8px" }}>=</span> {fcF(totalUses)}
        </div>
      </div>
    </div>
  );
}

/* ---------- Fee table ---------- */

function FeeTable({ w, fund }) {
  const k = w; // alias
  const rows = [
    { who: "GP",        label: "Acquisition fee",   rate: fpF(fund.acquisitionFeePct, 2),  base: "Total project cost · one-time", value: w.fees.acquisition,  color: FUND_COLORS.gp },
    { who: "GP",        label: "Asset mgmt fee",    rate: `${fpF(fund.assetMgmtFeePctYr, 2)}/yr`, base: "Unreturned equity balance · monthly", value: w.fees.assetMgmt,     color: FUND_COLORS.gp },
    { who: "Developer", label: "Development fee",   rate: fpF(fund.developmentFeePct, 2),  base: "Construction + site cost · S-curve", value: w.fees.development, color: FUND_COLORS.dev },
    { who: "GP",        label: "Performance fee (promote)",   rate: fpF(fund.promoteSplit, 0), base: "Of distributions after return of capital + preferred return", value: w.buckets.promoteToGP, color: FUND_COLORS.gp },
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div style={{ marginTop: 14 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={fTh}>Recipient</th>
            <th style={fTh}>Fee</th>
            <th style={fTh}>Rate</th>
            <th style={fTh}>Basis</th>
            <th style={fThR}>Amount</th>
            <th style={fThR}>% of fees</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border-2)" }}>
              <td style={fTd}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, background: r.color, display: "inline-block" }} />
                  {r.who}
                </span>
              </td>
              <td style={{ ...fTd, fontWeight: 500 }}>{r.label}</td>
              <td style={fTd}><span className="tabnum">{r.rate}</span></td>
              <td style={{ ...fTd, fontSize: 11, color: "var(--fg-3)" }}>{r.base}</td>
              <td style={fTdR}><span className="tabnum">{fcF(r.value)}</span></td>
              <td style={fTdR}><span className="tabnum">{total > 0 ? fpF(r.value / total, 1) : "—"}</span></td>
            </tr>
          ))}
          <tr style={{ background: "var(--bg-2)", borderTop: "2px solid var(--border-strong)" }}>
            <td style={fTd} colSpan={4}><strong>Total to GP + Developer</strong></td>
            <td style={fTdR}><span className="tabnum" style={{ fontWeight: 700 }}>{fcF(total)}</span></td>
            <td style={fTdR}><span className="tabnum">100%</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Annual table ---------- */

function AnnualPartyTable({ w }) {
  const horizon = w.horizon;
  const years = Math.ceil(horizon / 12);

  const sliceSum = (arr, y) => arr.slice(y * 12, (y + 1) * 12).reduce((s, v) => s + v, 0);

  const rows = [];
  let cumLP = 0, cumDev = 0, cumGP = 0;
  for (let y = 0; y < years; y++) {
    const lp  = sliceSum(w.party.lp.cashflow, y);
    const dev = sliceSum(w.party.dev.cashflow, y);
    const gp  = sliceSum(w.party.gp.cashflow, y);
    cumLP += lp; cumDev += dev; cumGP += gp;
    rows.push({ y, lp, dev, gp, cumLP, cumDev, cumGP });
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
      <thead>
        <tr style={{ background: "var(--bg-2)" }}>
          <th style={fTh}>Year</th>
          <th style={fThR}>LP</th>
          <th style={fThR}>LP cum.</th>
          <th style={fThR}>Developer</th>
          <th style={fThR}>Dev cum.</th>
          <th style={fThR}>GP</th>
          <th style={fThR}>GP cum.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.y} style={{ borderBottom: "1px solid var(--border-2)" }}>
            <td style={fTd}>Y{r.y + 1}</td>
            <td style={fTdN(r.lp)}>{r.lp === 0 ? "—" : fcF(r.lp)}</td>
            <td style={fTdN(r.cumLP)}><span style={{ color: r.cumLP < 0 ? "var(--ad-danger)" : "var(--ad-success)" }}>{fcF(r.cumLP)}</span></td>
            <td style={fTdN(r.dev)}>{r.dev === 0 ? "—" : fcF(r.dev)}</td>
            <td style={fTdN(r.cumDev)}><span style={{ color: r.cumDev < 0 ? "var(--ad-danger)" : "var(--ad-success)" }}>{fcF(r.cumDev)}</span></td>
            <td style={fTdN(r.gp)}>{r.gp === 0 ? "—" : fcF(r.gp)}</td>
            <td style={fTdN(r.cumGP)}><span style={{ color: r.cumGP < 0 ? "var(--ad-danger)" : "var(--ad-success)" }}>{fcF(r.cumGP)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- Shared styles ---------- */

const fTh = {
  padding: "10px 12px", textAlign: "left", fontWeight: 500,
  fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.12em",
  textTransform: "uppercase", color: "var(--fg-3)",
};
const fThR = { ...fTh, textAlign: "right" };
const fTd = { padding: "8px 12px", color: "var(--fg-1)" };
const fTdR = { padding: "8px 12px", color: "var(--fg-1)", textAlign: "right" };
const fTdN = (v) => ({
  padding: "8px 12px", textAlign: "right",
  color: v === 0 ? "var(--fg-4)" : v < 0 ? "var(--ad-danger)" : "var(--fg-1)",
  fontVariantNumeric: "tabular-nums",
});

window.FundPanel = FundPanel;
