/* =============================================================
   Sidebar — v2 input flow.
   1. Project & Land  →  total land cost, transfer fees, total
   2. Components (each: allocation %, FAR, costs, efficiency,
      sale/lease, revenue basis sqm|unit|key, timing, cap rate)
   3. Project timing (predesign, construction, pre-sales start)
   4. General costs (project-level %s)
   5. Financing
   ============================================================= */
const { useState: useStateS } = React;

/* ---------- Display helpers ---------- */
const fmtPct = (v) => `${Math.round(((+v) || 0) * 100)}%`;
const fmtYrs = (v) => {
  const n = (+v) || 0;
  if (n < 0.05) return "instant";
  return n === Math.round(n) ? `${n} yr${n === 1 ? "" : "s"}` : `${n.toFixed(2)} yrs`;
};

/* ---------- Atoms ---------- */

function Eyebrow({ children, n }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      {n !== undefined && <span style={{
        fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ad-gold-600)",
        letterSpacing: "0.06em",
      }}>{String(n).padStart(2, "0")}</span>}
      <div className="ad-eyebrow">{children}</div>
    </div>
  );
}

/* Small "!" affordance that explains a term on hover. Used for the jargon a
   non-specialist won't know — FAR, GFA, efficiency, LTC and friends. */
function TermTip({ tip }) {
  if (!tip) return null;
  return (
    <span
      title={tip}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
        border: "1px solid var(--ad-gold-600)", color: "var(--ad-gold-600)",
        fontSize: 9, fontWeight: 700, cursor: "help", lineHeight: 1,
        marginInlineStart: 5, verticalAlign: "middle",
      }}
    >!</span>
  );
}

function Field({ label, suffix, value, onChange, type = "number", step = 1, min, max, hint, tip, mono = true, disabled = false, placeholder }) {
  // A disabled field is a computed read-out; say so unless a hint already does.
  const shownHint = hint || (disabled ? "Calculated automatically" : null);
  return (
    <label style={{ display: "block" }}>
      <div style={{
        fontSize: 11, color: "var(--fg-2)", marginBottom: 4,
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", minWidth: 0 }}>
          <span>{label}</span>
          <TermTip tip={tip} />
        </span>
        {suffix && <span style={{ color: "var(--fg-4)", fontSize: 10 }}>{suffix}</span>}
      </div>
      <FieldInput
        type={type}
        step={step}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        mono={mono}
        placeholder={placeholder}
        onChange={onChange}
      />
      {shownHint && <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 3 }}>{shownHint}</div>}
    </label>
  );
}

/* Numeric input with thousand separators. Renders as a text input showing
   "125,000,000"; commas are display-only — the parsed number flows out
   through onChange. While focused, the user's raw typing is kept as-is (no
   caret jumps); the value re-formats on blur. */
function FieldInput({ type, step, min, max, value, disabled, mono, placeholder, onChange }) {
  const isNum = type === "number";
  const [draft, setDraft] = useStateS(null); // null = not editing
  const fmt = (v) => (v === null || v === undefined || v === "" || isNaN(+v))
    ? ""
    : (+v).toLocaleString("en-US", { maximumFractionDigits: 6 });
  return (
    <input
      className={`field-input ${mono ? "mono" : ""}`}
      type={isNum ? "text" : type}
      inputMode={isNum ? "decimal" : undefined}
      step={step}
      min={min}
      max={max}
      value={isNum ? (draft !== null ? draft : fmt(value)) : (value === null || value === undefined ? "" : value)}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        if (!isNum) { onChange(e.target.value); return; }
        const raw = e.target.value;
        if (!/^[-\d.,\s]*$/.test(raw)) return; // digits, comma, dot, minus only
        setDraft(raw);
        const parsed = parseFloat(raw.replace(/[,\s]/g, ""));
        onChange(isNaN(parsed) ? 0 : parsed);
      }}
      onFocus={() => { if (isNum) setDraft(fmt(value)); }}
      onBlur={() => setDraft(null)}
    />
  );
}

function PctField({ label, value, onChange, hint, tip, suffix = "%", step = 0.5, disabled = false }) {
  return (
    <Field
      label={label}
      suffix={suffix}
      value={value === null || value === undefined ? "" : +(+value * 100).toFixed(4)}
      onChange={(v) => onChange(+v / 100)}
      hint={hint}
      tip={tip}
      type="number"
      step={step}
      disabled={disabled}
    />
  );
}

function AutoHorizonDisplay({ input }) {
  /* Ask the engine rather than recomputing. This used to be a second copy of
     the horizon maths that branched on the component's own mode, so a
     Mixed-Use Building — whose mode is "mixed" — extended it by nothing and
     the read-out showed construction plus three while the model ran for
     years. */
  const horizon = Feas.autoHorizonMonths(input);
  const years = (horizon / 12);
  return (
    <div>
      <div style={{
        fontSize: 11, color: "var(--fg-2)", marginBottom: 4,
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
      }}>
        <span>Horizon</span>
        <span style={{ color: "var(--ad-gold-600)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" }}>Auto</span>
      </div>
      <div style={{
        height: 32, padding: "0 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        border: "1px solid var(--border-1)", background: "var(--bg-2)",
        fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-1)",
        fontVariantNumeric: "tabular-nums",
      }}>
        <span>{horizon} mo</span>
        <span style={{ color: "var(--fg-3)", fontSize: 11 }}>{years.toFixed(1)} yrs</span>
      </div>
      <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 3 }}>
        Predesign + construction + hold / sell-down + tail
      </div>
    </div>
  );
}

function Section({ title, n, children, defaultOpen = true, alarm }) {
  const [open, setOpen] = useStateS(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid var(--border-strong)" }}>
      {/* Section header reads as a distinct band: tinted background, gold
          accent when open, numbered badge and a full-size title. */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", background: "var(--bg-2)", border: "none", cursor: "pointer",
          textAlign: "start", fontFamily: "inherit",
          borderInlineStart: `3px solid ${open ? "var(--ad-gold-500)" : "transparent"}`,
          transition: "border-color var(--t-fast) var(--ease-out)",
        }}
      >
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {alarm && (
            <span style={{
              fontSize: 9, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.14em",
              background: "var(--ad-danger)", color: "white", fontWeight: 600,
            }}>{alarm}</span>
          )}
          <span style={{
            fontSize: 12, color: "var(--fg-3)",
            transition: "transform 200ms var(--ease-out)",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          }}>▾</span>
        </div>
      </button>
      {open && (
        /* Breathing room under the header band so fields don't crowd it */
        <div style={{ padding: "18px 24px 24px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ children, cols = 2 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", border: "1px solid var(--border-1)" }}>
      {options.map((o, i) => {
        // An option may be disabled — used to shut off "Saleable" on leased
        // land, where there are no units to sell.
        const off = !!o.disabled && value !== o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={off}
            title={off && o.disabledHint ? o.disabledHint : undefined}
            onClick={() => { if (!off) onChange(o.value); }}
            style={{
              flex: 1, padding: "6px 10px",
              background: value === o.value ? "var(--ad-navy-800)" : "transparent",
              color: value === o.value ? "white" : (off ? "var(--fg-4)" : "var(--fg-2)"),
              border: "none",
              borderLeft: i > 0 ? "1px solid var(--border-1)" : "none",
              cursor: off ? "not-allowed" : "pointer",
              opacity: off ? 0.45 : 1,
              fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
              fontWeight: 500,
            }}
          >{o.label}</button>
        );
      })}
    </div>
  );
}

/* ---------- Component presets ---------- */

const COMPONENT_PRESETS = {
  "villa":     { mode: "sale",  label: "Villa",            blurb: "Detached homes for sale", icon: "▱", basis: "unit", far: 1.6,  landCoveragePct: 0.45, maxFloors: 2, upperFloorCoveragePct: 0.30, lastFloorPct: 0.85, costPerSqmGFA: 2500, siteWorkPct: 0.08, basementCostPerSqm: 2200, efficiency: 0.85, avgUnitSize: 380, pricePerUnit: 2500000, salesPeriodMonths: 48 },
  "townhouse": { mode: "sale",  label: "Townhouse",        blurb: "Attached homes for sale", icon: "▤", basis: "unit", far: 0.9,  landCoveragePct: 0.50, maxFloors: 3, upperFloorCoveragePct: 0.45, lastFloorPct: 0.85, costPerSqmGFA: 2500, siteWorkPct: 0.07, basementCostPerSqm: 2000, efficiency: 0.82, avgUnitSize: 260, pricePerUnit: 1850000, salesPeriodMonths: 42 },
  // One building, one envelope, several uses. Massing, basement and site works
  // are unified; each sub takes a share of the GFA with its own build cost,
  // efficiency, purpose, rate, occupancy, timing and exit cap.
  // Starts with NO spaces: the user adds them from inside the component, so
  // nothing is assumed about what the building contains.
  "mixed":     { mode: "mixed", label: "Mixed-Use Building",   blurb: "Several uses in one building", icon: "▥", basis: "sqm", far: 3.0,  landCoveragePct: 0.50, maxFloors: 10, upperFloorCoveragePct: 0.50, lastFloorPct: 0.80, costPerSqmGFA: 2500, siteWorkPct: 0.07, basementCostPerSqm: 2000, efficiency: 0.78,
    subs: [] },
  "apartment": { mode: "sale",  label: "Residential Building", blurb: "Strata residences", icon: "▣", basis: "unit", far: 2.4,  landCoveragePct: 0.55, maxFloors: 8, upperFloorCoveragePct: 0.55, lastFloorPct: 0.80, costPerSqmGFA: 2500, siteWorkPct: 0.06, basementCostPerSqm: 2000, efficiency: 0.78, avgUnitSize: 150, pricePerUnit: 1000000, salesPeriodMonths: 36 },
  "btr":       { mode: "lease", label: "Build-to-Rent",    blurb: "Residential rental", icon: "◫", basis: "unit", far: 2.4,  landCoveragePct: 0.55, maxFloors: 8, upperFloorCoveragePct: 0.55, lastFloorPct: 0.80, costPerSqmGFA: 2500, siteWorkPct: 0.06, basementCostPerSqm: 2000, efficiency: 0.78, avgUnitSize: 100, rentPerUnitYr: 85000, occupancy: 0.92, opexPct: 0.32, operatingPeriodMonths: 60, exitCapRate: 0.075 },
  "retail":    { mode: "lease", label: "Retail",           blurb: "Leasable retail GLA", icon: "◰", basis: "sqm",  far: 1.0,  landCoveragePct: 0.65, maxFloors: 2, upperFloorCoveragePct: 0.55, lastFloorPct: 0.90, costPerSqmGFA: 2500, siteWorkPct: 0.10, basementCostPerSqm: 2500, efficiency: 0.72, rentPerSqmYr: 1450, occupancy: 0.88, opexPct: 0.28, operatingPeriodMonths: 60, exitCapRate: 0.075 },
  "office":    { mode: "lease", label: "Office",           blurb: "Leasable office NLA", icon: "◳", basis: "sqm",  far: 4.0,  landCoveragePct: 0.50, maxFloors: 12, upperFloorCoveragePct: 0.50, lastFloorPct: 0.85, costPerSqmGFA: 2500, siteWorkPct: 0.07, basementCostPerSqm: 2300, efficiency: 0.78, rentPerSqmYr: 1150, occupancy: 0.85, opexPct: 0.32, operatingPeriodMonths: 60, exitCapRate: 0.08 },
  "hotel":     { mode: "lease", label: "Hotel",            blurb: "Keyed hospitality", icon: "◧", basis: "key",  far: 3.0,  landCoveragePct: 0.45, maxFloors: 10, upperFloorCoveragePct: 0.40, lastFloorPct: 0.75, costPerSqmGFA: 4500, siteWorkPct: 0.10, basementCostPerSqm: 2800, efficiency: 0.65, keys: 220, adr: 1050, occupancy: 0.68, opexPct: 0.58, operatingPeriodMonths: 60, exitCapRate: 0.08 },
  "serviced":  { mode: "lease", label: "Serviced Apartment", blurb: "Long-stay keyed", icon: "◨", basis: "key",  far: 2.5,  landCoveragePct: 0.50, maxFloors: 8, upperFloorCoveragePct: 0.45, lastFloorPct: 0.80, costPerSqmGFA: 4500, siteWorkPct: 0.08, basementCostPerSqm: 2400, efficiency: 0.70, keys: 96,  adr: 720,  occupancy: 0.74, opexPct: 0.50, operatingPeriodMonths: 60, exitCapRate: 0.075 },
  "retail-sale": { mode: "sale", label: "Retail (Strata)", blurb: "Retail sold per m²", icon: "▦", basis: "sqm", far: 1.0,  landCoveragePct: 0.65, maxFloors: 2, upperFloorCoveragePct: 0.55, lastFloorPct: 0.90, costPerSqmGFA: 2500, siteWorkPct: 0.10, basementCostPerSqm: 2500, efficiency: 0.72, pricePerSqm: 11500, salesPeriodMonths: 36 },
  "custom":    { mode: "sale",  label: "Custom",           blurb: "Blank — define your own", icon: "◇", basis: "sqm", far: 1.0,  landCoveragePct: 0.50, maxFloors: 3, upperFloorCoveragePct: 0.45, lastFloorPct: 0.85, costPerSqmGFA: 2500, siteWorkPct: 0.08, basementCostPerSqm: 2200, efficiency: 0.80, pricePerSqm: 6000, salesPeriodMonths: 36 },
};

/* ---------- Floor-by-floor breakdown (coverage mode) ---------- */

function FloorBreakdown({ comp, land }) {
  /* Mirrors the engine's coverage massing (calc.js computeComponent): clamp the
     coverages to [0,1] and default a missing top-floor share to 100%, NOT to 0.
     Reading it as 0 made this table show a last floor of nothing and a total
     GFA below the figure the engine reported two rows further down the panel. */
  const clamp01 = (v, dflt) => {
    const n = (v === null || v === undefined || v === "" || isNaN(+v)) ? dflt : +v;
    return Math.max(0, Math.min(1, n));
  };
  const landCov = clamp01(comp.landCoveragePct, 0);
  const upperCov = clamp01(comp.upperFloorCoveragePct, 0);
  const lastPct = clamp01(comp.lastFloorPct, 1);
  const maxFloors = Math.max(0, +comp.maxFloors || 0);
  if (maxFloors === 0 || land === 0) {
    return (
      <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: -6, marginBottom: 10, fontStyle: "italic" }}>
        Enter a land allocation and max floors to see the floor-by-floor breakdown.
      </div>
    );
  }

  const groundArea = land * landCov;
  const typicalUpper = land * upperCov;
  const lastArea = maxFloors >= 2 ? typicalUpper * lastPct : 0;

  // Build per-floor rows: floor 1 = ground; floors 2..N-1 = typical upper; floor N = last
  const rows = [];
  for (let f = 1; f <= maxFloors; f++) {
    let label, area, calc;
    if (f === 1) {
      label = "Ground"; area = groundArea;
      calc = `land × ${(landCov * 100).toFixed(0)}%`;
    } else if (f === maxFloors && maxFloors >= 2) {
      label = "Last"; area = lastArea;
      calc = `floor ${f - 1} × ${(lastPct * 100).toFixed(0)}%`;
    } else {
      label = "Upper"; area = typicalUpper;
      calc = `land × ${(upperCov * 100).toFixed(0)}%`;
    }
    rows.push({ f, label, area, calc });
  }
  const total = rows.reduce((s, r) => s + r.area, 0);
  const maxArea = Math.max(...rows.map(r => r.area), 1);

  return (
    <div style={{
      border: "1px solid var(--border-1)", background: "var(--bg-2)",
      padding: "10px 12px", marginTop: -4, marginBottom: 12,
    }}>
      <div style={{
        fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--fg-3)", fontWeight: 500, marginBottom: 6,
      }}>
        Floor-by-floor build-up
      </div>
      <div style={{ display: "flex", flexDirection: "column-reverse", gap: 3 }}>
        {rows.map(r => {
          const pct = (r.area / maxArea) * 100;
          const tone = r.label === "Ground" ? "var(--ad-navy-700)"
                     : r.label === "Last"   ? "var(--ad-sand-700)"
                     :                        "var(--ad-navy-500)";
          return (
            <div key={r.f} style={{
              display: "grid", gridTemplateColumns: "44px 60px 1fr 90px",
              alignItems: "center", gap: 8, fontSize: 11, fontFamily: "var(--font-mono)",
            }}>
              {/* One token so it can be translated (F1 → د1) */}
              <span style={{ color: "var(--fg-3)", fontSize: 10, letterSpacing: "0.08em" }}>{`F${r.f}`}</span>
              <span style={{
                fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase",
                color: tone, fontWeight: 600,
              }}>{r.label}</span>
              <div style={{ position: "relative", height: 10, background: "var(--bg-1)", border: "1px solid var(--border-1)" }}>
                <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: tone, opacity: 0.85 }} />
              </div>
              <span className="tabnum" style={{ color: "var(--fg-1)", fontWeight: 500, textAlign: "right" }}>
                {Feas.formatNumber(r.area)} m²
              </span>
            </div>
          );
        })}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 8,
        paddingTop: 6, borderTop: "1px dashed var(--border-1)",
        fontSize: 11,
      }}>
        <span style={{ color: "var(--fg-3)" }}>Total GFA</span>
        <span className="tabnum" style={{ color: "var(--ad-navy-900)", fontWeight: 600 }}>
          {Feas.formatNumber(total)} m²
        </span>
      </div>
    </div>
  );
}

/* ---------- Component editor ---------- */

function ComponentEditor({ comp, onChange, onRemove, totalLandArea, landPricePerSqm, isLeasehold }) {
  const update = (k, v) => onChange({ ...comp, [k]: v });
  const preset = COMPONENT_PRESETS[comp.kind] || {};

  // Derived — use the engine so editor display always matches what the dashboard computes
  const computed = Feas.computeComponent(comp, totalLandArea, landPricePerSqm);
  const land = computed.land;
  const gfa = computed.gfa;
  const nsa = computed.nsa;
  const basementArea = computed.basementArea || 0;
  const landCostC = computed.landCost;

  /* Mixed-Use Building: the envelope (massing, basement, site works) belongs to
     the building, while purpose, efficiency, build cost and pricing belong to
     each sub-component. The engine has already sized every sub on `computed`. */
  // A mixed-use building is identified by HAVING a subs array, even an empty
  // one — an unfilled building must not fall back to the plain-component fields.
  const isMixed = Array.isArray(comp.subs);
  const subsComputed = computed.subs || [];
  const subs = comp.subs || [];
  const subSharePct = subs.reduce((t, s) => t + (+s.gfaSharePct || 0), 0);
  const subShareOff = isMixed && subs.length > 0 && Math.abs(subSharePct - 1) > 0.001;

  const updateSub = (i, k, v) => {
    update("subs", subs.map((s, j) => (j === i ? Object.assign({}, s, { [k]: v }) : s)));
  };
  /* Two kinds of space, and a building may hold several of either — leased
     retail and leased offices are both "for lease" but priced quite
     differently, so they are separate spaces. */
  const addSub = (mode) => {
    const baseLabel = mode === "sale" ? "Spaces for sale" : "Spaces for lease";
    const localised = window.I18N ? I18N.t(baseLabel) : baseLabel;
    const sameMode = subs.filter(s => s.mode === mode).length;
    const name = sameMode === 0 ? localised : `${localised} ${sameMode + 1}`;
    const common = {
      id: Math.random().toString(36).slice(2, 9),
      name, enabled: true, mode,
      gfaSharePct: 0, efficiency: 0.78, revenueBasis: "sqm",
    };
    const byMode = mode === "sale"
      ? { costPerSqmGFA: 2500, pricePerSqm: 6000, avgUnitSize: 150, pricePerUnit: 1000000, salesPeriodMonths: 36 }
      : { costPerSqmGFA: 3600, rentPerSqmYr: 1200, occupancy: 0.85, opexPct: 0.30,
          initialOccupancy: 0.30, yearsToStabilization: 1,
          operatingPeriodMonths: 60, exitCapRate: 0.075 };
    update("subs", [...subs, Object.assign(common, byMode)]);
  };
  const removeSub = (i) => update("subs", subs.filter((_, j) => j !== i));

  /* Switching a space between sale and lease must also give it the fields its
     new purpose needs. A space added as leasable carries no sales period, so
     flipping it to saleable left the sell-down undefined — which used to
     collapse the project's auto horizon to construction plus three months. */
  const switchSubMode = (i, mode) => {
    const s = subs[i] || {};
    const patch = { mode };
    if (mode === "sale") {
      if (s.salesPeriodMonths == null) patch.salesPeriodMonths = 36;
    } else {
      if (s.operatingPeriodMonths == null) patch.operatingPeriodMonths = 60;
      if (s.occupancy == null) patch.occupancy = 0.85;
      if (s.opexPct == null) patch.opexPct = 0.30;
      if (s.exitCapRate == null) patch.exitCapRate = 0.075;
      if (s.initialOccupancy == null) patch.initialOccupancy = 0.30;
      if (s.yearsToStabilization == null) patch.yearsToStabilization = 1;
    }
    update("subs", subs.map((x, j) => (j === i ? Object.assign({}, x, patch) : x)));
  };

  // Units / keys — from the engine, so the rounding rule lives in one place.
  const basis = comp.revenueBasis || "sqm";
  const units = computed.units || 0;
  const keys = computed.keys || 0;

  /* Revenue — taken from the engine, not recomputed.

     This panel used to re-derive it with `+comp.occupancy || 0` and
     `+comp.opexPct || 0`, while the engine uses numOr(..., 0.85) and
     numOr(..., 0.30). A component with either left blank therefore showed ZERO
     revenue here while every other view showed the real, default-based figure.
     `computed` is Feas.computeComponent for this very component. */
  let revenue = 0, gross = 0;
  if (isMixed) {
    // A building can sell and let at once, so both streams count.
    revenue = (computed.salesRevenue || 0) + (computed.noi || 0);
    gross = computed.grossIncome || 0;
  } else if (comp.mode === "sale") {
    revenue = computed.salesRevenue || 0;
  } else if (comp.mode === "lease") {
    gross = computed.grossIncome || 0;
    revenue = computed.noi || 0;
  }

  return (
    <div style={{
      border: "1px solid var(--border-1)",
      background: comp.enabled ? "var(--bg-1)" : "var(--bg-2)",
      padding: 14,
      marginBottom: 10,
    }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16, color: "var(--ad-navy-700)", width: 16, textAlign: "center" }}>{preset.icon || "◇"}</span>
        {/* Dashed underline + pencil — same rename affordance as the project name */}
        <span className="editable-name-wrap" style={{ flex: 1, minWidth: 0 }} title="Click to rename">
          <input
            className="field-input editable-name"
            style={{ flex: 1, padding: "4px 2px", fontWeight: 500, fontSize: 13, minWidth: 0 }}
            value={comp.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <svg className="pencil" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </span>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, color: "var(--fg-3)" }}>
          <input type="checkbox" checked={comp.enabled} onChange={e => update("enabled", e.target.checked)} />
          on
        </label>
        <button onClick={onRemove} style={{
          background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)",
          fontSize: 14, padding: "2px 6px",
        }}>×</button>
      </div>

      {/* Land allocation lives in the Allocate-the-land panel above, right
          under the program tiles — one place, seen immediately after picking. */}

      {/* Mode toggle */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 4 }}>Mode</div>
        {isMixed ? (
          <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.4 }}>
            Each use below is sold or let on its own terms.
          </div>
        ) : (
          <Segmented
            value={comp.mode}
            onChange={v => {
              /* Presets carry only the period their own purpose needs, so
                 flipping a leasable component to saleable (or back) would
                 otherwise leave the new period undefined and collapse the
                 auto horizon. */
              const patch = { mode: v };
              if (v === "sale") {
                if (comp.salesPeriodMonths == null) patch.salesPeriodMonths = 36;
              } else {
                if (comp.operatingPeriodMonths == null) patch.operatingPeriodMonths = 60;
                if (comp.occupancy == null) patch.occupancy = 0.85;
                if (comp.opexPct == null) patch.opexPct = 0.30;
                if (comp.exitCapRate == null) patch.exitCapRate = 0.075;
              }
              onChange(Object.assign({}, comp, patch));
            }}
            options={[{ value: "sale", label: "Saleable", disabled: isLeasehold, disabledHint: "Units cannot be sold on leased land" }, { value: "lease", label: "Leasable" }]}
          />
        )}
      </div>

      {/* Land & massing */}
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6 }}>Land & massing</div>
      {!isMixed && (
        <Row cols={2}>
          <PctField label="Efficiency" value={comp.efficiency} onChange={v => update("efficiency", v)} hint="NSA / GFA" tip="Efficiency — the share of built floor area that can actually be sold or let. The rest is corridors, stairs, lifts, plant rooms and wall thickness. Typically 65–85%, lower for hotels." />
          <div />
        </Row>
      )}

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 4 }}>
          Build-up area methodology
        </div>
        <Segmented
          value={comp.massingMode || "far"}
          onChange={v => update("massingMode", v)}
          options={[{ value: "far", label: "FAR" }, { value: "coverage", label: "Coverage" }]}
        />
      </div>

      {(comp.massingMode || "far") === "far" ? (
        <Row cols={2}>
          <Field label="FAR" suffix="ratio" value={comp.far} onChange={v => update("far", v)} step={0.05}
                 hint="GFA = Land × FAR"
                 tip="Floor Area Ratio — how much floor area the regulations let you build per m² of plot. FAR 2.0 on 1,000 m² of land allows 2,000 m² of GFA (Gross Floor Area, the total above-ground floor area)." />
          <div />
        </Row>
      ) : (
        <>
          <Row cols={2}>
            {/* Naming only — the massing maths is unchanged. */}
            <PctField label="Ground floor coverage" value={comp.landCoveragePct} onChange={v => update("landCoveragePct", v)} hint="Ground floor area ÷ land area" />
            <Field label="Max floors" suffix="incl. last" value={comp.maxFloors} onChange={v => update("maxFloors", v)} step={1} min={0} />
            <PctField label="Upper floors coverage" value={comp.upperFloorCoveragePct} onChange={v => update("upperFloorCoveragePct", v)} hint="Floors above the ground floor, excluding the last floor. Each floor ÷ land area" />
            <PctField label="Last floor (penthouse)" value={comp.lastFloorPct} onChange={v => update("lastFloorPct", v)} hint="Last floor as % of the floor below" />
          </Row>
          <FloorBreakdown comp={comp} land={land} />
        </>
      )}

      {/* Construction rates — apply to above-ground GFA.
          A mixed-use building costs each use at its own rate, so the building
          keeps only the site-works percentage. */}
      <Row cols={2}>
        {isMixed
          ? <div style={{ fontSize: 11, color: "var(--fg-3)", alignSelf: "center", lineHeight: 1.4 }}>
              Build cost is set per use below.
            </div>
          : <Field label="Built-up cost" suffix="SAR/m² GFA" value={comp.costPerSqmGFA} onChange={v => update("costPerSqmGFA", v)} step={50} hint="Above-ground construction rate" tip="Construction cost per m² of above-ground floor area (GFA). Excludes the basement, which carries its own rate, and excludes site works, design fees and contingency." />}
        <PctField label="Site work (incl. setbacks)" value={comp.siteWorkPct} onChange={v => update("siteWorkPct", v)} hint="% of construction cost" step={0.5} tip="Site works — everything outside the building footprint: boundary walls, landscaping, parking, external utilities and setbacks. Expressed as a percentage of construction cost." />
      </Row>

      {/* Basement */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px", border: "1px solid var(--border-1)", background: "var(--bg-2)",
        marginBottom: comp.hasBasement ? 8 : 12, marginTop: 4,
      }}>
        <span style={{ fontSize: 11, color: "var(--fg-2)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>
          Basement
        </span>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "var(--fg-3)" }}>
          <input type="checkbox" checked={!!comp.hasBasement} onChange={e => update("hasBasement", e.target.checked)} />
          {comp.hasBasement ? "Included" : "None"}
        </label>
      </div>
      {comp.hasBasement && (
        <Row cols={2}>
          <PctField
            label={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span>Basement coverage</span>
                <span
                  title="Basement coverage is measured as % of the land area. If the basement spans more than one floor, enter more than 100% — e.g. two full basement floors ≈ 200%."
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                    border: "1px solid var(--ad-gold-600)", color: "var(--ad-gold-600)",
                    fontSize: 9, fontWeight: 700, cursor: "help", lineHeight: 1,
                  }}
                >!</span>
              </span>
            }
            value={comp.basementCoveragePct}
            onChange={v => update("basementCoveragePct", v)}
            hint="% of land — over 100% adds floors (200% ≈ 2 levels)"
          />
          <Field label="Basement cost" suffix="SAR/m²" value={comp.basementCostPerSqm} onChange={v => update("basementCostPerSqm", v)} step={50} hint="Separate rate from built-up" />
        </Row>
      )}

      {/* Read-out only — a summary of the massing above. Nothing here feeds the
          engine, so changing what is displayed cannot move any number. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px 8px", padding: "10px", background: "var(--bg-2)", fontSize: 10, color: "var(--fg-3)", marginBottom: 12 }}>
        <div>Land<br /><span className="tabnum" style={{ color: "var(--fg-1)", fontSize: 12, fontWeight: 500 }}>{Feas.formatNumber(land)} m²</span></div>
        <div>GFA<br /><span className="tabnum" style={{ color: "var(--fg-1)", fontSize: 12, fontWeight: 500 }}>{Feas.formatNumber(gfa)} m²</span></div>
        <div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span>BUA</span>
            <span
              title="Built-up area — the total constructed area: above-ground GFA plus the basement where one is included. The saleable/leasable area is the share of GFA that can actually be sold or let, after circulation, cores and walls."
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                border: "1px solid var(--ad-gold-600)", color: "var(--ad-gold-600)",
                fontSize: 9, fontWeight: 700, cursor: "help", lineHeight: 1,
              }}
            >!</span>
          </span>
          <br />
          <span className="tabnum" style={{ color: "var(--fg-1)", fontSize: 12, fontWeight: 500 }}>
            {Feas.formatNumber(gfa + (comp.hasBasement ? basementArea : 0))} m²
          </span>
        </div>
        <div>{isMixed ? "Saleable / leasable" : comp.mode === "sale" ? "Saleable" : "Leasable"}<br /><span className="tabnum" style={{ color: "var(--fg-1)", fontSize: 12, fontWeight: 500 }}>{Feas.formatNumber(nsa)} m²</span></div>
      </div>

      {/* ---------- Mixed use: the sub-components ---------- */}
      {isMixed && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)" }}>Spaces in this building</div>
            {subs.length > 0 && (
              <span className="tabnum" style={{
                fontSize: 11, fontWeight: 600,
                color: subShareOff ? "var(--ad-danger)" : "var(--ad-success)",
              }}>{Feas.formatPct(subSharePct)} of GFA</span>
            )}
          </div>

          {subs.length === 0 && (
            <div style={{
              fontSize: 11, lineHeight: 1.5, padding: "10px 11px", marginBottom: 8,
              border: "1px dashed var(--border-2)", background: "var(--bg-2)", color: "var(--fg-3)",
            }}>
              No spaces yet. Add the spaces this building holds — you can add several of either kind, so leased retail and leased offices sit side by side.
            </div>
          )}

          {subShareOff && (
            <div style={{
              fontSize: 11, lineHeight: 1.45, padding: "7px 9px", marginBottom: 8,
              border: "1px solid var(--ad-danger)", background: "var(--bg-2)", color: "var(--ad-danger)",
            }}>
              {subSharePct > 1
                ? "The uses add up to more than the building's GFA. Reduce one or more shares."
                : "Some of the building's GFA is unassigned — it is built and costed but earns nothing."}
            </div>
          )}

          {(comp.subs || []).map((s, i) => {
            const sc = subsComputed[i] || {};
            const sBasis = s.revenueBasis || "sqm";
            return (
              <div key={s.id || i} style={{
                border: "1px solid var(--border-1)", background: "var(--bg-1)",
                padding: "9px 10px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <input
                    value={s.name || ""}
                    onChange={e => updateSub(i, "name", e.target.value)}
                    style={{
                      flex: 1, border: "none", borderBottom: "1px dashed var(--border-2)",
                      background: "transparent", font: "inherit", fontSize: 12, fontWeight: 600,
                      color: "var(--fg-1)", padding: "2px 0",
                    }}
                  />
                  <button type="button" onClick={() => removeSub(i)} title="Remove this use" style={{
                    border: "none", background: "transparent", cursor: "pointer",
                    color: "var(--fg-3)", fontSize: 14, lineHeight: 1, padding: "0 2px",
                  }}>×</button>
                </div>

                <Row cols={2}>
                  <PctField label="Share of GFA" value={s.gfaSharePct} onChange={v => updateSub(i, "gfaSharePct", v)} hint="of the building's GFA" tip="How much of this building's total floor area this use takes. All the uses together should come to 100%." />
                  <PctField label="Efficiency" value={s.efficiency} onChange={v => updateSub(i, "efficiency", v)} hint="NSA / GFA" tip="The share of this use's floor area that can actually be sold or let. Offices and retail differ." />
                </Row>

                <Row cols={2}>
                  <Field label="Built-up cost" suffix="SAR/m² GFA" value={s.costPerSqmGFA} onChange={v => updateSub(i, "costPerSqmGFA", v)} step={50} hint="This use's build rate" tip="Construction cost per m² for this use. A retail shell and an office fit-out cost very different amounts." />
                  <div style={{ alignSelf: "end", fontSize: 10, color: "var(--fg-3)", lineHeight: 1.5 }}>
                    GFA <span className="tabnum" style={{ color: "var(--fg-1)" }}>{Feas.formatNumber(sc.gfa || 0)}</span> m²<br />
                    NSA <span className="tabnum" style={{ color: "var(--fg-1)" }}>{Feas.formatNumber(sc.nsa || 0)}</span> m²
                  </div>
                </Row>

                <div style={{ marginBottom: 8 }}>
                  <Segmented
                    value={s.mode || "lease"}
                    onChange={v => switchSubMode(i, v)}
                    options={[{ value: "sale", label: "Saleable", disabled: isLeasehold, disabledHint: "Units cannot be sold on leased land" }, { value: "lease", label: "Leasable" }]}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Segmented
                    value={sBasis}
                    onChange={v => updateSub(i, "revenueBasis", v)}
                    options={[
                      { value: "sqm",  label: "per m²" },
                      { value: "unit", label: "per unit" },
                      { value: "key",  label: "per key" },
                    ]}
                  />
                </div>

                {s.mode === "sale" ? (
                  <>
                    <Row cols={2}>
                      {sBasis === "sqm" && <Field label="Sale price" suffix="SAR/m² NSA" value={s.pricePerSqm} onChange={v => updateSub(i, "pricePerSqm", v)} step={100} />}
                      {sBasis === "unit" && <Field label="Avg unit size" suffix="m²" value={s.avgUnitSize} onChange={v => updateSub(i, "avgUnitSize", v)} step={5} />}
                      {sBasis === "unit" && <Field label="Unit price" suffix="SAR" value={s.pricePerUnit} onChange={v => updateSub(i, "pricePerUnit", v)} step={50000} />}
                      {sBasis === "key" && <Field label="Keys" value={s.keys} onChange={v => updateSub(i, "keys", v)} step={1} />}
                      {sBasis === "key" && <Field label="Price per key" suffix="SAR" value={s.pricePerKey} onChange={v => updateSub(i, "pricePerKey", v)} step={50000} />}
                      <Field label="Sales period" suffix="months" value={s.salesPeriodMonths} onChange={v => updateSub(i, "salesPeriodMonths", v)} step={1} hint="Sell-down window" />
                    </Row>
                  </>
                ) : (
                  <>
                    <Row cols={2}>
                      {sBasis === "sqm" && <Field label="Rent" suffix="SAR/m²·yr" value={s.rentPerSqmYr} onChange={v => updateSub(i, "rentPerSqmYr", v)} step={25} />}
                      {sBasis === "unit" && <Field label="Avg unit size" suffix="m²" value={s.avgUnitSize} onChange={v => updateSub(i, "avgUnitSize", v)} step={5} />}
                      {sBasis === "unit" && <Field label="Rent per unit" suffix="SAR/unit·yr" value={s.rentPerUnitYr} onChange={v => updateSub(i, "rentPerUnitYr", v)} step={1000} />}
                      {sBasis === "key" && <Field label="Keys" value={s.keys} onChange={v => updateSub(i, "keys", v)} step={1} />}
                      {sBasis === "key" && <Field label="ADR" suffix="SAR/night" value={s.adr} onChange={v => updateSub(i, "adr", v)} step={25} tip="Average Daily Rate — the average room rate per night across the year. ADR × occupancy × keys × 365 gives annual room revenue." />}
                      <div />
                    </Row>

                    {/* Lease-up ramp — each space fills at its own pace, so
                        retail and offices in one building can stabilise on
                        different curves. */}
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6, marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>Lease-up ramp</span>
                      <span style={{ flex: 1, height: 1, background: "var(--border-2)" }} />
                      <span style={{ fontSize: 10, color: "var(--fg-4)", textTransform: "none", letterSpacing: 0 }}>
                        {fmtPct(s.initialOccupancy ?? 0.30)} → {fmtPct(s.occupancy ?? 0.85)} over {fmtYrs(s.yearsToStabilization ?? 1)}
                      </span>
                    </div>
                    <Row cols={3}>
                      <PctField label="Initial occupancy" value={s.initialOccupancy ?? 0.30} onChange={v => updateSub(i, "initialOccupancy", v)} hint="Day-1 at delivery" />
                      <Field label="Years to stabilization" suffix="years" value={s.yearsToStabilization ?? 1} onChange={v => updateSub(i, "yearsToStabilization", v)} step={0.25} min={0} hint="Lease-up period" />
                      <PctField label="Stabilized occupancy" value={s.occupancy} onChange={v => updateSub(i, "occupancy", v)} hint="Long-term run-rate" tip="The occupancy the asset settles at once lease-up finishes — the long-run average, not the day-one figure." />
                    </Row>

                    <Row cols={2}>
                      <PctField label="OpEx" value={s.opexPct} onChange={v => updateSub(i, "opexPct", v)} hint="% of gross income" tip="Operating expenses — the annual cost of running the asset: management, maintenance, utilities, insurance and service charges. Deducted from gross income to give NOI." />
                      <PctField label="Exit cap rate" value={s.exitCapRate} onChange={v => updateSub(i, "exitCapRate", v)} hint="Terminal cap" step={0.25} tip="The yield a buyer would accept for this use at exit. Stabilised NOI divided by the cap rate gives the exit value." />
                    </Row>
                    <Row cols={2}>
                      <Field label="Operating period" suffix="months" value={s.operatingPeriodMonths} onChange={v => updateSub(i, "operatingPeriodMonths", v)} step={1} hint="Held before exit" />
                      <div />
                    </Row>
                  </>
                )}

                <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 6 }}>
                  {s.mode === "sale" ? "Sales revenue " : "Annual NOI "}
                  <span className="tabnum" style={{ color: "var(--fg-1)", fontWeight: 600 }}>
                    {Feas.formatCurrency(s.mode === "sale" ? (sc.salesRevenue || 0) : (sc.noi || 0))}
                  </span>
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button type="button" disabled={isLeasehold}
              onClick={() => { if (!isLeasehold) addSub("sale"); }}
              title={isLeasehold ? "Units cannot be sold on leased land" : undefined}
              style={{
                flex: 1, padding: "8px",
                cursor: isLeasehold ? "not-allowed" : "pointer",
                opacity: isLeasehold ? 0.4 : 1,
                border: "1px dashed var(--ad-success)", background: "transparent",
                color: "var(--ad-success)", font: "inherit", fontSize: 11, fontWeight: 600,
              }}>+ Spaces for sale</button>
            <button type="button" onClick={() => addSub("lease")} style={{
              flex: 1, padding: "8px", cursor: "pointer",
              border: "1px dashed var(--ad-gold-600)", background: "transparent",
              color: "var(--ad-gold-600)", font: "inherit", fontSize: 11, fontWeight: 600,
            }}>+ Spaces for lease</button>
          </div>
        </>
      )}

      {/* Revenue basis — per use on a mixed-use building, so hidden here */}
      {!isMixed && (
        <>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6 }}>Revenue basis</div>
          <div style={{ marginBottom: 10 }}>
            <Segmented
              value={comp.revenueBasis || "sqm"}
              onChange={v => update("revenueBasis", v)}
              options={[
                { value: "sqm",  label: "per m²" },
                { value: "unit", label: "per unit" },
                { value: "key",  label: "per key" },
              ]}
            />
          </div>
        </>
      )}

      {/* Revenue inputs depend on basis + mode */}
      {!isMixed && comp.mode === "sale" && (
        <Row cols={3}>
          {basis === "sqm" && (
            <>
              <Field label="Sale price" suffix="SAR/m² NSA" value={comp.pricePerSqm} onChange={v => update("pricePerSqm", v)} step={100} />
              <div />
              <div />
            </>
          )}
          {basis === "unit" && (
            <>
              <Field label="Avg unit size" suffix="m²" value={comp.avgUnitSize} onChange={v => update("avgUnitSize", v)} step={5} />
              <Field label="Unit price" suffix="SAR/unit" value={comp.pricePerUnit} onChange={v => update("pricePerUnit", v)} step={50000} />
              <Field label="Units (derived)" suffix="#" value={units} onChange={() => {}} disabled />
            </>
          )}
          {basis === "key" && (
            <>
              <Field label="Keys" suffix="#" value={comp.keys} onChange={v => update("keys", v)} step={5} />
              <Field label="Key price" suffix="SAR/key" value={comp.pricePerKey} onChange={v => update("pricePerKey", v)} step={50000} />
              <div />
            </>
          )}
        </Row>
      )}
      {!isMixed && comp.mode === "lease" && (
        <>
          <Row cols={3}>
            {basis === "sqm" && (
              <>
                <Field label="Rent" suffix="SAR/m²·yr" value={comp.rentPerSqmYr} onChange={v => update("rentPerSqmYr", v)} step={25} />
                <div />
                <div />
              </>
            )}
            {basis === "unit" && (
              <>
                <Field label="Avg unit size" suffix="m²" value={comp.avgUnitSize} onChange={v => update("avgUnitSize", v)} step={5} />
                <Field label="Rent" suffix="SAR/unit·yr" value={comp.rentPerUnitYr} onChange={v => update("rentPerUnitYr", v)} step={2500} />
                <Field label="Units" suffix="#" value={units} onChange={() => {}} disabled />
              </>
            )}
            {basis === "key" && (
              <>
                <Field label="Keys" suffix="#" value={comp.keys} onChange={v => update("keys", v)} step={5} />
                <Field label="ADR" suffix="SAR/night" value={comp.adr} onChange={v => update("adr", v)} step={25} tip="Average Daily Rate — the average room rate per night across the year. ADR × occupancy × keys × 365 gives annual room revenue." />
                <div />
              </>
            )}
          </Row>

          {/* Lease-up ramp — defines the occupancy curve from delivery to stabilization */}
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6, marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Lease-up ramp</span>
            <span style={{ flex: 1, height: 1, background: "var(--border-2)" }} />
            <span style={{ fontSize: 10, color: "var(--fg-4)", textTransform: "none", letterSpacing: 0 }}>
              {fmtPct(comp.initialOccupancy ?? 0.30)} → {fmtPct(comp.occupancy ?? 0.85)} over {fmtYrs(comp.yearsToStabilization ?? 1)}
            </span>
          </div>
          <Row cols={3}>
            <PctField label="Initial occupancy" value={comp.initialOccupancy ?? 0.30} onChange={v => update("initialOccupancy", v)} hint="Day-1 at delivery" />
            <Field label="Years to stabilization" suffix="years" value={comp.yearsToStabilization ?? 1} onChange={v => update("yearsToStabilization", v)} step={0.25} min={0} hint="Lease-up period" />
            <PctField label="Stabilized occupancy" value={comp.occupancy} onChange={v => update("occupancy", v)} hint="Long-term run-rate" tip="The occupancy the asset settles at once lease-up finishes — the long-run average, not the day-one figure." />
          </Row>

          <Row cols={2}>
            <PctField label="OpEx" value={comp.opexPct} onChange={v => update("opexPct", v)} hint="% of gross income" tip="Operating expenses — the annual cost of running the asset: management, maintenance, utilities, insurance and service charges. Deducted from gross income to give NOI." />
            <PctField label="Exit cap rate" value={comp.exitCapRate} onChange={v => update("exitCapRate", v)} hint="Terminal cap" tip="Capitalisation rate at sale — the yield a buyer accepts. Exit value = stabilised NOI ÷ cap rate, so a lower cap rate means a higher sale price." />
          </Row>
        </>
      )}

      {/* Timing — set per use on a mixed-use building */}
      {!isMixed && (
        <>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6, marginTop: 6 }}>Timing</div>
          <Row cols={2}>
            {comp.mode === "sale" && (
              <Field label="Sales period" suffix="months" value={comp.salesPeriodMonths} onChange={v => update("salesPeriodMonths", v)} />
            )}
            {comp.mode === "lease" && (
              <Field label="Operating period" suffix="months → exit" value={comp.operatingPeriodMonths} onChange={v => update("operatingPeriodMonths", v)} hint="Hold until exit" />
            )}
            <div />
          </Row>
        </>
      )}

      {/* Summary */}
      <div style={{
        marginTop: 8, padding: "10px 12px", background: "var(--ad-navy-50)",
        display: "flex", justifyContent: "space-between", fontSize: 11,
      }}>
        <span style={{ color: "var(--fg-3)" }}>
          {isMixed ? "Sales revenue + annual NOI" : comp.mode === "sale" ? "Sales revenue" : "Annual NOI"}
        </span>
        <span className="tabnum" style={{ color: "var(--ad-navy-900)", fontWeight: 600 }}>
          {Feas.formatCurrency(revenue)} {(!isMixed && comp.mode === "lease") ? "/yr" : ""}
        </span>
      </div>
    </div>
  );
}

/* ---------- Component picker (tile grid) ---------- */

function ComponentPicker({ onPick, hasComponents, landArea, isLeasehold }) {
  const entries = Object.entries(COMPONENT_PRESETS);
  /* Every component type stays available on leased land — a villa or an
     apartment block can perfectly well be BUILT and LET on a ground lease.
     What is unavailable is SELLING it, which is enforced on each component's
     purpose toggle rather than by withholding the building type. A sale-preset
     component added here simply arrives set to lease. */
  return (
    <div style={{ marginBottom: hasComponents ? 4 : 0 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 8,
      }}>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 500 }}>
          {hasComponents ? "Add another component" : "Choose program components"}
        </div>
        {!hasComponents && landArea > 0 && (
          <div style={{ fontSize: 10, color: "var(--fg-4)" }}>
            {Feas.formatNumber(landArea)} m² to allocate
          </div>
        )}
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
      }}>
        {entries.map(([k, p]) => (
          <button
            key={k}
            type="button"
            onClick={() => onPick(k)}
            title={p.blurb}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start",
              gap: 4, padding: "10px 10px 9px",
              border: "1px solid var(--border-1)", background: "var(--bg-1)",
              cursor: "pointer", textAlign: "left",
              transition: "background 120ms var(--ease-out), border-color 120ms var(--ease-out)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--ad-navy-50)"; e.currentTarget.style.borderColor = "var(--ad-navy-400)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-1)"; e.currentTarget.style.borderColor = "var(--border-1)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{ fontSize: 18, color: "var(--ad-navy-700)", lineHeight: 1 }}>{p.icon}</span>
              <span style={{
                fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase",
                // A mixed-use building has no single purpose — each sub-component
                // is sold or leased on its own terms.
                color: p.mode === "mixed" ? "var(--ad-navy-700)"
                     : p.mode === "sale"  ? "var(--ad-success)"
                     : "var(--ad-gold-600)",
                fontWeight: 600,
              }}>{p.mode === "mixed" ? "Sale + Lease" : p.mode === "sale" ? "Sale" : "Lease"}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-1)", marginTop: 4 }}>{p.label}</div>
            <div style={{ fontSize: 10, color: "var(--fg-3)", lineHeight: 1.3 }}>{p.blurb}</div>
            <div style={{
              marginTop: 4, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--ad-navy-700)", display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 11, lineHeight: 1 }}>+</span> Add
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Empty state when no components selected ---------- */

function ComponentEmptyState() {
  return (
    <div style={{
      marginTop: 16,
      padding: "20px 18px",
      border: "1px dashed var(--border-1)",
      background: "var(--bg-2)",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--fg-3)", fontWeight: 500, marginBottom: 6,
      }}>No components yet</div>
      <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
        Pick from the tiles above to build your program.<br />
        Each component lands with sensible defaults — names, sizing and pricing are all editable.
      </div>
    </div>
  );
}

/* ---------- Land allocation panel — sits right under the program tiles so
   allocating the site is the first thing asked after picking a component. --- */

function AllocationPanel({ components, totalLand, onChange }) {
  if (!components.length) return null;
  return (
    <div style={{
      marginTop: 14, border: "1px solid var(--border-1)",
      borderInlineStart: "3px solid var(--ad-gold-500)", background: "var(--ad-navy-50)",
    }}>
      <div style={{ padding: "10px 12px 8px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-1)", fontWeight: 600 }}>
          Allocate the land
        </div>
        <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
          Give each component its share (%) of the net developable area
        </div>
      </div>
      <div style={{ padding: "0 12px 12px" }}>
        {components.map((c, i) => {
          const preset = COMPONENT_PRESETS[c.kind] || {};
          const area = totalLand * (+c.allocationPct || 0);
          return (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 0", borderTop: i === 0 ? "none" : "1px dashed var(--border-1)",
              opacity: c.enabled ? 1 : 0.45,
            }}>
              <span style={{ fontSize: 13, color: "var(--ad-navy-700)", width: 14, textAlign: "center", flexShrink: 0 }}>
                {preset.icon || "◇"}
              </span>
              <span style={{
                flex: 1, minWidth: 0, fontSize: 12, color: "var(--fg-1)", fontWeight: 500,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{c.name}</span>
              <div style={{ width: 74, flexShrink: 0 }}>
                <FieldInput
                  type="number"
                  step={0.5}
                  mono
                  value={c.allocationPct === null || c.allocationPct === undefined ? "" : +(+c.allocationPct * 100).toFixed(4)}
                  onChange={(v) => onChange(i, +v / 100)}
                />
              </div>
              <span style={{ fontSize: 11, color: "var(--fg-2)", flexShrink: 0 }}>%</span>
              <span className="tabnum" style={{ fontSize: 11, color: "var(--ad-navy-900)", fontWeight: 600, flexShrink: 0, width: 78, textAlign: "end" }}>
                {Feas.formatNumber(area)} m²
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Allocation alarm ---------- */

function AllocationAlarm({ totalPct, totalLand, hasComponents, isRawLand }) {
  if (!hasComponents) return null;
  const isOver = totalPct > 1.001;
  const isUnder = totalPct < 0.98;
  const usedLand = totalPct * totalLand;
  return (
    <div style={{
      margin: "12px 0",
      padding: "12px 14px",
      background: isOver ? "rgba(176,50,28,0.08)" : isUnder ? "rgba(184,118,30,0.07)" : "rgba(46,125,91,0.06)",
      border: `1px solid ${isOver ? "var(--ad-danger)" : isUnder ? "var(--ad-warning)" : "var(--ad-success)"}`,
      borderLeft: `3px solid ${isOver ? "var(--ad-danger)" : isUnder ? "var(--ad-warning)" : "var(--ad-success)"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{
          fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600,
          color: isOver ? "var(--ad-danger)" : isUnder ? "var(--ad-warning)" : "var(--ad-success)",
        }}>
          {isOver ? "⚠ Land overallocated" : isUnder ? "Land partially allocated" : "Land fully allocated"}
        </span>
        <span className="tabnum" style={{ fontWeight: 600, color: "var(--fg-1)" }}>
          {(totalPct * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-2)" }}>
        <span>{Feas.formatNumber(usedLand)} m² allocated</span>
        <span>of {Feas.formatNumber(totalLand)} m²{isRawLand ? " net developable" : ""}</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-3)", marginTop: 8, position: "relative" }}>
        <div style={{
          height: "100%",
          background: isOver ? "var(--ad-danger)" : isUnder ? "var(--ad-warning)" : "var(--ad-success)",
          width: `${Math.min(100, totalPct * 100)}%`,
        }} />
        {isOver && (
          <div style={{
            position: "absolute", top: 0, left: "100%", height: "100%",
            background: "var(--ad-danger)", opacity: 0.5,
            width: `${Math.min(50, (totalPct - 1) * 100)}%`,
            marginLeft: "-1px",
          }} />
        )}
      </div>
      {isOver && (
        <div style={{ fontSize: 11, color: "var(--ad-danger)", marginTop: 8 }}>
          Reduce one or more allocations — total exceeds available land by {((totalPct - 1) * 100).toFixed(1)} pts.
        </div>
      )}
    </div>
  );
}

/* ---------- Fund Structure section ---------- */

function FundStructureSection({ input, upd }) {
  const fund = input.fund || {};
  const updFund = (k, v) => upd("fund", { ...fund, [k]: v });
  const enabled = !!fund.enabled;
  const eqSum = ((+fund.lpEquityPct || 0) + (+fund.devEquityPct || 0) + (+fund.gpEquityPct || 0));
  const eqOver = Math.abs(eqSum - 1) > 0.005;

  return (
    <Section
      title="Fund Structure"
      n="08"
      defaultOpen={enabled}
      alarm={enabled && eqOver ? "EQUITY ≠ 100%" : null}
    >
      {/* Master toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", border: "1px solid var(--border-1)",
        background: enabled ? "var(--ad-navy-50)" : "var(--bg-2)",
        marginBottom: enabled ? 14 : 4,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 11, color: "var(--fg-1)", fontWeight: 600,
            letterSpacing: "0.04em",
          }}>Use fund structure</div>
          <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.4 }}>
            Splits equity across LP (cash investors), Developer and GP (fund manager),
            adds fees + a promote waterfall, and opens the <strong>Fund</strong> tab.
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "var(--fg-2)", fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => updFund("enabled", e.target.checked)}
            style={{ transform: "scale(1.1)" }}
          />
          {enabled ? "On" : "Off"}
        </label>
      </div>

      {enabled && (
        <>
          {/* Capital split */}
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6, marginTop: 4 }}>
            Equity contribution split
          </div>
          <Row cols={3}>
            <PctField label="LP" value={fund.lpEquityPct} onChange={v => updFund("lpEquityPct", v)} hint="Cash investors" />
            <PctField label="Developer" value={fund.devEquityPct} onChange={v => updFund("devEquityPct", v)} hint="Co-invest" />
            <PctField label="GP" value={fund.gpEquityPct} onChange={v => updFund("gpEquityPct", v)} hint="Fund manager" />
          </Row>
          <EquitySplitBar lp={fund.lpEquityPct} dev={fund.devEquityPct} gp={fund.gpEquityPct} />

          {/* Fees */}
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6, marginTop: 14 }}>
            Fees
          </div>
          <Row cols={2}>
            <PctField label="Subscription fee" value={fund.subscriptionFeePct} onChange={v => updFund("subscriptionFeePct", v)} hint="To GP · % of equity, once at establishment" tip="A one-off fee charged on the capital investors commit, paid to the fund manager (GP) when the fund is established." />
            <PctField label="Asset mgmt (yr)" value={fund.assetMgmtFeePctYr} onChange={v => updFund("assetMgmtFeePctYr", v)} hint="To GP · annual · on unreturned equity" tip="Annual management fee paid to the fund manager (GP) for running the fund, charged on paid-in capital." />
            <PctField label="Development fee" value={fund.developmentFeePct} onChange={v => updFund("developmentFeePct", v)} hint="To Developer · % of constr. + site" tip="Fee paid to the developer for delivering the project, charged as a percentage of construction plus site-works cost." />
            <div />
          </Row>

          {/* Waterfall */}
          <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6, marginTop: 14 }}>
            Distribution waterfall
          </div>
          <Row cols={2}>
            <PctField label="Preferred return" value={fund.preferredReturnPct} onChange={v => updFund("preferredReturnPct", v)} hint="Compounded · pro-rata to all equity" tip="The hurdle — the minimum annual return investors must receive on their capital before the manager earns any performance fee. Compounds until paid." />
            <PctField label="Performance fee" value={fund.promoteSplit} onChange={v => updFund("promoteSplit", v)} hint="GP share of profit above pref · paid once at exit" tip="Also called the promote or carried interest — the manager's share of profit above the preferred return. Paid once at exit, and only if the hurdle is met." />
          </Row>

          <div style={{
            marginTop: 4,
            padding: "10px 14px", background: "var(--bg-2)",
            fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5,
            borderInlineStart: "3px solid var(--ad-gold-600)",
          }}>
            <strong style={{ color: "var(--fg-1)" }}>European waterfall:</strong>{" "}
            (1) <em>return of capital</em> pro-rata to whoever contributed cash, (2) <em>compounded preferred return</em> pro-rata, (3) <em>performance fee</em> — {fpFsidebar(fund.promoteSplit)} to GP, {fpFsidebar(1 - (+fund.promoteSplit || 0))} pro-rata to investors (LP + Dev only — GP is rewarded via promote).
          </div>
        </>
      )}
    </Section>
  );
}

// local % formatter (avoid leaking into Feas; we already have one but want a tiny inline)
function fpFsidebar(v) {
  if (v === null || v === undefined || isNaN(v)) return "—%";
  return `${(v * 100).toFixed(0)}%`;
}

function EquitySplitBar({ lp, dev, gp }) {
  const total = (+lp || 0) + (+dev || 0) + (+gp || 0);
  const norm = total > 0 ? 1 / total : 0;
  const lpW = (+lp || 0) * norm * 100;
  const devW = (+dev || 0) * norm * 100;
  const gpW = (+gp || 0) * norm * 100;
  return (
    <div style={{ marginBottom: 6, marginTop: -2 }}>
      <div style={{ display: "flex", height: 14, border: "1px solid var(--border-1)" }}>
        <div title="LP" style={{ width: `${lpW}%`, background: "var(--ad-navy-700)" }} />
        <div title="Developer" style={{ width: `${devW}%`, background: "var(--ad-sand-700)" }} />
        <div title="GP" style={{ width: `${gpW}%`, background: "var(--ad-gold-600)" }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 4,
        fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)",
      }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--ad-navy-700)", marginRight: 4 }} />LP {(lpW).toFixed(0)}%</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--ad-sand-700)", marginRight: 4 }} />Dev {(devW).toFixed(0)}%</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--ad-gold-600)", marginRight: 4 }} />GP {(gpW).toFixed(0)}%</span>
      </div>
      {Math.abs(total - 1) > 0.005 && (
        <div style={{ fontSize: 10, color: "var(--ad-danger)", marginTop: 4 }}>
          Splits sum to {(total * 100).toFixed(1)}% — adjust to 100%.
        </div>
      )}
    </div>
  );
}

/* ---------- Sidebar ---------- */

function Sidebar({ input, setInput }) {
  // Declared first: addComp below closes over it, and several land figures
  // depend on it.
  const isLeasehold = (input.landTenure || "own") === "lease";
  const upd = (k, v) => setInput({ ...input, [k]: v });
  const updComp = (idx, c) => {
    const arr = input.components.slice();
    arr[idx] = c;
    upd("components", arr);
  };
  const removeComp = (idx) => {
    const arr = input.components.slice();
    arr.splice(idx, 1);
    upd("components", arr);
  };
  const addComp = (kind) => {
    const preset = COMPONENT_PRESETS[kind];
    // Auto-number duplicates: "Villa", "Villa 2", "Villa 3"...
    // Name in the ACTIVE language — the name lives in an <input>, which the
    // i18n layer can't translate on render (it only handles children/props).
    const baseLabel = (window.I18N ? I18N.t(preset.label) : preset.label);
    const sameKindCount = input.components.filter(c => c.kind === kind).length;
    const name = sameKindCount === 0 ? baseLabel : `${baseLabel} ${sameKindCount + 1}`;
    const newComp = {
      id: Math.random().toString(36).slice(2, 9),
      kind,
      name,
      mode: preset.mode,
      enabled: true,
      allocationPct: 0.10,
      // Massing — default to FAR methodology for back-compat
      massingMode: "far",
      far: preset.far,
      landCoveragePct: preset.landCoveragePct,
      maxFloors: preset.maxFloors,
      upperFloorCoveragePct: preset.upperFloorCoveragePct,
      lastFloorPct: preset.lastFloorPct,
      // Basement (off by default)
      hasBasement: false,
      basementCoveragePct: 0.40,
      basementCostPerSqm: preset.basementCostPerSqm,
      // Construction + site work
      costPerSqmGFA: preset.costPerSqmGFA,
      siteWorkPct: preset.siteWorkPct,
      efficiency: preset.efficiency,
      revenueBasis: preset.basis,
      avgUnitSize: preset.avgUnitSize,
      keys: preset.keys,
      pricePerSqm: preset.pricePerSqm,
      pricePerUnit: preset.pricePerUnit,
      pricePerKey: preset.pricePerKey,
      rentPerSqmYr: preset.rentPerSqmYr,
      rentPerUnitYr: preset.rentPerUnitYr,
      adr: preset.adr,
      occupancy: preset.occupancy,
      initialOccupancy: preset.initialOccupancy ?? 0.30,
      yearsToStabilization: preset.yearsToStabilization ?? 1,
      opexPct: preset.opexPct,
      exitCapRate: preset.exitCapRate,
      salesPeriodMonths: preset.salesPeriodMonths,
      operatingPeriodMonths: preset.operatingPeriodMonths,
    };
    /* On leased land a sale preset cannot arrive set to sell — the project has
       no title to pass on. It comes in leasable instead, with the fields
       leasing needs, so the building type stays available and only the purpose
       is constrained. */
    if (isLeasehold && newComp.mode === "sale") {
      newComp.mode = "lease";
      if (newComp.rentPerSqmYr == null) newComp.rentPerSqmYr = 1200;
      if (newComp.rentPerUnitYr == null) newComp.rentPerUnitYr = 85000;
      if (newComp.occupancy == null) newComp.occupancy = 0.85;
      if (newComp.opexPct == null) newComp.opexPct = 0.30;
      if (newComp.exitCapRate == null) newComp.exitCapRate = 0.075;
      if (newComp.operatingPeriodMonths == null) newComp.operatingPeriodMonths = 60;
    }

    // Mixed use: deep-copy the preset's sub-components and give each a fresh
    // id. Sharing the preset array by reference would make every mixed-use
    // building on the project edit the same subs.
    if (preset.subs) {
      newComp.subs = preset.subs.map(s => Object.assign({}, s, {
        id: Math.random().toString(36).slice(2, 9),
        enabled: true,
        name: (window.I18N ? I18N.t(s.name) : s.name),
      }));
    }
    upd("components", [...input.components, newComp]);
  };

  const totalAllocationPct = input.components.filter(c => c.enabled).reduce((s, c) => s + (+c.allocationPct || 0), 0);
  const hasComponents = input.components.filter(c => c.enabled).length > 0;
  // Tenure (isLeasehold declared at the top of Sidebar): bought outright, or
  // held on a ground lease with no title and no RETT.
  const totalLandCost = isLeasehold ? 0 : (input.landArea || 0) * (input.landPricePerSqm || 0);
  const landTransferFees = totalLandCost * (isLeasehold ? 0 : (input.landTransferFeesPct || 0));
  const annualGroundRent = isLeasehold
    ? (input.landArea || 0) * (input.landRentPerSqmYr || 0) : 0;

  /* Anything still set to sell while the land is only leased — plain
     components and individual spaces inside a mixed-use building alike. */
  const saleOnLeasedLand = [];
  (input.components || []).forEach(c => {
    if (!c || !c.enabled) return;
    if (Array.isArray(c.subs)) {
      c.subs.forEach(s => {
        if (s && s.enabled !== false && s.mode === "sale") {
          saleOnLeasedLand.push(`${c.name} — ${s.name}`);
        }
      });
    } else if (c.mode === "sale") {
      saleOnLeasedLand.push(c.name);
    }
  });
  const totalLandIn = totalLandCost + landTransferFees;
  const isRawLand = input.landType === "raw";
  // Clamped to [0,1] as the engine does, so an out-of-range entry cannot make
  // this panel's net developable area disagree with what the engine allocates.
  const developablePct = isRawLand
    ? Math.max(0, Math.min(1, input.developablePct ?? 0.70)) : 1;
  const netDevelopableArea = (input.landArea || 0) * developablePct;
  const landInfraCost = (input.landArea || 0) * (input.landInfraCostPerSqm || 0);

  return (
    <aside style={{
      gridArea: "side",
      borderRight: "1px solid var(--border-1)",
      background: "var(--bg-1)",
      overflowY: "auto",
      minWidth: 0,
    }}>
      {/* Project header — styled to match the collapsible section bands */}
      <div style={{ padding: "14px 24px 18px", borderBottom: "1px solid var(--border-1)", borderInlineStart: "3px solid var(--ad-gold-500)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginInlineStart: -3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, lineHeight: 1,
              padding: "4px 6px", borderRadius: 3, flexShrink: 0,
              background: "var(--ad-navy-800)", color: "#FFFFFF",
            }}>01</span>
            <span style={{
              fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--fg-1)",
            }}>Project</span>
          </span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("feas:reset"))}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "none", border: "1px solid var(--border-1)", cursor: "pointer",
              color: "var(--fg-3)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "4px 9px", fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>↺</span>
            Reset
          </button>
        </div>
        <div className="editable-name-wrap" style={{ marginTop: 8, marginBottom: 14 }} title="Click to rename">
          <input
            className="field-input editable-name"
            style={{ fontSize: 18, fontWeight: 600, padding: "6px 2px", color: "var(--fg-1)", letterSpacing: "-0.01em", flex: 1 }}
            value={input.projectName}
            onChange={e => upd("projectName", e.target.value)}
            placeholder="Name this opportunity…"
          />
          <svg className="pencil" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </div>
        <Row cols={2}>
          <Field label="Location" type="text" value={input.location} onChange={v => upd("location", v)} mono={false} />
          <Field label="Project type" type="text" value={input.projectType} onChange={v => upd("projectType", v)} mono={false} placeholder="e.g. Mixed-use, Residential…" />
        </Row>
      </div>

      {/* 02 Land */}
      <Section title="Land" n="02">
        <Row cols={2}>
          <Field label="Land area" suffix="m²" value={input.landArea} onChange={v => upd("landArea", v)} step={1000} />
          <div />
        </Row>

        {/* Tenure: the land is either bought or leased. */}
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6, marginTop: 4 }}>Land tenure</div>
        <div style={{ display: "flex", gap: 0, marginBottom: 10, border: "1px solid var(--border-1)" }}>
          {[
            { key: "own",   label: "Acquisition", blurb: "Bought outright" },
            { key: "lease", label: "Lease",       blurb: "Ground rent, no title" },
          ].map(opt => {
            const active = (input.landTenure || "own") === opt.key;
            return (
              <button key={opt.key} onClick={() => upd("landTenure", opt.key)} style={{
                flex: 1, padding: "8px 10px", cursor: "pointer", textAlign: "left",
                background: active ? "var(--ad-navy-900)" : "var(--bg-1)",
                color: active ? "white" : "var(--fg-2)",
                border: "none", borderRight: opt.key === "own" ? "1px solid var(--border-1)" : "none",
                fontFamily: "inherit",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: 9.5, opacity: 0.75, marginTop: 1 }}>{opt.blurb}</div>
              </button>
            );
          })}
        </div>

        {/* Purchase inputs — hidden entirely on a lease, where nothing is
            bought and no transfer tax falls due. */}
        {!isLeasehold && (
          <Row cols={2}>
            <Field label="Land price" suffix="SAR/m²" value={input.landPricePerSqm} onChange={v => upd("landPricePerSqm", v)} step={50} />
            <Field label="Total land cost" suffix="SAR" value={Math.round(totalLandCost)} onChange={() => {}} disabled />
            <PctField label="Transfer / gov fees" value={input.landTransferFeesPct} onChange={v => upd("landTransferFeesPct", v)} hint="On land cost" />
            <div />
          </Row>
        )}

        {isLeasehold && (
          <>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6, marginTop: 4 }}>Ground rent</div>
            <Row cols={2}>
              <Field label="Land rent" suffix="SAR/m²·yr" value={input.landRentPerSqmYr} onChange={v => upd("landRentPerSqmYr", v)} step={25} hint="Annual ground rent" tip="Annual rent per m² of plot. Paid in advance at the start of each year, and it runs until the project exits — not to the end of the horizon." />
              <Field label="Rent review" suffix="years" value={input.landRentEscalationYears ?? 5} onChange={v => upd("landRentEscalationYears", v)} step={1} min={1} hint="Escalates every" tip="How often the rent steps up. With a five-year review the first five years sit at the opening rate and the first uplift lands in year six." />
              <PctField label="Escalation" value={input.landRentEscalationPct} onChange={v => upd("landRentEscalationPct", v)} hint="At each review" step={0.5} />
              <Field label="First year rent" suffix="SAR" value={Math.round(annualGroundRent)} onChange={() => {}} disabled />
            </Row>
            <div style={{
              fontSize: 11, lineHeight: 1.45, padding: "7px 9px", marginBottom: 10,
              border: "1px solid var(--border-1)", background: "var(--bg-2)", color: "var(--fg-3)",
            }}>
              Ground rent is an operating cost, so it does not count toward the debt facility — a lender advances against build cost, not rent. Expect a smaller facility than buying the land.
            </div>
          </>
        )}

        {/* Land condition: net (serviced) vs raw (needs infrastructure) */}
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6, marginTop: 4 }}>Land condition</div>
        <div style={{ display: "flex", gap: 0, marginBottom: 10, border: "1px solid var(--border-1)" }}>
          {[
            { key: "net", label: "Net / serviced", blurb: "Ready to build" },
            { key: "raw", label: "Raw / unserviced", blurb: "Incl. roads & utilities" },
          ].map(opt => {
            const active = (input.landType || "net") === opt.key;
            return (
              <button key={opt.key} onClick={() => upd("landType", opt.key)} style={{
                flex: 1, padding: "8px 10px", cursor: "pointer", textAlign: "left",
                background: active ? "var(--ad-navy-900)" : "var(--bg-1)",
                color: active ? "white" : "var(--fg-2)",
                border: "none", borderRight: opt.key === "net" ? "1px solid var(--border-1)" : "none",
                fontFamily: "inherit",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: 9.5, opacity: 0.75, marginTop: 1 }}>{opt.blurb}</div>
              </button>
            );
          })}
        </div>

        {isRawLand && (
          <Row cols={2}>
            <PctField label="Developable share" value={input.developablePct ?? 0.70} onChange={v => upd("developablePct", v)} hint="Net of roads, utilities & open space" tip="On raw land, the share of the plot left to build on once roads, utilities and public open space are taken out." />
            <Field label="Net developable" suffix="m²" value={Math.round(netDevelopableArea)} onChange={() => {}} disabled />
          </Row>
        )}

        <Row cols={2}>
          <Field label="Infrastructure cost" suffix="SAR/m²" value={input.landInfraCostPerSqm ?? 0} onChange={v => upd("landInfraCostPerSqm", v)} step={25} hint={isRawLand ? "Roads & utilities, on gross land" : "Optional — on gross land"} />
          <Field label="Total infrastructure" suffix="SAR" value={Math.round(landInfraCost)} onChange={() => {}} disabled />
        </Row>
        <div style={{
          padding: "10px 14px", background: "var(--ad-navy-50)",
          display: "flex", justifyContent: "space-between", fontSize: 12,
        }}>
          <span style={{ color: "var(--fg-2)" }}>Total land in (cost + fees)</span>
          <span className="tabnum" style={{ color: "var(--ad-navy-900)", fontWeight: 600 }}>
            {Feas.formatCurrency(totalLandIn)}
          </span>
        </div>
      </Section>

      {/* 03 Components */}
      <Section
        title="Program — Components"
        n="03"
        alarm={totalAllocationPct > 1.001 ? "OVERALLOCATED" : null}
      >
        {/* Nothing can be sold on land the project only leases, so anything
            already set to sell is flagged rather than silently rewritten — the
            user decides whether to convert it or drop it.

            Each line below is its own string child so the i18n layer can
            translate it; interpolating the names into one sentence would leave
            fragments no dictionary key matches. */}
        {isLeasehold && saleOnLeasedLand.length > 0 && (
          <div style={{
            fontSize: 11, lineHeight: 1.5, padding: "9px 11px", marginBottom: 10,
            border: "1px solid var(--ad-danger)", background: "var(--bg-2)", color: "var(--ad-danger)",
          }}>
            <div style={{ fontWeight: 700 }}>Units cannot be sold on leased land.</div>
            <div style={{ marginTop: 4 }}>These are still set to sell and are being counted as sales revenue:</div>
            <div style={{ marginTop: 2, fontWeight: 600, color: "var(--fg-1)" }}>{saleOnLeasedLand.join(" · ")}</div>
            <div style={{ marginTop: 4 }}>Switch them to leasable, remove them, or buy the land instead.</div>
          </div>
        )}

        <ComponentPicker
          onPick={addComp}
          hasComponents={hasComponents}
          landArea={netDevelopableArea}
          isLeasehold={isLeasehold}
        />

        {hasComponents ? (
          <>
            <AllocationPanel
              components={input.components}
              totalLand={netDevelopableArea}
              onChange={(i, pct) => updComp(i, { ...input.components[i], allocationPct: pct })}
            />
            <AllocationAlarm
              totalPct={totalAllocationPct}
              totalLand={netDevelopableArea}
              hasComponents={hasComponents}
              isRawLand={isRawLand}
            />
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", margin: "16px 0 8px" }}>
              {/* Whole words, not a split "component"+"s" — the trailing
                  suffix can't be translated on its own. */}
              Your program · {input.components.length} {input.components.length === 1 ? "component" : "components"}
            </div>
            <div>
              {input.components.map((c, i) => (
                <ComponentEditor
                  key={c.id}
                  comp={c}
                  onChange={(c2) => updComp(i, c2)}
                  onRemove={() => removeComp(i)}
                  totalLandArea={netDevelopableArea}
                  landPricePerSqm={input.landPricePerSqm || 0}
                  isLeasehold={isLeasehold}
                />
              ))}
            </div>
          </>
        ) : (
          <ComponentEmptyState />
        )}
      </Section>

      {/* 04 Timing */}
      <Section title="Project Timing" n="04">
        <Row cols={2}>
          <Field label="Pre-design" suffix="months" value={input.predesignMonths} onChange={v => upd("predesignMonths", v)} hint="Concept → DD → tender" />
          <Field label="Construction" suffix="months" value={input.constructionMonths} onChange={v => upd("constructionMonths", v)} />
          <Field label="Pre-sales start" suffix="month" value={input.preSalesStartMonth} onChange={v => upd("preSalesStartMonth", v)} hint="From kickoff" />
          <AutoHorizonDisplay input={input} />
        </Row>
        <div style={{ padding: "10px 14px", background: "var(--bg-2)", fontSize: 11, color: "var(--fg-3)" }}>
          Operating period &amp; exit cap rate are set per-component above. Horizon is auto-sized from your timing &amp; hold assumptions.
        </div>
      </Section>

      {/* 05 General Costs */}
      <Section title="General Costs" n="05">
        <Row cols={2}>
          <PctField label="Soft costs" value={input.softCostsPct} onChange={v => upd("softCostsPct", v)} hint="Of construction + site" tip="Everything that is not physical construction: design and engineering fees, project management, permits, surveys and legal. Usually 10–15% of construction." />
          <PctField label="Contingency" value={input.contingencyPct} onChange={v => upd("contingencyPct", v)} hint="Of construction + soft" tip="A reserve for the unknowns — variations, overruns and surprises on site. 5% is a normal minimum on a well-defined scheme." />
          <PctField label="Marketing" value={input.marketingPct} onChange={v => upd("marketingPct", v)} hint="Of sales revenue" />
          <PctField label="Sales commission" value={input.salesCommissionPct} onChange={v => upd("salesCommissionPct", v)} hint="Of sales revenue" />
          <PctField label="Gov / sales fees" value={input.govFeesPct} onChange={v => upd("govFeesPct", v)} hint="On sales revenue" />
        </Row>
      </Section>

      {/* 06 Financing */}
      <Section title="Financing" n="06">
        <Row cols={2}>
          <PctField label="LTC" value={input.ltc} onChange={v => upd("ltc", v)} hint="Loan to cost" tip="Loan to Cost — how much of total project cost the lender funds. 60% LTC means debt covers 60% and equity must fund the remaining 40%." />
          <PctField label="Interest" value={input.interestRate} onChange={v => upd("interestRate", v)} hint="Annual" />
        </Row>
        <div style={{
          padding: "10px 14px", background: "var(--bg-2)",
          fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5,
          borderLeft: "3px solid var(--ad-navy-700)",
        }}>
          <strong style={{ color: "var(--fg-1)" }}>Funding order:</strong>{" "}
          each month's income (e.g. off-plan sales) covers that month's costs first; any shortfall is drawn from the facility (interest capitalises only when no cash can pay it), and equity covers the remainder. Surplus cash pays interest and sweeps the loan at any time — repaid amounts can be redrawn — and equity takes distributions only when no further contributions are needed.
        </div>
      </Section>

      {/* 07 Valuation */}
      <Section title="Valuation" n="07">
        <Row cols={2}>
          <PctField
            label="Hurdle / discount rate"
            value={input.discountRate}
            onChange={(v) => upd("discountRate", v)}
            hint="Used for NPV and the IRR hurdle check"
          />
          <div />
        </Row>
        <div style={{ padding: "10px 14px", background: "var(--bg-2)", fontSize: 11, color: "var(--fg-3)" }}>
          The hurdle is the cost-of-equity benchmark. Equity IRR above this line clears the gate; NPV is discounted at this rate. Component-level exit cap rates live with each program component above.
        </div>
      </Section>

      {/* 08 Fund Structure */}
      <FundStructureSection input={input} upd={upd} />

      <div style={{
        padding: "20px 24px", borderTop: "1px solid var(--border-1)",
        display: "flex", gap: 8, background: "var(--bg-2)",
      }}>
        <button className="btn btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("feas:export"))}>
          Export PDF
        </button>
        <button className="btn" onClick={() => window.dispatchEvent(new CustomEvent("feas:reset"))}>
          Reset
        </button>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
window.COMPONENT_PRESETS = COMPONENT_PRESETS;
