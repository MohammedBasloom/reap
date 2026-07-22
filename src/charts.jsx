/* =============================================================
   Chart components — pure SVG, no libraries.
   ============================================================= */

const { useState, useMemo, useRef, useEffect } = React;

/* ---------- StackedArea (cash flow S-curve) ---------- */
function StackedArea({ months, series, height = 220, formatY }) {
  // series: [{ label, color, values: [n], stack: "neg" | "pos" }]
  const W = 800;
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

  const yMax = Math.max(...posStacks, 1);
  const yMin = Math.min(...negStacks, -1);
  const yRange = yMax - yMin;
  const x = (i) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - yMin) / yRange) * (H - padT - padB);

  // Cumulative net line
  const cumulative = [];
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += series.reduce((s, sr) => s + (sr.values[i] || 0), 0);
    cumulative.push(cum);
  }
  const cumMax = Math.max(...cumulative, 0);
  const cumMin = Math.min(...cumulative, 0);
  const cumRange = (cumMax - cumMin) || 1;
  const yCum = (v) => padT + (1 - (v - cumMin) / cumRange) * (H - padT - padB);

  // Y ticks
  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const v = yMin + (yRange * i) / tickCount;
    yTicks.push({ v, y: y(v) });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }} aria-label="Stacked cashflow">
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
    </svg>
  );
}

/* ---------- StackedBars (annual stacked bars + monthly cumulative line) ---------- */
function StackedBars({ months, series, height = 220, formatY, bucket = 12 }) {
  // series: [{ label, color, values: [n monthly] }] — bars aggregate the
  // monthly values into `bucket`-month groups (years by default); the
  // cumulative net line keeps monthly resolution on its own scale.
  const W = 800, H = height;
  const padL = 56, padR = 16, padT = 12, padB = 28;
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

  const yMax = Math.max(...pos, 1);
  const yMin = Math.min(...neg, 0);
  const yRange = (yMax - yMin) || 1;
  const plotW = W - padL - padR;
  const slotW = plotW / nb;
  const barW = Math.min(slotW * 0.6, 46);
  const xSlot = (bi) => padL + bi * slotW + slotW / 2;
  const y = (v) => padT + (1 - (v - yMin) / yRange) * (H - padT - padB);

  const yTicks = [];
  for (let i = 0; i <= 4; i++) { const v = yMin + (yRange * i) / 4; yTicks.push({ v, y: y(v) }); }

  const labelEvery = nb > 14 ? Math.ceil(nb / 12) : 1;

  return (
    <div>
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

      {/* Data labels: total of the positive stack above each bar,
          total of the negative stack below it */}
      {pos.map((v, bi) => v > 0 ? (
        <text key={`p${bi}`} x={xSlot(bi)} y={y(v) - 5} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--fg-2)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatY ? formatY(v) : v.toFixed(0)}
        </text>
      ) : null)}
      {neg.map((v, bi) => v < 0 ? (
        <text key={`n${bi}`} x={xSlot(bi)} y={y(v) + 11} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--ad-danger)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatY ? formatY(v) : v.toFixed(0)}
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
    </div>
    </div>
  );
}

/* ---------- Bars (horizontal — cost stack, etc.) ---------- */
function HBars({ data, height = 240, formatV }) {
  // data: [{ label, value, color }]
  const W = 800;
  const H = height;
  const padL = 180, padR = 80, padT = 10, padB = 10;
  const rowH = (H - padT - padB) / data.length;
  const max = Math.max(...data.map(d => d.value), 1);
  const x = (v) => padL + (v / max) * (W - padL - padR);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {data.map((d, i) => {
        const yC = padT + i * rowH + rowH / 2;
        const barH = rowH * 0.5;
        return (
          <g key={i}>
            <text x={padL - 12} y={yC + 3} textAnchor="end" fontSize="11" fill="var(--fg-2)">{d.label}</text>
            <rect x={padL} y={yC - barH / 2} width={x(d.value) - padL} height={barH} fill={d.color} />
            <text x={x(d.value) + 8} y={yC + 3} fontSize="11" fill="var(--fg-1)" style={{ fontVariantNumeric: "tabular-nums" }}>{formatV ? formatV(d.value) : d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Tornado chart ---------- */
function Tornado({ data, height = 280 }) {
  // data: [{ label, irrLo, irrHi, baseIRR }]
  const W = 800;
  const H = height;
  const padL = 200, padR = 60, padT = 16, padB = 26;
  const rowH = (H - padT - padB) / Math.max(1, data.length);
  // Centered on base
  const base = data[0]?.baseIRR ?? 0;
  let maxDelta = 0;
  data.forEach(d => {
    maxDelta = Math.max(maxDelta, Math.abs(d.irrLo - base), Math.abs(d.irrHi - base));
  });
  if (maxDelta === 0) maxDelta = 0.01;
  const cx = padL + (W - padL - padR) / 2;
  const scaleX = (W - padL - padR) / 2 / maxDelta;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {/* Center line */}
      <line x1={cx} x2={cx} y1={padT} y2={H - padB} stroke="var(--ad-navy-700)" strokeWidth="1" />
      <text x={cx} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--fg-3)">Base IRR {(base * 100).toFixed(1)}%</text>

      {data.map((d, i) => {
        const yC = padT + i * rowH + rowH / 2;
        const barH = Math.min(20, rowH * 0.55);
        const lo = base - d.irrLo;
        const hi = d.irrHi - base;
        const xLo = cx + Math.min(0, (d.irrLo - base) * scaleX);
        const wLo = Math.abs((d.irrLo - base) * scaleX);
        const xHi = cx + Math.min(0, (d.irrHi - base) * scaleX);
        const wHi = Math.abs((d.irrHi - base) * scaleX);
        const downColor = "var(--ad-danger)";
        const upColor = "var(--ad-success)";
        return (
          <g key={i}>
            <text x={padL - 12} y={yC + 3} textAnchor="end" fontSize="11" fill="var(--fg-2)">{d.label}</text>
            {/* down side bar */}
            <rect x={Math.min(cx, cx - (base - d.irrLo) * scaleX)} y={yC - barH / 2}
                  width={Math.abs((base - d.irrLo) * scaleX)} height={barH}
                  fill={d.irrLo < base ? downColor : upColor} opacity={0.85} />
            {/* up side bar */}
            <rect x={Math.min(cx, cx + (d.irrHi - base) * scaleX)} y={yC - barH / 2}
                  width={Math.abs((d.irrHi - base) * scaleX)} height={barH}
                  fill={d.irrHi > base ? upColor : downColor} opacity={0.85} />
            <text x={cx - (base - d.irrLo) * scaleX - 6} y={yC + 3} textAnchor="end" fontSize="10" fill="var(--fg-3)">{(d.irrLo * 100).toFixed(1)}%</text>
            <text x={cx + (d.irrHi - base) * scaleX + 6} y={yC + 3} fontSize="10" fill="var(--fg-3)">{(d.irrHi * 100).toFixed(1)}%</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Histogram (Monte Carlo) ---------- */
function Histogram({ values, bins = 28, height = 200, formatX, target, label }) {
  const W = 800;
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

  return (
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
      {[{ v: p10, lbl: "P10" }, { v: p50, lbl: "P50" }, { v: p90, lbl: "P90" }].map((t, i) => (
        <g key={i}>
          <line x1={xVal(t.v)} x2={xVal(t.v)} y1={padT + 4} y2={H - padB} stroke="var(--ad-navy-900)" strokeWidth="0.8" strokeDasharray="2 2" opacity={0.5} />
          <text x={xVal(t.v)} y={H - 14} textAnchor="middle" fontSize="9" fill="var(--fg-3)">{t.lbl}</text>
          <text x={xVal(t.v)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--fg-2)" style={{ fontVariantNumeric: "tabular-nums" }}>{formatX ? formatX(t.v) : t.v.toFixed(2)}</text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- Waterfall (cost / return breakdown) ---------- */
function Waterfall({ steps, height = 240, formatY }) {
  // steps: [{ label, value, type: "start" | "delta" | "end" }]
  const W = 800;
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

  return (
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
            <text x={x(i) + bw / 2} y={H - 22} textAnchor="middle" fontSize="10" fill="var(--fg-2)">{r.label}</text>
          </g>
        );
      })}
    </svg>
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

window.Charts = { StackedArea, StackedBars, HBars, Tornado, Histogram, Waterfall, Donut, Sparkline };
