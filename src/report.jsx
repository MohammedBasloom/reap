/* =============================================================
   Investment report — deterministic, paginated, print-ready.

   WHAT THIS IS. A consulting-grade report assembled entirely from data the
   platform already holds: the input the user typed, the engine's own output,
   and the scenario and sensitivity runs the results tabs already
   perform. Nothing here calls a model, a service or an API. Every sentence
   comes from a template selected by a published rule over those numbers, so
   the same input always produces byte-identical prose.

   WHAT IT DELIBERATELY DOES NOT CONTAIN. The brief asked for several things
   the platform has no data for, and asked that anything unavailable be
   dropped rather than invented:
     · Market analysis — REAP holds no market series, comparables or indices
       on the modeling side, so there is nothing to report and any text would
       be fabrication.
     · Risk matrix — risks carry a severity level but no likelihood and no
       impact axis, so a matrix cannot be plotted from them.
     · DSCR — removed from the engine on purpose. The debt model is a
       revolving cash sweep with no amortisation schedule, which makes a debt
       service cover ratio meaningless. Interest cover is reported instead,
       and it is a real engine output.
     · Break-even — not computed anywhere in the engine.
     · Project description — there is no such input field; the overview uses
       the name, location, type and program that do exist.

   WHAT IS DERIVED RATHER THAN STORED. The brief asked for an overall score
   and an investment rating; the platform has neither. Both are computed here
   by an explicit weighted formula over metrics that DO exist, and that
   formula is printed in the appendix so a reader can reproduce it by hand.
   That is a rule, not a judgement, and it satisfies the no-AI requirement.

   PAGINATION. Chrome cannot number pages from CSS — @page margin boxes are
   not implemented — so "Page X of Y", the running header and the repeated
   table headers are all produced by measuring the content and packing it into
   fixed A4 pages here. That also means the on-screen preview is the printed
   artefact, not an approximation of it.
   ============================================================= */

const { useState: useStateRep, useMemo: useMemoRep, useEffect: useEffectRep,
        useRef: useRefRep, useLayoutEffect: useLayoutEffectRep } = React;

(function () {

const FC = window.Feas.formatCurrency;
const FP = window.Feas.formatPct;
const FN = window.Feas.formatNumber;

/* Full numerals for a document someone may check with a calculator; the
   compact 12.3M form is for dashboards, not for a bank's file. */
const money = (v) => FC(v, { compact: false });

/* Verbatim text — never translated.

   The i18n layer patches React.createElement and translates every DIRECT
   string child whose text matches a dictionary key. That is right for the
   report's own prose and wrong for anything a person typed: the first run of
   this report came back with "Mohammed Basloom" rendered as "محمد باسلوم",
   because the site footer happens to carry that name as a dictionary entry.
   A company, a contact or a reference number must appear exactly as entered.

   Wrapping the value in a one-element array is all it takes: the translator
   only inspects children that ARE strings, and an array is not one. React
   renders it identically, and an array of plain strings raises no key warning
   because the key check only walks React elements.

   Applied to the identity fields — who the report is for, who prepared it,
   and how it is referenced. Project and component names deliberately still
   translate, because their defaults are dictionary terms and the rest of the
   app already renders them that way. */
function Raw({ v }) {
  if (v === null || v === undefined || v === "") return null;
  return <>{[String(v)]}</>;
}

/* Template lookup. The whole template — placeholders and all — is the
   dictionary key, so a translator sees a complete sentence rather than
   fragments that would assemble into nonsense under RTL. */
function T(str, vars) {
  let out = (window.I18N && window.I18N.t) ? window.I18N.t(str) : str;
  if (vars) for (const k in vars) out = out.split("{" + k + "}").join(vars[k]);
  return out;
}

/* ---------- A4 geometry ----------
   Worked in millimetres and converted once, so the preview and the print are
   the same object rather than two layouts that agree by luck. */
/* ---------- Slide geometry ----------
   338.67 x 190.5mm — 13.333 x 7.5 inches, the standard 16:9 presentation
   page. Not A4: this is read on a screen and shown in a room, so it is laid
   out landscape, wider and shallower, with fewer blocks to a page.

   The shallower page is the reason a deck runs to more pages than the
   portrait version did, and that is the intended trade. */
const MM = 96 / 25.4;
const PAGE_W_MM = 338.67, PAGE_H_MM = 190.5;
const PAD_X_MM = 20, HEAD_H_MM = 15, FOOT_H_MM = 11, GAP_MM = 5;
const CONTENT_H_PX = Math.floor((PAGE_H_MM - HEAD_H_MM - FOOT_H_MM - GAP_MM * 2) * MM);
const CONTENT_W_MM = PAGE_W_MM - PAD_X_MM * 2;

/* How many year columns fit across one slide before the table has to be cut
   and continued. Years run horizontally, so this is a width budget, not a
   height one — the paginator cannot help, so the split happens at build. */
const YEARS_PER_BLOCK = 10;

/* =============================================================
   1. Derived metrics
   ============================================================= */

/* Aggregate a monthly series into years. The engine's horizon is a duration,
   so the last year is usually a stub — it is kept rather than padded, because
   a reader comparing the table to the timeline should see the project end
   where the timeline says it ends. */
function annualise(arr, months) {
  const years = Math.ceil(months / 12);
  const out = new Array(years).fill(0);
  for (let m = 0; m < months; m++) out[Math.floor(m / 12)] += (arr && arr[m]) || 0;
  return out;
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/* The composite score. Five components over metrics the engine produces,
   weighted to 100. Printed in full in the appendix — a reader who disagrees
   with the weighting can recompute their own from the same table.

   Every branch has a defined answer for a project that called no equity: on
   those the equity measures are undefined by construction (there is no equity
   series to solve), so the project-level measure stands in. Scoring them zero
   would punish the strongest outcome the model can produce. */
function scoreProject(k, risks, horizonMonths, hurdle) {
  const noEquity = !(k.totalEquity > 0.01);
  const irr = noEquity ? k.projectIRR : k.equityIRR;
  const npv = noEquity ? k.projectNPV : k.equityNPV;
  const base = noEquity ? (k.totalCost || 0) : (k.totalEquity || 0);
  const payback = noEquity ? k.projectPayback : k.equityPayback;

  // 1. Return against the discount rate the user set as their hurdle (30)
  const sReturn = (irr === null || !hurdle) ? 0 : clamp01((irr / hurdle) / 1.5) * 30;
  // 2. Value created per riyal of capital at risk (25)
  const sValue = base > 0 ? clamp01((npv / base) / 0.5) * 25 : 0;
  // 3. Margin on revenue (20)
  const margin = k.totalRevenue > 0 ? k.profit / k.totalRevenue : 0;
  const sMargin = clamp01(margin / 0.25) * 20;
  // 4. Speed of capital recovery against the analysis horizon (15)
  const sPayback = (payback === null || !horizonMonths) ? 0
    : clamp01(1 - payback / horizonMonths) * 15;
  // 5. Clean bill of health on the engine's own risk register (10)
  const danger = risks.filter(r => r.level === "danger").length;
  const warning = risks.filter(r => r.level === "warning").length;
  const sRisk = Math.max(0, 10 - danger * 3 - warning * 1.5);

  const total = sReturn + sValue + sMargin + sPayback + sRisk;
  return {
    total: Math.round(total),
    parts: [
      { key: "Return vs hurdle", got: sReturn, max: 30 },
      { key: "Value created per riyal of capital", got: sValue, max: 25 },
      { key: "Profit margin on revenue", got: sMargin, max: 20 },
      { key: "Speed of capital recovery", got: sPayback, max: 15 },
      { key: "Risk register", got: sRisk, max: 10 },
    ],
    noEquity,
  };
}

function ratingFor(score) {
  if (score >= 80) return { label: "Strong", tone: "good", band: "80–100" };
  if (score >= 65) return { label: "Favourable", tone: "good", band: "65–79" };
  if (score >= 50) return { label: "Moderate", tone: "mid", band: "50–64" };
  if (score >= 35) return { label: "Marginal", tone: "warn", band: "35–49" };
  return { label: "Unfavourable", tone: "bad", band: "0–34" };
}

function metricsOf(input, result) {
  const k = result.kpi;
  const hurdle = (input.discountRate === null || input.discountRate === undefined)
    ? 0.10 : +input.discountRate;
  const totalInvestment = (k.totalCost || 0) + (k.totalInterest || 0);
  const margin = k.totalRevenue > 0 ? k.profit / k.totalRevenue : null;
  const equityMultiple = k.equityROI == null ? null : 1 + k.equityROI;
  const ltcActual = totalInvestment > 0 ? (k.peakDebt || 0) / totalInvestment : 0;
  const score = scoreProject(k, result.risks || [], k.horizonMonths, hurdle);
  return {
    k, hurdle, totalInvestment, margin, equityMultiple, ltcActual,
    score, rating: ratingFor(score.total),
  };
}

/* =============================================================
   2. Rule engines — every one a pure function of the numbers
   ============================================================= */

function deriveStrengths(m, input, result) {
  const { k } = m, out = [];
  const add = (title, detail) => out.push({ title, detail });

  if (k.equityIRR !== null && k.equityIRR >= m.hurdle)
    add("Return clears the target hurdle",
      T("Equity IRR of {irr} exceeds the {hurdle} discount rate set for this study, leaving {gap} of headroom.",
        { irr: FP(k.equityIRR), hurdle: FP(m.hurdle), gap: FP(k.equityIRR - m.hurdle) }));
  if (k.equityNPV > 0)
    add("Positive net present value",
      T("Discounted at {hurdle}, the equity position creates {npv} of value above the cost of capital.",
        { hurdle: FP(m.hurdle), npv: money(k.equityNPV) }));
  if (m.margin !== null && m.margin >= 0.20)
    add("Healthy margin on revenue",
      T("Net profit of {profit} on {rev} of revenue is a margin of {margin}.",
        { profit: money(k.profit), rev: money(k.totalRevenue), margin: FP(m.margin) }));
  if (m.ltcActual > 0 && m.ltcActual <= 0.60)
    add("Conservative financing structure",
      T("Peak debt of {debt} is {ltc} of total investment, below the 60% level at which lenders typically begin to price additional risk.",
        { debt: money(k.peakDebt), ltc: FP(m.ltcActual) }));
  if (!(k.totalEquity > 0.01))
    add("Self-funding through the cycle",
      T("Income and debt covered every outflow, so the scheme never required an equity injection.", null));
  if (k.interestCover !== null && k.interestCover !== undefined && k.interestCover >= 2)
    add("Comfortable interest cover",
      T("Operating income covers interest {x}× once the asset stabilises.",
        { x: k.interestCover.toFixed(2) }));
  if (k.equityPayback !== null && k.horizonMonths && k.equityPayback <= k.horizonMonths * 0.5)
    add("Capital returns inside half the horizon",
      T("Equity is recovered in month {m} of a {h}-month analysis period.",
        { m: FN(k.equityPayback), h: FN(k.horizonMonths) }));
  if ((result.components || []).length >= 3)
    add("Diversified revenue base",
      T("{n} distinct components spread income across more than one product and demand pool.",
        { n: FN((result.components || []).length) }));
  if (k.landTenure === "lease")
    add("Land held on lease rather than purchased",
      T("Ground rent of {rent} over the term replaces an outright land purchase, which lowers the capital the project must raise up front.",
        { rent: money(k.totalLandRent) }));
  if (k.totalExit > 0)
    add("Value realised at exit",
      T("A terminal disposal of {exit} converts the stabilised income into recoverable capital.",
        { exit: money(k.totalExit) }));

  return out;
}

function deriveWeaknesses(m, input, result) {
  const { k } = m, out = [];
  const add = (title, detail) => out.push({ title, detail });

  if (k.equityIRR !== null && k.equityIRR < m.hurdle)
    add("Return below the target hurdle",
      T("Equity IRR of {irr} falls short of the {hurdle} discount rate by {gap}.",
        { irr: FP(k.equityIRR), hurdle: FP(m.hurdle), gap: FP(m.hurdle - k.equityIRR) }));
  if (k.equityIRR === null && k.totalEquity > 0.01)
    add("Return could not be solved",
      T("The equity cashflow does not change sign, which means contributions are never recovered — no internal rate of return exists.", null));
  if (k.equityNPV < 0)
    add("Negative net present value",
      T("Discounted at {hurdle}, the equity position destroys {npv} of value against the cost of capital.",
        { hurdle: FP(m.hurdle), npv: money(Math.abs(k.equityNPV)) }));
  if (k.profit < 0)
    add("The scheme runs at a loss",
      T("Revenue of {rev} does not cover {cost} of cost and finance charges.",
        { rev: money(k.totalRevenue), cost: money(m.totalInvestment) }));
  else if (m.margin !== null && m.margin < 0.12)
    add("Thin margin on revenue",
      T("A margin of {margin} leaves little absorption for cost overrun or price softening.",
        { margin: FP(m.margin) }));
  if (m.ltcActual > 0.70)
    add("High leverage",
      T("Peak debt of {debt} is {ltc} of total investment, which magnifies the effect of any rate move or delay.",
        { debt: money(k.peakDebt), ltc: FP(m.ltcActual) }));
  if (k.equityPayback !== null && k.horizonMonths && k.equityPayback > k.horizonMonths * 0.75)
    add("Slow capital recovery",
      T("Equity is not recovered until month {m} of a {h}-month horizon, leaving capital exposed for most of the project's life.",
        { m: FN(k.equityPayback), h: FN(k.horizonMonths) }));
  if (k.interestCover !== null && k.interestCover !== undefined && k.interestCover < 1.25)
    add("Tight interest cover",
      T("Operating income covers interest only {x}×, which is close to the point at which the facility cannot be serviced from the asset.",
        { x: k.interestCover.toFixed(2) }));
  if ((input.contingencyPct || 0) < 0.05)
    add("Contingency below convention",
      T("A {c} contingency is thinner than the 5–10% normally carried through construction.",
        { c: FP(input.contingencyPct || 0) }));
  if ((input.softCostsPct || 0) < 0.08)
    add("Soft costs look understated",
      T("Design, consultants and project management at {s} of construction sit below the 10–15% ordinarily observed.",
        { s: FP(input.softCostsPct || 0) }));
  if ((result.components || []).length === 1)
    add("Single-product exposure",
      T("All revenue derives from one component, so the scheme carries no internal diversification.", null));

  return out;
}

function deriveOpportunities(m, input, result) {
  const { k } = m, out = [];
  const add = (title, detail) => out.push({ title, detail });
  const alloc = k.totalAllocationPct || 0;

  if (k.allocationUnused > 0.02)
    add("Unallocated land remains",
      T("{pct} of the site — about {area} m² — carries no component. It is available for a further phase, for public realm, or for density the current program does not use.",
        { pct: FP(k.allocationUnused), area: FN((k.netDevelopableArea || 0) * k.allocationUnused) }));
  if (m.ltcActual > 0 && m.ltcActual < 0.50)
    add("Capacity for additional leverage",
      T("At {ltc} of total investment the facility is well inside conventional limits, so more debt could be drawn to lift the return on equity.",
        { ltc: FP(m.ltcActual) }));
  if (k.totalGrossIncome > 0 && k.totalExit === 0)
    add("An exit is not currently priced in",
      T("The model holds the income-producing element to the end of the horizon without a disposal. Setting an exit cap rate would show what a sale is worth.", null));
  if (k.landType === "raw" && (input.developablePct || 0) < 0.80)
    add("Developable share could be tested",
      T("Only {pct} of the gross site is treated as developable. A masterplan that lifts that share would spread the land cost over more saleable area.",
        { pct: FP(input.developablePct || 0) }));
  if (input.preSalesStartMonth > input.predesignMonths)
    add("Pre-sales could start earlier",
      T("Sales begin in month {m}, after the {p}-month design period. Releasing earlier would pull revenue forward and reduce the peak funding requirement.",
        { m: FN(input.preSalesStartMonth), p: FN(input.predesignMonths) }));
  if (!(input.fund && input.fund.enabled))
    add("A fund structure has not been modelled",
      T("The study reports the project on its own balance sheet. Modelling an LP / GP structure would show how the return divides between sponsor and investor.", null));
  if (alloc > 0 && alloc < 0.98 && k.allocationUnused <= 0.02)
    add("Density has room to move",
      T("The program does not exhaust the site's allocation, so additional gross floor area could be tested against the same land cost.", null));

  return out;
}

/* Forward-looking risks derived from the numbers, distinct from the engine's
   own register — that one reports what the model already flagged, this one
   reports what the exposure implies. */
function deriveRiskFactors(m, input, result, scenarios) {
  const { k } = m, out = [];
  const add = (title, detail) => out.push({ title, detail });

  if (scenarios && scenarios.downside && scenarios.downside.kpi) {
    const d = scenarios.downside.kpi;
    add("Downside case", T(
      "A 10% adverse move in price, cost and absorption together with a three-month construction delay takes profit to {p} and equity IRR to {i}.",
      { p: money(d.profit), i: d.equityIRR === null ? "—" : FP(d.equityIRR) }));
  }
  if (m.ltcActual > 0.5)
    add("Interest rate exposure", T(
      "Debt peaks at {debt} and total finance charges are {int}. A one-point rise in the {r} rate is felt across the whole draw period.",
      { debt: money(k.peakDebt), int: money(k.totalInterest), r: FP(input.interestRate || 0) }));
  if (input.constructionMonths >= 36)
    add("Construction duration", T(
      "A {n}-month build carries the scheme through more of the cycle than a shorter programme, and extends the window over which cost inflation applies.",
      { n: FN(input.constructionMonths) }));
  if (k.totalGrossIncome > 0)
    add("Letting and occupancy", T(
      "Gross income of {g} depends on the occupancy assumed for the leased element. Income is the first thing to move if absorption is slower than planned.",
      { g: money(k.totalGrossIncome) }));
  if (k.totalExit > 0)
    add("Exit pricing", T(
      "{exit} of the total return is a terminal value set by a capitalisation rate. Yield expansion between now and disposal reduces it directly.",
      { exit: money(k.totalExit) }));
  /* The simulated-dispersion factor was dropped with Monte Carlo: it quoted
     trial probabilities, and there are no trials any more. */
  if (k.landTenure === "lease")
    add("Ground rent obligation", T(
      "Rent of {rent} accrues over the term whether or not the asset performs, and it is payable ahead of any return to capital.",
      { rent: money(k.totalLandRent) }));
  if (k.peakEquity > 0)
    add("Peak capital at risk", T(
      "The most capital exposed at any one time is {pe}, which is the figure a sponsor must be able to fund before any of it comes back.",
      { pe: money(k.peakEquity) }));

  return out;
}

/* The recommendation. A decision table, not a sentence generator: the four
   tests below are evaluated in order and the first matching band supplies the
   verdict, the reasoning and the conditions. */
function deriveRecommendation(m, input, result) {
  const { k } = m;
  const irr = (k.totalEquity > 0.01) ? k.equityIRR : k.projectIRR;
  const npv = (k.totalEquity > 0.01) ? k.equityNPV : k.projectNPV;
  const danger = (result.risks || []).filter(r => r.level === "danger").length;
  const clears = irr !== null && irr >= m.hurdle;
  const beats = irr !== null && irr >= m.hurdle * 1.25;
  const positive = npv > 0;

  /* Conditions go through T() rather than being concatenated, so the figure
     is substituted into the ARABIC sentence rather than glued onto an English
     one that the dictionary could never match. */
  const conditions = [];
  if (m.ltcActual > 0.70)
    conditions.push(T("Confirm the facility at the modelled peak of {debt}, or restructure toward a lower loan-to-cost.", { debt: money(k.peakDebt) }));
  if ((input.contingencyPct || 0) < 0.05)
    conditions.push(T("Raise contingency to at least 5% of construction before the cost plan is fixed.", null));
  if ((input.softCostsPct || 0) < 0.08)
    conditions.push(T("Re-test soft costs against a real consultant fee schedule.", null));
  if (k.interestCover !== null && k.interestCover !== undefined && k.interestCover < 1.25)
    conditions.push(T("Demonstrate that the stabilised asset can service the facility, or size the debt to the income rather than to cost.", null));
  if (k.allocationOverflow)
    conditions.push(T("Resolve the land allocation, which currently exceeds the site.", null));
  if (k.totalExit > 0)
    conditions.push(T("Support the exit capitalisation rate with transactional evidence.", null));
  if (!conditions.length)
    conditions.push(T("Re-run the study against tendered construction rates once they are available.", null));

  if (beats && positive && danger === 0)
    return {
      verdict: "Proceed",
      tone: "good",
      body: T("The scheme clears its return target with margin, creates value on a discounted basis, and carries no red flag on the risk register. On the assumptions set out in this report it supports a decision to proceed.", null),
      conditions,
    };
  if (clears && positive && danger === 0)
    return {
      verdict: "Proceed, subject to conditions",
      tone: "good",
      body: T("The scheme meets its return target and creates value on a discounted basis. The margin over the hurdle is not wide, so the conditions below should be satisfied before capital is committed.", null),
      conditions,
    };
  if (positive && danger <= 1)
    return {
      verdict: "Proceed with caution",
      tone: "mid",
      body: T("The scheme creates value but does not clear the return target on the current assumptions. It merits further work on the inputs carrying the most sensitivity before a commitment is made.", null),
      conditions,
    };
  if (irr !== null && irr > 0)
    return {
      verdict: "Restructure before proceeding",
      tone: "warn",
      body: T("The scheme returns capital but falls short of the target and shows material risk. The structure — programme, price, cost or financing — should be revised and the study re-run before it is taken further.", null),
      conditions,
    };
  return {
    verdict: "Do not proceed on these assumptions",
    tone: "bad",
    body: T("On the inputs modelled the scheme does not recover its capital at an acceptable return. It should not be progressed without a material change to the assumptions on which it rests.", null),
    conditions,
  };
}

/* The executive paragraph. Assembled from four template slots — headline,
   return, funding, verdict — each chosen by a band. */
function execParagraph(m, input, result, rec) {
  const { k } = m;
  const parts = [];

  parts.push(T("{name} is a {type} scheme in {loc} on a site of {area} m², carrying a total investment of {inv} including finance charges.", {
    name: input.projectName || T("The project", null),
    type: (input.projectType || T("mixed-use", null)).toLowerCase(),
    loc: input.location && input.location !== "—" ? input.location : T("the location stated in the inputs", null),
    area: FN(input.landArea || 0),
    inv: money(m.totalInvestment),
  }));

  if (k.profit >= 0)
    parts.push(T("Revenue of {rev} produces a net profit of {profit}, a margin of {margin}.", {
      rev: money(k.totalRevenue), profit: money(k.profit),
      margin: m.margin === null ? "—" : FP(m.margin),
    }));
  else
    parts.push(T("Revenue of {rev} does not cover cost, leaving a shortfall of {loss}.", {
      rev: money(k.totalRevenue), loss: money(Math.abs(k.profit)),
    }));

  if (k.totalEquity > 0.01)
    parts.push(T("The scheme calls {eq} of equity against a peak debt of {debt}, and returns an equity IRR of {irr} with a net present value of {npv} at a {hurdle} discount rate.", {
      eq: money(k.totalEquity), debt: money(k.peakDebt),
      irr: k.equityIRR === null ? "—" : FP(k.equityIRR),
      npv: money(k.equityNPV), hurdle: FP(m.hurdle),
    }));
  else
    parts.push(T("No equity was required: income and debt covered every outflow, so the return is reported at project level as {irr} with a net present value of {npv}.", {
      irr: k.projectIRR === null ? "—" : FP(k.projectIRR), npv: money(k.projectNPV),
    }));

  parts.push(T("Against the platform's composite measure the scheme scores {score} of 100 and is rated {rating}. The recommendation of this report is: {verdict}.", {
    score: FN(m.score.total), rating: T(m.rating.label, null), verdict: T(rec.verdict, null),
  }));

  return parts.join(" ");
}

/* =============================================================
   3. Block builder — the report as data
   ============================================================= */

function buildBlocks(ctx) {
  const { input, result, scenarios, waterfall, tornadoIRR, m, rec } = ctx;
  const k = m.k;
  const cf = result.cashflow;
  const B = [];
  /* Sections number themselves. They used to carry the numeral as a literal,
     with every section after the optional fund one written as a conditional —
     which meant inserting a section anywhere meant editing the rest by hand. */
  let secN = 0;
  const sec = (title, subtitle) => {
    secN += 1;
    B.push({ type: "section", num: (secN < 10 ? "0" : "") + secN, title, subtitle });
  };
  const h = (text) => B.push({ type: "heading", text });
  const p = (text) => B.push({ type: "para", text });
  const table = (o) => B.push(Object.assign({ type: "table" }, o));
  const list = (variant, items) => items.length && B.push({ type: "list", variant, items });

  /* ---- 01 Executive summary ---- */
  sec("Executive Summary", "Findings, headline metrics and overall assessment");
  B.push({ type: "verdict", score: m.score.total, rating: m.rating, rec });
  p(execParagraph(m, input, result, rec));
  B.push({
    type: "kpis", items: [
      { label: "Total investment", value: money(m.totalInvestment) },
      { label: "Total revenue", value: money(k.totalRevenue) },
      { label: "Net profit", value: money(k.profit) },
      { label: "Profit margin", value: m.margin === null ? "—" : FP(m.margin) },
      { label: "Equity IRR", value: k.equityIRR === null ? "—" : FP(k.equityIRR) },
      { label: "Project IRR", value: k.projectIRR === null ? "—" : FP(k.projectIRR) },
      { label: "Equity NPV", value: money(k.equityNPV) },
      { label: "Equity multiple", value: m.equityMultiple === null ? "—" : m.equityMultiple.toFixed(2) + "×" },
      { label: "Equity payback", value: k.equityPayback === null ? "—" : T("Month {m}", { m: FN(k.equityPayback) }) },
      { label: "Peak equity at risk", value: money(k.peakEquity) },
      { label: "Peak debt", value: money(k.peakDebt) },
      { label: "Loan to cost", value: FP(m.ltcActual) },
    ]
  });

  /* ---- 02 Project overview ---- */
  sec("Project Overview", "The site, the programme and the timeline as modelled");
  const ov = [
    ["Project name", input.projectName || "—"],
    ["Location", input.location && input.location !== "—" ? input.location : "—"],
    ["Development type", input.projectType || "—"],
    ["Land tenure", k.landTenure === "lease" ? T("Leasehold — ground rent", null) : T("Freehold — purchased", null)],
    ["Site condition", k.landType === "raw" ? T("Raw — requires infrastructure", null) : T("Serviced", null)],
    ["Gross land area", FN(input.landArea || 0) + " m²"],
  ];
  if (k.landType === "raw")
    ov.push([T("Net developable area", null), FN(k.netDevelopableArea || 0) + " m² (" + FP(input.developablePct || 0) + ")"]);
  ov.push(
    ["Gross floor area", FN(k.gfa || 0) + " m²"],
    ["Net saleable / leasable area", FN(k.nsa || 0) + " m²"],
    ["Residential units", k.totalUnits ? FN(k.totalUnits) : "—"],
    ["Hotel keys", k.totalKeys ? FN(k.totalKeys) : "—"],
    ["Pre-design period", T("{n} months", { n: FN(input.predesignMonths || 0) })],
    ["Construction period", T("{n} months", { n: FN(input.constructionMonths || 0) })],
    ["Sales commence", T("Month {m}", { m: FN(input.preSalesStartMonth || 0) })],
    ["Analysis horizon", T("{n} months", { n: FN(k.horizonMonths || 0) })],
  );
  table({ title: "Project particulars", head: ["Item", "Detail"], rows: ov, align: ["start", "end"] });

  const comps = result.components || [];
  if (comps.length) {
    table({
      title: "Development programme",
      head: ["Component", "Land share", "GFA (m²)", "NSA (m²)", "Units / keys", "Basis"],
      align: ["start", "end", "end", "end", "end", "end"],
      rows: comps.map(c => [
        c.name || c.type || "—",
        FP(c.allocationPct || 0),
        FN(c.gfa || 0),
        FN(c.nsa || 0),
        c.units ? FN(c.units) : (c.keys ? FN(c.keys) : "—"),
        c.mode === "sale" ? T("Sale", null) : c.mode === "lease" ? T("Lease", null) : T("Mixed", null),
      ]),
      foot: ["Total", FP(k.totalAllocationPct || 0), FN(k.gfa || 0), FN(k.nsa || 0),
             k.totalUnits ? FN(k.totalUnits) : (k.totalKeys ? FN(k.totalKeys) : "—"), ""],
    });
  }

  /* ---- 03 Financial overview ---- */
  /* ---- Cost ---- */
  sec("Cost", "What the scheme costs to build and carry");

  /* Two traps in this table, both found by checking that the rows add to the
     foot rather than trusting that they would.

     ONE: kpi.siteWorkCost ALREADY INCLUDES landInfraCost — the engine adds
     them on the same line, since both are horizontal works on the same
     S-curve. Listing "Site infrastructure" as its own row counted the
     infrastructure twice on any raw-land scheme.

     TWO: kpi.totalOpex is the STABILISED ANNUAL figure, not the whole-period
     one, while kpi.totalCost carries operating expenditure over the entire
     hold. Omitting an OpEx row therefore left the rows 13.1M short of their
     own total on the worked scheme, and the shares summing to 94%. The
     whole-period figure comes off the cashflow, as it does everywhere else
     in the app. */
  const opexWholePeriod = -((cf.opex || []).reduce((s, v) => s + v, 0));

  const costRows = [];
  const pushCost = (label, v) => { if (v) costRows.push([label, money(v), FP(m.totalInvestment > 0 ? v / m.totalInvestment : 0)]); };
  pushCost(T("Land acquisition", null), k.landCost);
  pushCost(T("Land transfer fees", null), k.landTransferFees);
  pushCost(T("Ground rent over term", null), k.totalLandRent);
  pushCost(T("Construction", null), k.constructionCost);
  pushCost(T("Site works and infrastructure", null), k.siteWorkCost);
  pushCost(T("Soft costs", null), k.softCosts);
  pushCost(T("Contingency", null), k.contingency);
  pushCost(T("Operating expenditure over term", null), opexWholePeriod);
  pushCost(T("Marketing", null), k.marketing);
  pushCost(T("Sales commission", null), k.salesCommission);
  pushCost(T("Government and sales fees", null), k.govFees);
  pushCost(T("Finance charges", null), k.totalInterest);
  table({
    title: "Development cost", head: ["Cost head", "Amount", "Share"],
    align: ["start", "end", "end"], rows: costRows,
    foot: [T("Total investment", null), money(m.totalInvestment), "100.0%"],
  });

  /* The table says what each head costs; the bars say which of them the
     project actually turns on. Same numbers, read in one glance. */
  if (costRows.length) {
    const bars = [];
    const pushBar = (label, v, color) => { if (v > 0) bars.push({ label, value: v, color }); };
    pushBar(T("Land", null), (k.landCost || 0) + (k.landTransferFees || 0) + (k.totalLandRent || 0), "var(--ad-navy-900)");
    pushBar(T("Construction", null), k.constructionCost || 0, "var(--ad-navy-700)");
    // siteWorkCost already carries landInfraCost — adding both double-counted.
    pushBar(T("Site works", null), k.siteWorkCost || 0, "var(--ad-navy-500)");
    pushBar(T("Soft costs", null), k.softCosts || 0, "var(--ad-navy-400)");
    pushBar(T("Contingency", null), k.contingency || 0, "var(--ad-sand-700)");
    pushBar(T("Operating expenditure", null), opexWholePeriod, "var(--ad-sand-900)");
    pushBar(T("Selling and fees", null), (k.marketing || 0) + (k.salesCommission || 0) + (k.govFees || 0), "var(--ad-sand-500)");
    pushBar(T("Finance charges", null), k.totalInterest || 0, "var(--ad-gold-500)");
    bars.sort((a, b2) => b2.value - a.value);
    if (bars.length) {
      B.push({
        type: "chart", title: "Cost structure", height: Math.max(150, bars.length * 30 + 20),
        total: m.totalInvestment, totalLabel: T("Total investment", null),
        note: T("Every cost head, largest first, against total investment.", null),
        render: () => React.createElement(window.Charts.HBars, {
          data: bars, height: Math.max(150, bars.length * 30 + 20), formatV: FC,
        }),
      });
      const barTotal = bars.reduce((a, b2) => a + b2.value, 0);
      B.push({
        type: "donut", title: "Cost mix", data: bars, total: barTotal, totalLabel: T("Total investment", null),
        note: T("The same heads as a share of the whole.", null),
      });
    }
  }

  /* ---- Revenue ---- */
  sec("Revenue", "What the scheme earns, and from where");
  const revRows = [];
  if (k.totalRevenue) {
    const salesTotal = (cf.sales || []).reduce((a, b) => a + b, 0);
    const rentTotal = (cf.rent || []).reduce((a, b) => a + b, 0);
    if (salesTotal) revRows.push([T("Sales proceeds", null), money(salesTotal), FP(salesTotal / k.totalRevenue)]);
    if (rentTotal) revRows.push([T("Rental income (gross)", null), money(rentTotal), FP(rentTotal / k.totalRevenue)]);
    if (k.totalExit) revRows.push([T("Exit / terminal value", null), money(k.totalExit), FP(k.totalExit / k.totalRevenue)]);
  }
  if (revRows.length)
    table({
      title: "Revenue", head: ["Revenue source", "Amount", "Share"],
      align: ["start", "end", "end"], rows: revRows,
      foot: [T("Total revenue", null), money(k.totalRevenue), "100.0%"],
    });

  /* These three are the STABILISED ANNUAL figures the engine reports, which
     is how the app labels them too ("Annual rent (stab.)"). They were headed
     "over term" here, which invited them to be read as lifetime totals — off
     by a factor of nearly five on the worked scheme. The lifetime figures are
     added underneath so both are on the page and neither is ambiguous. */
  if (k.totalGrossIncome > 0) {
    const rentWholePeriod = (cf.rent || []).reduce((s, v) => s + v, 0);
    table({
      title: "Operating result on the income-producing element",
      note: T("The first three lines are stabilised annual figures — the asset at full occupancy in a normal year. The lifetime lines below are the totals actually collected and spent across the hold.", null),
      head: ["Item", "Amount"], align: ["start", "end"],
      rows: [
        [T("Gross income, stabilised year", null), money(k.totalGrossIncome)],
        [T("Operating expenditure, stabilised year", null), "−" + money(k.totalOpex)],
        [T("Net operating income, stabilised year", null), money(k.totalNOI)],
        [T("Rental income collected over term", null), money(rentWholePeriod)],
        [T("Operating expenditure over term", null), "−" + money(opexWholePeriod)],
      ],
      foot: [T("Net operating income over term", null), money(rentWholePeriod - opexWholePeriod)],
      kinds: [null, null, "total", null, null],
    });
  }

  /* Built from the three sources by name, not by walking revRows — that list
     drops empty lines, so its indices do not map to sales / rent / exit once
     any one of them is absent, and the ring would have labelled the wrong
     slice on a lease-only or sale-only scheme. */
  {
    const tot = (a) => (a || []).reduce((x, y) => x + y, 0);
    const mix = [
      { label: T("Sales proceeds", null), value: tot(cf.sales), color: "var(--ad-success)" },
      { label: T("Rental income", null), value: tot(cf.rent), color: "var(--ad-navy-600)" },
      { label: T("Exit / terminal value", null), value: k.totalExit || 0, color: "var(--ad-gold-500)" },
    ].filter(x => x.value > 0);
    const mixTotal = mix.reduce((a, b2) => a + b2.value, 0);
    if (mix.length > 1 && mixTotal > 0)
      B.push({ type: "donut", title: "Revenue mix", data: mix, total: mixTotal, totalLabel: T("Total revenue", null),
               note: T("Where the income comes from.", null) });
  }

  /* Revenue arriving over time is a different question from where it comes
     from, and the one a funder asks first. */
  if (k.totalRevenue > 0)
    B.push({
      type: "chart", title: "Revenue by year", height: 200,
      total: k.totalRevenue, totalLabel: T("Total revenue", null),
      note: T("When the income actually arrives.", null),
      render: () => React.createElement(window.Charts.StackedBars, {
        months: cf.months, height: 200, bucket: 12,
        series: [
          { label: T("Sales proceeds", null), color: "var(--ad-success)", values: cf.sales || [] },
          { label: T("Rental income", null), color: "var(--ad-navy-600)", values: cf.rent || [] },
          { label: T("Exit / terminal value", null), color: "var(--ad-gold-500)", values: cf.exit || [] },
        ],
        formatY: v => v === 0 ? "0" : (v / 1e6).toFixed(0) + "M",
      }),
    });
  /* ---- Cash flow ----
     Two statements rather than one summary. The project statement is
     unlevered: revenue less cost, each broken into its components with a
     subtotal on each side. The equity statement takes that result and applies
     the facility to it.

     One trap worth recording: debtRepay ALREADY CARRIES THE INTEREST. On the
     worked scheme the draw is 80.1M and the repayment 104.7M, the difference
     being exactly the 24.6M of interest. Listing interest as a third line
     would count it twice. Both identities below were checked against the
     engine at every month, not merely in total:
       revenue lines + cost lines = cf.gross
       cf.gross + debtDraw + debtRepay = cf.net                              */
  sec("Cash Flow Analysis", "The project statement, and what reaches equity");
  const months = k.horizonMonths || (cf.months || []).length;
  const yr = (a) => annualise(a || [], months);
  const nYears = Math.ceil(months / 12);
  const sumArr = (a) => a.reduce((x, y) => x + y, 0);

  /* Years across, sub-lines under their subtotal, a Total column on the last
     block. One table per YEARS_PER_BLOCK columns, because the paginator
     splits rows and cannot split columns. */
  const yearTable = (title, note, rows) => {
    for (let start = 0; start < nYears; start += YEARS_PER_BLOCK) {
      const end = Math.min(nYears, start + YEARS_PER_BLOCK);
      const last = end >= nYears;
      const idx = []; for (let i = start; i < end; i++) idx.push(i);
      const head = [T("Measure", null), ...idx.map(i => T("Year {n}", { n: FN(i + 1) }))];
      if (last) head.push(T("Total", null));
      table({
        title: start === 0 ? title
          : T("{t}, years {a}–{b}", { t: T(title, null), a: FN(start + 1), b: FN(end) }),
        note: start === 0 ? note : null,
        head,
        align: head.map((_, i) => i === 0 ? "start" : "end"),
        rows: rows.map(r => [
          r.label,
          ...idx.map(i => FC(r.values[i] || 0)),
          ...(last ? [r.noTotal ? "" : FC(sumArr(r.values))] : []),
        ]),
        kinds: rows.map(r => r.kind || null),
      });
    }
  };

  const addUp = (...arrs) => arrs[0].map((_, i) => arrs.reduce((s, a) => s + (a[i] || 0), 0));

  /* --- Project statement, unlevered --- */
  const pSales = yr(cf.sales), pRent = yr(cf.rent), pExit = yr(cf.exit);
  const pLand = yr(cf.land), pGround = yr(cf.landRent), pSoft = yr(cf.soft);
  const pCon = yr(cf.construction), pSite = yr(cf.siteWork), pCont = yr(cf.contingency);
  const pSell = yr(cf.selling), pOpex = yr(cf.opex);
  const pRevTotal = addUp(pSales, pRent, pExit);
  const pCostTotal = addUp(pLand, pGround, pSoft, pCon, pSite, pCont, pSell, pOpex);
  const pNet = yr(cf.gross);
  let c1 = 0; const pCum = pNet.map(v => (c1 += v));

  const projRows = [
    { label: T("Sales proceeds", null), values: pSales, kind: "sub" },
    { label: T("Rental income", null), values: pRent, kind: "sub" },
    { label: T("Exit / terminal value", null), values: pExit, kind: "sub" },
    { label: T("Total revenue", null), values: pRevTotal, kind: "total" },
    { label: T("Land acquisition", null), values: pLand, kind: "sub" },
    { label: T("Ground rent", null), values: pGround, kind: "sub" },
    { label: T("Construction", null), values: pCon, kind: "sub" },
    { label: T("Site works", null), values: pSite, kind: "sub" },
    { label: T("Soft costs", null), values: pSoft, kind: "sub" },
    { label: T("Contingency", null), values: pCont, kind: "sub" },
    { label: T("Selling costs", null), values: pSell, kind: "sub" },
    { label: T("Operating expenditure", null), values: pOpex, kind: "sub" },
    { label: T("Total cost", null), values: pCostTotal, kind: "total" },
    { label: T("Net project cash flow", null), values: pNet, kind: "grand" },
    { label: T("Cumulative", null), values: pCum, kind: "cum", noTotal: true },
  ].filter(r => r.kind !== "sub" || r.values.some(v => Math.abs(v) > 0.5));

  yearTable("Project cash flow",
    T("Unlevered: revenue less development cost, before any financing. Figures are rounded for presentation; the full amounts are in the Cost and Revenue sections.", null),
    projRows);

  /* The chart sits with the statement it draws, not at the end of the
     section — a reader should not have to hold one page in their head while
     they find the other. */
  B.push({
    type: "chart", title: "Project cash flow", height: 215,
    total: (cf.gross || []).reduce((a, b2) => a + b2, 0), totalLabel: T("Net project cash flow", null),
    note: T("Cost and revenue by year, with the cumulative project position drawn over them.", null),
    render: () => React.createElement(window.Charts.StackedBars, {
      months: cf.months, height: 215, bucket: 12,
      series: [
        { label: T("Costs", null), color: "var(--ad-navy-700)",
          values: (cf.months || []).map((_, i) =>
            (cf.land[i] || 0) + (cf.landRent ? cf.landRent[i] || 0 : 0) + (cf.soft[i] || 0) +
            (cf.construction[i] || 0) + (cf.siteWork[i] || 0) + (cf.contingency[i] || 0) +
            (cf.selling[i] || 0) + (cf.opex[i] || 0)) },
        { label: T("Revenue", null), color: "var(--ad-success)",
          values: (cf.months || []).map((_, i) => (cf.sales[i] || 0) + (cf.rent[i] || 0) + (cf.exit[i] || 0)) },
      ],
      cumulativeValues: cf.gross, cumulativeOnPrimary: true,
      formatY: v => v === 0 ? "0" : (v / 1e6).toFixed(0) + "M",
    }),
  });

  /* --- Equity statement, levered --- */
  const eDraw = yr(cf.debtDraw), eRepay = yr(cf.debtRepay);
  const eNet = yr(cf.net);
  let c2 = 0; const eCum = eNet.map(v => (c2 += v));
  const equityRows = [
    { label: T("Net project cash flow", null), values: pNet, kind: "sub" },
    { label: T("Debt drawn", null), values: eDraw, kind: "sub" },
    { label: T("Debt service", null), values: eRepay, kind: "sub" },
    { label: T("Net equity cash flow", null), values: eNet, kind: "grand" },
    { label: T("Cumulative", null), values: eCum, kind: "cum", noTotal: true },
  ];
  yearTable("Equity cash flow",
    T("The project result after the facility is applied. Debt service carries both principal and interest — the interest sits inside it rather than on a line of its own, and showing it again would count it twice.", null),
    equityRows);

  B.push({
    type: "chart", title: "Equity cash flow", height: 215,
    total: (cf.net || []).reduce((a, b2) => a + b2, 0), totalLabel: T("Net equity cash flow", null),
    note: T("The facility drawn and serviced, with the cumulative equity position drawn over it.", null),
    render: () => React.createElement(window.Charts.StackedBars, {
      months: cf.months, height: 215, bucket: 12,
      series: [
        { label: T("Debt drawn", null), color: "var(--ad-navy-400)", values: cf.debtDraw || [] },
        { label: T("Debt service", null), color: "var(--ad-danger)", opacity: 0.75, values: cf.debtRepay || [] },
      ],
      cumulativeValues: cf.net, cumulativeOnPrimary: true,
      formatY: v => v === 0 ? "0" : (v / 1e6).toFixed(0) + "M",
    }),
  });
  /* ---- Sources and uses ----
     Both sides come from the engine's own per-month coverage decomposition,
     which is why they balance: every riyal of use is attributed to the debt,
     revenue or equity that funded it in the month it arose. */
  sec("Uses and Sources", "What the project spends, and what pays for it");
  const uses = cf.usesByCat || {};
  const sumOf = (a) => (a || []).reduce((x, y) => x + y, 0);
  const usesRows = [
    [T("Land and ground rent", null), sumOf(uses.land)],
    [T("Construction", null), sumOf(uses.construction)],
    [T("Site works", null), sumOf(uses.siteWork)],
    [T("Soft costs", null), sumOf(uses.soft)],
    [T("Contingency", null), sumOf(uses.contingency)],
    [T("Marketing, commission and fees", null), sumOf(uses.marketing)],
    [T("Operating expenditure", null), sumOf(uses.opex)],
    [T("Finance charges", null), sumOf(uses.interest)],
  ].filter(r => Math.abs(r[1]) > 0.5);
  const totalUses = sumOf(cf.totalUses);
  const cov = cf.coverageTotals || { equity: 0, debt: 0, revenue: 0 };
  const totalSources = cov.equity + cov.debt + cov.revenue;

  table({
    title: "Uses of funds",
    head: ["Use", "Amount", "Share"], align: ["start", "end", "end"],
    rows: usesRows.map(r => [r[0], money(r[1]), FP(totalUses > 0 ? r[1] / totalUses : 0)]),
    foot: [T("Total uses", null), money(totalUses), "100.0%"],
  });
  /* Each chart follows the table it draws, as in the cash flow section. */
  B.push({
    type: "donut", title: "Uses of funds",
    note: T("Where the money goes, by cost head.", null),
    data: usesRows.map((r, i) => ({
      label: r[0], value: r[1],
      color: ["var(--ad-navy-900)", "var(--ad-navy-700)", "var(--ad-navy-500)", "var(--ad-navy-400)",
              "var(--ad-sand-700)", "var(--ad-sand-500)", "var(--ad-gold-600)", "var(--ad-gold-400)"][i % 8],
    })),
    total: totalUses, totalLabel: T("Total uses", null),
  });

  table({
    title: "Sources of funds",
    note: T("Revenue funds a cost when it arrives in the same month; the facility covers what revenue does not; equity is the residual that covers the rest. The two totals agree by construction.", null),
    head: ["Source", "Amount", "Share"], align: ["start", "end", "end"],
    rows: [
      [T("Revenue applied", null), money(cov.revenue), FP(totalSources > 0 ? cov.revenue / totalSources : 0)],
      [T("Debt facility", null), money(cov.debt), FP(totalSources > 0 ? cov.debt / totalSources : 0)],
      [T("Equity injected", null), money(cov.equity), FP(totalSources > 0 ? cov.equity / totalSources : 0)],
    ],
    foot: [T("Total sources", null), money(totalSources), "100.0%"],
  });
  B.push({
    type: "donut", title: "Sources of funds",
    note: T("What pays for it, by funding stream.", null),
    data: [
      { label: T("Revenue applied", null), value: cov.revenue, color: "var(--ad-success)" },
      { label: T("Debt facility", null), value: cov.debt, color: "var(--ad-navy-500)" },
      { label: T("Equity injected", null), value: cov.equity, color: "var(--ad-gold-500)" },
    ].filter(x => x.value > 0),
    total: totalSources, totalLabel: T("Total sources", null),
  });
  /* Bucketed by year like every other bar chart here — it was titled "month
     by month", which described the underlying series rather than the picture
     actually drawn. */
  B.push({
    type: "chart", title: "How the spend was funded, by year", height: 210,
    note: T("Each year of outflow, split into the equity, debt and revenue that covered it.", null),
    total: totalSources, totalLabel: T("Total sources", null),
    render: () => React.createElement(window.Charts.StackedBars, {
      months: cf.months, height: 210, bucket: 12,
      series: [
        { label: T("Revenue applied", null), color: "var(--ad-success)", values: cf.revenueApplied || [] },
        { label: T("Debt drawn", null), color: "var(--ad-navy-500)", values: cf.debtDraw || [] },
        { label: T("Equity injected", null), color: "var(--ad-gold-500)", values: cf.equityInjected || [] },
      ],
      formatY: v => v === 0 ? "0" : (v / 1e6).toFixed(0) + "M",
    }),
  });

  /* ---- Financial metrics ----
     Split by whose money it is. Project measures are unlevered — they judge
     the scheme on its own, before any facility. Equity measures judge what
     reaches the sponsor after the debt has been served. Reading them in one
     undifferentiated list invites the two to be compared as though they
     answered the same question. */
  sec("Financial Metrics", "The project on its own, and what reaches equity");

  B.push({
    type: "kpis", items: [
      { label: "Project IRR", value: k.projectIRR === null ? "—" : FP(k.projectIRR) },
      { label: "Equity IRR", value: k.equityIRR === null ? "—" : FP(k.equityIRR) },
      { label: "Project NPV", value: money(k.projectNPV) },
      { label: "Equity NPV", value: money(k.equityNPV) },
      { label: "Net profit", value: money(k.profit) },
      { label: "Profit margin", value: m.margin === null ? "—" : FP(m.margin) },
    ]
  });

  /* Revenue down to profit, one cost head at a time. The single most useful
     picture in the report: it shows which head actually consumes the margin,
     which no table of totals makes obvious. */
  const wfSteps = [
    { label: T("Revenue", null), value: k.totalRevenue, type: "start" },
    { label: T("Land", null), value: -((k.landCost || 0) + (k.landTransferFees || 0)), type: "delta" },
    { label: T("Ground rent", null), value: -(k.totalLandRent || 0), type: "delta" },
    { label: T("Construction", null), value: -(k.constructionCost || 0), type: "delta" },
    { label: T("Site works", null), value: -(k.siteWorkCost || 0), type: "delta" },
    { label: T("Soft costs", null), value: -(k.softCosts || 0), type: "delta" },
    { label: T("Contingency", null), value: -(k.contingency || 0), type: "delta" },
    // Whole-period, off the cashflow — kpi.totalOpex is the stabilised annual
    // figure, and using it left the bridge 10.3M short of the profit it ends on.
    { label: T("OpEx", null), value: -opexWholePeriod, type: "delta" },
    { label: T("Selling", null), value: -((k.marketing || 0) + (k.salesCommission || 0) + (k.govFees || 0)), type: "delta" },
    { label: T("Finance", null), value: -(k.totalInterest || 0), type: "delta" },
    { label: T("Profit", null), value: k.profit, type: "end" },
  ].filter(s => s.type !== "delta" || Math.abs(s.value) > 0.5);
  B.push({
    type: "chart", title: "From revenue to profit", height: 235,
    total: k.profit, totalLabel: T("Net profit", null),
    note: T("Every cost head taken off revenue in turn, ending at net profit.", null),
    render: () => React.createElement(window.Charts.Waterfall, {
      steps: wfSteps, height: 235, formatY: v => (v / 1e6).toFixed(1) + "M",
    }),
  });

  const projectMetrics = [
    [T("Project IRR", null), k.projectIRR === null ? "—" : FP(k.projectIRR),
      T("Annualised return on all capital employed, before the effect of debt.", null)],
    [T("Project NPV", null), money(k.projectNPV),
      T("Value of the unlevered cash flows discounted at the target rate, less the capital they require.", null)],
    [T("Project ROI", null), k.projectROI === null ? "—" : FP(k.projectROI),
      T("Total gain expressed as a proportion of capital employed, without regard to timing.", null)],
    [T("Project payback", null), k.projectPayback === null ? "—" : T("Month {m}", { m: FN(k.projectPayback) }),
      T("The month in which the unlevered position first turns positive.", null)],
    [T("Net profit", null), money(k.profit),
      T("Total revenue less every cost, including finance charges.", null)],
    [T("Profit margin", null), m.margin === null ? "—" : FP(m.margin),
      T("Net profit as a share of total revenue.", null)],
    [T("Total investment", null), money(m.totalInvestment),
      T("Every cost the scheme incurs, finance charges included.", null)],
  ];
  table({
    title: "Project measures",
    note: T("Unlevered. These judge the scheme on its own, before any facility.", null),
    head: ["Metric", "Value", "Definition"], align: ["start", "end", "start"],
    rows: projectMetrics, widths: ["24%", "17%", "59%"],
  });

  const equityMetrics = [
    [T("Equity IRR", null), k.equityIRR === null ? "—" : FP(k.equityIRR),
      T("Annualised return to the equity holder after debt is serviced.", null)],
    [T("Equity NPV", null), money(k.equityNPV),
      T("The same measure applied to the equity cash flows alone.", null)],
    [T("Equity ROI", null), k.equityROI === null ? "—" : FP(k.equityROI),
      T("The same proportion measured on equity alone.", null)],
    [T("Equity multiple", null), m.equityMultiple === null ? "—" : m.equityMultiple.toFixed(2) + "×",
      T("Every riyal of equity returns this many riyals in total.", null)],
    [T("Equity payback", null), k.equityPayback === null ? "—" : T("Month {m}", { m: FN(k.equityPayback) }),
      T("The month in which cumulative equity distributions first equal contributions.", null)],
    [T("Total equity called", null), money(k.totalEquity),
      T("Every riyal of equity the scheme required over its life.", null)],
    [T("Peak equity at risk", null), money(k.peakEquity),
      T("The largest amount of equity outstanding at any one point.", null)],
    [T("Peak debt", null), money(k.peakDebt),
      T("The highest facility balance reached during the draw period.", null)],
    [T("Loan to cost", null), FP(m.ltcActual),
      T("Peak debt as a proportion of total investment.", null)],
  ];
  if (k.interestCover !== null && k.interestCover !== undefined)
    equityMetrics.push([T("Interest cover", null), k.interestCover.toFixed(2) + "×",
      T("Operating income divided by interest, measured once the asset has stabilised. Reported in place of a debt service cover ratio because the facility is a revolving cash sweep with no amortisation schedule.", null)]);
  table({
    title: "Equity measures",
    note: T("Levered. These judge what reaches the sponsor once the facility has been served.", null),
    head: ["Metric", "Value", "Definition"], align: ["start", "end", "start"],
    rows: equityMetrics, widths: ["24%", "17%", "59%"],
  });

  /* ---- Fund waterfall, only when the user has modelled one ---- */
  if (waterfall) {
    sec("Capital Structure and Waterfall", "How proceeds divide between the partners");
    /* Per-party totals live under `totals`, not on the waterfall itself.
       Reading them off the wrong level produced three null rows and a section
       page with nothing on it — a silent hole rather than an error. */
    const wt = waterfall.totals || {};
    const wrow = (label, party) => party ? [label, money(party.contributed), money(party.distributed),
      money(party.profit), party.moic ? party.moic.toFixed(2) + "×" : "—",
      party.irr === null || party.irr === undefined ? "—" : FP(party.irr)] : null;
    const rows = [
      wrow(T("Limited partners", null), wt.lp),
      wrow(T("Developer", null), wt.dev),
      wrow(T("General partner", null), wt.gp),
    ].filter(Boolean);
    if (rows.length)
      table({
        title: "Distribution by party",
        head: ["Party", "Contributed", "Distributed", "Profit", "MOIC", "IRR"],
        align: ["start", "end", "end", "end", "end", "end"], rows,
      });

    const bk = waterfall.buckets || {};
    table({
      title: "Waterfall tiers",
      note: T("Capital is returned first, then the preferred return accrues and is paid, and only the surplus above both is split.", null),
      head: ["Tier", "Amount"], align: ["start", "end"],
      rows: [
        [T("Return of capital", null), money(bk.returnOfCapital || 0)],
        [T("Preferred return", null), money(bk.preferredReturn || 0)],
        [T("Performance fee to GP", null), money(bk.promoteToGP || 0)],
        [T("Residual, pro rata", null), money(bk.proRataResidual || 0)],
      ],
    });

    const fe = waterfall.fees || {};
    table({
      title: "Fees",
      head: ["Fee", "Recipient", "Amount"], align: ["start", "start", "end"],
      rows: [
        [T("Subscription fee", null), T("General partner", null), money(fe.subscription || 0)],
        [T("Asset management fee", null), T("General partner", null), money(fe.assetMgmt || 0)],
        [T("Development fee", null), T("Developer", null), money(fe.development || 0)],
        [T("Performance fee", null), T("General partner", null), money(fe.promote || 0)],
      ],
      foot: [T("Total fees", null), "",
        money((fe.subscription || 0) + (fe.assetMgmt || 0) + (fe.development || 0) + (fe.promote || 0))],
    });
    if (waterfall.config && waterfall.config.promoteHurdleMet === false)
      p(T("The preferred return was not achieved over the fund's life, so no performance fee is payable to the general partner.", null));
  }

  /* ---- Risk assessment ---- */
  sec("Risk Assessment", "The engine's register of flags raised by these inputs");
  const risks = result.risks || [];
  const counts = {
    danger: risks.filter(r => r.level === "danger").length,
    warning: risks.filter(r => r.level === "warning").length,
    success: risks.filter(r => r.level === "success").length,
  };
  p(T("The model raised {d} critical flags, {w} cautions and {s} confirmations on these inputs. Each is listed below with the condition that produced it.",
    { d: FN(counts.danger), w: FN(counts.warning), s: FN(counts.success) }));
  if (risks.length)
    table({
      head: ["Severity", "Finding", "Detail"], align: ["start", "start", "start"],
      widths: ["14%", "28%", "58%"],
      rows: risks.map(r => [
        r.level === "danger" ? T("Critical", null) : r.level === "warning" ? T("Caution", null) : T("Confirmed", null),
        r.title, r.detail,
      ]),
      levels: risks.map(r => r.level),
    });

  /* ---- Sensitivity ---- */
  sec("Sensitivity Analysis", "What moves the return, and by how much");
  if (tornadoIRR && tornadoIRR.length) {
    p(T("Each driver below was flexed ±10% in isolation and the study re-run. The drivers are ordered by the spread they open in equity IRR — the ones at the top are where estimating error costs most.", null));
    B.push({
      type: "chart", title: "Equity IRR sensitivity", height: Math.max(180, Math.min(10, tornadoIRR.length) * 26 + 60),
      render: () => React.createElement(window.Charts.Tornado, {
        data: tornadoIRR.slice(0, 10), height: Math.max(180, Math.min(10, tornadoIRR.length) * 26 + 60),
      }),
    });
    table({
      title: "Driver sensitivity, ±10%",
      head: ["Driver", "IRR at −10%", "Base IRR", "IRR at +10%", "Spread"],
      align: ["start", "end", "end", "end", "end"],
      rows: tornadoIRR.slice(0, 10).map(d => [
        d.label, FP(d.irrLo), FP(d.baseIRR), FP(d.irrHi), FP(d.delta),
      ]),
    });
  }
  if (scenarios) {
    const sc = (r) => r && r.kpi ? r.kpi : null;
    const rows = [
      [T("Downside", null), sc(scenarios.downside)],
      [T("Base", null), sc(scenarios.base)],
      [T("Upside", null), sc(scenarios.upside)],
    ].filter(r => r[1]).map(([label, kk]) => [
      label, money(kk.totalRevenue), money(kk.profit),
      kk.equityIRR === null ? "—" : FP(kk.equityIRR), money(kk.equityNPV),
    ]);
    if (rows.length)
      table({
        title: "Scenarios",
        note: T("Downside applies a 10% fall in price, a 5% rise in cost, a 3% fall in occupancy and a three-month delay. Upside mirrors it. Base is the study as modelled.", null),
        head: ["Scenario", "Revenue", "Profit", "Equity IRR", "Equity NPV"],
        align: ["start", "end", "end", "end", "end"], rows,
      });

    /* The spread between the three cases is the point of the section, and it
       is easier to see as three bars than as three rows of figures. Only
       drawn when every case turns a profit — HBars scales from zero and
       cannot render a negative, so a loss-making downside would simply
       vanish and overstate the picture. */
    const profits = ["downside", "base", "upside"]
      .map(kk => scenarios[kk] && scenarios[kk].kpi ? scenarios[kk].kpi.profit : null)
      .filter(v => v !== null);
    if (profits.length === 3 && profits.every(v => v > 0))
      B.push({
        type: "chart", title: "Profit by scenario", height: 150,
        note: T("Net profit under each case.", null),
        render: () => React.createElement(window.Charts.HBars, {
          height: 150, formatV: FC,
          data: [
            { label: T("Downside", null), value: profits[0], color: "var(--ad-danger)" },
            { label: T("Base", null), value: profits[1], color: "var(--ad-navy-600)" },
            { label: T("Upside", null), value: profits[2], color: "var(--ad-success)" },
          ],
        }),
      });
  }

  /* ---- Assessment: strengths, weaknesses, opportunities, risks ---- */
  sec("Assessment", "Strengths, weaknesses, opportunities and risk factors");
  const strengths = deriveStrengths(m, input, result);
  const weaknesses = deriveWeaknesses(m, input, result);
  const opportunities = deriveOpportunities(m, input, result);
  const riskFactors = deriveRiskFactors(m, input, result, scenarios);

  h("Strengths");
  if (strengths.length) list("good", strengths);
  else p(T("No strength test was met on these inputs.", null));

  h("Weaknesses");
  if (weaknesses.length) list("bad", weaknesses);
  else p(T("No weakness test was triggered on these inputs.", null));

  h("Opportunities");
  if (opportunities.length) list("mid", opportunities);
  else p(T("No opportunity test was met on these inputs.", null));

  h("Risk factors");
  if (riskFactors.length) list("warn", riskFactors);
  else p(T("No risk factor test was triggered on these inputs.", null));

  /* ---- Recommendation ---- */
  sec("Recommendation", "The conclusion these numbers support");
  B.push({ type: "verdict", score: m.score.total, rating: m.rating, rec, wide: true });
  p(rec.body);
  h("Conditions");
  list("warn", rec.conditions.map(c => ({ title: null, detail: c })));

  /* ---- Appendix ---- */
  sec("Appendix", "Assumptions, formulae and definitions");

  /* A percentage on its own says nothing — 5% contingency is 5% OF something,
     and the something differs from line to line. Every basis below was read
     off the engine rather than assumed: soft costs run on construction plus
     site works, contingency on that sum PLUS soft costs, and the three selling
     percentages on sales revenue only, so they raise nothing on a scheme that
     is entirely leased. */
  h("Assumptions and input parameters");
  table({
    note: T("Each percentage is applied to the basis named in the third column. Rates are annual unless stated.", null),
    head: ["Parameter", "Value", "Applied to"],
    align: ["start", "end", "start"], widths: ["27%", "15%", "58%"],
    rows: [
      [T("Land price per m²", null), input.landPricePerSqm ? money(input.landPricePerSqm) : "—",
        T("Gross land area. Not charged on a leasehold site.", null)],
      [T("Land transfer fees", null), FP(input.landTransferFeesPct || 0),
        T("The land purchase price. Not charged on a leasehold site.", null)],
      [T("Ground rent per m² per year", null), input.landRentPerSqmYr ? money(input.landRentPerSqmYr) : "—",
        T("Gross land area, each year of the term. Leasehold only.", null)],
      [T("Rent review period", null), input.landRentEscalationYears ? T("{n} years", { n: FN(input.landRentEscalationYears) }) : "—",
        T("Interval between ground rent reviews.", null)],
      [T("Rent escalation at review", null), FP(input.landRentEscalationPct || 0),
        T("The rent then in force, compounded at each review.", null)],
      [T("Site infrastructure per m²", null), input.landInfraCostPerSqm ? money(input.landInfraCostPerSqm) : "—",
        T("Gross land area. Spent alongside site works during construction.", null)],
      [T("Soft costs", null), FP(input.softCostsPct || 0),
        T("Construction cost plus site works.", null)],
      [T("Contingency", null), FP(input.contingencyPct || 0),
        T("Construction plus site works plus soft costs.", null)],
      [T("Marketing", null), FP(input.marketingPct || 0),
        T("Sales revenue only. Raises nothing on a wholly leased scheme.", null)],
      [T("Sales commission", null), FP(input.salesCommissionPct || 0),
        T("Sales revenue only. Raises nothing on a wholly leased scheme.", null)],
      [T("Government and sales fees", null), FP(input.govFeesPct || 0),
        T("Sales revenue only. Raises nothing on a wholly leased scheme.", null)],
      [T("Loan to cost, as set", null), FP(input.ltc || 0),
        T("Development cost before finance — land, transfer fees, construction, site works, soft costs and contingency. Sets the facility limit, not the amount drawn.", null)],
      [T("Interest rate", null), FP(input.interestRate || 0),
        T("Annual, charged monthly on the outstanding balance at the twelfth root of the annual rate.", null)],
      [T("Discount rate / hurdle", null), FP(m.hurdle),
        T("Annual. Discounts the cash flows for NPV, and is the hurdle every return is judged against.", null)],
    ].concat(input.landType === "raw" ? [
      [T("Developable share", null), FP(input.developablePct || 0),
        T("Gross land area. The remainder carries no buildable programme.", null)],
    ] : []),
  });

  if (input.fund && input.fund.enabled) {
    const f = input.fund;
    table({
      title: "Fund terms",
      head: ["Term", "Value"], align: ["start", "end"],
      rows: [
        [T("Limited partner equity", null), FP(f.lpEquityPct || 0)],
        [T("Developer co-investment", null), FP(f.devEquityPct || 0)],
        [T("General partner co-investment", null), FP(f.gpEquityPct || 0)],
        [T("Subscription fee", null), FP(f.subscriptionFeePct || 0)],
        [T("Asset management fee per year", null), FP(f.assetMgmtFeePctYr || 0)],
        [T("Development fee", null), FP(f.developmentFeePct || 0)],
        [T("Preferred return", null), FP(f.preferredReturnPct || 0)],
        [T("Performance split to GP", null), FP(f.promoteSplit || 0)],
      ],
    });
  }

  h("How the score was calculated");
  p(T("The composite score is the sum of five components, each capped at its own maximum and computed only from figures printed elsewhere in this report. It is a summary of those figures, not an additional judgement about them.", null));
  table({
    head: ["Component", "Basis", "Score", "Maximum"],
    align: ["start", "start", "end", "end"],
    widths: ["26%", "44%", "15%", "15%"],
    rows: [
      [T("Return vs hurdle", null), T("IRR ÷ hurdle, credited in full at 1.5× and above", null), m.score.parts[0].got.toFixed(1), "30"],
      [T("Value created per riyal of capital", null), T("NPV ÷ capital at risk, credited in full at 0.50 and above", null), m.score.parts[1].got.toFixed(1), "25"],
      [T("Profit margin on revenue", null), T("Profit ÷ revenue, credited in full at 25% and above", null), m.score.parts[2].got.toFixed(1), "20"],
      [T("Speed of capital recovery", null), T("Proportion of the horizon remaining once capital is repaid", null), m.score.parts[3].got.toFixed(1), "15"],
      [T("Risk register", null), T("Ten points, less three per critical flag and one and a half per caution", null), m.score.parts[4].got.toFixed(1), "10"],
    ],
    foot: [T("Composite score", null), "", FN(m.score.total), "100"],
  });
  table({
    title: "Rating bands",
    head: ["Score", "Rating"], align: ["start", "end"],
    rows: [
      ["80–100", T("Strong", null)], ["65–79", T("Favourable", null)],
      ["50–64", T("Moderate", null)], ["35–49", T("Marginal", null)],
      ["0–34", T("Unfavourable", null)],
    ],
  });
  if (m.score.noEquity)
    p(T("This scheme called no equity, so the return, value and payback components were measured at project level. An equity IRR is undefined when there is no equity series to solve — that is a property of a self-funding project, not a failure of it.", null));

  h("Basis of preparation");
  p(T("Every figure in this report is produced by the platform's own calculation engine from the inputs listed above. Cash flows are modelled monthly and aggregated for presentation. Discounting is monthly at the rate stated. No figure has been adjusted, rounded up, or supplied from outside the model, and no part of this document was generated by a language model — the narrative is assembled from fixed templates selected by the rules printed in this appendix, so the same inputs will always produce the same report.", null));
  p(T("This is an indicative analysis for screening and decision support. It is not an accredited valuation and not a substitute for one where a licensed valuer, a physical inspection or a regulated report is required.", null));

  return B;
}

/* =============================================================
   4. Pagination

   Blocks are measured once at the real content width, then packed into pages
   of a fixed height. Tables are the only divisible block: they are packed row
   by row and their header is reprinted whenever they continue onto a new page,
   which is the behaviour a reader expects and the thing CSS cannot do here.
   ============================================================= */

function flatten(blocks) {
  const atoms = [];
  blocks.forEach((b, bi) => {
    if (b.type === "section") { atoms.push({ b, bi, kind: "block", newPage: true }); return; }
    if (b.type === "table") {
      if (b.title || b.note) atoms.push({ b, bi, kind: "tabletitle", keepWithNext: true });
      atoms.push({ b, bi, kind: "tablehead", keepWithNext: true });
      (b.rows || []).forEach((r, ri) => atoms.push({ b, bi, kind: "tablerow", ri }));
      if (b.foot) atoms.push({ b, bi, kind: "tablefoot" });
      return;
    }
    atoms.push({ b, bi, kind: "block", keepWithNext: b.type === "heading" });
  });
  return atoms;
}

function pack(atoms, heights, contentH) {
  const pages = [];
  let cur = [], y = 0;
  const flush = () => { if (cur.length) { pages.push(cur); cur = []; y = 0; } };

  const key = (a) => a.bi + ":" + (a.kind === "tablerow" ? "r" + a.ri : a.kind);
  /* The atom that closes a table also carries the table's bottom margin,
     which belongs to no single row. */
  const isLastOfTable = (i) => {
    const a = atoms[i], n = atoms[i + 1];
    if (a.kind !== "tablerow" && a.kind !== "tablefoot") return false;
    return !n || n.bi !== a.bi;
  };
  const heightAt = (i) => {
    const a = atoms[i];
    return (heights[key(a)] || 0) + (isLastOfTable(i) ? (heights[a.bi + ":tablegap"] || 0) : 0);
  };
  /* What a continuation costs at the top of the next page: the reprinted
     header plus the "continued" marker row. Both were previously unbudgeted —
     the header was looked up under a key that never existed. */
  const continuationCost = (a) =>
    (heights[a.bi + ":tablehead"] || 0) + (heights["__cont"] || 0);

  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    const hgt = heightAt(i);

    if (a.newPage) flush();

    // A heading, a table title or a table header alone at the foot of a page
    // is an orphan; move it forward with the thing it introduces.
    let need = hgt;
    if (a.keepWithNext && i + 1 < atoms.length) need += heightAt(i + 1);

    if (y + need > contentH && cur.length) {
      flush();
      if (a.kind === "tablerow" || a.kind === "tablefoot") {
        cur.push({ b: a.b, bi: a.bi, kind: "tablehead", continued: true });
        y += continuationCost(a);
      }
    }
    cur.push(a);
    y += hgt;
  }
  flush();
  return pages;
}

/* =============================================================
   5. Block rendering
   ============================================================= */

function Para({ children }) { return <p className="rp-p">{children}</p>; }

function VerdictCard({ score, rating, rec, wide }) {
  return (
    <div className={"rp-verdict" + (wide ? " wide" : "")}>
      <div className="rp-verdict-score">
        <div className="rp-vs-num">{FN(score)}</div>
        <div className="rp-vs-of">/ 100</div>
      </div>
      <div className="rp-verdict-body">
        <div className={"rp-badge tone-" + rating.tone}>{rating.label}</div>
        <div className="rp-verdict-line">{rec.verdict}</div>
      </div>
    </div>
  );
}

function KpiGrid({ items }) {
  return (
    <div className="rp-kpis">
      {items.map((it, i) => (
        <div className="rp-kpi" key={i}>
          <div className="rp-kpi-l">{it.label}</div>
          <div className="rp-kpi-v tabnum">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function FindingList({ variant, items }) {
  return (
    <ul className={"rp-list tone-" + variant}>
      {items.map((it, i) => (
        <li key={i}>
          {it.title ? <b>{it.title}. </b> : null}
          <span>{it.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function TableHead({ b, bi }) {
  return (
    <thead>
      <tr data-mid={bi + ":tablehead"}>{b.head.map((hd, i) => (
        <th key={i} style={{
          textAlign: (b.align && b.align[i]) || "start",
          width: b.widths ? b.widths[i] : undefined,
        }}>{hd}</th>
      ))}</tr>
    </thead>
  );
}

function TableRow({ b, ri, bi }) {
  const cells = b.rows[ri];
  const lvl = b.levels ? b.levels[ri] : null;
  const em = b.emphasis && b.emphasis.indexOf(ri) !== -1;
  /* "sub" indents under the subtotal it feeds; "total" rules off above
     itself; "grand" and "cum" carry the statement's result. */
  const kind = b.kinds ? b.kinds[ri] : null;
  return (
    <tr className={[lvl ? "lvl-" + lvl : "", em ? "rp-em" : "", kind ? "rp-k-" + kind : ""]
          .filter(Boolean).join(" ") || undefined}
        data-mid={bi + ":r" + ri}>
      {cells.map((c, i) => (
        <td key={i} className={i > 0 ? "tabnum" : undefined}
            style={{ textAlign: (b.align && b.align[i]) || "start" }}>{c}</td>
      ))}
    </tr>
  );
}

function TableFoot({ b, bi }) {
  return (
    <tr className="rp-tfoot" data-mid={bi + ":tablefoot"}>
      {b.foot.map((c, i) => (
        <td key={i} className={i > 0 ? "tabnum" : undefined}
            style={{ textAlign: (b.align && b.align[i]) || "start" }}>{c}</td>
      ))}
    </tr>
  );
}

/* One page's atoms, with consecutive table pieces re-gathered into a single
   <table> so borders and column widths behave as one object. */
function renderAtoms(atoms) {
  const out = [];
  let i = 0;
  while (i < atoms.length) {
    const a = atoms[i];
    if (a.kind === "tablehead" || a.kind === "tablerow" || a.kind === "tablefoot") {
      const bi = a.bi, b = a.b;
      const group = [];
      while (i < atoms.length && atoms[i].bi === bi &&
             (atoms[i].kind === "tablehead" || atoms[i].kind === "tablerow" || atoms[i].kind === "tablefoot")) {
        group.push(atoms[i]); i++;
      }
      const hasHead = group.some(g => g.kind === "tablehead");
      const cont = group.some(g => g.kind === "tablehead" && g.continued);
      out.push(
        <table className="rp-table" key={"t" + bi + "-" + out.length} data-mid-table={bi}>
          {hasHead ? <TableHead b={b} bi={bi} /> : null}
          <tbody>
            {cont ? (
              <tr className="rp-cont" data-mid="__cont"><td colSpan={b.head.length}>{T("continued", null)}</td></tr>
            ) : null}
            {group.filter(g => g.kind === "tablerow").map(g => <TableRow b={b} bi={bi} ri={g.ri} key={g.ri} />)}
            {group.some(g => g.kind === "tablefoot") ? <TableFoot b={b} bi={bi} /> : null}
          </tbody>
        </table>
      );
      continue;
    }
    /* A "tabletitle" atom carries the TABLE block, whose own type has no case
       in BlockView — passing it through unchanged rendered nothing, so every
       table in the report lost its heading and its explanatory note while the
       packer went on reserving the space for them. The type is overridden
       here exactly as the measuring pass does it. */
    const blk = a.kind === "tabletitle" ? Object.assign({}, a.b, { type: "tabletitle" }) : a.b;
    out.push(<div className="rp-m" data-mid={a.bi + ":" + a.kind} key={"b" + a.bi + "-" + out.length}><BlockView b={blk} /></div>);
    i++;
  }
  return out;
}

function BlockView({ b }) {
  switch (b.type) {
    case "section":
      return (
        <div className="rp-section">
          <div className="rp-section-n">{b.num}</div>
          <h2 className="rp-section-t">{b.title}</h2>
          {b.subtitle ? <div className="rp-section-s">{b.subtitle}</div> : null}
        </div>
      );
    case "heading": return <h3 className="rp-h3">{b.text}</h3>;
    case "para": return <Para>{b.text}</Para>;
    case "kpis": return <KpiGrid items={b.items} />;
    case "verdict": return <VerdictCard score={b.score} rating={b.rating} rec={b.rec} wide={b.wide} />;
    case "list": return <FindingList variant={b.variant} items={b.items} />;
    case "tabletitle":
      return (
        <div className="rp-tt">
          {b.title ? <div className="rp-tt-t">{b.title}</div> : null}
          {b.note ? <div className="rp-tt-n">{b.note}</div> : null}
        </div>
      );
    case "chart":
      return (
        <div className="rp-chart">
          <div className="rp-chart-head">
            <div>
              {b.title ? <div className="rp-tt-t">{b.title}</div> : null}
              {b.note ? <div className="rp-tt-n">{b.note}</div> : null}
            </div>
            {/* A stacked bar chart shows the shape of the spend but never the
                size of it — the total has to be stated, not inferred from
                adding up columns by eye. */}
            {b.total !== undefined && b.total !== null ? (
              <div className="rp-chart-total">
                <div className="rp-ct-l">{b.totalLabel || T("Total", null)}</div>
                <div className="rp-ct-v tabnum">{money(b.total)}</div>
              </div>
            ) : null}
          </div>
          <div className="rp-chart-body">{b.render()}</div>
        </div>
      );
    /* The ring alone carries no information — Donut draws arcs and nothing
       else — so it is paired with its own keyed legend, which is where the
       figures actually live. */
    case "donut":
      return (
        <div className="rp-chart rp-donut">
          {b.title ? <div className="rp-tt-t">{b.title}</div> : null}
          {b.note ? <div className="rp-tt-n">{b.note}</div> : null}
          <div className="rp-donut-body">
            {/* The ring's hole is the natural place for the total, and Donut
                leaves it empty — it draws arcs and nothing else. */}
            <div className="rp-donut-ring">
              {React.createElement(window.Charts.Donut, { data: b.data, size: 150, thickness: 26 })}
              <div className="rp-donut-centre">
                <div className="rp-dc-l">{b.totalLabel || T("Total", null)}</div>
                <div className="rp-dc-v tabnum">{FC(b.total)}</div>
              </div>
            </div>
            <ul className="rp-legend">
              {b.data.map((d, i) => (
                <li key={i}>
                  <span className="rp-swatch" style={{ background: d.color }} />
                  <span className="rp-legend-l">{d.label}</span>
                  <span className="rp-legend-v tabnum">{money(d.value)}</span>
                  <span className="rp-legend-p tabnum">{FP(b.total > 0 ? d.value / b.total : 0)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    default: return null;
  }
}

/* =============================================================
   6. Page chrome
   ============================================================= */

function Mark({ size, color }) {
  return (
    <svg width={size * 1.13} height={size} viewBox="4 16 88 78" fill={color} aria-hidden="true"
         style={{ flexShrink: 0, display: "block" }}>
      <path d="M10 88 V67 C10 60.9 14.9 56 21 56 C27.1 56 32 60.9 32 67 V88 Z" />
      <path d="M37 88 V51 C37 44.9 41.9 40 48 40 C54.1 40 59 44.9 59 51 V88 Z" />
      <path d="M64 88 V33 C64 26.9 68.9 22 75 22 C81.1 22 86 26.9 86 33 V88 Z" />
    </svg>
  );
}

function Page({ meta, num, total, children, kind }) {
  return (
    <div className={"rp-page" + (kind ? " " + kind : "")}>
      <div className="rp-head">
        <div className="rp-head-l">
          {meta.logo
            ? <img src={meta.logo} alt="" className="rp-head-logo" />
            : <Mark size={14} color="var(--ad-navy-900)" />}
          <span className="rp-head-org"><Raw v={meta.company || "REAP"} /></span>
        </div>
        <div className="rp-head-r">{meta.reportTitle}{meta.projectName ? " · " + meta.projectName : ""}</div>
      </div>
      <div className="rp-content">{children}</div>
      <div className="rp-foot">
        <div className="rp-foot-l">
          <Mark size={9} color="var(--fg-3)" />
          <span>{meta.confidentiality}</span>
        </div>
        <div className="rp-foot-c">{T("Page {a} of {b}", { a: FN(num), b: FN(total) })}</div>
        <div className="rp-foot-r">{meta.dateLabel} · © {meta.year} REAP</div>
      </div>
    </div>
  );
}

function CoverPage({ meta }) {
  const row = (label, value) => value ? (
    <div className="rp-cv-row">
      <span className="rp-cv-l">{label}</span>
      <span className="rp-cv-v"><Raw v={value} /></span>
    </div>
  ) : null;
  return (
    <div className="rp-page rp-cover">
      <div className="rp-cv-band" />
      <div className="rp-cv-top">
        {meta.logo
          ? <img src={meta.logo} alt="" className="rp-cv-logo" />
          : <div className="rp-cv-mark"><Mark size={34} color="var(--ad-navy-900)" /><span>REAP</span></div>}
        {meta.company ? <div className="rp-cv-org"><Raw v={meta.company} /></div> : null}
      </div>

      <div className="rp-cv-mid">
        <div className="rp-cv-eyebrow">{T("Feasibility Study Report", null)}</div>
        <h1 className="rp-cv-title">{meta.reportTitle}</h1>
        {meta.projectName ? <div className="rp-cv-project">{meta.projectName}</div> : null}
        {meta.subtitle ? <div className="rp-cv-sub">{meta.subtitle}</div> : null}
      </div>

      <div className="rp-cv-meta">
        {(meta.forCompany || meta.forPerson) ? (
          <div className="rp-cv-block">
            <div className="rp-cv-bt">{T("Prepared for", null)}</div>
            {row(null, meta.forCompany)}
            {row(null, meta.forPerson)}
            {row(null, meta.forPosition)}
            {meta.forNotes ? <div className="rp-cv-notes"><Raw v={meta.forNotes} /></div> : null}
          </div>
        ) : null}
        <div className="rp-cv-block">
          <div className="rp-cv-bt">{T("Prepared by", null)}</div>
          {row(null, meta.preparedBy || meta.company || "REAP")}
          {row(null, meta.address)}
          {row(null, meta.website)}
        </div>
        <div className="rp-cv-block">
          <div className="rp-cv-bt">{T("Report details", null)}</div>
          {row(T("Date", null), meta.dateLabel)}
          {row(T("Reference", null), meta.reportNumber)}
          {row(T("Classification", null), meta.confidentiality)}
        </div>
      </div>

      <div className="rp-cv-foot">
        <div className="rp-cv-conf">{meta.confidentialityNote}</div>
        <div className="rp-cv-brand">
          <Mark size={12} color="var(--fg-3)" />
          <span>{T("Produced with REAP — Real Estate Assessment Platform", null)}</span>
        </div>
      </div>
    </div>
  );
}

function TocPage({ meta, entries, num, total }) {
  return (
    <Page meta={meta} num={num} total={total} kind="rp-toc">
      <div className="rp-section">
        <h2 className="rp-section-t">{T("Contents", null)}</h2>
      </div>
      <ul className="rp-toc-list">
        {entries.map((e, i) => (
          <li key={i}>
            <span className="rp-toc-n">{e.num}</span>
            <span className="rp-toc-t">{e.title}</span>
            <span className="rp-toc-dots" />
            <span className="rp-toc-p tabnum">{FN(e.page)}</span>
          </li>
        ))}
      </ul>
    </Page>
  );
}

/* =============================================================
   7. The document
   ============================================================= */

/* Read every tagged atom height out of a rendered subtree. Used twice: once
   on the off-screen measuring pass, and once on the finished document to
   confirm the pages actually hold what the packer promised. */
function readHeights(root) {
  const heights = {};
  root.querySelectorAll("[data-mid]").forEach(el => {
    const h = el.getBoundingClientRect().height;
    // A row that appears on several pages is the same row; keep the tallest.
    const k = el.getAttribute("data-mid");
    if (!(heights[k] > h)) heights[k] = h;
  });
  root.querySelectorAll("[data-mid-table]").forEach(el => {
    const k = el.getAttribute("data-mid-table") + ":tablegap";
    const h = parseFloat(getComputedStyle(el).marginBottom || 0);
    if (!(heights[k] > h)) heights[k] = h;
  });
  return heights;
}

function ReportDocument({ blocks, meta }) {
  const measureRef = useRefRep(null);
  const docRef = useRefRep(null);
  const [pages, setPages] = useStateRep(null);
  const correctedRef = useRefRep(0);

  const atoms = useMemoRep(() => flatten(blocks), [blocks]);

  useLayoutEffectRep(() => {
    correctedRef.current = 0;
    setPages(null);
  }, [blocks]);

  /* Verification. The off-screen measurement and the finished page are
     structurally identical by construction — both wrap each block in .rp-m —
     so they should agree exactly. "Should" is not good enough for a document
     that goes to a lender: a page that silently clips its last table row is
     worse than one that is a page longer. So the rendered document is
     measured, and if any page is over its box the whole thing is re-packed
     from the heights the browser actually produced.

     Bounded to two corrections. Re-packing changes which atoms share a page,
     which can change their heights again (a table alone on a page lays its
     columns out differently), so an unbounded loop could oscillate. */
  useLayoutEffectRep(() => {
    if (!pages || !docRef.current || correctedRef.current >= 3) return;
    const doc = docRef.current;
    let worst = 0;
    /* Only pages the packer produced. The contents page is built separately
       and repacking cannot change it, so including it here burned the whole
       correction budget on a page that could never converge — and left the
       real overflows unfixed. */
    doc.querySelectorAll(".rp-page:not(.rp-toc) .rp-content").forEach(c => {
      worst = Math.max(worst, c.scrollHeight - c.clientHeight);
    });
    if (worst <= 0) return;
    correctedRef.current += 1;
    console.warn("[REAP report] page overflow of " + Math.round(worst) +
      "px detected; re-paginating from rendered heights (pass " + correctedRef.current + ")");
    setPages(pack(atoms, readHeights(doc), CONTENT_H_PX));
  }, [pages, atoms]);

  /* .rp-m is display:flow-root, so a block's own margins are inside the
     measured rectangle instead of collapsing out through the wrapper. They
     used to escape, which made every block measure short — the packer then
     fitted a chart onto a page that had 158px less room than it thought.
     The rendered page wraps blocks the same way, so the two agree. */
  useLayoutEffectRep(() => {
    if (pages || !measureRef.current) return;
    setPages(pack(atoms, readHeights(measureRef.current), CONTENT_H_PX));
  }, [atoms, pages]);

  if (!pages) {
    /* The measuring pass. Everything is rendered once at the exact content
       width so the heights we pack with are the heights that will print. */
    return (
      <div className="rp-measure" ref={measureRef} aria-hidden="true">
        <div className="rp-content" style={{ width: CONTENT_W_MM + "mm" }}>
          {blocks.map((b, bi) => {
            if (b.type === "table") {
              return (
                <div key={bi}>
                  {(b.title || b.note) ? <div className="rp-m" data-mid={bi + ":tabletitle"}><BlockView b={Object.assign({}, b, { type: "tabletitle" })} /></div> : null}
                  <table className="rp-table" data-mid-table={bi}>
                    <thead><tr data-mid={bi + ":tablehead"}>
                      {b.head.map((hd, i) => <th key={i} style={{ width: b.widths ? b.widths[i] : undefined }}>{hd}</th>)}
                    </tr></thead>
                    <tbody>
                      {(b.rows || []).map((r, ri) => (
                        <tr key={ri} data-mid={bi + ":r" + ri}>
                          {r.map((c, i) => <td key={i}>{c}</td>)}
                        </tr>
                      ))}
                      {b.foot ? <tr data-mid={bi + ":tablefoot"} className="rp-tfoot">
                        {b.foot.map((c, i) => <td key={i}>{c}</td>)}
                      </tr> : null}
                    </tbody>
                  </table>
                </div>
              );
            }
            return <div className="rp-m" data-mid={bi + ":block"} key={bi}><BlockView b={b} /></div>;
          })}
          {/* One sample "continued" marker, so its cost is measured rather
              than guessed at when a table spills onto the next page. */}
          <table className="rp-table"><tbody>
            <tr className="rp-cont" data-mid="__cont"><td>{T("continued", null)}</td></tr>
          </tbody></table>
        </div>
      </div>
    );
  }

  /* Cover is page 1, contents page 2, body starts at 3. */
  const bodyStart = 3;
  const total = pages.length + bodyStart - 1;
  const toc = [];
  pages.forEach((pg, pi) => {
    pg.forEach(a => {
      if (a.b.type === "section" && a.kind === "block")
        toc.push({ num: a.b.num, title: a.b.title, page: pi + bodyStart });
    });
  });

  return (
    <div className="rp-doc" ref={docRef}>
      <CoverPage meta={meta} />
      <TocPage meta={meta} entries={toc} num={2} total={total} />
      {pages.map((pg, pi) => (
        <Page meta={meta} num={pi + bodyStart} total={total} key={pi}>
          {renderAtoms(pg)}
        </Page>
      ))}
    </div>
  );
}

/* =============================================================
   8. The pre-generation dialog
   ============================================================= */

const META_KEY = "reap_report_meta_v1";

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function todayISO() {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" : "") + n;
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function Field({ label, hint, children }) {
  return (
    <label className="rp-field">
      <span className="rp-field-l">{label}</span>
      {children}
      {hint ? <span className="rp-field-h">{hint}</span> : null}
    </label>
  );
}

function ReportDialog({ input, onCancel, onGenerate }) {
  const saved = useMemoRep(loadMeta, []);
  const [f, setF] = useStateRep(() => ({
    company: saved.company || "",
    address: saved.address || "",
    website: saved.website || "",
    logo: saved.logo || "",
    forCompany: "", forPerson: "", forPosition: "", forNotes: "",
    reportTitle: input.projectName || "Feasibility Study",
    reportNumber: "",
    reportDate: todayISO(),
    preparedBy: saved.preparedBy || "",
    confidentiality: saved.confidentiality || "Confidential",
  }));
  const set = (k) => (e) => setF(v => Object.assign({}, v, { [k]: e.target.value }));
  const [logoErr, setLogoErr] = useStateRep("");

  const onLogo = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { setLogoErr(T("That file is not an image.", null)); return; }
    // Held as a data URI so the report stays a single self-contained document
    // and prints without a network fetch.
    if (file.size > 1.5e6) { setLogoErr(T("Please use an image under 1.5 MB.", null)); return; }
    const fr = new FileReader();
    fr.onload = () => { setLogoErr(""); setF(v => Object.assign({}, v, { logo: fr.result })); };
    fr.onerror = () => setLogoErr(T("That image could not be read.", null));
    fr.readAsDataURL(file);
  };

  const submit = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem(META_KEY, JSON.stringify({
        company: f.company, address: f.address, website: f.website,
        logo: f.logo, preparedBy: f.preparedBy, confidentiality: f.confidentiality,
      }));
    } catch (err) {}
    onGenerate(f);
  };

  /* With no programme there is nothing to report on. The engine still runs and
     would produce a complete document of zeros, rated "do not proceed" — which
     is arithmetically true and useless, and worse than saying so plainly to
     someone about to send it to a lender. */
  const empty = !(input.components || []).some(c => c.enabled !== false);

  return (
    <div className="rp-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <form className="rp-modal" onSubmit={submit}>
        <div className="rp-modal-head">
          <div>
            <div className="rp-modal-eyebrow">{T("Report", null)}</div>
            <h2>{T("Prepare the report", null)}</h2>
          </div>
          <button type="button" className="rp-x" onClick={onCancel} aria-label={T("Close", null)}>×</button>
        </div>

        {empty ? (
          <div className="rp-modal-body">
            <div className="rp-empty">
              <div className="rp-empty-t">{T("There is no programme to report on yet", null)}</div>
              <p>{T("Add at least one component to the programme — and set the land area and price — and the report will assemble from the results. Generating now would produce a complete document in which every figure is zero.", null)}</p>
            </div>
          </div>
        ) : (
        <div className="rp-modal-body">
          <p className="rp-modal-note">
            {T("Everything below is optional. Anything left blank is simply omitted, and the report falls back to REAP branding.", null)}
          </p>

          <div className="rp-fs">{T("Branding", null)}</div>
          <div className="rp-grid2">
            <Field label={T("Company name", null)}>
              <input value={f.company} onChange={set("company")} placeholder="REAP" />
            </Field>
            <Field label={T("Company logo", null)} hint={logoErr || T("PNG or SVG, under 1.5 MB", null)}>
              <div className="rp-logo-row">
                <input type="file" accept="image/*" onChange={onLogo} />
                {f.logo ? <img src={f.logo} alt="" className="rp-logo-prev" /> : null}
                {f.logo ? <button type="button" className="rp-clear" onClick={() => setF(v => Object.assign({}, v, { logo: "" }))}>{T("Remove", null)}</button> : null}
              </div>
            </Field>
            <Field label={T("Company address", null)}>
              <input value={f.address} onChange={set("address")} />
            </Field>
            <Field label={T("Company website", null)}>
              <input value={f.website} onChange={set("website")} />
            </Field>
          </div>

          <div className="rp-fs">{T("Prepared for", null)}</div>
          <div className="rp-grid2">
            <Field label={T("Company name", null)}>
              <input value={f.forCompany} onChange={set("forCompany")} />
            </Field>
            <Field label={T("Contact person", null)}>
              <input value={f.forPerson} onChange={set("forPerson")} />
            </Field>
            <Field label={T("Position or title", null)}>
              <input value={f.forPosition} onChange={set("forPosition")} />
            </Field>
            <Field label={T("Notes", null)}>
              <input value={f.forNotes} onChange={set("forNotes")} />
            </Field>
          </div>

          <div className="rp-fs">{T("Report information", null)}</div>
          <div className="rp-grid2">
            <Field label={T("Report title", null)}>
              <input value={f.reportTitle} onChange={set("reportTitle")} required />
            </Field>
            <Field label={T("Report number", null)}>
              <input value={f.reportNumber} onChange={set("reportNumber")} />
            </Field>
            <Field label={T("Report date", null)}>
              <input type="date" value={f.reportDate} onChange={set("reportDate")} />
            </Field>
            <Field label={T("Prepared by", null)}>
              <input value={f.preparedBy} onChange={set("preparedBy")} />
            </Field>
            <Field label={T("Confidentiality level", null)}>
              <select value={f.confidentiality} onChange={set("confidentiality")}>
                <option value="Public">{T("Public", null)}</option>
                <option value="Confidential">{T("Confidential", null)}</option>
                <option value="Strictly Confidential">{T("Strictly Confidential", null)}</option>
              </select>
            </Field>
          </div>
        </div>
        )}

        <div className="rp-modal-foot">
          <button type="button" className="rp-btn" onClick={onCancel}>{T("Cancel", null)}</button>
          {!empty && <button type="submit" className="rp-btn rp-btn-primary">{T("Generate report", null)}</button>}
        </div>
      </form>
    </div>
  );
}

/* =============================================================
   9. Orchestration
   ============================================================= */

const CONF_NOTE = {
  "Public": "This report may be circulated without restriction.",
  "Confidential": "This report is confidential and is provided solely for the use of the recipient named above. It may not be reproduced or circulated without written consent.",
  "Strictly Confidential": "This report is strictly confidential. It is provided solely for the named recipient and may not be copied, quoted, or disclosed to any other party under any circumstances.",
};

function buildMeta(f, input) {
  const ar = window.I18N && window.I18N.lang === "ar";
  const d = f.reportDate ? new Date(f.reportDate + "T00:00:00") : new Date();
  const dateLabel = d.toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-GB",
    { year: "numeric", month: "long", day: "numeric" });
  return {
    logo: f.logo || "",
    company: f.company || "",
    address: f.address || "",
    website: f.website || "",
    forCompany: f.forCompany || "",
    forPerson: f.forPerson || "",
    forPosition: f.forPosition || "",
    forNotes: f.forNotes || "",
    reportTitle: f.reportTitle || T("Feasibility Study", null),
    reportNumber: f.reportNumber || "",
    preparedBy: f.preparedBy || f.company || "REAP",
    confidentiality: T(f.confidentiality || "Confidential", null),
    confidentialityNote: T(CONF_NOTE[f.confidentiality] || CONF_NOTE.Confidential, null),
    projectName: input.projectName || "",
    subtitle: [input.location && input.location !== "—" ? input.location : null, input.projectType]
      .filter(Boolean).join(" · "),
    dateLabel,
    year: d.getFullYear(),
  };
}

/* The @page rule, injected while the report is open and removed when it
   closes.

   It cannot live in report.css: the page already carries an inline
   `@page { margin: 13mm }` for printing the dashboard, and that <style> sits
   after the stylesheet link, so it wins. A 13mm inset on a page box that is
   already exactly A4 pushes every sheet onto two. @page is document-global
   and cannot be scoped by a selector, so the only way to override it is to
   land later in the head — which a runtime-appended <style> always does. */
const RP_PAGE_RULE = "@page { size: 338.67mm 190.5mm; margin: 0; }";

function mountPageRule() {
  if (document.getElementById("rp-page-rule")) return;
  const s = document.createElement("style");
  s.id = "rp-page-rule";
  s.textContent = RP_PAGE_RULE;
  document.head.appendChild(s);
}
function unmountPageRule() {
  const s = document.getElementById("rp-page-rule");
  if (s) s.remove();
}

/* Created on first use rather than at load, so a session that never exports
   never grows the extra node. */
function portalHost() {
  let d = document.getElementById("rp-portal");
  if (!d) {
    d = document.createElement("div");
    d.id = "rp-portal";
    document.body.appendChild(d);
  }
  return d;
}

/* Mounted once by the app. Listens for the export event, collects the cover
   details, then renders the document over the page. */
function ReportHost({ input, result, scenarios, waterfall }) {
  const [phase, setPhase] = useStateRep("idle"); // idle | form | doc
  const [meta, setMeta] = useStateRep(null);

  useEffectRep(() => {
    const open = () => setPhase("form");
    window.addEventListener("feas:export", open);
    return () => window.removeEventListener("feas:export", open);
  }, []);

  useEffectRep(() => {
    const esc = (e) => { if (e.key === "Escape") { setPhase("idle"); } };
    if (phase !== "idle") window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [phase]);

  // The heavy runs happen only once the user has committed to a report.
  const heavy = useMemoRep(() => {
    if (phase !== "doc") return null;
    const drivers = [
      { key: "landPricePerSqm", label: T("Land price / m²", null) },
      { key: "interestRate", label: T("Interest rate", null) },
      { key: "ltc", label: T("LTC", null) },
      { key: "softCostsPct", label: T("Soft costs %", null) },
      { key: "contingencyPct", label: T("Contingency %", null) },
      { key: "constructionMonths", label: T("Construction duration", null) },
    ];
    (input.components || []).forEach((c, ci) => {
      const base = "components." + ci;
      const nm = c.name || c.type || T("Component", null);
      if (c.costPerSqmGFA) drivers.push({ key: "c" + ci + "cost", label: nm + " — " + T("build cost", null), path: base + ".costPerSqmGFA" });
      if (c.pricePerSqm) drivers.push({ key: "c" + ci + "psqm", label: nm + " — " + T("price/m²", null), path: base + ".pricePerSqm" });
      if (c.pricePerUnit) drivers.push({ key: "c" + ci + "punit", label: nm + " — " + T("price/unit", null), path: base + ".pricePerUnit" });
      if (c.rentPerSqmYr) drivers.push({ key: "c" + ci + "rsqm", label: nm + " — " + T("rent/m²", null), path: base + ".rentPerSqmYr" });
    });
    let tornadoIRR = [];
    try { tornadoIRR = window.Feas.tornado(input, drivers, 0.10); } catch (e) { tornadoIRR = []; }
    return { tornadoIRR };
  }, [phase, input]);

  const blocks = useMemoRep(() => {
    if (phase !== "doc" || !heavy) return null;
    const m = metricsOf(input, result);
    const rec = deriveRecommendation(m, input, result);
    return buildBlocks({
      input, result, scenarios, waterfall,
      tornadoIRR: heavy.tornadoIRR, m, rec,
    });
  }, [phase, heavy, input, result, scenarios, waterfall]);

  /* The overlay is portalled to <body> rather than rendered inside the app.
     That is what lets the report print INSTEAD of the dashboard: the print
     rules only have to hide #root, rather than unpick the app's own print
     stylesheet rule by rule. The body class is the switch. */
  useEffectRep(() => {
    if (phase === "doc") {
      document.body.classList.add("rp-active");
      mountPageRule();
    } else {
      document.body.classList.remove("rp-active");
      unmountPageRule();
    }
    return () => { document.body.classList.remove("rp-active"); unmountPageRule(); };
  }, [phase]);

  if (phase === "idle") return null;

  const portal = portalHost();

  if (phase === "form")
    return ReactDOM.createPortal(
      <ReportDialog
        input={input}
        onCancel={() => setPhase("idle")}
        onGenerate={(f) => { setMeta(buildMeta(f, input)); setPhase("doc"); }}
      />, portal);

  return ReactDOM.createPortal(
    <div className="rp-overlay">
      <div className="rp-bar no-print">
        <div className="rp-bar-l">
          <Mark size={15} color="var(--ad-gold-500)" />
          <span><Raw v={meta.reportTitle} /></span>
        </div>
        <div className="rp-bar-r">
          <button className="rp-btn" onClick={() => setPhase("form")}>{T("Edit details", null)}</button>
          <button className="rp-btn" onClick={() => setPhase("idle")}>{T("Close", null)}</button>
          <button className="rp-btn rp-btn-primary" onClick={() => window.print()}>{T("Print or save as PDF", null)}</button>
        </div>
      </div>
      <div className="rp-scroll">
        {blocks ? <ReportDocument blocks={blocks} meta={meta} /> : null}
      </div>
    </div>, portal);
}

window.Report = { ReportHost };

})();
