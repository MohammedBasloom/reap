/* =============================================================
   Chart components — pure SVG, no libraries.
   ============================================================= */

const { useState, useMemo, useRef, useEffect } = React;

/* ---------- Drawing at the real width ----------
   These charts used to be laid out on a fixed 800-unit canvas and stretched to
   whatever box they were given. Stretching a drawing stretches its lettering
   with it, so in a 530px card every axis figure and every label was squeezed
   to two-thirds of its width, and in a wide one pulled fat.

   Each chart now measures the box it is in and lays itself out in those
   pixels, so a unit in the drawing is a pixel on the screen and text is the
   size it says it is. `preserveAspectRatio="none"` stays on the drawings as
   the fallback only: before the first measurement, and on a printed dashboard
   (whose width the page cannot measure in advance), the chart still fills its
   box the way it always did rather than leaving a gap. */
const MIN_W = 140;
function useChartWidth(fallback = 800) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // clientWidth, not getBoundingClientRect: the report scales its pages to
    // fit the window, and the chart must be laid out in the page's own pixels.
    // Below MIN_W there is no room to lay a chart out at all — the margins
    // alone are wider than the box and bar widths go negative. A box that
    // small is drawn at MIN_W and squeezed into place, as every size once was.
    const read = () => {
      const cw = Math.max(el.clientWidth, MIN_W);
      if (el.clientWidth > 0) setW(prev => (Math.abs(prev - cw) < 0.5 ? prev : cw));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* Width of a piece of chart lettering, in pixels. Now that text is drawn at
   its own size, anything that has to fit — a label in its slot, a figure
   inside its bar — needs the real width, and a per-character guess is wrong
   for Arabic in one direction and for capitals in the other. */
let _measureCtx = null, _measureFamily = null;
function textW(s, px = 10, weight = 400) {
  const str = String(s ?? "");
  try {
    if (!_measureCtx) _measureCtx = document.createElement("canvas").getContext("2d");
    if (!_measureFamily) _measureFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
    _measureCtx.font = `${weight} ${px}px ${_measureFamily}`;
    return _measureCtx.measureText(str).width;
  } catch (e) {
    return str.length * px * 0.56;
  }
}
// Shorten a label to a width, ending on an ellipsis.
function fitText(s, maxPx, px = 10, weight = 400) {
  let str = String(s ?? "");
  if (textW(str, px, weight) <= maxPx) return str;
  while (str.length > 1 && textW(str + "…", px, weight) > maxPx) str = str.slice(0, -1);
  return str.trimEnd() + "…";
}
// Translate before measuring or cutting: a label cut in English no longer
// matches its dictionary entry and would be left in English.
const trLabel = (s) => (window.I18N && typeof window.I18N.t === "function" ? window.I18N.t(s) : s);
// Show every n-th axis label so neighbours never run into each other.
const labelStep = (slotPx, needPx) => Math.max(1, Math.ceil(needPx / Math.max(1, slotPx)));

/* ---------- StackedArea (cash flow S-curve) ---------- */
function StackedArea({ months, series, height = 220, formatY, cumulativeValues, cumulativeOnPrimary }) {
  // series: [{ label, color, values: [n], stack: "neg" | "pos" }]
  const [boxRef, W] = useChartWidth();
  const H = height;
  const padL = 56, padR = 16, padT = 12, padB = 28;
  const n = months.length;

  // Build cumulative stacks per month (positive and negative separately)
  const posStacks = months.map(() => 0);
  const negStacks = months.map(() => 0);
  const seriesWithBaseline = series.map(s => {
    const out = { ...s, points: [] };
    for (let i = 0; i < n; i++) {
      const v = s.values[i] || 0;
      if (v >= 0) {
        const base = posStacks[i];
        out.points.push({ base, top: base + v });
        posStacks[i] = base + v;
      } else {
        const base = negStacks[i];
        out.points.push({ base, top: base + v });
        negStacks[i] = base + v;
      }
    }
    return out;
  });

  // Cumulative line — by default the running sum of the plotted series;
  // callers can pass `cumulativeValues` to plot an engine-computed series
  // instead (e.g. true equity cashflow, avoiding P&L/cash double counts).
  const cumulative = [];
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += cumulativeValues ? (cumulativeValues[i] || 0) : series.reduce((s, sr) => s + (sr.values[i] || 0), 0);
    cumulative.push(cum);
  }

  let yMax = Math.max(...posStacks, 1);
  let yMin = Math.min(...negStacks, -1);
  // With `cumulativeOnPrimary` the line shares the labeled axis (honest
  // reading against the ticks); otherwise it keeps its own fitted scale.
  if (cumulativeOnPrimary) {
    yMax = Math.max(yMax, ...cumulative, 0);
    yMin = Math.min(yMin, ...cumulative, 0);
  }
  const yRange = yMax - yMin;
  const x = (i) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - yMin) / yRange) * (H - padT - padB);

  const cumMax = Math.max(...cumulative, 0);
  const cumMin = Math.min(...cumulative, 0);
  const cumRange = (cumMax - cumMin) || 1;
  const yCum = cumulativeOnPrimary
    ? y
    : (v) => padT + (1 - (v - cumMin) / cumRange) * (H - padT - padB);

  // Y ticks
  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const v = yMin + (yRange * i) / tickCount;
    yTicks.push({ v, y: y(v) });
  }

  // Hover tooltip on the cumulative line — quiet by design: nothing is
  // drawn until the pointer is over the chart.
  const [hoverI, setHoverI] = React.useState(null);
  const fmtCumVal = (v) => {
    const a = Math.abs(v);
    const s = v < 0 ? "−" : "";
    if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `${s}${(a / 1e3).toFixed(0)}K`;
    return `${s}${a.toFixed(0)}`;
  };
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    let i = Math.round(((sx - padL) / (W - padL - padR)) * (n - 1));
    if (i < 0) i = 0;
    if (i > n - 1) i = n - 1;
    setHoverI(i);
  };

  return (
    <div ref={boxRef} style={{ width: "100%" }}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }} aria-label="Stacked cashflow"
         onMouseMove={onMove} onMouseLeave={() => setHoverI(null)}>
      {/* Y grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="var(--border-1)" strokeWidth="0.5" strokeDasharray="2 3" />
          <text x={padL - 8} y={t.y + 3} textAnchor="end" fontSize="10" fill="var(--fg-3)" style={{ fontVariantNumeric: "tabular-nums" }}>{formatY ? formatY(t.v) : t.v.toFixed(0)}</text>
        </g>
      ))}
      {/* Zero line */}
      <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--ad-navy-300)" strokeWidth="1" />

      {/* Stacked areas */}
      {seriesWithBaseline.map((s, si) => {
        const top = s.points.map((p, i) => `${x(i)},${y(p.top)}`).join(" ");
        const bot = s.points.map((p, i) => `${x(i)},${y(p.base)}`).reverse().join(" ");
        return <polygon key={si} points={`${top} ${bot}`} fill={s.color} opacity={s.opacity || 0.95} />;
      })}

      {/* Cumulative line on secondary axis */}
      <polyline
        fill="none"
        stroke="var(--ad-navy-900)"
        strokeWidth="1.5"
        points={cumulative.map((v, i) => `${x(i)},${yCum(v)}`).join(" ")}
      />

      {/* X axis labels */}
      {[0, Math.floor(n / 4), Math.floor(n / 2), Math.floor(3 * n / 4), n - 1].map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--fg-3)">M{i}</text>
      ))}

      {/* Cumulative-line tooltip: guideline + dot + compact value chip */}
      {hoverI !== null && (() => {
        const hx = x(hoverI);
        const hy = yCum(cumulative[hoverI]);
        const label = `M${hoverI} · ${fmtCumVal(cumulative[hoverI])}`;
        const flip = hx > W - 130;
        const chipY = Math.min(Math.max(hy, padT + 12), H - padB - 10);
        return (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={padT} y2={H - padB} stroke="var(--ad-navy-300)" strokeWidth="0.6" strokeDasharray="3 3" />
            <circle cx={hx} cy={hy} r="3.5" fill="var(--ad-navy-900)" stroke="#FFFFFF" strokeWidth="1.2" />
            <g transform={`translate(${flip ? hx - 8 : hx + 8}, ${chipY})`}>
              <rect x={flip ? -98 : 0} y={-10} width="98" height="18" rx="3" fill="var(--ad-navy-900)" opacity="0.92" />
              <text x={flip ? -49 : 49} y={3} textAnchor="middle" fontSize="10" fill="#FFFFFF" style={{ fontVariantNumeric: "tabular-nums" }}>{label}</text>
            </g>
          </g>
        );
      })()}
    </svg>
    </div>
  );
}

/* ---------- StackedBars (annual stacked bars + monthly cumulative line) ---------- */
function StackedBars({ months, series, height = 220, formatY, bucket = 12, cumulativeValues, cumulativeOnPrimary }) {
  // series: [{ label, color, values: [n monthly] }] — bars aggregate the
  // monthly values into `bucket`-month groups (years by default); the
  // cumulative net line keeps monthly resolution on its own scale.
  const [boxRef, W] = useChartWidth();
  const H = height;
  const padL = 56, padR = 16, padT = 12;
  const n = months.length;
  const nb = Math.max(1, Math.ceil(n / bucket));

  const agg = series.map(s => {
    const vals = Array(nb).fill(0);
    for (let i = 0; i < n; i++) vals[Math.floor(i / bucket)] += (s.values[i] || 0);
    return { ...s, vals };
  });

  const pos = Array(nb).fill(0), neg = Array(nb).fill(0);
  const withBase = agg.map(s => {
    const pts = s.vals.map((v, bi) => {
      if (v >= 0) { const b = pos[bi]; pos[bi] = b + v; return { base: b, top: b + v }; }
      const b = neg[bi]; neg[bi] = b + v; return { base: b, top: b + v };
    });
    return { ...s, pts };
  });
  // A total printed under a bar needs a line of its own above the year
  // labels, or the two sit on top of each other at the foot of the chart.
  const padB = neg.some(v => v < 0) ? 40 : 28;

  // Optional cumulative line (monthly resolution). Only drawn when the
  // caller passes `cumulativeValues` — the revenue charts stay bars-only.
  let cumulative = null;
  if (cumulativeValues) {
    cumulative = [];
    let c = 0;
    for (let i = 0; i < n; i++) { c += cumulativeValues[i] || 0; cumulative.push(c); }
  }

  let yMax = Math.max(...pos, 1);
  let yMin = Math.min(...neg, 0);
  if (cumulative && cumulativeOnPrimary) {
    yMax = Math.max(yMax, ...cumulative, 0);
    yMin = Math.min(yMin, ...cumulative, 0);
  }
  const yRange = (yMax - yMin) || 1;
  const plotW = W - padL - padR;
  const slotW = plotW / nb;
  const barW = Math.min(slotW * 0.6, 46);
  const xSlot = (bi) => padL + bi * slotW + slotW / 2;
  const y = (v) => padT + (1 - (v - yMin) / yRange) * (H - padT - padB);

  const yTicks = [];
  for (let i = 0; i <= 4; i++) { const v = yMin + (yRange * i) / 4; yTicks.push({ v, y: y(v) }); }

  const fmtV = (v) => (formatY ? formatY(v) : v.toFixed(0));
  const labelEvery = labelStep(slotW, textW(`Y${nb}`, 10) + 6);

  // The totals above and below the bars. At their own size they do not always
  // fit a slot each, so where two would run together the larger figure keeps
  // its label and the smaller one gives way: the peaks are what a reader
  // looks for first.
  const roomFor = (vals) => {
    const show = new Set(), taken = [];
    vals.map((v, bi) => bi).filter(bi => vals[bi] !== 0)
      .sort((a, b) => Math.abs(vals[b]) - Math.abs(vals[a]))
      .forEach(bi => {
        const half = textW(fmtV(vals[bi]), 9, 600) / 2 + 2;
        const c = xSlot(bi);
        if (taken.every(([a, b]) => c + half <= a || c - half >= b)) { taken.push([c - half, c + half]); show.add(bi); }
      });
    return show;
  };
  const showPos = roomFor(pos), showNeg = roomFor(neg);

  return (
    <div ref={boxRef}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }} aria-label="Stacked bars">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="var(--border-1)" strokeWidth="0.5" strokeDasharray="2 3" />
          <text x={padL - 8} y={t.y + 3} textAnchor="end" fontSize="10" fill="var(--fg-3)" style={{ fontVariantNumeric: "tabular-nums" }}>{formatY ? formatY(t.v) : t.v.toFixed(0)}</text>
        </g>
      ))}
      <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--ad-navy-300)" strokeWidth="1" />

      {withBase.map((s, si) => (
        <g key={si}>
          {s.pts.map((p, bi) => {
            if (p.top === p.base) return null;
            const yTop = y(Math.max(p.base, p.top));
            const h = Math.abs(y(p.base) - y(p.top));
            return <rect key={bi} x={xSlot(bi) - barW / 2} y={yTop} width={barW} height={h} fill={s.color} opacity={s.opacity || 0.95} />;
          })}
        </g>
      ))}

      {cumulative && (() => {
        const xm = (i) => padL + ((i + 0.5) / n) * plotW;
        const cumMax = Math.max(...cumulative, 0);
        const cumMin = Math.min(...cumulative, 0);
        const cumRange = (cumMax - cumMin) || 1;
        const yC = cumulativeOnPrimary ? y : (v) => padT + (1 - (v - cumMin) / cumRange) * (H - padT - padB);
        return (
          <polyline
            fill="none"
            stroke="var(--ad-navy-900)"
            strokeWidth="1.5"
            points={cumulative.map((v, i) => `${xm(i)},${yC(v)}`).join(" ")}
          />
        );
      })()}

      {/* Data labels: total of the positive stack above each bar,
          total of the negative stack below it */}
      {pos.map((v, bi) => v > 0 && showPos.has(bi) ? (
        <text key={`p${bi}`} x={xSlot(bi)} y={y(v) - 5} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--fg-2)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {fmtV(v)}
        </text>
      ) : null)}
      {neg.map((v, bi) => v < 0 && showNeg.has(bi) ? (
        <text key={`n${bi}`} x={xSlot(bi)} y={y(v) + 11} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--ad-danger)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {fmtV(v)}
        </text>
      ) : null)}

      {Array.from({ length: nb }, (_, bi) => bi).filter(bi => bi % labelEvery === 0).map(bi => (
        <text key={bi} x={xSlot(bi)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--fg-3)">Y{bi + 1}</text>
      ))}
    </svg>
    {/* Legend: one swatch per series */}
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "4px 18px", marginTop: 8, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, color: "var(--fg-3)" }}>
      {series.map((s, si) => (
        <span key={si} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, background: s.color, display: "inline-block", flexShrink: 0 }} />
          {s.label}
        </span>
      ))}
      {cumulative && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 15, height: 2, background: "var(--ad-navy-900)", display: "inline-block", flexShrink: 0 }} />
          Cumulative
        </span>
      )}
    </div>
    </div>
  );
}

/* ---------- Bars (horizontal — cost stack, etc.) ---------- */
/* Horizontal bars — one row per item: name, bar, amount.

   Built from ordinary elements, not drawn. It used to be an SVG laid out 800
   units wide and stretched to whatever box it was given, and stretching a
   drawing stretches its lettering with it: in a 530px card every name and every
   figure was squeezed to two-thirds of its width, which is the one thing a
   chart of names and figures cannot afford. Text set as text is always at its
   own size, wraps and aligns like the rest of the page, and prints as text.

   One grid for the whole chart rather than a grid per row, so the name column
   is as wide as the longest name and every bar starts on the same line. The
   amount sits at the end of its bar; the bars are scaled inside the room left
   after the widest amount, so the longest bar's figure still fits on the row.

   Left-to-right in both languages, like every other chart here — the axes do
   not mirror, and a cost chart that ran the other way from the charts beside
   it would be the odd one out. */
function HBars({ data, height = 240, formatV }) {
  // data: [{ label, value, color }]
  const max = Math.max(...data.map(d => d.value), 1);
  const rowH = height / Math.max(1, data.length);
  const barH = Math.max(8, Math.min(18, rowH * 0.5));
  return (
    <div dir="ltr" style={{
      height, display: "grid",
      gridTemplateColumns: "minmax(0, max-content) minmax(0, 1fr)",
      gridAutoRows: "1fr", columnGap: 12, alignItems: "center",
    }}>
      {data.map((d, i) => (
        <React.Fragment key={i}>
          <span style={{
            fontSize: 12, lineHeight: 1.25, color: "var(--fg-2)", textAlign: "end",
            maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{d.label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{
              flex: "0 0 auto", height: barH, minWidth: 2,
              width: `calc((100% - 96px) * ${Math.max(0, d.value) / max})`,
              background: d.color,
              // Bars are backgrounds, and a browser drops backgrounds from a
              // printed page unless told the colour is the content.
              WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
            }} />
            <span className="tabnum" style={{
              fontSize: 12, lineHeight: 1.25, fontWeight: 500, color: "var(--fg-1)", whiteSpace: "nowrap",
            }}>{formatV ? formatV(d.value) : d.value}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---------- Tornado chart ---------- */
function Tornado({ data, height = 280, loKey = "irrLo", hiKey = "irrHi", baseKey = "baseIRR", format, formatBar, baseLabel = "Base IRR" }) {
  // data: [{ label, <loKey>, <hiKey>, <baseKey> }] — defaults read the IRR
  // fields; pass the keys + a formatter to chart any other metric.
  // `formatBar` is the short form used on the bars (currency symbols and
  // bidi marks scramble inside the LTR-forced SVG, so keep them out).
  const fmt = format || ((v) => `${(v * 100).toFixed(1)}%`);
  const fmtBar = formatBar || fmt;
  const [boxRef, W] = useChartWidth();
  const H = height;
  // The name column is as wide as the longest name needs, up to 218px or 40%
  // of the chart, whichever is less — so short names leave the room to the
  // bars, and a narrow card does not spend most of itself on a margin.
  const names = data.map(d => trLabel(d.label));
  const padL = Math.max(80, Math.min(218, W * 0.4, Math.max(0, ...names.map(s => textW(s, 11))) + 24));
  const padR = 64, padT = 16, padB = 26;
  const rowH = (H - padT - padB) / Math.max(1, data.length);
  // Centered on base
  const base = data[0]?.[baseKey] ?? 0;
  let maxDelta = 0;
  data.forEach(d => {
    maxDelta = Math.max(maxDelta, Math.abs(d[loKey] - base), Math.abs(d[hiKey] - base));
  });
  if (maxDelta === 0) maxDelta = 0.01;
  const cx = padL + (W - padL - padR) / 2;
  const scaleX = (W - padL - padR) / 2 / maxDelta;

  return (
    <div ref={boxRef} style={{ width: "100%" }}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {/* Center line */}
      <line x1={cx} x2={cx} y1={padT} y2={H - padB} stroke="var(--ad-navy-700)" strokeWidth="1" />
      <text x={cx} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--fg-3)">{baseLabel} {fmt(base)}</text>

      {data.map((d, i) => {
        const yC = padT + i * rowH + rowH / 2;
        const barH = Math.min(20, rowH * 0.55);
        const vLo = d[loKey];
        const vHi = d[hiKey];
        const downColor = "var(--ad-danger)";
        const upColor = "var(--ad-success)";
        // Bar geometry (signed offsets from the centre line)
        const loW = Math.abs((base - vLo) * scaleX);
        const hiW = Math.abs((vHi - base) * scaleX);
        const loX = Math.min(cx, cx - (base - vLo) * scaleX);
        const hiX = Math.min(cx, cx + (vHi - base) * scaleX);
        const loTxt = fmtBar(vLo);
        const hiTxt = fmtBar(vHi);
        // Each figure belongs to the far end of its own bar: inside it when
        // the bar is wide enough, otherwise just beyond it. "Far end" follows
        // the way the bar actually points — a cost driver's low case is the
        // one that raises the result, so its bar runs right, not left. Placing
        // by which shock it was rather than by which way it points is what
        // used to drop a short bar's figure onto the bar opposite.
        const place = (v, bx, bw, tw) => {
          const dir = v >= base ? 1 : -1;
          const inside = bw >= tw + 12;
          const end = dir > 0 ? bx + bw : bx;
          const tx = inside ? end - dir * 6 : end + dir * 6;
          const leftward = inside ? dir > 0 : dir < 0;   // text runs back from tx
          return { inside, dir, tx, anchor: leftward ? "end" : "start", box: leftward ? [tx - tw, tx] : [tx, tx + tw] };
        };
        const lo = place(vLo, loX, loW, textW(loTxt, 10));
        const hi = place(vHi, hiX, hiW, textW(hiTxt, 10));
        // Both shocks on the same side of base: the two figures would share a
        // spot, so the high one is moved outward past the low one.
        if (lo.box[0] < hi.box[1] && hi.box[0] < lo.box[1]) {
          const tw = hi.box[1] - hi.box[0];
          const tx = hi.dir > 0 ? Math.max(lo.box[1], hiX + hiW) + 6 : Math.min(lo.box[0], hiX) - 6;
          Object.assign(hi, { inside: false, tx, anchor: hi.dir > 0 ? "start" : "end", box: hi.dir > 0 ? [tx, tx + tw] : [tx - tw, tx] });
        }
        return (
          <g key={i}>
            <title>{`${d.label}: ${fmt(vLo)} → ${fmt(vHi)}`}</title>
            <text x={padL - 12} y={yC + 3} textAnchor="end" fontSize="11" fill="var(--fg-2)">{fitText(names[i], padL - 16, 11)}</text>
            {/* down side bar */}
            <rect x={loX} y={yC - barH / 2} width={loW} height={barH}
                  fill={vLo < base ? downColor : upColor} opacity={0.85} />
            {/* up side bar */}
            <rect x={hiX} y={yC - barH / 2} width={hiW} height={barH}
                  fill={vHi > base ? upColor : downColor} opacity={0.85} />
            <text x={lo.tx} y={yC + 3}
                  textAnchor={lo.anchor} fontSize="10"
                  fill={lo.inside ? "#FFFFFF" : "var(--fg-3)"}>{loTxt}</text>
            <text x={hi.tx} y={yC + 3}
                  textAnchor={hi.anchor} fontSize="10"
                  fill={hi.inside ? "#FFFFFF" : "var(--fg-3)"}>{hiTxt}</text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/* ---------- Histogram (Monte Carlo) ---------- */
function Histogram({ values, bins = 28, height = 200, formatX, target, label }) {
  const [boxRef, W] = useChartWidth();
  const H = height;
  const padL = 36, padR = 16, padT = 14, padB = 30;
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = (max - min) || 1;
  const binW = range / bins;
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    let idx = Math.floor((v - min) / binW);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  const maxCount = Math.max(...counts);
  const innerW = W - padL - padR;
  const bw = innerW / bins;

  const x = (i) => padL + i * bw;
  const y = (c) => padT + (1 - c / maxCount) * (H - padT - padB);

  // p10 / p50 / p90 ticks
  const sorted = [...values].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const xVal = (v) => padL + ((v - min) / range) * innerW;

  // P10 / P50 / P90: the marker line stays on its value, but the lettering
  // under it is moved sideways just far enough that neighbours do not run
  // together and the outer two stay inside the drawing.
  const marks = [{ v: p10, lbl: trLabel("P10") }, { v: p50, lbl: trLabel("P50") }, { v: p90, lbl: trLabel("P90") }].map(t => {
    const txt = formatX ? formatX(t.v) : t.v.toFixed(2);
    return { ...t, txt, lx: xVal(t.v), half: Math.max(textW(t.lbl, 9), textW(txt, 9)) / 2 + 3 };
  });
  for (let i = 1; i < marks.length; i++) {
    marks[i].lx = Math.max(marks[i].lx, marks[i - 1].lx + marks[i - 1].half + marks[i].half);
  }
  marks[marks.length - 1].lx = Math.min(marks[marks.length - 1].lx, W - marks[marks.length - 1].half);
  for (let i = marks.length - 2; i >= 0; i--) {
    marks[i].lx = Math.min(marks[i].lx, marks[i + 1].lx - marks[i + 1].half - marks[i].half);
  }
  marks[0].lx = Math.max(marks[0].lx, marks[0].half);

  return (
    <div ref={boxRef} style={{ width: "100%" }}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {counts.map((c, i) => (
        <rect key={i} x={x(i) + 1} y={y(c)} width={bw - 2} height={H - padB - y(c)} fill="var(--ad-navy-600)" opacity={0.85} />
      ))}
      {/* target line */}
      {target !== undefined && target >= min && target <= max && (
        <g>
          <line x1={xVal(target)} x2={xVal(target)} y1={padT} y2={H - padB} stroke="var(--ad-gold-500)" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x={xVal(target)} y={padT - 2} textAnchor="middle" fontSize="9" fill="var(--ad-gold-600)">Hurdle</text>
        </g>
      )}
      {/* p markers */}
      {marks.map((t, i) => (
        <g key={i}>
          <line x1={xVal(t.v)} x2={xVal(t.v)} y1={padT + 4} y2={H - padB} stroke="var(--ad-navy-900)" strokeWidth="0.8" strokeDasharray="2 2" opacity={0.5} />
          <text x={t.lx} y={H - 14} textAnchor="middle" fontSize="9" fill="var(--fg-3)">{t.lbl}</text>
          <text x={t.lx} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--fg-2)" style={{ fontVariantNumeric: "tabular-nums" }}>{t.txt}</text>
        </g>
      ))}
    </svg>
    </div>
  );
}

/* ---------- Waterfall (cost / return breakdown) ---------- */
function Waterfall({ steps, height = 240, formatY }) {
  // steps: [{ label, value, type: "start" | "delta" | "end" }]
  const [boxRef, W] = useChartWidth();
  const H = height;
  const padL = 50, padR = 16, padT = 30, padB = 40;
  let cum = 0;
  const rows = steps.map(s => {
    if (s.type === "start" || s.type === "end") {
      const r = { ...s, from: 0, to: s.value };
      cum = s.value;
      return r;
    }
    const from = cum;
    cum += s.value;
    return { ...s, from, to: cum };
  });
  const allVals = rows.flatMap(r => [r.from, r.to]);
  const yMax = Math.max(...allVals, 0);
  const yMin = Math.min(...allVals, 0);
  const yRange = (yMax - yMin) || 1;
  const innerW = W - padL - padR;
  const bw = innerW / steps.length;
  const x = (i) => padL + i * bw;
  const y = (v) => padT + (1 - (v - yMin) / yRange) * (H - padT - padB);

  // Step names along the bottom. When they are too long for one column each
  // they go on two alternating lines, which gives every name two columns of
  // room; only a name too long even for that is shortened.
  const names = rows.map(r => trLabel(r.label));
  const stagger = names.some(s => textW(s, 10) > bw - 4);
  const nameRoom = stagger ? bw * 2 - 6 : bw - 4;

  return (
    <div ref={boxRef} style={{ width: "100%" }}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--ad-navy-300)" strokeWidth="0.8" />
      {rows.map((r, i) => {
        const top = Math.min(y(r.from), y(r.to));
        const h = Math.abs(y(r.to) - y(r.from));
        const isStart = r.type === "start" || r.type === "end";
        const color = isStart ? "var(--ad-navy-800)" : r.value >= 0 ? "var(--ad-success)" : "var(--ad-danger)";
        return (
          <g key={i}>
            <rect x={x(i) + bw * 0.18} y={top} width={bw * 0.64} height={Math.max(1, h)} fill={color} opacity={isStart ? 1 : 0.75} />
            <text x={x(i) + bw / 2} y={top - 6} textAnchor="middle" fontSize="10" fill="var(--fg-2)" style={{ fontVariantNumeric: "tabular-nums" }}>{formatY ? formatY(r.value) : r.value.toFixed(0)}</text>
            <text x={x(i) + bw / 2} y={stagger ? (i % 2 ? H - 12 : H - 25) : H - 22} textAnchor="middle" fontSize="10" fill="var(--fg-2)">{fitText(names[i], nameRoom, 10)}</text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/* ---------- Donut ---------- */
function Donut({ data, size = 160, thickness = 18 }) {
  // data: [{ label, value, color }]
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const cx = size / 2, cy = size / 2;
  let a0 = -Math.PI / 2;
  const arcs = data.map(d => {
    const a1 = a0 + (d.value / total) * Math.PI * 2;
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
    a0 = a1;
    return { ...d, path };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((a, i) => (
        <path key={i} d={a.path} fill="none" stroke={a.color} strokeWidth={thickness} strokeLinecap="butt" />
      ))}
    </svg>
  );
}

/* ---------- Sparkline ---------- */
function Sparkline({ values, height = 28, color = "var(--ad-navy-800)" }) {
  const W = 100, H = height;
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const r = (max - min) || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / r) * H}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

window.Charts = { StackedArea, StackedBars, HBars, Tornado, Histogram, Waterfall, Donut, Sparkline, useChartWidth, textW, fitText, labelStep };
