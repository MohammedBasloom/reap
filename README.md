# REAP — Real Estate Assessment Platform

Arabian Dyar opportunity-assessment tool: a live real-estate feasibility model
(land, program components, cost stack, financing, fund waterfall) with a
tabbed results dashboard — Summary, Cost, Program & Revenue, Capital,
Cash flow, Returns, Sensitivity, Scenarios, Monte Carlo, Risk, and Fund.

Imported from the claude.ai/design project "Real Estate Platform"
(`Opportunity Assessment.html`).

## Run

The app compiles JSX in the browser (Babel standalone), so it must be served
over HTTP — opening `index.html` directly from disk will not work.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8321
```

Then open <http://localhost:8321/>. Any other static file server pointed at
this folder works too.

## Structure

- `index.html` — entry page (loads tokens, React/Babel, then the src modules)
- `src/calc.js` — feasibility calculation engine (`window.Feas`): S-curves,
  IRR/NPV, debt draw, scenarios, Monte Carlo, fund waterfall
- `src/charts.jsx` — pure-SVG chart components (`window.Charts`)
- `src/sidebar.jsx` — input flow: project & land, program tiles, timing,
  costs, financing, fund structure (`window.Sidebar`)
- `src/results.jsx` — the dashboard tab panels (`window.Panels`)
- `src/fund.jsx` — LP / Developer / GP fund waterfall panel (`window.FundPanel`)
- `src/app.jsx` — state, header KPIs, tab shell; persists inputs to
  localStorage under `ad_feas_v4`
- `assets/` — brand tokens (CSS) and images
- `vendor/` — pinned react@18.3.1, react-dom@18.3.1, @babel/standalone@7.29.0
  (vendored so the app runs without internet; fonts still load from Google
  Fonts and fall back to system fonts offline)
- `serve.ps1` — minimal PowerShell static file server (no Node/Python needed)

## Notes

- Reset all inputs via the sidebar's reset control (dispatches `feas:reset`);
  export uses the browser print dialog (`feas:export`).
- All amounts are SAR.
