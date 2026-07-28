/* =============================================================
   Feasibility calculation engine — v2
   New schema:
     Project-level:
       landArea, landPricePerSqm, landTransferFeesPct
       predesignMonths, constructionMonths, preSalesStartMonth
       softCostsPct, contingencyPct, marketingPct, salesCommissionPct, govFeesPct
       ltc, interestRate, discountRate, horizonMonths
     Components (each):
       id, kind, name, enabled, mode("sale"|"lease")
       allocationPct, far, costPerSqmGFA, siteWorkCostPerSqm, efficiency
       revenueBasis("sqm"|"unit"|"key"), avgUnitSize, keys
       pricePerSqm, pricePerUnit, pricePerKey
       rentPerSqmYr, rentPerUnitYr, adr
       occupancy, opexPct
       salesPeriodMonths (sale) / operatingPeriodMonths (lease)
       exitCapRate (lease only)
   ============================================================= */
(function () {

const sCurveCdf = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 3 * t * t - 2 * t * t * t;
};

const sCurveMonthly = (months) => {
  if (months <= 0) return [];
  const cdf = [];
  for (let i = 1; i <= months; i++) cdf.push(sCurveCdf(i / months));
  const out = [];
  let prev = 0;
  for (const c of cdf) { out.push(c - prev); prev = c; }
  return out;
};

const npv = (cashflows, annualRate) => {
  const monthly = Math.pow(1 + annualRate, 1 / 12) - 1;
  let v = 0;
  for (let i = 0; i < cashflows.length; i++) {
    v += cashflows[i] / Math.pow(1 + monthly, i);
  }
  return v;
};

/* IRR — robust to the non-conventional equity cashflows this model can
   produce. Under debt-first funding, equity often contributes ~nothing in
   the early months (the facility fronts all costs) and the exit force-clear
   can drop a large negative flow late — so the equity series can change sign
   more than once. Such flows have zero or multiple NPV roots, and the old
   single-bracket bisection then returned an arbitrary root (sometimes with a
   sign contradicting the deal's actual profit) or, when its auto-expanded
   bracket never crossed, a nonsense rate in the millions of percent.
   Instead: locate ALL roots by grid scan + bisection over [-99%, +100,000%],
   then report the first crossing moving away from 0% in the direction of the
   deal's cash profit. For conventional flows (single root) this is exactly
   the classic IRR; for pathological flows it never shows a positive IRR on a
   money-losing deal or a negative IRR on a profitable one — if no root with
   the right sign exists, IRR is reported as null ("—"). */
const irr = (cashflows) => {
  let hasNeg = false, hasPos = false, sum = 0;
  for (const c of cashflows) { if (c < 0) hasNeg = true; if (c > 0) hasPos = true; sum += c; }
  if (!hasNeg || !hasPos) return null;

  const refine = (lo, hi, vLo) => {
    for (let i = 0; i < 120; i++) {
      const mid = (lo + hi) / 2;
      const vMid = npv(cashflows, mid);
      if (vMid === 0) return mid;
      if (vMid * vLo < 0) hi = mid; else { lo = mid; vLo = vMid; }
    }
    return (lo + hi) / 2;
  };

  // Rate grid: fine where deals actually land, geometric out to 100,000%/yr.
  const grid = [];
  for (let r = -0.99; r < 2; r += 0.01) grid.push(r);
  for (let r = 2; r < 10; r += 0.1) grid.push(r);
  for (let r = 10; r <= 1000; r *= 1.25) grid.push(r);

  const roots = [];
  let prevR = grid[0], prevV = npv(cashflows, prevR);
  for (let i = 1; i < grid.length; i++) {
    const v = npv(cashflows, grid[i]);
    if (prevV === 0) roots.push(prevR);
    else if (prevV * v < 0) roots.push(refine(prevR, grid[i], prevV));
    prevR = grid[i]; prevV = v;
  }
  if (roots.length === 0) return null;
  if (sum > 0) {
    const pos = roots.filter(r => r > 0);
    return pos.length ? Math.min(...pos) : null;
  }
  if (sum < 0) {
    const neg = roots.filter(r => r < 0);
    return neg.length ? Math.max(...neg) : null;
  }
  return roots.reduce((a, b) => (Math.abs(a) < Math.abs(b) ? a : b));
};

const paybackMonths = (cashflows) => {
  // Payback = first month cumulative CF recovers to ≥ 0 AFTER having dipped
  // negative. Without the dip guard, an all-zero opening month (fully
  // debt-funded projects) reports payback at month 0.
  let cum = 0, dipped = false;
  for (let i = 0; i < cashflows.length; i++) {
    cum += cashflows[i];
    if (cum < -1e-6) { dipped = true; continue; }
    if (dipped && cum >= 0) return i;
  }
  return null;
};

const boxMuller = (() => {
  let spare = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u, v, s;
    do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; }
    while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * m;
    return u * m;
  };
})();

const sampleNormal = (mean, sd) => mean + sd * boxMuller();
const sampleTri = (lo, mid, hi) => {
  const u = Math.random();
  const c = (mid - lo) / (hi - lo);
  if (u < c) return lo + Math.sqrt(u * (hi - lo) * (mid - lo));
  return hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mid));
};

const percentile = (arr, p) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

/* Numeric input with default — unlike `|| dflt`, honours an explicit 0. */
const numOr = (v, dflt) => {
  if (v === undefined || v === null || v === "") return dflt;
  const n = +v;
  return isNaN(n) ? dflt : n;
};

/* ---------- Component math ---------- */

/* Revenue-bearing units of a component.

   A Mixed-Use Building spreads one unified envelope — one land allocation, one
   FAR/coverage massing, one total GFA, one basement, one site-works % — across
   sub-components that each take a share of that GFA and carry their own build
   cost, efficiency, purpose (sale or lease), rate, occupancy, timing and exit
   cap. A community centre that is part retail and part offices is one building
   on one plot, but two very different revenue streams.

   A plain component is its own single revenue unit, so every component without
   subs[] follows exactly the path it always did.

   The test is the PRESENCE of a subs array, not whether it has entries: a
   mixed-use building the user has not filled in yet must earn nothing rather
   than falling back to the plain-component fields. */
function revenueUnits(c) {
  return Array.isArray(c.subs) ? c.subs : [c];
}

/* How long a unit sells down / is held.

   `+v | 0` on a missing period yields 0, and Math.max(1, 0) then crams the
   whole sell-down or hold into a SINGLE month — which silently collapses the
   auto horizon to construction + 3. That happens whenever a unit carries the
   timing for one purpose and is switched to the other, so fall back to the
   preset period rather than to one month. An explicit 0 still floors at 1. */
const salePeriodOf  = (u) => Math.max(1, Math.round(numOr(u.salesPeriodMonths, 36)));
const leasePeriodOf = (u) => Math.max(1, Math.round(numOr(u.operatingPeriodMonths, 60)));

/* Revenue for one unit (a plain component, or one sub of a mixed-use
   building) given its already-derived net saleable/leasable area. */
function computeUnitRevenue(u, nsa) {
  const basis = u.revenueBasis || "sqm";
  let units = 0, keys = 0;
  let salesRevenue = 0, grossIncome = 0, opex = 0, noi = 0, exitValue = 0;

  if (basis === "unit") {
    const avgUnitSize = +u.avgUnitSize || 0;
    units = avgUnitSize > 0 ? Math.floor(nsa / avgUnitSize) : 0;
  } else if (basis === "key") {
    keys = +u.keys || 0;
  }

  if (u.mode === "sale") {
    if (basis === "sqm")  salesRevenue = nsa * (+u.pricePerSqm || 0);
    if (basis === "unit") salesRevenue = units * (+u.pricePerUnit || 0);
    if (basis === "key")  salesRevenue = keys  * (+u.pricePerKey  || 0);
  } else if (u.mode === "lease") {
    const occ = numOr(u.occupancy, 0.85);
    const opexPct = numOr(u.opexPct, 0.30);
    if (basis === "sqm")  grossIncome = nsa * (+u.rentPerSqmYr || 0) * occ;
    if (basis === "unit") grossIncome = units * (+u.rentPerUnitYr || 0) * occ;
    if (basis === "key")  grossIncome = keys * (+u.adr || 0) * occ * 365;
    opex = grossIncome * opexPct;
    noi = grossIncome - opex;
    // numOr, not `||`: a cap rate of 0 is a deliberate statement that the asset
    // is held rather than sold, so it must survive as 0 and produce no exit
    // value. `+v || 0.075` would read that 0 as "not supplied" and quietly
    // capitalise the NOI at 7.5%.
    const cap = numOr(u.exitCapRate, 0.075);
    exitValue = cap > 0 ? noi / cap : 0;
  }

  return { units, keys, salesRevenue, grossIncome, opex, noi, exitValue };
}

function computeComponent(c, projectLandArea, projectLandPricePerSqm) {
  const allocationPct = +c.allocationPct || 0;
  const land = projectLandArea * allocationPct;

  // ----- Build-up area methodology: FAR or Coverage -----
  const massingMode = c.massingMode || "far";
  let gfa = 0, derivedFAR = 0, derivedFloors = 0;
  let groundArea = 0, upperTypicalArea = 0, lastFloorArea = 0;

  if (massingMode === "coverage") {
    const landCoverage = Math.max(0, Math.min(1, +c.landCoveragePct || 0));   // ground floor footprint
    const upperCoverage = Math.max(0, Math.min(1, +c.upperFloorCoveragePct || 0));
    // 0 is meaningful here — a top floor set back to nothing — so numOr, not `||`.
    const lastPct = Math.max(0, Math.min(1, numOr(c.lastFloorPct, 1)));        // last floor as % of upper typical
    const maxFloors = Math.max(0, +c.maxFloors || 0);                          // total above-ground, incl. last

    groundArea = land * landCoverage;
    const upperCount = Math.max(0, maxFloors - 1);                             // floors above ground
    const typicalCount = Math.max(0, upperCount - 1);                          // upper floors excluding last
    upperTypicalArea = land * upperCoverage * typicalCount;
    lastFloorArea = upperCount >= 1 ? land * upperCoverage * lastPct : 0;
    gfa = groundArea + upperTypicalArea + lastFloorArea;

    derivedFAR = land > 0 ? gfa / land : 0;
    derivedFloors = maxFloors;
  } else {
    const far = +c.far || 0;
    gfa = land * far;
    derivedFAR = far;
    derivedFloors = far;
    groundArea = Math.min(land, gfa / Math.max(1, far));
  }

  /* ----- Sub-components (Mixed-Use Building) -----
     Each sub takes gfaSharePct of the building's unified GFA and applies its
     OWN efficiency and build rate to that share. A plain component has no
     subs[]: `subs` stays null and every figure below is derived exactly as
     before. */
  const rawSubs = Array.isArray(c.subs)
    ? c.subs.filter(s => s && s.enabled !== false)
    : null;

  let subs = null;
  let nsa, aboveGroundConstructionCost;

  if (rawSubs) {
    subs = rawSubs.map(s => {
      const share = Math.max(0, +s.gfaSharePct || 0);
      const subGfa = gfa * share;
      const subEfficiency = numOr(s.efficiency, 0.78);
      const subNsa = subGfa * subEfficiency;
      const subConstructionCost = subGfa * (+s.costPerSqmGFA || 0);
      return Object.assign({}, s, {
        gfaSharePct: share,
        gfa: subGfa,
        efficiency: subEfficiency,
        nsa: subNsa,
        constructionCost: subConstructionCost,
      }, computeUnitRevenue(s, subNsa));
    });
    nsa = subs.reduce((t, s) => t + s.nsa, 0);
    aboveGroundConstructionCost = subs.reduce((t, s) => t + s.constructionCost, 0);
  } else {
    // numOr to match the sub-component path, which already used it.
    const efficiency = numOr(c.efficiency, 0.78);
    nsa = gfa * efficiency;
    aboveGroundConstructionCost = gfa * (+c.costPerSqmGFA || 0);
  }

  // Share of GFA the user has handed to sub-components. Anything short of
  // 100% is built and costed but earns nothing, so the UI warns on it.
  const subGfaAllocatedPct = subs ? subs.reduce((t, s) => t + s.gfaSharePct, 0) : 0;

  // ----- Basement (unified for the whole building) -----
  const hasBasement = !!c.hasBasement;
  // Coverage may exceed 100% of land: each extra 100% represents another
  // full basement floor (e.g. 200% ≈ two basement levels).
  const basementCoverage = hasBasement ? Math.max(0, +c.basementCoveragePct || 0) : 0;
  const basementArea = land * basementCoverage;
  // Basement uses its own SAR/m² rate (typically lower per m² than above-ground).
  const basementCostPerSqm = +c.basementCostPerSqm || 0;
  const basementCost = basementArea * basementCostPerSqm;

  // ----- Construction + site work -----
  // aboveGroundConstructionCost is derived above: one rate on the whole GFA for
  // a plain component, or the sum of each sub's own rate on its GFA share.
  const builtCost = aboveGroundConstructionCost + basementCost;

  // Site work (incl. setbacks) = % of this component's construction cost
  // Back-compat: if no siteWorkPct supplied, fall back to legacy area-based formula
  let siteWorkCost;
  if (c.siteWorkPct !== undefined && c.siteWorkPct !== null) {
    siteWorkCost = builtCost * (+c.siteWorkPct || 0);
  } else {
    const footprint = Math.min(land, gfa / Math.max(1, derivedFAR || 1));
    const remainingArea = Math.max(0, land - footprint);
    siteWorkCost = remainingArea * (+c.siteWorkCostPerSqm || 0);
  }

  const footprint = groundArea;
  const remainingArea = Math.max(0, land - footprint);

  const landCost = land * projectLandPricePerSqm;

  // Revenue calc — a mixed-use building sums its sub-components; a plain
  // component is evaluated as a single revenue unit (identical arithmetic).
  let units, keys, salesRevenue, grossIncome, opex, noi, exitValue;
  if (subs) {
    const sum = (k) => subs.reduce((t, s) => t + (s[k] || 0), 0);
    units = sum("units"); keys = sum("keys");
    salesRevenue = sum("salesRevenue"); grossIncome = sum("grossIncome");
    opex = sum("opex"); noi = sum("noi"); exitValue = sum("exitValue");
  } else {
    ({ units, keys, salesRevenue, grossIncome, opex, noi, exitValue } =
      computeUnitRevenue(c, nsa));
  }

  return {
    ...c,
    land, gfa, nsa, footprint, remainingArea,
    landCost, builtCost, siteWorkCost,
    // Massing diagnostics
    massingMode, derivedFAR, derivedFloors,
    groundArea, upperTypicalArea, lastFloorArea,
    // Basement
    hasBasement, basementArea, basementCost,
    // Mixed use: computed sub-components (null for a plain component) and the
    // share of GFA they account for.
    subs, subGfaAllocatedPct,
    units, keys,
    salesRevenue, grossIncome, opex, noi, exitValue,
  };
}

/* ---------- Main feasibility ---------- */

function runFeasibility(input) {
  const a = input;

  // Project timing
  const predesignMonths = Math.max(0, a.predesignMonths | 0);
  const constructionMonths = Math.max(1, a.constructionMonths | 0);
  const conStart = predesignMonths;
  const conEnd = predesignMonths + constructionMonths;
  const preSalesStartMonth = a.preSalesStartMonth !== undefined ? Math.max(0, a.preSalesStartMonth | 0) : predesignMonths;

  // Land + transfer fees
  const landArea = +a.landArea || 0;
  const landPricePerSqm = +a.landPricePerSqm || 0;
  /* Tenure: the land is either bought or leased.

     Bought  — a month-0 outlay plus RETT, sitting inside development cost and
               therefore inside the debt facility base.
     Leased  — no purchase price and NO RETT, because a ground lease transfers
               no title. Instead an annual ground rent runs until the project
               exits. That rent is an operating cost, not development capex, so
               it is deliberately kept OUT of devCostExFinance: a construction
               lender does not advance against rent that has not been incurred.
               The practical effect is a much smaller facility on leasehold. */
  const landTenure = a.landTenure === "lease" ? "lease" : "own";
  const isLeasehold = landTenure === "lease";

  const landCost = isLeasehold ? 0 : landArea * landPricePerSqm;
  const landTransferFeesPct = +a.landTransferFeesPct || 0;
  const landTransferFees = isLeasehold ? 0 : landCost * landTransferFeesPct;

  // Land condition: raw land only develops a share of the gross plot
  // (the rest goes to roads, utilities, open space). Net/serviced land
  // develops 100%. Program components allocate against the NET area.
  const landType = a.landType === "raw" ? "raw" : "net";
  const developablePct = landType === "raw"
    ? Math.max(0, Math.min(1, a.developablePct !== undefined ? +a.developablePct : 0.70))
    : 1;
  const netDevelopableArea = landArea * developablePct;

  // Land infrastructure (roads / utilities) — SAR per m² of GROSS land,
  // applicable to raw or net. Spent alongside site work during construction.
  const landInfraCost = landArea * (+a.landInfraCostPerSqm || 0);

  // Components
  const componentsRaw = a.components || [];
  const components = componentsRaw.map((c) => {
    if (!c.enabled) return { ...c, land: 0, gfa: 0, nsa: 0, units: 0, keys: 0, salesRevenue: 0, grossIncome: 0, opex: 0, noi: 0, exitValue: 0, builtCost: 0, siteWorkCost: 0, landCost: 0 };
    // On leasehold no land is bought, so no component carries a land cost.
    return computeComponent(c, netDevelopableArea, isLeasehold ? 0 : landPricePerSqm);
  });

  // Allocation validation
  const totalAllocationPct = components.filter(c => c.enabled).reduce((s, c) => s + (+c.allocationPct || 0), 0);
  const allocationOverflow = totalAllocationPct > 1.001;
  const allocationUnused = Math.max(0, 1 - totalAllocationPct);

  // Aggregates
  const totalGFA = components.reduce((s, c) => s + (c.gfa || 0), 0);
  const totalNSA = components.reduce((s, c) => s + (c.nsa || 0), 0);
  const totalUnits = components.reduce((s, c) => s + (c.units || 0), 0);
  const totalKeys = components.reduce((s, c) => s + (c.keys || 0), 0);
  const totalSalesRevenue = components.reduce((s, c) => s + (c.salesRevenue || 0), 0);
  const totalGrossIncome = components.reduce((s, c) => s + (c.grossIncome || 0), 0);
  const totalOpex = components.reduce((s, c) => s + (c.opex || 0), 0);
  const totalNOI = components.reduce((s, c) => s + (c.noi || 0), 0);
  const totalExit = components.reduce((s, c) => s + (c.exitValue || 0), 0);
  const totalConstructionCost = components.reduce((s, c) => s + (c.builtCost || 0), 0);
  // Site work includes land infrastructure (roads/utilities on gross land) —
  // both are horizontal works spent on the same S-curve during construction.
  const totalSiteWorkCost = components.reduce((s, c) => s + (c.siteWorkCost || 0), 0) + landInfraCost;

  // Project-level cost percentages
  const softCostsPct = +a.softCostsPct || 0;
  const contingencyPct = +a.contingencyPct || 0;
  const marketingPct = +a.marketingPct || 0;
  const salesCommissionPct = +a.salesCommissionPct || 0;
  const govFeesPct = +a.govFeesPct || 0;

  const softCosts = (totalConstructionCost + totalSiteWorkCost) * softCostsPct;
  const contingencyBase = totalConstructionCost + totalSiteWorkCost + softCosts;
  const contingency = contingencyBase * contingencyPct;
  const marketing = totalSalesRevenue * marketingPct;
  const salesCommission = totalSalesRevenue * salesCommissionPct;
  const govFees = totalSalesRevenue * govFeesPct;

  const devCostExFinance =
    landCost + landTransferFees +
    totalConstructionCost + totalSiteWorkCost +
    softCosts + contingency;

  /* ---------- Auto horizon (derived from project assumptions) ----------
     Horizon = predesign + construction + max(sell-down, operating) + small tail.
     A user-supplied `horizonMonths` acts as a floor / upper-cap override.    */
  let endMonth = conEnd;
  components.forEach((c) => {
    if (!c.enabled) return;
    revenueUnits(c).forEach((u) => {
      if (u.mode === "sale") {
        const e = preSalesStartMonth + salePeriodOf(u);
        if (e > endMonth) endMonth = e;
      } else if (u.mode === "lease") {
        const e = conEnd + leasePeriodOf(u);
        if (e > endMonth) endMonth = e;
      }
    });
  });
  const tailMonths = 3;
  const autoHorizon = Math.max(12, endMonth + tailMonths);
  const userHorizon = Math.max(0, a.horizonMonths | 0);
  // If the user pinned a horizon, honour it as a minimum (never shorter than auto).
  const horizon = userHorizon > autoHorizon ? userHorizon : autoHorizon;
  const arr = () => new Array(horizon + 1).fill(0);

  /* ---------- Cashflow streams ---------- */

  // Land + transfer fees: paid month 0 (zero on leasehold)
  const landFlow = arr();
  landFlow[0] = -(landCost + landTransferFees);

  /* Ground rent (leasehold only) — an OPERATING cost of holding the site,
     accrued MONTHLY exactly as OpEx is, escalating by a fixed percentage every
     N years (5 by default) and running until the project exits rather than to
     the end of the horizon.

     Monthly, not annually in advance, and this matters well beyond
     presentation. A once-a-year lump makes needFlow spike far above that
     month's operating income, which both forces an equity call and drags
     `lastCall` later; distributions are locked before the last equity call, so
     one rent lump late in the hold froze every distribution before it and the
     equity curve sat flat until exit. Rent is not development capex that
     equity must pre-fund — it is paid out of the income the asset produces, so
     it belongs on the operating side and spread like any other running cost.

     Escalation steps on completed multiples of the review period: with a
     5-year review the first five years sit at the opening rate and the first
     uplift lands in year six. */
  const landRentFlow = arr();
  const landRentPerSqmYr = isLeasehold ? Math.max(0, numOr(a.landRentPerSqmYr, 0)) : 0;
  const landRentEscalationYears = Math.max(1, Math.round(numOr(a.landRentEscalationYears, 5)));
  const landRentEscalationPct = numOr(a.landRentEscalationPct, 0);
  let totalLandRent = 0;
  if (landRentPerSqmYr > 0) {
    const rentLastMonth = Math.min(horizon, Math.max(0, endMonth));
    for (let m = 0; m <= rentLastMonth; m++) {
      const steps = Math.floor(Math.floor(m / 12) / landRentEscalationYears);
      const annual = landArea * landRentPerSqmYr * Math.pow(1 + landRentEscalationPct, steps);
      const due = annual / 12;
      landRentFlow[m] -= due;
      totalLandRent += due;
    }
  }

  // Soft costs: spread across predesign + first half of construction
  const softFlow = arr();
  const softMonths = Math.max(1, predesignMonths + Math.floor(constructionMonths / 2));
  const softDist = sCurveMonthly(softMonths);
  for (let i = 0; i < softDist.length && i <= horizon; i++) softFlow[i] = -softCosts * softDist[i];

  // Construction: S-curve over construction window
  const constructionFlow = arr();
  const siteWorkFlow = arr();
  const conDist = sCurveMonthly(constructionMonths);
  for (let i = 0; i < conDist.length; i++) {
    const m = conStart + i;
    if (m <= horizon) {
      constructionFlow[m] -= totalConstructionCost * conDist[i];
      siteWorkFlow[m]     -= totalSiteWorkCost     * conDist[i];
    }
  }

  // Contingency: drawn pro-rata with construction
  const contingencyFlow = arr();
  for (let i = 0; i < conDist.length; i++) {
    const m = conStart + i;
    if (m <= horizon) contingencyFlow[m] -= contingency * conDist[i];
  }

  // Sales: each sale component over its own sales window
  const salesFlow = arr();
  const sellingFlow = arr();
  components.forEach(c => {
    if (!c.enabled) return;
    revenueUnits(c).forEach(u => {
      if (u.mode !== "sale") return;
      const salesStart = preSalesStartMonth;
      const salesPeriod = salePeriodOf(u);
      const dist = sCurveMonthly(salesPeriod);
      for (let i = 0; i < dist.length; i++) {
        const m = salesStart + i;
        if (m <= horizon) {
          salesFlow[m] += (u.salesRevenue || 0) * dist[i];
        }
      }
    });
  });
  // Selling costs flow with overall sales
  const totalSelling = marketing + salesCommission + govFees;
  const totalSales = salesFlow.reduce((s, v) => s + v, 0);
  if (totalSales > 0) {
    for (let m = 0; m <= horizon; m++) {
      sellingFlow[m] = -totalSelling * (salesFlow[m] / totalSales);
    }
  }

  /* ---------- Operating cashflow: per-component lease-up ramp ----------
     Each component carries:
       - occupancy            → stabilized (long-run) occupancy
       - initialOccupancy     → day-1 occupancy at delivery (default 30%)
       - yearsToStabilization → lease-up period (default 1 yr)
     Monthly gross income scales by (currentOccupancy / stabilizedOccupancy),
     linearly interpolating from initial → stabilized over the lease-up window. */
  const rentFlow = arr();
  const opexFlow = arr();
  const noiFlow = arr();
  const exitFlow = arr();
  components.forEach(c => {
    if (!c.enabled) return;
    revenueUnits(c).forEach(u => {
      if (u.mode !== "lease") return;
      const opStart = conEnd;
      const opPeriod = leasePeriodOf(u);
      const opEnd = Math.min(horizon, opStart + opPeriod);

      const stabOcc = numOr(u.occupancy, 0.85);
      const initOcc = Math.max(0, Math.min(stabOcc, numOr(u.initialOccupancy, 0.30)));
      const leaseUpMonths = Math.max(1, Math.round(numOr(u.yearsToStabilization, 1) * 12));

      for (let m = opStart; m < opEnd && m <= horizon; m++) {
        const elapsed = m - opStart + 1; // 1-indexed month-in-operation
        const t = Math.min(1, elapsed / leaseUpMonths);
        const currentOcc = initOcc + (stabOcc - initOcc) * t;
        // Ratio vs. the stabilized grossIncome already on the unit.
        const occRatio = stabOcc > 0 ? currentOcc / stabOcc : 1;
        const monthGross = (u.grossIncome || 0) / 12 * occRatio;
        const monthOpex  = (u.opex || 0) / 12 * occRatio;
        rentFlow[m] += monthGross;
        opexFlow[m] -= monthOpex;
        noiFlow[m]  += monthGross - monthOpex;
      }
      // Exit at end of operating period
      if (opEnd <= horizon) {
        exitFlow[opEnd] += u.exitValue || 0;
      } else {
        // If operating period exceeds horizon, exit at horizon
        exitFlow[horizon] += u.exitValue || 0;
      }
    });
  });

  /* ---------- Debt model — revenue-first funding, revolving cash sweep ----------
     Funding order each month:
       1. The month's own project income (off-plan sales, NOI, exit
          proceeds — net of selling costs) PLUS any cash retained from
          earlier surpluses covers that month's costs first.
       2. Any shortfall is drawn from the facility, capped by OUTSTANDING
          BALANCE (LTC × dev cost, with room reserved for the month's
          interest) — repaid amounts re-open the facility for later draws.
       3. Whatever remains is called from equity.
     Interest is PAID IN CASH whenever the project has positive cash that
     month; it capitalises into the balance only when there is no cash to
     pay it. All remaining cash sweeps the principal immediately — even
     during construction — since the facility can be redrawn.
     Distributions to equity happen only when retained cash plus remaining
     facility capacity fully cover every future funding need — an equity
     holder takes no distribution while they might have to contribute again.
     Any residual loan balance at the project's natural exit month is
     force-cleared (from cash, else a final equity deficiency call). */
  const ltc = Math.max(0, Math.min(1, +a.ltc || 0));
  const interestAnnual = +a.interestRate || 0;
  const interestMonthly = Math.pow(1 + interestAnnual, 1 / 12) - 1;
  const debtFacility = devCostExFinance * ltc;
  const projectExitMonth = Math.min(horizon, Math.max(1, endMonth));

  // Monthly funding need before financing: costs minus income (net of
  // selling costs). Negative = surplus month.
  const outlayFlow = arr();
  const incomeNetFlow = arr();
  const needFlow = arr();
  for (let m = 0; m <= horizon; m++) {
    // Ground rent sits on the INCOME side, not in outlay: it is an operating
    // cost met from the project's own receipts, not development capex that
    // equity has to pre-fund. Keeping it out of outlay is what stops it
    // inflating futureNeed and locking distributions.
    outlayFlow[m] = -(landFlow[m] + softFlow[m] + constructionFlow[m] + siteWorkFlow[m] + contingencyFlow[m]);
    incomeNetFlow[m] = salesFlow[m] + noiFlow[m] + exitFlow[m] + sellingFlow[m] + landRentFlow[m];
    needFlow[m] = outlayFlow[m] - incomeNetFlow[m];
  }
  // Backward pass: futureNeed[m] = the peak cumulative funding shortfall in
  // the months AFTER m — the amount worth retaining instead of distributing.
  const futureNeed = arr();
  let runNeed = 0;
  for (let m = horizon; m >= 0; m--) {
    futureNeed[m] = runNeed;
    runNeed = Math.max(0, needFlow[m] + runNeed);
  }

  /* The funding loop runs as a function so it can be iterated: distributions
     are LOCKED before the last observed equity call, and the loop re-runs
     until stable. That makes "no distribution while a later contribution
     could be required" exact rather than estimated (the capacity heuristic
     alone can miss future capitalised interest). */
  const runFundingPass = (noDistBefore) => {
    const F = {
      debtDrawFlow: arr(), debtRepayFlow: arr(), interestFlow: arr(), debtBalance: arr(),
      interestPaidFlow: arr(), principalRepayFlow: arr(), cashAvailableFlow: arr(),
      intCapitalisedFlow: arr(), equityNeedCashFlow: arr(), distributionFlow: arr(),
      cashBalanceFlow: arr(),
      // Equity cash that clears a loan deficiency at exit (revenue < debt
      // service). Real investor cash — part of the equity cashflow — but NOT
      // "equity funding project uses" (principal repayment is financing,
      // not a use), so it stays out of the Capital tab's decomposition.
      deficiencyFlow: arr(),
      totalEquity: 0, lastCall: -1,
    };
    let outstanding = 0;
    let cashBalance = 0; // retained project cash (undistributed surpluses)

    for (let m = 0; m <= horizon; m++) {
      // Interest accrues on the opening balance.
      const interest = outstanding * interestMonthly;

      // 1) Revenue-first: this month's income AND retained cash fund the
      //    month's costs before any debt is drawn.
      const need = needFlow[m];
      let draw = 0;
      let equityNeeded = 0;
      let totalCash;
      // 2) Draw headroom is capped on the OUTSTANDING balance (revolver:
      //    repayments re-open it), reserving room for this month's interest
      //    so the cap covers draws INCLUDING capitalised interest.
      const drawHeadroom = Math.max(0, debtFacility - outstanding - interest);
      if (need > 0) {
        const fromCash = Math.min(cashBalance, need);
        const afterCash = need - fromCash;
        if (afterCash > 0 && drawHeadroom > 0) {
          draw = Math.min(drawHeadroom, afterCash);
        }
        // 3) Equity plugs whatever cash + debt could not cover.
        equityNeeded = Math.max(0, afterCash - draw);
        totalCash = cashBalance - fromCash;
      } else {
        totalCash = cashBalance - need; // need < 0 → surplus adds to cash
      }
      const cashForService = totalCash;

      // 4) Interest is paid in cash whenever cash exists. The unpaid remainder
      //    capitalises — but ONLY as far as the facility still allows. The LTC
      //    limit is a hard cap on the balance, not merely on new draws: once
      //    the facility is fully drawn, interest that can be neither paid from
      //    cash nor capitalised within the cap is cured by equity, exactly as a
      //    revolver covenant would require. Without this cure the balance
      //    compounds past the stated LTC without limit.
      const intPaid = Math.min(interest, totalCash);
      totalCash -= intPaid;
      const intUnpaid = interest - intPaid;
      const capHeadroom = Math.max(0, debtFacility - (outstanding + draw));
      const intCapitalised = Math.min(intUnpaid, capHeadroom);
      const intCuredByEquity = intUnpaid - intCapitalised;
      if (intCuredByEquity > 0) equityNeeded += intCuredByEquity;

      // 5) ALL remaining cash sweeps the principal immediately — even during
      //    construction — since repaid amounts can be redrawn later.
      const balancePreSweep = outstanding + draw + intCapitalised;
      const principalPaid = Math.min(balancePreSweep, totalCash);
      totalCash -= principalPaid;
      let newOutstanding = balancePreSweep - principalPaid;
      // Equity-cured interest reaches the lender just as cash-paid interest does.
      let repay = intPaid + intCuredByEquity + principalPaid;
      let forcedPrincipal = 0;

      // Force-clear any residual at the project's natural exit month —
      // from remaining cash first, else as a final equity deficiency call.
      if (m === projectExitMonth && newOutstanding > 0.01) {
        const extraFromCash = Math.min(totalCash, newOutstanding);
        totalCash -= extraFromCash;
        const fromEquity = newOutstanding - extraFromCash;
        if (fromEquity > 0.01) F.deficiencyFlow[m] = fromEquity;
        forcedPrincipal = newOutstanding;
        repay += newOutstanding;
        newOutstanding = 0;
      }
      if (newOutstanding < 0.01) newOutstanding = 0;
      outstanding = newOutstanding;

      // 6) Distribute only cash beyond what future needs can't get from the
      //    (re-opened) facility — and never before the locked month.
      const futureCapacity = Math.max(0, debtFacility - outstanding);
      const retainTarget = (m >= projectExitMonth) ? 0 : Math.max(0, futureNeed[m] - futureCapacity);
      const distribute = (m >= noDistBefore) ? Math.max(0, totalCash - retainTarget) : 0;
      cashBalance = totalCash - distribute;

      F.debtDrawFlow[m] = draw;
      F.debtRepayFlow[m] = -repay;
      F.interestFlow[m] = -interest;
      F.debtBalance[m] = outstanding;
      // Interest actually settled with the lender this month — from cash, plus
      // any cured by an equity call when the facility had no headroom left.
      F.interestPaidFlow[m] = intPaid + intCuredByEquity;
      F.principalRepayFlow[m] = principalPaid + forcedPrincipal;
      // Cash that was available for debt service this month (after costs).
      F.cashAvailableFlow[m] = cashForService;
      F.intCapitalisedFlow[m] = intCapitalised;
      F.distributionFlow[m] = distribute;
      F.cashBalanceFlow[m] = cashBalance;

      F.equityNeedCashFlow[m] = equityNeeded;
      F.totalEquity += equityNeeded;
      if (equityNeeded > 0.01 || (F.deficiencyFlow[m] || 0) > 0.01) F.lastCall = m;
    }
    // Safety nets (defensive — only reached if projectExitMonth fell out of bounds)
    if (outstanding > 0) {
      F.debtRepayFlow[horizon] -= outstanding;
    }
    if (cashBalance > 0.01) {
      // Any cash still retained at the horizon flows out to equity.
      F.distributionFlow[horizon] += cashBalance;
      F.cashBalanceFlow[horizon] = 0;
    }
    return F;
  };

  // Iterate to a fixed point: lock distributions before the last equity
  // call and re-run. Locking only retains more cash, which can only reduce
  // (or advance) equity needs — so the lock is monotone and converges.
  let lock = 0;
  let pass = runFundingPass(lock);
  for (let iter = 0; iter < 6; iter++) {
    const newLock = pass.lastCall + 1;
    if (newLock <= lock) break;
    lock = newLock;
    pass = runFundingPass(lock);
  }
  const debtDrawFlow = pass.debtDrawFlow;
  const debtRepayFlow = pass.debtRepayFlow;
  const interestFlow = pass.interestFlow;
  const debtBalance = pass.debtBalance;
  const interestPaidFlow = pass.interestPaidFlow;
  const principalRepayFlow = pass.principalRepayFlow;
  const cashAvailableFlow = pass.cashAvailableFlow;
  const intCapitalisedFlow = pass.intCapitalisedFlow;
  const equityNeedCashFlow = pass.equityNeedCashFlow;
  const distributionFlow = pass.distributionFlow;
  const cashBalanceFlow = pass.cashBalanceFlow;
  const deficiencyFlow = pass.deficiencyFlow;
  const totalEquity = pass.totalEquity;

  /* ---------- Per-month Sources & Uses coverage ----------
     For each month, decompose all outflows ("uses incurred") into the funding
     streams that cover them: debt drawn + pre-sales/operating revenue applied
     + equity injected (plug). Used by the Capital coverage timeline chart. */
  const usesByCatFlow = {
    land:         arr(), // land + transfer fees
    construction: arr(), // hard cost above ground
    siteWork:     arr(),
    soft:         arr(),
    contingency:  arr(),
    marketing:    arr(), // marketing + commission + gov fees (all pro-rata to sales)
    interest:     arr(),
  };
  const totalUsesFlow = arr();
  const equityInjectedFlow = arr();
  const revenueAppliedFlow = arr();
  for (let m = 0; m <= horizon; m++) {
    // "Land" covers the whole cost of securing the site — the purchase and
    // RETT on a freehold, the ground rent on a lease. Grouping them keeps the
    // per-year uses table tying to total uses without a column that is empty
    // for most projects; the headline Uses breakdown still shows ground rent
    // as its own line.
    usesByCatFlow.land[m]         = -(landFlow[m] + landRentFlow[m]);
    usesByCatFlow.construction[m] = -constructionFlow[m];
    usesByCatFlow.siteWork[m]     = -siteWorkFlow[m];
    usesByCatFlow.soft[m]         = -softFlow[m];
    usesByCatFlow.contingency[m]  = -contingencyFlow[m];
    usesByCatFlow.marketing[m]    = -sellingFlow[m];
    usesByCatFlow.interest[m]     = -interestFlow[m];
    const u =
      usesByCatFlow.land[m] + usesByCatFlow.construction[m] + usesByCatFlow.siteWork[m] +
      usesByCatFlow.soft[m] + usesByCatFlow.contingency[m] + usesByCatFlow.marketing[m] +
      usesByCatFlow.interest[m];
    totalUsesFlow[m] = u;
    const debtThisMonth = debtDrawFlow[m] || 0;
    // Funding order (matches the debt loop): revenue first, then the facility
    // (costs + its own capitalised interest until the cap), then equity.
    // "Revenue applied" is the residual: income used on the month's own
    // costs, interest rolled beyond the cap, selling costs netted from
    // receipts.
    const debtCover = debtThisMonth + (intCapitalisedFlow[m] || 0);
    equityInjectedFlow[m] = equityNeedCashFlow[m] || 0;
    revenueAppliedFlow[m] = Math.max(0, u - debtCover - equityInjectedFlow[m]);
  }
  const debtDrawnTotalCov = debtDrawFlow.reduce((s, v) => s + v, 0) +
    intCapitalisedFlow.reduce((s, v) => s + v, 0);
  const equityInjectedTotal = equityInjectedFlow.reduce((s, v) => s + v, 0);
  const revenueAppliedTotal = revenueAppliedFlow.reduce((s, v) => s + v, 0);

  /* ---------- Net cashflow ----------
     grossCashflow = the unlevered project view (all uses & revenues).
     netCashflow = the EQUITY's cash view under retained-cash funding:
     equity calls out (negative), distributions in (positive). Surplus cash
     retained inside the project shows as neither until it is released —
     that timing shift is exactly the retained-cash account. By cash
     conservation (loan fully closed, cash account ends at zero),
     Σ netCashflow ≡ profit still holds by construction. */
  const grossCashflow = arr();
  const netCashflow = arr();
  for (let m = 0; m <= horizon; m++) {
    grossCashflow[m] =
      landFlow[m] + landRentFlow[m] + softFlow[m] + constructionFlow[m] + siteWorkFlow[m] +
      contingencyFlow[m] + salesFlow[m] + sellingFlow[m] +
      rentFlow[m] + opexFlow[m] + exitFlow[m];
    netCashflow[m] = distributionFlow[m] - equityNeedCashFlow[m] - deficiencyFlow[m];
  }

  /* ---------- KPIs ---------- */
  const totalCashRevenue = salesFlow.reduce((s, v) => s + v, 0) +
    rentFlow.reduce((s, v) => s + v, 0) +
    exitFlow.reduce((s, v) => s + v, 0);
  const totalCashCosts = -(
    landFlow.reduce((s, v) => s + v, 0) +
    softFlow.reduce((s, v) => s + v, 0) +
    constructionFlow.reduce((s, v) => s + v, 0) +
    siteWorkFlow.reduce((s, v) => s + v, 0) +
    contingencyFlow.reduce((s, v) => s + v, 0) +
    sellingFlow.reduce((s, v) => s + v, 0) +
    opexFlow.reduce((s, v) => s + v, 0)
  );
  const totalInterest = -interestFlow.reduce((s, v) => s + v, 0);
  const profit = totalCashRevenue - totalCashCosts - totalInterest;
  const profitUnlevered = totalCashRevenue - totalCashCosts;

  const equityCashflow = netCashflow.slice();
  const discount = numOr(a.discountRate, 0.10);
  const projectIRR = irr(grossCashflow);
  const equityIRR = irr(equityCashflow);
  const projectNPV = npv(grossCashflow, discount);
  const equityNPV = npv(equityCashflow, discount);
  const projectROI = totalCashCosts > 0 ? profitUnlevered / totalCashCosts : 0;
  // equityROI is computed AFTER totalEquityContributed below — the debt-loop
  // cash variable `totalEquity` can be 0 under debt-first funding, which made
  // ROI/multiple display as 0%/1.00× while the header showed real equity.
  const projectPayback = paybackMonths(grossCashflow);
  const equityPayback = paybackMonths(equityCashflow);
  const peakDebt = debtBalance.reduce((m, v) => Math.max(m, v), 0);
  const debtDrawnTotal = debtDrawFlow.reduce((s, v) => s + v, 0);
  // Peak equity outstanding — max single-month drawdown (lower than total
  // contributed because later revenue inflows offset it).
  let peakEqOut = 0, cumEq = 0;
  for (const v of equityCashflow) { cumEq += v; if (cumEq < peakEqOut) peakEqOut = cumEq; }
  const peakEquityAtRisk = -peakEqOut;
  // Total equity = Total uses − Debt drawn, by accounting identity. This is
  // THE invariant that makes Sources ≡ Uses in the Capital tab.
  // Total uses = devCostExFinance (land + transfer + construction + site +
  //   soft + contingency) + selling (marketing + commission + gov fees) +
  //   total interest paid.
  const totalUsesForBalance =
    (landCost + landTransferFees + totalConstructionCost + totalSiteWorkCost +
     softCosts + contingency) + totalLandRent +
    (marketing + salesCommission + govFees) +
    (-interestFlow.reduce((s, v) => s + v, 0));
  // Equity required = actual CASH called from investors — only what neither
  // the month's own revenue nor the facility could cover (revenue-first →
  // debt → equity funding order).
  const totalEquityContributed = totalEquity;
  // Canonical equity basis — same figure the header / Capital tab display.
  // null when the facility funds everything (ROI on zero equity is undefined).
  const equityROI = totalEquityContributed > 0 ? profit / totalEquityContributed : null;

  let minDSCR = Infinity;
  for (let m = 0; m <= horizon; m++) {
    // Debt service = actual cash applied to the loan this month (debtRepay
    // already covers both principal AND any interest paid — see note in the
    // Net cashflow block above for why we don't add interestFlow again).
    const ds = -debtRepayFlow[m];
    if (ds > 1) {
      const inc = salesFlow[m] + noiFlow[m] + exitFlow[m];
      const r = inc / ds;
      if (r < minDSCR) minDSCR = r;
    }
  }
  if (!isFinite(minDSCR)) minDSCR = null;

  const risks = computeRisks({
    a, projectIRR, equityIRR, projectROI, profit, ltc, contingencyPct,
    softCostsPct, constructionMonths, predesignMonths, peakDebt, debtFacility,
    allocationOverflow, totalAllocationPct, allocationUnused,
    totalEquity: totalEquityContributed,
    components,
  });

  return {
    kpi: {
      projectIRR, equityIRR, projectNPV, equityNPV,
      projectROI, equityROI, projectPayback, equityPayback,
      profit, profitUnlevered,
      totalRevenue: totalCashRevenue, totalCost: totalCashCosts,
      peakDebt, totalEquity: totalEquityContributed, peakEquity: peakEquityAtRisk, debtDrawnTotal,
      minDSCR,
      gfa: totalGFA, nsa: totalNSA, totalUnits, totalKeys,
      landCost, landTransferFees,
      // Leasehold: ground rent is a cost of the project but never part of
      // devCostExFinance, so it never inflates the debt facility.
      landTenure, totalLandRent,
      landRentPerSqmYr, landRentEscalationYears, landRentEscalationPct,
      landType, developablePct, netDevelopableArea, landInfraCost,
      constructionCost: totalConstructionCost,
      siteWorkCost: totalSiteWorkCost,
      softCosts, contingency,
      marketing, salesCommission, govFees, totalInterest,
      devCostExFinance, totalExit, totalNOI,
      totalGrossIncome, totalOpex,
      totalAllocationPct, allocationUnused, allocationOverflow,
      horizonMonths: horizon,
      autoHorizonMonths: autoHorizon,
    },
    cashflow: {
      months: Array.from({ length: horizon + 1 }, (_, i) => i),
      land: landFlow, landRent: landRentFlow,
      soft: softFlow, construction: constructionFlow,
      infra: siteWorkFlow, // alias for back-compat
      siteWork: siteWorkFlow,
      contingency: contingencyFlow,
      sales: salesFlow, selling: sellingFlow,
      rent: rentFlow, opex: opexFlow, noi: noiFlow,
      exit: exitFlow,
      debtDraw: debtDrawFlow, debtRepay: debtRepayFlow, interest: interestFlow,
      // Decomposition for the "Cash sweep" table:
      interestPaid: interestPaidFlow,
      // Interest rolled into the balance because there was no cash to pay it
      // AND the facility still had headroom. accrued = paid + capitalised.
      intCapitalised: intCapitalisedFlow,
      principalRepay: principalRepayFlow,
      cashAvailable: cashAvailableFlow,
      // Retained-cash account: monthly distributions to equity and the
      // closing retained balance
      distributions: distributionFlow,
      cashBalance: cashBalanceFlow,
      equityDeficiency: deficiencyFlow,
      gross: grossCashflow, net: netCashflow, debtBalance,
      // Per-month sources-cover-uses decomposition
      usesByCat: usesByCatFlow,
      totalUses: totalUsesFlow,
      equityInjected: equityInjectedFlow,
      revenueApplied: revenueAppliedFlow,
      coverageTotals: {
        equity: equityInjectedTotal,
        debt: debtDrawnTotalCov,
        revenue: revenueAppliedTotal,
      },
    },
    components,
    risks,
    allocation: {
      totalAllocationPct,
      allocationOverflow,
      allocationUnused,
    },
  };
}

function computeRisks(ctx) {
  const out = [];
  const { a, equityIRR, profit, ltc, contingencyPct, softCostsPct, constructionMonths, peakDebt, debtFacility, allocationOverflow, totalAllocationPct, allocationUnused, totalEquity, components } = ctx;
  const push = (level, title, detail) => out.push({ level, title, detail });

  // Allocation alarm (high priority)
  if (allocationOverflow) {
    push("danger", "Land allocation exceeds 100%",
      `Components allocate ${(totalAllocationPct * 100).toFixed(1)}% of the land area — over by ${((totalAllocationPct - 1) * 100).toFixed(1)} pts. Reduce one or more component allocations.`);
  } else if (totalAllocationPct < 0.98 && totalAllocationPct > 0) {
    push("warning", `${(allocationUnused * 100).toFixed(1)}% of land unallocated`,
      "Unallocated land may represent public realm or future-phase reserve — confirm intent.");
  } else if (totalAllocationPct === 0) {
    push("warning", "No components allocated to land", "Add at least one component.");
  } else {
    push("success", "Land allocation balanced", `${(totalAllocationPct * 100).toFixed(1)}% allocated across components.`);
  }

  const hurdle = numOr(a.discountRate, 0.12);
  // A null IRR has two very different causes. If no equity was ever called the
  // project simply funded itself, and there is no equity series to solve — that
  // is a good outcome, not a danger. Only an unsolvable series is a red flag.
  const noEquityCalled = !(totalEquity > 0.01);
  if (noEquityCalled) push("success", "No equity called", "Income and debt covered every outflow, so no equity was required — an equity IRR is undefined rather than poor.");
  else if (equityIRR === null) push("danger", "IRR could not be computed", "Cashflow does not change sign — revenue may not cover costs.");
  else if (equityIRR < hurdle * 0.7) push("danger", "Equity IRR well below hurdle", `Equity IRR ${(equityIRR * 100).toFixed(1)}% vs hurdle ${(hurdle * 100).toFixed(1)}%.`);
  else if (equityIRR < hurdle) push("warning", "Equity IRR below hurdle", `${(equityIRR * 100).toFixed(1)}% vs target ${(hurdle * 100).toFixed(1)}%.`);
  else push("success", "Equity IRR clears hurdle", `${(equityIRR * 100).toFixed(1)}% vs target ${(hurdle * 100).toFixed(1)}%.`);

  if (profit < 0) push("danger", "Project shows a loss", `Net profit SAR ${(profit / 1e6).toFixed(1)}M.`);
  if (ltc > 0.70) push("warning", "Leverage above 70% LTC", "High debt exposure — sensitivity to rate moves will be material.");
  if (contingencyPct < 0.05) push("warning", "Contingency below 5%", "Limited buffer for construction overruns.");
  if (softCostsPct < 0.08) push("warning", "Soft costs look low", "Typical design + consultants + PM is 10–15% of construction.");
  if (constructionMonths < 12) push("warning", "Aggressive construction timeline", `${constructionMonths} months may not reflect typical procurement.`);
  if (constructionMonths > 60) push("warning", "Long construction window", "Carry costs and market risk grow significantly past 5 years.");
  if (peakDebt > debtFacility * 0.98 && debtFacility > 0) push("warning", "Peak debt at facility limit", "Little headroom — consider larger facility or staged equity.");

  return out;
}

/* ---------- Fund waterfall — LP / Developer / GP ----------
   European waterfall, three tiers:
     (1) Return of capital — pro-rata of unreturned contributions to ALL who
         contributed cash (LP + Dev + GP co-invest)
     (2) Preferred return — compounded monthly at preferredReturnPct, pro-rata
         on unreturned capital balances
     (3) Performance split — promoteSplit to GP; (1 - promoteSplit) pro-rata
         to investors only (LP + Developer), NOT to GP co-invest             */

function runWaterfall(input, result) {
  const f = input.fund || {};
  if (!f.enabled) return null;

  const equityCF = result.cashflow.net;

  /* The fund LIFE ends when the project naturally exits (last sale / lease exit
     + tail). Iterating past that point keeps charging asset-mgmt fees on any
     residual unreturned equity (loss-makers) and produces phantom GP income +
     negative LP IRR — a modelling artefact. So we cap the waterfall at the
     project's auto-horizon, not the user-pinned horizon. */
  const fundLife = Math.min(equityCF.length, result.kpi.autoHorizonMonths || equityCF.length);
  const horizon = fundLife;

  // Normalise equity splits to sum to 1
  const lpIn = +f.lpEquityPct || 0;
  const devIn = +f.devEquityPct || 0;
  const gpIn = +f.gpEquityPct || 0;
  const sumIn = lpIn + devIn + gpIn || 1;
  const lp = lpIn / sumIn;
  const dev = devIn / sumIn;
  const gp = gpIn / sumIn;

  // Investor-only split (for the residual / non-GP-promote share)
  const invTotal = lp + dev || 1;
  const lpInv = lp / invTotal;
  const devInv = dev / invTotal;

  const prefAnnual = +f.preferredReturnPct || 0;
  const prefMonthly = Math.pow(1 + prefAnnual, 1 / 12) - 1;
  const mgmtMonthly = (+f.assetMgmtFeePctYr || 0) / 12;
  // Subscription fee — charged on each equity call, as a % of the amount
  // called (replaces the old one-off acquisition fee on project cost).
  const subFeePct = +f.subscriptionFeePct || 0;
  const devFeePct = +f.developmentFeePct || 0;

  const promote = Math.max(0, Math.min(1, +f.promoteSplit || 0));

  // Fee bases
  const k = result.kpi;
  const totalProjectCost =
    (k.devCostExFinance || 0) + (k.totalInterest || 0) +
    (k.marketing || 0) + (k.salesCommission || 0) + (k.govFees || 0);
  const constructionBase = (k.constructionCost || 0) + (k.siteWorkCost || 0);
  const devFeeTotal = constructionBase * devFeePct;

  const predesign = Math.max(0, input.predesignMonths | 0);
  const conMonths = Math.max(1, input.constructionMonths | 0);
  const conStart = predesign;
  const conEnd = predesign + conMonths;
  const conDist = sCurveMonthly(conMonths); // dev fee follows construction draw

  // Party trackers
  const mkParty = () => ({
    contrib: 0, returned: 0, prefAccrued: 0,
    cashflow: new Array(horizon).fill(0),
    contribFlow: new Array(horizon).fill(0),
    returnOfCapFlow: new Array(horizon).fill(0),
    prefFlow: new Array(horizon).fill(0),
    promoteFlow: new Array(horizon).fill(0),
    proRataFlow: new Array(horizon).fill(0),
    feeFlow: new Array(horizon).fill(0),
  });
  const party = { lp: mkParty(), dev: mkParty(), gp: mkParty() };

  // Fee totals + bucket aggregates
  const fees = { subscription: 0, assetMgmt: 0, development: 0, promote: 0 };
  // Per-month fee streams — so the UI can show WHEN each fee accrues
  const feeFlows = {
    subscription: new Array(horizon).fill(0),
    assetMgmt: new Array(horizon).fill(0),
    development: new Array(horizon).fill(0),
    promote: new Array(horizon).fill(0),
  };
  const buckets = {
    returnOfCapital: 0,
    preferredReturn: 0,
    promoteToGP: 0,
    proRataResidual: 0,
  };
  // Performance fee accrues through the life but is paid once, at exit.
  let promoteReserve = 0;
  let promoteHurdleMet = false;

  /* ---- Equity is collected in full at fund establishment (month 0) ----
     The single call must cover the project's whole equity need, the
     development fee, asset-management fees for the fund's life, and the
     subscription fee — each of the last two being a % of the call itself,
     so solve for E directly:
        E = (projectNeed + devFee) / (1 − subFee% − AM%/12 × months)      */
  const projectNeedTotal = equityCF
    .slice(0, horizon)
    .reduce((s, v) => s + Math.max(0, -(v || 0)), 0);
  // AM accrues on paid-in capital from the month AFTER the call lands (the
  // fee is computed before the call inside the loop), hence horizon − 1.
  const amLoad = mgmtMonthly * Math.max(0, horizon - 1);
  const loadDenom = 1 - subFeePct - amLoad;
  const equityAtClose = loadDenom > 0.01
    ? (projectNeedTotal + devFeeTotal) / loadDenom
    : projectNeedTotal + devFeeTotal;
  const subFeeAtClose = equityAtClose * subFeePct;

  for (let m = 0; m < horizon; m++) {
    // === Fees this month — paid as incurred (standard treatment) ===
    let devFeeM = 0;
    if (m >= conStart && m < conEnd) {
      devFeeM = devFeeTotal * (conDist[m - conStart] || 0);
    }
    // Asset management — annual rate accrued monthly on PAID-IN capital, for
    // the whole fund life. (Basing it on unreturned capital made the fee
    // vanish once capital was repaid, so it only showed in the first year.)
    const paidInCapital = party.lp.contrib + party.dev.contrib + party.gp.contrib;
    const mgmtFeeM = paidInCapital * mgmtMonthly;

    fees.development += devFeeM;
    fees.assetMgmt += mgmtFeeM;
    feeFlows.development[m] += devFeeM;
    feeFlows.assetMgmt[m] += mgmtFeeM;

    // Fees paid out to recipients immediately
    party.gp.cashflow[m]  += mgmtFeeM;
    party.gp.feeFlow[m]   += mgmtFeeM;
    party.dev.cashflow[m] += devFeeM;
    party.dev.feeFlow[m]  += devFeeM;

    // ----- Capital call — the whole commitment, once, at establishment -----
    // The fund holds the cash and disburses it to the project as costs fall
    // due, so later months need no further calls.
    const totalCall = m === 0 ? equityAtClose : 0;
    // Subscription fee — charged once, on the equity collected at close.
    const subFeeM = m === 0 ? subFeeAtClose : 0;
    if (subFeeM > 0) {
      fees.subscription += subFeeM;
      feeFlows.subscription[m] += subFeeM;
      party.gp.cashflow[m] += subFeeM;
      party.gp.feeFlow[m]  += subFeeM;
    }
    if (totalCall > 0) {
      const lpCall  = totalCall * lp;
      const devCall = totalCall * dev;
      const gpCall  = totalCall * gp;
      party.lp.contrib  += lpCall;  party.lp.cashflow[m]  -= lpCall;  party.lp.contribFlow[m]  -= lpCall;
      party.dev.contrib += devCall; party.dev.cashflow[m] -= devCall; party.dev.contribFlow[m] -= devCall;
      party.gp.contrib  += gpCall;  party.gp.cashflow[m]  -= gpCall;  party.gp.contribFlow[m]  -= gpCall;
    }

    // ----- Preferred return accrues EVERY month on unreturned capital -----
    // (Accruing only in distribution months understates pref through the
    // all-negative construction period.)
    party.lp.prefAccrued  += Math.max(0, party.lp.contrib  - party.lp.returned)  * prefMonthly;
    party.dev.prefAccrued += Math.max(0, party.dev.contrib - party.dev.returned) * prefMonthly;
    party.gp.prefAccrued  += Math.max(0, party.gp.contrib  - party.gp.returned)  * prefMonthly;

    // ----- Distributions this month -----
    // Positive equity cashflow (after debt sweep) is what's available to
    // run the waterfall on. If equityCF is negative, there's nothing to
    // distribute and the call above has already handled the funding gap.
    let cf = Math.max(0, equityCF[m]);

    if (cf > 0) {
      let dist = cf;

      // (b) Return of capital — pro-rata of unreturned (to ALL contributors)
      const lpUn  = Math.max(0, party.lp.contrib  - party.lp.returned);
      const devUn = Math.max(0, party.dev.contrib - party.dev.returned);
      const gpUn  = Math.max(0, party.gp.contrib  - party.gp.returned);
      const totalUn = lpUn + devUn + gpUn;
      if (totalUn > 0 && dist > 0) {
        const pay = Math.min(dist, totalUn);
        const lpPay  = pay * (lpUn  / totalUn);
        const devPay = pay * (devUn / totalUn);
        const gpPay  = pay * (gpUn  / totalUn);
        party.lp.returned  += lpPay;  party.lp.cashflow[m]  += lpPay;  party.lp.returnOfCapFlow[m]  += lpPay;
        party.dev.returned += devPay; party.dev.cashflow[m] += devPay; party.dev.returnOfCapFlow[m] += devPay;
        party.gp.returned  += gpPay;  party.gp.cashflow[m]  += gpPay;  party.gp.returnOfCapFlow[m]  += gpPay;
        buckets.returnOfCapital += pay;
        dist -= pay;
      }

      // (c) Compounded preferred return — pro-rata of accrued
      if (dist > 0) {
        const totalPref = party.lp.prefAccrued + party.dev.prefAccrued + party.gp.prefAccrued;
        if (totalPref > 0) {
          const pay = Math.min(dist, totalPref);
          const lpPay  = pay * (party.lp.prefAccrued  / totalPref);
          const devPay = pay * (party.dev.prefAccrued / totalPref);
          const gpPay  = pay * (party.gp.prefAccrued  / totalPref);
          party.lp.prefAccrued  -= lpPay;  party.lp.cashflow[m]  += lpPay;  party.lp.prefFlow[m]  += lpPay;
          party.dev.prefAccrued -= devPay; party.dev.cashflow[m] += devPay; party.dev.prefFlow[m] += devPay;
          party.gp.prefAccrued  -= gpPay;  party.gp.cashflow[m]  += gpPay;  party.gp.prefFlow[m]  += gpPay;
          buckets.preferredReturn += pay;
          dist -= pay;
        }
      }

      // (d) Performance split — the GP's share is HELD BACK and settled once
      //     at exit (see below); investors receive their share as it arises.
      if (dist > 0) {
        const gpShare = dist * promote;
        const invShare = dist - gpShare;
        promoteReserve += gpShare;

        party.lp.cashflow[m]    += invShare * lpInv;
        party.dev.cashflow[m]   += invShare * devInv;
        party.lp.proRataFlow[m]  += invShare * lpInv;
        party.dev.proRataFlow[m] += invShare * devInv;
        buckets.proRataResidual += invShare;
        dist = 0;
      }
    }

    /* ---- Exit: settle the performance fee, once ----
       Paid only if the fund cleared its hurdle — i.e. every riyal of
       preferred return has been paid. If it did not clear, the reserve is
       released to investors instead. */
    if (m === horizon - 1 && promoteReserve > 0.01) {
      const prefOutstanding =
        party.lp.prefAccrued + party.dev.prefAccrued + party.gp.prefAccrued;
      const hurdleMet = prefOutstanding <= 0.01;
      if (hurdleMet) {
        party.gp.cashflow[m]    += promoteReserve;
        party.gp.promoteFlow[m] += promoteReserve;
        fees.promote += promoteReserve;
        feeFlows.promote[m] += promoteReserve;
        buckets.promoteToGP += promoteReserve;
      } else {
        party.lp.cashflow[m]     += promoteReserve * lpInv;
        party.dev.cashflow[m]    += promoteReserve * devInv;
        party.lp.proRataFlow[m]  += promoteReserve * lpInv;
        party.dev.proRataFlow[m] += promoteReserve * devInv;
        buckets.proRataResidual += promoteReserve;
      }
      promoteHurdleMet = hurdleMet;
      promoteReserve = 0;
    }
  }

  // Per-party totals & metrics
  const totalsFor = (p) => {
    const inn  = p.cashflow.reduce((s, v) => v < 0 ? s - v : s, 0);
    const out  = p.cashflow.reduce((s, v) => v > 0 ? s + v : s, 0);
    return { contributed: inn, distributed: out, profit: out - inn, moic: inn > 0 ? out / inn : 0, irr: irr(p.cashflow) };
  };
  const lpT  = totalsFor(party.lp);
  const devT = totalsFor(party.dev);
  const gpT  = totalsFor(party.gp);

  return {
    enabled: true,
    contributions: { lp: party.lp.contrib, dev: party.dev.contrib, gp: party.gp.contrib,
                     total: party.lp.contrib + party.dev.contrib + party.gp.contrib },
    splits: { lp, dev, gp },
    fees,
    feeFlows,
    buckets,
    party,
    totals: { lp: lpT, dev: devT, gp: gpT },
    horizon,
    fundLifeMonths: fundLife,
    config: {
      preferredReturnPct: prefAnnual,
      promoteSplit: promote,
      subscriptionFeePct: subFeePct,
      equityAtClose,
      promoteHurdleMet,
      promotePaidAtExit: true,
    },
  };
}

/* ---------- Sensitivity / scenarios / monte carlo ---------- */

function patch(input, path, fn) {
  const clone = JSON.parse(JSON.stringify(input));
  const parts = path.split(".");
  let obj = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (p.includes("[")) {
      const m = p.match(/(.+)\[(\d+)\]/);
      obj = obj[m[1]][+m[2]];
    } else obj = obj[p];
  }
  const last = parts[parts.length - 1];
  if (last.includes("[")) {
    const m = last.match(/(.+)\[(\d+)\]/);
    obj[m[1]][+m[2]] = fn(obj[m[1]][+m[2]]);
  } else {
    obj[last] = fn(obj[last]);
  }
  return clone;
}

/* Both metrics come from the SAME two simulations per driver — computing
   profit alongside IRR is free, and keeps the two tornado charts consistent. */
function tornado(input, drivers, deltaPct = 0.10) {
  const base = runFeasibility(input);
  const baseIRR = base.kpi.equityIRR ?? 0;
  const baseProfit = base.kpi.profit ?? 0;
  return drivers.map(({ key, label, path }) => {
    const lo = patch(input, path || key, (v) => v * (1 - deltaPct));
    const hi = patch(input, path || key, (v) => v * (1 + deltaPct));
    const resLo = runFeasibility(lo);
    const resHi = runFeasibility(hi);
    const irrLo = resLo.kpi.equityIRR ?? 0;
    const irrHi = resHi.kpi.equityIRR ?? 0;
    const profitLo = resLo.kpi.profit ?? 0;
    const profitHi = resHi.kpi.profit ?? 0;
    return {
      key, label,
      baseIRR, irrLo, irrHi, delta: Math.abs(irrHi - irrLo),
      baseProfit, profitLo, profitHi, deltaProfit: Math.abs(profitHi - profitLo),
    };
  }).sort((a, b) => b.delta - a.delta);
}

/* Apply price / cost / occupancy multipliers to one revenue unit.

   On a Mixed-Use Building the price, rent, build cost and occupancy live on
   the spaces, not the building, so a shock that stopped at the component would
   leave a mixed building completely unmoved — scenarios and Monte Carlo would
   report identical profit across downside, base and upside. shockComponent
   therefore recurses into subs[]. */
function shockUnit(u, m) {
  return Object.assign({}, u, {
    pricePerSqm:   u.pricePerSqm   ? u.pricePerSqm   * m.price : u.pricePerSqm,
    pricePerUnit:  u.pricePerUnit  ? u.pricePerUnit  * m.price : u.pricePerUnit,
    pricePerKey:   u.pricePerKey   ? u.pricePerKey   * m.price : u.pricePerKey,
    rentPerSqmYr:  u.rentPerSqmYr  ? u.rentPerSqmYr  * m.price : u.rentPerSqmYr,
    rentPerUnitYr: u.rentPerUnitYr ? u.rentPerUnitYr * m.price : u.rentPerUnitYr,
    adr:           u.adr           ? u.adr           * m.price : u.adr,
    costPerSqmGFA: u.costPerSqmGFA ? u.costPerSqmGFA * m.cost  : u.costPerSqmGFA,
    occupancy:     u.occupancy     ? Math.max(0.3, Math.min(0.98, u.occupancy * m.occ)) : u.occupancy,
  });
}

function shockComponent(c, m) {
  const out = shockUnit(c, m);
  if (Array.isArray(c.subs)) out.subs = c.subs.map(s => shockUnit(s, m));
  return out;
}

function buildScenarios(input, shock = 0.10) {
  const downside = JSON.parse(JSON.stringify(input));
  const upside = JSON.parse(JSON.stringify(input));
  // Downside: prices down, costs up, occupancy down. Upside mirrors it.
  const mult = (sign) => ({
    price: 1 + sign * shock,
    cost:  1 - sign * shock * 0.5,
    occ:   1 + sign * shock * 0.3,
  });
  downside.components = downside.components.map(c => shockComponent(c, mult(-1)));
  downside.constructionMonths = input.constructionMonths + 3;
  upside.components = upside.components.map(c => shockComponent(c, mult(1)));
  upside.constructionMonths = Math.max(6, input.constructionMonths - 2);
  return {
    downside: runFeasibility(downside),
    base: runFeasibility(input),
    upside: runFeasibility(upside),
  };
}

function monteCarlo(input, trials = 400) {
  const irrs = [], npvs = [], profits = [], roiVals = [];
  for (let t = 0; t < trials; t++) {
    const sim = JSON.parse(JSON.stringify(input));
    const priceShock = sampleNormal(1, 0.07);
    const costShock = sampleNormal(1, 0.08);
    const delay = Math.round(sampleNormal(0, 2));
    const occShock = sampleNormal(1, 0.05);
    // Same helper as scenarios, so mixed-use spaces are shocked too.
    sim.components = sim.components.map(c =>
      shockComponent(c, { price: priceShock, cost: costShock, occ: occShock }));
    sim.constructionMonths = Math.max(6, input.constructionMonths + delay);
    const r = runFeasibility(sim);
    if (r.kpi.equityIRR !== null) irrs.push(r.kpi.equityIRR);
    npvs.push(r.kpi.equityNPV);
    profits.push(r.kpi.profit);
    roiVals.push(r.kpi.equityROI);
  }
  /* These probabilities are shares of the trials that produced an equity IRR —
     which excludes every trial where the project funded itself and called no
     equity. On a self-funding scheme that can be nearly all of them, so the
     sample is both tiny and selected for the trials that went badly enough to
     need equity. `irrSampleCount` is exported so the UI can say how many trials
     actually contributed, and null is returned rather than 0/0 = NaN when none
     did. Whether these should instead be measured on profit or NPV — which are
     defined in every trial — is an open question for the modeller. */
  const irrSampleCount = irrs.length;
  const probPositive = irrSampleCount
    ? irrs.filter(v => v > 0).length / irrSampleCount : null;
  const probAboveHurdle = irrSampleCount
    ? irrs.filter(v => v > numOr(input.discountRate, 0.12)).length / irrSampleCount : null;
  return {
    trials, irrs, npvs, profits, roiVals,
    // How many of `trials` produced a defined equity IRR.
    irrSampleCount,
    irrP10: percentile(irrs, 0.10),
    irrP50: percentile(irrs, 0.50),
    irrP90: percentile(irrs, 0.90),
    npvP10: percentile(npvs, 0.10),
    npvP50: percentile(npvs, 0.50),
    npvP90: percentile(npvs, 0.90),
    probPositive, probAboveHurdle,
  };
}

/* ---------- Formatters ---------- */

function formatCurrency(v, opts = {}) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  const ar = typeof window !== "undefined" && window.I18N && window.I18N.lang === "ar";
  const compact = opts.compact !== false;
  // Arabic: value first, currency after. ⁦..⁩ (LRI..PDI) makes the
  // token an atomic LTR run so it can never reorder inside RTL text.
  const wrap = (body) => (ar ? `⁦${sign}${body} ر.س⁩` : `${sign}SAR ${body}`);
  if (compact) {
    if (abs >= 1e9) return wrap(`${(abs / 1e9).toFixed(2)}B`);
    if (abs >= 1e6) return wrap(`${(abs / 1e6).toFixed(1)}M`);
    if (abs >= 1e3) return wrap(`${(abs / 1e3).toFixed(0)}K`);
    return wrap(abs.toFixed(0));
  }
  return wrap(abs.toLocaleString("en-US", { maximumFractionDigits: 0 }));
}

function formatPct(v, digits = 1) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

function formatNumber(v, digits = 0) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

window.Feas = {
  sCurveCdf, sCurveMonthly, npv, irr, paybackMonths,
  sampleTri, sampleNormal, percentile,
  runFeasibility, tornado, buildScenarios, monteCarlo,
  runWaterfall,
  formatCurrency, formatPct, formatNumber,
  computeComponent,
};

})();
