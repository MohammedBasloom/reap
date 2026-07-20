/* =============================================================
   REAP Valuation engine — IVS-aligned three-approach valuation
   1. Sales comparison  (market approach)
   2. Income capitalisation (income approach)
   3. Depreciated replacement cost (cost approach)
   Reconciled into a final value + confidence range, with quality
   checks so non-specialists get warned about weak inputs.
   ============================================================= */
(function () {

/* ---------- Market defaults per property type (SAR, KSA-typical) ----------
   These pre-fill the wizard so a non-specialist can produce a credible
   valuation before touching a single advanced field. */
const PROPERTY_TYPES = {
  apartment: {
    label: "Apartment", icon: "▣",
    blurb: "A residential unit in a building",
    defaults: { buildCostPerSqm: 2600, rentPerSqmYr: 420, capRate: 0.07, opexPct: 0.25, vacancyPct: 0.08, economicLifeYrs: 60, landSharePct: 0.15 },
    weights: { sales: 0.55, income: 0.30, cost: 0.15 },
    usesLand: false,
  },
  villa: {
    label: "Villa", icon: "▱",
    blurb: "A detached private home",
    defaults: { buildCostPerSqm: 2800, rentPerSqmYr: 300, capRate: 0.065, opexPct: 0.20, vacancyPct: 0.06, economicLifeYrs: 60 },
    weights: { sales: 0.55, income: 0.10, cost: 0.35 },
    usesLand: true,
  },
  townhouse: {
    label: "Townhouse", icon: "▤",
    blurb: "An attached home in a row",
    defaults: { buildCostPerSqm: 2700, rentPerSqmYr: 320, capRate: 0.065, opexPct: 0.20, vacancyPct: 0.06, economicLifeYrs: 60 },
    weights: { sales: 0.60, income: 0.10, cost: 0.30 },
    usesLand: true,
  },
  office: {
    label: "Office", icon: "◳",
    blurb: "Office space or a commercial building",
    defaults: { buildCostPerSqm: 4000, rentPerSqmYr: 1100, capRate: 0.075, opexPct: 0.30, vacancyPct: 0.12, economicLifeYrs: 55 },
    weights: { sales: 0.25, income: 0.60, cost: 0.15 },
    usesLand: true,
  },
  retail: {
    label: "Retail", icon: "◰",
    blurb: "A shop, showroom or retail strip",
    defaults: { buildCostPerSqm: 4200, rentPerSqmYr: 1400, capRate: 0.08, opexPct: 0.28, vacancyPct: 0.10, economicLifeYrs: 55 },
    weights: { sales: 0.25, income: 0.60, cost: 0.15 },
    usesLand: true,
  },
  warehouse: {
    label: "Warehouse", icon: "◫",
    blurb: "Storage or light-industrial space",
    defaults: { buildCostPerSqm: 1800, rentPerSqmYr: 260, capRate: 0.085, opexPct: 0.18, vacancyPct: 0.08, economicLifeYrs: 45 },
    weights: { sales: 0.30, income: 0.55, cost: 0.15 },
    usesLand: true,
  },
  land: {
    label: "Land", icon: "◇",
    blurb: "A vacant plot",
    defaults: { buildCostPerSqm: 0, rentPerSqmYr: 0, capRate: 0.08, opexPct: 0, vacancyPct: 0, economicLifeYrs: 0 },
    weights: { sales: 1.0, income: 0, cost: 0 },
    usesLand: true, landOnly: true,
  },
};

/* Condition → effective-age multiplier (how "worn" the building really is
   relative to its calendar age). */
const CONDITIONS = {
  excellent: { label: "Excellent — like new / recently renovated", factor: 0.6 },
  good:      { label: "Good — well maintained",                    factor: 1.0 },
  fair:      { label: "Fair — visible wear, some repairs needed",  factor: 1.35 },
  poor:      { label: "Poor — major repairs required",             factor: 1.7 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v, d = 0) => {
  if (v === undefined || v === null || v === "") return d;
  const n = +v; return isNaN(n) ? d : n;
};
const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/* ---------- 1. Sales comparison approach ---------- */
function salesApproach(input) {
  const s = input.sales || {};
  const p = input.property || {};
  const subjectArea = num(p.type === "land" ? p.landArea : p.builtArea);
  const trend = num(s.marketTrendPctYr, 0.03);

  const comps = (s.comps || [])
    .map((c) => ({ price: num(c.price), area: num(c.area), monthsAgo: num(c.monthsAgo),
      locationAdj: num(c.locationAdj), conditionAdj: num(c.conditionAdj), otherAdj: num(c.otherAdj) }))
    .filter((c) => c.price > 0 && c.area > 0);

  const adjusted = comps.map((c) => {
    const ppsqm = c.price / c.area;
    const timeAdj = trend * (c.monthsAgo / 12);          // older sale → uplift to today
    const totalAdjPct = timeAdj + c.locationAdj + c.conditionAdj + c.otherAdj;
    return { ...c, ppsqm, timeAdj, totalAdjPct, adjustedPpsqm: ppsqm * (1 + totalAdjPct) };
  });

  const values = adjusted.map((c) => c.adjustedPpsqm);
  const med = median(values);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const spread = med > 0 ? (max - min) / med : 0;

  return {
    comps: adjusted,
    compCount: adjusted.length,
    medianPpsqm: med,
    spread,
    subjectArea,
    indicatedValue: med * subjectArea,
  };
}

/* ---------- 2. Income approach (direct capitalisation) ---------- */
function incomeApproach(input) {
  const inc = input.income || {};
  const p = input.property || {};
  const area = num(p.builtArea);

  const pgi = inc.rentBasis === "total"
    ? num(inc.annualRent)
    : num(inc.rentPerSqmYr) * area;                      // potential gross income
  const vacancy = clamp(num(inc.vacancyPct, 0.08), 0, 0.6);
  const egi = pgi * (1 - vacancy);                        // effective gross income
  const opexPct = clamp(num(inc.opexPct, 0.25), 0, 0.8);
  const opex = egi * opexPct;
  const noi = egi - opex;                                 // net operating income
  const cap = num(inc.capRate, 0.075);
  const indicatedValue = cap > 0 ? noi / cap : 0;

  return { pgi, vacancy, egi, opexPct, opex, noi, capRate: cap, indicatedValue };
}

/* ---------- 3. Cost approach (depreciated replacement cost) ---------- */
function costApproach(input) {
  const c = input.cost || {};
  const p = input.property || {};
  const typeDef = PROPERTY_TYPES[p.type] || PROPERTY_TYPES.apartment;

  const landArea = num(p.landArea);
  const builtArea = num(p.builtArea);
  const landPricePerSqm = num(c.landPricePerSqm);
  // Apartments usually don't own their land plot — attribute a land share instead.
  const landValue = typeDef.usesLand
    ? landArea * landPricePerSqm
    : (builtArea * num(c.buildCostPerSqm)) * num(typeDef.defaults.landSharePct, 0.15);

  const replacementCost = builtArea * num(c.buildCostPerSqm);
  const econLife = Math.max(1, num(c.economicLifeYrs, 60));
  const condFactor = (CONDITIONS[p.condition] || CONDITIONS.good).factor;
  const effectiveAge = num(p.age) * condFactor;
  const physicalDep = clamp(effectiveAge / econLife, 0, 0.9);
  const obsolescence = clamp(num(c.obsolescencePct, 0), 0, 0.5);
  const depreciatedCost = replacementCost * (1 - physicalDep) * (1 - obsolescence);

  return {
    landValue, replacementCost, econLife, effectiveAge,
    physicalDep, obsolescence, depreciatedCost,
    indicatedValue: landValue + depreciatedCost,
  };
}

/* ---------- Reconciliation + quality checks ---------- */
function runValuation(input) {
  const p = input.property || {};
  const typeDef = PROPERTY_TYPES[p.type] || PROPERTY_TYPES.apartment;
  const isLand = !!typeDef.landOnly;

  const sales = salesApproach(input);
  const income = isLand ? null : incomeApproach(input);
  const cost = isLand ? null : costApproach(input);

  // Normalise the user's weights over the approaches that produced a value.
  const w = input.weights || typeDef.weights;
  const entries = [
    { key: "sales", value: sales.indicatedValue, weight: num(w.sales) },
    { key: "income", value: income ? income.indicatedValue : 0, weight: isLand ? 0 : num(w.income) },
    { key: "cost", value: cost ? cost.indicatedValue : 0, weight: isLand ? 0 : num(w.cost) },
  ].map((e) => ({ ...e, weight: e.value > 0 ? e.weight : 0 }));
  const wSum = entries.reduce((s, e) => s + e.weight, 0);
  entries.forEach((e) => { e.normWeight = wSum > 0 ? e.weight / wSum : 0; });

  const finalValue = entries.reduce((s, e) => s + e.value * e.normWeight, 0);

  // Confidence range: wider when the approaches disagree or comps are thin.
  const active = entries.filter((e) => e.value > 0);
  let divergence = 0;
  if (active.length >= 2 && finalValue > 0) {
    const vals = active.map((e) => e.value);
    divergence = (Math.max(...vals) - Math.min(...vals)) / finalValue;
  }
  const rangePct = clamp(0.05 + divergence * 0.25 + (sales.compCount < 3 ? 0.03 : 0), 0.05, 0.20);

  const areaBasis = isLand ? num(p.landArea) : num(p.builtArea);

  /* Quality checks — plain-language flags for non-specialists */
  const checks = [];
  const flag = (level, title, detail) => checks.push({ level, title, detail });
  if (sales.compCount === 0)
    flag("danger", "No usable comparables", "Add at least 3 recent sales of similar properties — the market approach is the backbone of most valuations.");
  else if (sales.compCount < 3)
    flag("warning", `Only ${sales.compCount} comparable${sales.compCount === 1 ? "" : "s"}`, "Professional practice uses 3–5 comparable sales. Fewer comps make the value less reliable.");
  if (sales.compCount >= 2 && sales.spread > 0.25)
    flag("warning", "Comparables disagree widely", `Your adjusted comps span ${(sales.spread * 100).toFixed(0)}% around the middle value. Re-check the adjustments or replace outlier comps.`);
  sales.comps.forEach((c, i) => {
    if (Math.abs(c.totalAdjPct) > 0.25)
      flag("warning", `Comp ${i + 1} is heavily adjusted (${(c.totalAdjPct * 100).toFixed(0)}%)`, "Total adjustments beyond ±25% suggest the comparable is not truly similar — consider replacing it.");
  });
  if (income && income.indicatedValue > 0) {
    if (income.capRate < 0.04 || income.capRate > 0.12)
      flag("warning", "Unusual capitalisation rate", `${(income.capRate * 100).toFixed(1)}% is outside the typical 4–12% band for income property in the region.`);
    if (income.noi <= 0)
      flag("danger", "Negative operating income", "Operating costs exceed rental income — the income approach is not meaningful with these inputs.");
  }
  if (cost && cost.physicalDep >= 0.85)
    flag("warning", "Building nearly fully depreciated", "At this effective age the structure contributes little value — the valuation is essentially the land.");
  if (cost && typeDef.usesLand && num(p.landArea) <= 0)
    flag("warning", "Land area missing", "The cost approach needs the plot size. Enter the land area (m²) in step 01, or the land value stays 0.");
  if (divergence > 0.30)
    flag("warning", "Approaches disagree by more than 30%", "A large gap between approaches usually means one set of inputs is off. Compare the per-m² results and revisit the weakest one.");
  if (!isLand && num(p.builtArea) <= 0)
    flag("danger", "Built-up area missing", "Enter the built-up area (m²) — every approach needs it.");
  if (checks.length === 0)
    flag("ok", "Inputs look consistent", "Comparables, income and cost inputs are within normal professional ranges.");

  return {
    property: { ...p, typeDef },
    sales, income, cost,
    reconciliation: {
      entries, finalValue,
      low: finalValue * (1 - rangePct),
      high: finalValue * (1 + rangePct),
      rangePct, divergence,
      perSqm: areaBasis > 0 ? finalValue / areaBasis : 0,
      areaBasis,
    },
    checks,
  };
}

/* ---------- Sensitivity: final value vs key drivers ---------- */
function sensitivity(input) {
  const base = runValuation(input);
  const rows = [];
  const shift = (mut, label) => {
    const lo = JSON.parse(JSON.stringify(input)); mut(lo, -0.10);
    const hi = JSON.parse(JSON.stringify(input)); mut(hi, +0.10);
    rows.push({
      label,
      low: runValuation(lo).reconciliation.finalValue,
      base: base.reconciliation.finalValue,
      high: runValuation(hi).reconciliation.finalValue,
    });
  };
  shift((inp, d) => { (inp.sales.comps || []).forEach((c) => { c.price = num(c.price) * (1 + d); }); }, "Comparable prices ±10%");
  if (base.income && base.income.indicatedValue > 0) {
    shift((inp, d) => { inp.income.rentPerSqmYr = num(inp.income.rentPerSqmYr) * (1 + d); inp.income.annualRent = num(inp.income.annualRent) * (1 + d); }, "Rent ±10%");
    shift((inp, d) => { inp.income.capRate = num(inp.income.capRate) * (1 - d); }, "Cap rate ∓10%");
  }
  if (base.cost && base.cost.indicatedValue > 0) {
    shift((inp, d) => { inp.cost.buildCostPerSqm = num(inp.cost.buildCostPerSqm) * (1 + d); }, "Build cost ±10%");
    shift((inp, d) => { inp.cost.landPricePerSqm = num(inp.cost.landPricePerSqm) * (1 + d); }, "Land price ±10%");
  }
  return rows;
}

/* ---------- Formatters (mirror the Feas ones) ---------- */
const formatCurrency = (v) => {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  const ar = typeof window !== "undefined" && window.I18N && window.I18N.lang === "ar";
  // ⁦..⁩ (LRI..PDI) makes the whole token an atomic LTR run, so
  // "436K ر.س – 552K ر.س" can never reorder inside RTL text.
  const wrap = (body) => (ar ? `⁦${sign}${body} ر.س⁩` : `${sign}SAR ${body}`);
  if (abs >= 1e9) return wrap(`${(abs / 1e9).toFixed(2)}B`);
  if (abs >= 1e6) return wrap(`${(abs / 1e6).toFixed(1)}M`);
  if (abs >= 1e3) return wrap(`${(abs / 1e3).toFixed(0)}K`);
  return wrap(abs.toFixed(0));
};
const formatNumber = (v) => (v === null || v === undefined || isNaN(v)) ? "—" : (+v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const formatPct = (v, dp = 1) => (v === null || v === undefined || isNaN(v)) ? "—" : `${(v * 100).toFixed(dp)}%`;

window.Val = { PROPERTY_TYPES, CONDITIONS, runValuation, sensitivity, formatCurrency, formatNumber, formatPct };
})();
