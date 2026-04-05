// ============================================================
// Dynamic Dashboard — Self-contained HTML template that fetches
// data from /api/scan and renders an interactive dashboard.
// No embedded data; all data comes via JavaScript fetch().
//
// V3: Coherent Nansen-inspired layout — Sankey above table,
//     chain dots, no $ prefix, AI analysis placeholder,
//     auto-refresh interval control.
// ============================================================

/**
 * Returns a complete HTML string for the dynamic dashboard.
 * The page polls /api/scan at a configurable interval and re-renders.
 */
export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Narrative Pulse — Live Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"><\/script>
  <style>
    :root {
      --bg-primary: #0f1117;
      --bg-card: #181b25;
      --bg-card-alt: #1e2230;
      --bg-card-hover: #252a3a;
      --text-primary: #e8e9ed;
      --text-secondary: #8b8fa3;
      --text-muted: #5a5e72;
      --color-positive: #34d399;
      --color-negative: #f87171;
      --color-warning: #fbbf24;
      --border-color: #2a2d3a;
      --shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      --radius: 12px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* ── Scrollbar ─────────────────────────────────── */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-primary); }
    ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #3a3d4a; }

    /* ── Selection ─────────────────────────────────── */
    ::selection { background: rgba(129, 140, 248, 0.3); color: #fff; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    body::before {
      content: '';
      display: block;
      height: 2px;
      background: linear-gradient(90deg, rgba(52,211,153,0.6), rgba(129,140,248,0.6), rgba(52,211,153,0.6));
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px 48px;
    }

    /* ── Header ─────────────────────────────────── */

    .header {
      padding: 16px 28px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 20px;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-brand {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 1.15rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: nowrap;
      line-height: 1.2;
    }

    .header-tagline {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 400;
      letter-spacing: 0.03em;
      line-height: 1.2;
    }

    .header-powered {
      font-size: 0.68rem;
      color: var(--text-muted);
      font-weight: 400;
      letter-spacing: 0.02em;
      padding: 0 10px;
      height: 34px;
      display: flex;
      align-items: center;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .header-meta {
      font-size: 0.75rem;
      color: var(--text-secondary);
      padding: 6px 12px;
      border-radius: 6px;
      background: rgba(52, 211, 153, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.15);
      height: 34px;
      display: flex;
      align-items: center;
      white-space: nowrap;
    }

    .header-credits {
      display: none;
    }

    .scan-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--color-warning);
      height: 34px;
      padding: 0 10px;
    }

    .scan-indicator .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-warning);
      animation: pulse 1.2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .btn-scan {
      height: 34px;
      padding: 0 18px;
      border: 1px solid rgba(129, 140, 248, 0.3);
      border-radius: 7px;
      background: rgba(129, 140, 248, 0.1);
      color: #a5b4fc;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      white-space: nowrap;
    }

    .btn-scan:hover {
      background: rgba(129, 140, 248, 0.2);
      border-color: rgba(129, 140, 248, 0.5);
      box-shadow: 0 0 16px rgba(129, 140, 248, 0.15);
    }

    .btn-scan:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── Signal Overview ─────────────────────────── */

    .signal-overview {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .signal-card {
      padding: 16px 18px;
      border-radius: var(--radius);
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      text-align: center;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      position: relative;
      overflow: hidden;
    }

    .signal-card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: var(--radius);
      padding: 1px;
      background: linear-gradient(135deg, rgba(52,211,153,0), rgba(129,140,248,0), rgba(52,211,153,0));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      transition: background 0.4s ease;
      pointer-events: none;
    }

    .signal-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .signal-card:hover::before {
      background: linear-gradient(135deg, rgba(52,211,153,0.5), rgba(129,140,248,0.5), rgba(52,211,153,0.5));
      background-size: 200% 200%;
      animation: borderGlow 3s linear infinite;
    }

    @keyframes borderGlow {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }

    .signal-card-icon {
      font-size: 1.3rem;
      margin-bottom: 2px;
    }

    .signal-card-value {
      font-size: 1.6rem;
      font-weight: 700;
      color: #ffffff;
    }

    .signal-card-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .signal-card-hint {
      font-size: 0.65rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .signal-explanation {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-bottom: 20px;
      padding: 0 4px;
    }

    /* ── Filter Bar ─────────────────────────────── */

    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }

    .filter-bar-left {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .filter-select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      padding: 6px 28px 6px 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-card-alt);
      color: var(--text-primary);
      font-size: 0.82rem;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a5e72' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 12px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .filter-select:hover {
      border-color: rgba(139, 143, 163, 0.4);
      box-shadow: 0 0 8px rgba(139, 143, 163, 0.08);
    }

    .filter-select:focus {
      outline: none;
      border-color: var(--color-positive);
      box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.15);
    }

    .filter-select option {
      background: #1e2230;
      color: #e8e9ed;
      padding: 8px 10px;
    }

    .header-select {
      height: 34px;
      font-size: 0.75rem;
      padding: 0 28px 0 10px;
    }

    /* ── Custom CSS Tooltips ─────────────────────── */

    [data-tooltip] {
      position: relative;
    }

      [data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 10px;
      border-radius: 6px;
      background: #2a2d3a;
      color: #e8e9ed;
      font-size: 0.72rem;
      font-weight: 400;
      line-height: 1.4;
      white-space: normal;
      width: max-content;
      max-width: 240px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 100;
      border: 1px solid rgba(129, 140, 248, 0.15);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    [data-tooltip]:hover::after {
      opacity: 1;
    }

    /* For elements near the top of the page, show tooltip below */
    [data-tooltip-pos="bottom"]::after {
      bottom: auto;
      top: calc(100% + 8px);
    }

    .filter-count {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .filter-narrative-active {
      display: none;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: #a5b4fc;
      background: rgba(129, 140, 248, 0.1);
      border: 1px solid rgba(129, 140, 248, 0.2);
      padding: 4px 12px;
      border-radius: 6px;
    }

    .filter-narrative-active a {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.75rem;
      margin-left: 4px;
      cursor: pointer;
    }

    .filter-narrative-active a:hover {
      color: var(--text-primary);
    }

    .chain-legend {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 0 10px;
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .chain-legend-label {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-right: 2px;
    }

    .chain-legend-item {
      display: flex;
      align-items: center;
      gap: 0;
    }

    /* ── Main Section Card ──────────────────────── */

    .main-section-card {
      background: var(--bg-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
      border-top: 2px solid transparent;
      border-image: linear-gradient(90deg, rgba(52,211,153,0.5), rgba(129,140,248,0.5), rgba(52,211,153,0.5)) 1;
    }

    .section-title {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 4px;
      color: #ffffff;
    }

    .section-subtitle {
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    /* ── Sankey Chart ────────────────────────────── */

    #sankey-chart {
      width: 100%;
      height: 280px;
    }

    .sankey-card { margin-bottom: 24px; }
    .sankey-hint { font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; text-align: center; }

    /* ── Section Headers ────────────────────────── */

    .section { margin-bottom: 32px; }

    .section-heading {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 12px;
      color: #ffffff;
    }

    .section-body {
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 0;
      overflow: hidden;
    }

    /* ── Tables ─────────────────────────────────── */

    .token-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    .token-table thead th {
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-card-alt);
    }

    .token-table tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(42, 45, 58, 0.5);
      color: var(--text-primary);
    }

    .token-table tbody tr { transition: background 0.2s ease; }
    .token-table tbody tr:hover { background: var(--bg-card-hover); }
    .token-table tbody tr:last-child td { border-bottom: none; }

    .token-table .mono { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; }

    .netflow-positive { color: var(--color-positive) !important; }
    .netflow-negative { color: var(--color-negative) !important; }

    /* ── Expandable Rows ────────────────────────── */

    .token-table tbody tr.expandable-row {
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .token-table tbody tr.expandable-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .expand-arrow {
      display: inline-block;
      width: 0;
      height: 0;
      border-left: 5px solid var(--text-muted);
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      margin-right: 6px;
      vertical-align: middle;
      transition: transform 0.2s ease;
    }

    .expand-arrow.open { transform: rotate(90deg); }

    .expanded-detail {
      display: none;
      background: var(--bg-card-alt);
      border-bottom: 1px solid var(--border-color);
      border-left: 2px solid rgba(129, 140, 248, 0.3);
    }

    .expanded-detail.visible {
      display: table-row;
      animation: fadeSlideIn 0.2s ease;
    }

    @keyframes fadeSlideIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .expanded-detail td {
      padding: 16px 20px !important;
      font-size: 0.82rem;
    }

    .expanded-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 24px;
      align-items: start;
    }

    .expanded-right {
      min-height: 120px;
      transition: min-height 0.3s ease;
    }

    .expanded-footer {
      margin-top: 10px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px 20px;
    }

    .detail-item-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 2px;
    }

    .detail-item-value {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.88rem;
      color: var(--text-primary);
    }

    .detail-link {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      border-radius: 6px;
      background: rgba(139, 143, 163, 0.1);
      color: var(--text-secondary);
      font-size: 0.78rem;
      text-decoration: none;
      border: 1px solid var(--border-color);
      transition: all 0.15s ease;
    }

    .detail-link:hover {
      background: rgba(139, 143, 163, 0.2);
      color: var(--text-primary);
    }

    /* ── Sortable Headers ───────────────────────── */

    .token-table thead th.sortable {
      cursor: pointer;
      user-select: none;
    }

    .token-table thead th.sortable:hover {
      color: var(--text-primary);
    }

    .token-table thead th.sortable::after {
      content: '\\2195';
      margin-left: 4px;
      font-size: 0.7rem;
      line-height: 1;
      color: var(--text-muted);
      opacity: 0.4;
      transition: opacity 0.15s, color 0.15s;
    }

    .token-table thead th.sortable:hover::after {
      opacity: 0.8;
      color: var(--text-secondary);
    }

    .token-table thead th.sortable.sort-asc::after {
      content: '\\2191';
      opacity: 1;
      font-size: 0.7rem;
      color: var(--color-positive);
    }

    .token-table thead th.sortable.sort-desc::after {
      content: '\\2193';
      opacity: 1;
      font-size: 0.7rem;
      color: var(--color-positive);
    }

    /* ── Screener Badges ────────────────────────── */

    .screener-badge {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 4px;
      vertical-align: middle;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .screener-badge.pumping {
      background: rgba(236, 72, 153, 0.18);
      color: #ec4899;
    }

    .screener-badge.heavy-accumulation {
      background: rgba(52, 211, 153, 0.18);
      color: var(--color-positive);
    }

    .screener-badge.accumulating {
      background: rgba(251, 191, 36, 0.15);
      color: var(--color-warning);
    }

    .screener-badge.distributing {
      background: rgba(248, 113, 113, 0.12);
      color: #f87171;
      border: 1px solid rgba(248, 113, 113, 0.2);
    }

    .screener-badge.mixed {
      background: rgba(139, 143, 163, 0.15);
      color: var(--text-secondary);
    }

    .screener-badge.diverging {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }

    .diverge-sub {
      display: inline-block;
      font-size: 0.55rem;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      margin-left: 4px;
      vertical-align: middle;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stablecoin-tag {
      display: inline-block;
      font-size: 0.55rem;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(139, 143, 163, 0.12);
      color: var(--text-muted);
      margin-left: 4px;
      vertical-align: middle;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* ── Narrative Pill ─────────────────────────── */

    .narrative-pill {
      display: inline-block;
      font-size: 0.6rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(129, 140, 248, 0.12);
      color: #a5b4fc;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
    }

    .narrative-cell {
      position: relative;
    }

    .narrative-cell:hover .narrative-pill {
      background: rgba(129, 140, 248, 0.2);
      border-color: rgba(129, 140, 248, 0.3);
    }

    /* ── Buy/Sell Bar ──────────────────────────── */

    .buy-sell-bar {
      display: flex;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      min-width: 60px;
    }

    .buy-sell-bar .buy-bar { background: var(--color-positive); }
    .buy-sell-bar .sell-bar { background: var(--color-negative); }

    /* ── Flow Intelligence Section ──────────────── */

    .flow-intel-section {
      margin-top: 12px;
      padding: 12px 14px;
      background: rgba(15, 17, 23, 0.6);
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }

    .flow-intel-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .flow-intel-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 4px 0;
    }

    .flow-intel-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 0;
      font-size: 0.78rem;
    }

    .flow-intel-label {
      flex: 0 0 90px;
      font-weight: 500;
      color: var(--text-muted);
      font-size: 0.72rem;
    }

    .flow-intel-value {
      flex: 0 0 80px;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-weight: 600;
      font-size: 0.78rem;
    }

    .flow-intel-meta {
      color: var(--text-muted);
      font-size: 0.68rem;
    }

    .flow-intel-note {
      font-size: 0.68rem;
      color: var(--text-muted);
      font-style: italic;
      margin-left: auto;
    }

    .token-description {
      font-size: 0.78rem;
      color: var(--text-secondary);
      line-height: 1.5;
      padding: 8px 10px;
      margin-bottom: 10px;
      background: rgba(15, 17, 23, 0.5);
      border-radius: 6px;
      border-left: 2px solid rgba(129, 140, 248, 0.3);
      max-height: 3em;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── AI Analysis ──────────────────────────────── */

    .ai-analysis-section { margin-top: 12px; min-height: 120px; display: flex; flex-direction: column; }

    .ai-analysis-blur {
      position: relative;
      padding: 14px;
      border-radius: 8px;
      border: 1px dashed rgba(129, 140, 248, 0.3);
      cursor: pointer;
      overflow: hidden;
      transition: border-color 0.25s ease;
      flex: 1;
      display: flex;
      align-items: center;
    }

    .ai-analysis-blur:hover {
      border-color: rgba(129, 140, 248, 0.5);
    }

    .ai-analysis-blur::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg,
        rgba(129, 140, 248, 0.08) 0%,
        rgba(52, 211, 153, 0.06) 50%,
        rgba(129, 140, 248, 0.08) 100%);
      background-size: 200% 200%;
      animation: aiShimmer 3s ease-in-out infinite;
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }

    @keyframes aiShimmer {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .ai-fade-out {
      opacity: 0;
      transform: scaleY(0.95);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    .ai-fade-in {
      animation: aiFadeIn 0.3s ease forwards;
    }

    @keyframes aiFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ai-analysis-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
    }

    .ai-analysis-icon { font-size: 1.1rem; }
    .ai-analysis-text { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
    .ai-analysis-hint { font-size: 0.72rem; color: var(--text-muted); }

    /* AI Setup Form */

    .ai-setup {
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-card-alt);
      flex: 1;
    }

    .ai-setup-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
    }

    .ai-setup-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .ai-setup-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }

    .ai-field label {
      display: block;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .ai-input {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-card);
      color: var(--text-primary);
      font-size: 0.82rem;
      transition: border-color 0.2s ease;
    }

    .ai-input:focus {
      outline: none;
      border-color: rgba(129, 140, 248, 0.5);
    }

    .ai-btn-save {
      padding: 6px 16px;
      border: none;
      border-radius: 6px;
      background: rgba(129, 140, 248, 0.2);
      color: #a5b4fc;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .ai-btn-save:hover {
      background: rgba(129, 140, 248, 0.3);
    }

    /* AI Loading — Skeleton Pulse */

    .ai-loading {
      padding: 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .ai-loading-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .ai-loading-icon { font-size: 1rem; }

    .ai-loading-text {
      font-size: 0.78rem;
      color: var(--text-secondary);
    }

    .ai-skeleton {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ai-skeleton-bar {
      height: 10px;
      border-radius: 4px;
      background: linear-gradient(90deg,
        rgba(129, 140, 248, 0.08) 0%,
        rgba(129, 140, 248, 0.2) 50%,
        rgba(129, 140, 248, 0.08) 100%);
      background-size: 200% 100%;
      animation: skeletonPulse 1.5s ease-in-out infinite;
    }

    @keyframes skeletonPulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* AI Result */

    .ai-result {
      padding: 10px 14px;
      border: 1px solid rgba(129, 140, 248, 0.2);
      border-radius: 8px;
      background: rgba(129, 140, 248, 0.04);
      flex: 1;
    }

    .ai-result-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .ai-result-icon { font-size: 0.95rem; }

    .ai-result-provider {
      font-size: 0.68rem;
      color: var(--text-muted);
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    }

    .ai-result-text {
      font-size: 0.8rem;
      color: var(--text-primary);
      line-height: 1.5;
      margin-bottom: 4px;
    }

    .ai-btn-reanalyze {
      padding: 4px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-right: 6px;
    }

    .ai-btn-reanalyze:hover {
      border-color: rgba(129, 140, 248, 0.3);
      color: #a5b4fc;
    }

    /* AI Error */

    .ai-error {
      padding: 12px 16px;
      border: 1px solid rgba(248, 113, 113, 0.2);
      border-radius: 8px;
      background: rgba(248, 113, 113, 0.04);
      flex: 1;
    }

    .ai-error-text {
      font-size: 0.8rem;
      color: var(--color-negative);
      margin-bottom: 10px;
    }

    .ai-error-actions {
      display: flex;
      gap: 6px;
    }

    /* Responsive: stack AI setup fields on mobile */
    @media (max-width: 768px) {
      .ai-setup-grid { grid-template-columns: 1fr; }
    }

    /* ── Card utility ───────────────────────────── */

    .card {
      background: var(--bg-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
    }

    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: #ffffff;
    }

    /* ── Loading / Error states ─────────────────── */

    .loading-state, .error-state, .empty-state {
      text-align: center;
      padding: 64px 24px;
      color: var(--text-muted);
    }

    .loading-state .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top-color: var(--color-positive);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Loading shimmer ───────────────────────────── */
    .loading-shimmer {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 40px;
      animation: fadeIn 0.3s ease;
    }
    .shimmer-line {
      height: 16px;
      border-radius: 8px;
      background: linear-gradient(90deg, var(--bg-card-alt) 25%, var(--bg-card-hover) 50%, var(--bg-card-alt) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
    }
    .shimmer-line.wide { width: 80%; }
    .shimmer-line.medium { width: 50%; }
    .shimmer-line.narrow { width: 30%; }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .error-state { color: var(--color-negative); }

    /* ── Footer ─────────────────────────────────── */

    .footer {
      text-align: center;
      padding: 28px 24px;
      font-size: 0.78rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border-color);
      margin-top: 40px;
      letter-spacing: 0.02em;
    }
    .footer span {
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* ── Responsive ─────────────────────────────── */

    @media (max-width: 768px) {
      .signal-overview { grid-template-columns: repeat(2, 1fr); }
      .card { padding: 16px; }
      .main-section-card { padding: 16px; }
      #sankey-chart { height: 250px; }
      .token-table { font-size: 0.78rem; }
      .token-table thead th,
      .token-table tbody td { padding: 8px 6px; }
      .filter-bar { flex-direction: column; align-items: flex-start; }
      .flow-intel-row { flex-wrap: wrap; gap: 4px; }
      .flow-intel-label { flex: 0 0 auto; }
      .expanded-layout { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header" id="report-header">
      <div class="header-row">
        <div class="header-brand">
          <span class="header-title">NARRATIVE PULSE</span>
          <span class="header-tagline">Smart Money Intelligence</span>
        </div>
        <div class="header-actions">
          <span class="header-powered">powered by <span style="color:var(--text-secondary);font-weight:500">Nansen</span></span>
          <span class="header-meta" id="header-ago">Updated — ago</span>
          <span class="scan-indicator" id="scan-indicator" style="display:none">
            <span class="dot"></span> Scanning...
          </span>
          <button class="btn-scan" id="btn-scan" onclick="triggerScan()" data-tooltip="Rescan all data (~300 credits)" data-tooltip-pos="bottom">Rescan</button>
          <select class="filter-select header-select" id="refresh-interval" onchange="setRefreshInterval(this.value)">
            <option value="0">Manual</option>
            <option value="300000">5 min</option>
            <option value="600000">10 min</option>
            <option value="900000" selected>15 min</option>
            <option value="1800000">30 min</option>
          </select>
        </div>
      </div>
    </header>

    <!-- Main content area -->
    <div id="main-content">
      <div class="loading-shimmer" id="loading-state">
        <div class="shimmer-line wide"></div>
        <div class="shimmer-line medium"></div>
        <div class="shimmer-line wide"></div>
        <div class="shimmer-line narrow"></div>
        <div class="shimmer-line medium"></div>
        <div class="shimmer-line wide"></div>
        <div class="shimmer-line narrow"></div>
        <div class="shimmer-line medium"></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Narrative Pulse &middot; Smart Money Intelligence &middot; Nansen API + DexScreener
    </div>
  </div>

  <script>
    // ── State ──────────────────────────────────────────────
    var currentData = null;
    var lastScanTime = null;
    var refreshTimerId = null;
    var updateAgoTimerId = null;
    var narrativeFilter = null;

    // ── Utility Functions ──────────────────────────────────

    function formatUsd(value) {
      var sign = value >= 0 ? '+' : '-';
      var abs = Math.abs(value);
      if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(1) + 'B';
      if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
      if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
      return sign + '$' + Math.round(abs).toLocaleString('en-US');
    }

    function formatUsdAbs(value) {
      var abs = Math.abs(value);
      if (abs >= 1e9) return '$' + (abs / 1e9).toFixed(1) + 'B';
      if (abs >= 1e6) return '$' + (abs / 1e6).toFixed(1) + 'M';
      if (abs >= 1e3) return '$' + (abs / 1e3).toFixed(1) + 'K';
      return '$' + Math.round(abs).toLocaleString('en-US');
    }

    function formatMcap(value) {
      if (!value || value <= 0) return '\\u2014';
      if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
      if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
      if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
      return '$' + Math.round(value).toLocaleString('en-US');
    }

    function formatPercent(value) {
      if (value === undefined || value === null) return '\\u2014';
      var sign = value >= 0 ? '+' : '-';
      return sign + Math.abs(value).toFixed(1) + '%';
    }

    function formatVolume(value) {
      if (!value || value <= 0) return '\\u2014';
      return formatUsdAbs(value);
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function stripEmoji(str) {
      return str.replace(/[\\u{1F600}-\\u{1F64F}\\u{1F300}-\\u{1F5FF}\\u{1F680}-\\u{1F6FF}\\u{1F1E0}-\\u{1F1FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{FE00}-\\u{FE0F}\\u{1F900}-\\u{1F9FF}\\u{1FA00}-\\u{1FA6F}\\u{1FA70}-\\u{1FAFF}\\u{200D}\\u{20E3}\\u{E0020}-\\u{E007F}\\u2713\\u2717\\u2714\\u2716\\u2605\\u2606\\u25BA\\u25BC\\u25B2]/gu, '').trim();
    }

    function slugify(name) {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    function minutesAgo(dateStr) {
      if (!dateStr) return null;
      var then = new Date(dateStr).getTime();
      var now = Date.now();
      var mins = Math.floor((now - then) / 60000);
      if (mins < 1) return 'just now';
      if (mins === 1) return '1 min ago';
      return mins + ' min ago';
    }

    function hasNonZeroFlow(fi) {
      return (fi.smart_trader_net_flow_usd !== 0) ||
             (fi.public_figure_net_flow_usd !== 0) ||
             (fi.whale_net_flow_usd !== 0) ||
             (fi.top_pnl_net_flow_usd !== 0) ||
             (fi.exchange_net_flow_usd !== 0) ||
             (fi.fresh_wallets_net_flow_usd !== 0);
    }

    function updateAgoText() {
      var el = document.getElementById('header-ago');
      if (!el) return;
      if (!lastScanTime) {
        el.textContent = 'Updated — ago';
        return;
      }
      el.textContent = 'Updated ' + minutesAgo(lastScanTime);
    }

    function chainLabel(chain) {
      var styles = {
        ethereum: 'background:rgba(98,126,234,0.15);color:#8ba0f0',
        solana: 'background:rgba(156,106,222,0.15);color:#b48de8',
        base: 'background:rgba(0,170,255,0.15);color:#4db8ff',
        bnb: 'background:rgba(243,186,47,0.15);color:#f5c842',
        arbitrum: 'background:rgba(40,160,240,0.15);color:#5eb8f0'
      };
      var labels = { ethereum: 'ETH', solana: 'SOL', base: 'BASE', bnb: 'BNB', arbitrum: 'ARB' };
      var style = styles[chain] || 'background:rgba(139,143,163,0.15);color:#8b8fa3';
      var label = labels[chain] || chain;
      return '<span style="' + style + ';font-size:0.6rem;font-weight:700;padding:1px 4px;border-radius:3px;letter-spacing:0.02em;margin-left:6px;vertical-align:middle">' + label + '</span>';
    }

    function dexScreenerUrl(chain, address) {
      var chainMap = { ethereum: 'ethereum', solana: 'solana', base: 'base', bnb: 'bsc', arbitrum: 'arbitrum' };
      var c = chainMap[chain] || chain;
      return 'https://dexscreener.com/' + c + '/' + address;
    }

    function dexLink(chain, address, symbolHtml) {
      return '<a href="' + dexScreenerUrl(chain, address || '') + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;border-bottom:1px dotted var(--text-muted)">' + symbolHtml + '</a>';
    }

    // Sort state tracker per table
    var sortStates = {};

    function sortTable(tableId, colIndex, type) {
      var table = document.getElementById(tableId);
      if (!table) return;
      var tbody = table.querySelector('tbody');
      if (!tbody) return;

      // Toggle sort direction
      var key = tableId + '-' + colIndex;
      if (sortStates[key] === 'asc') {
        sortStates[key] = 'desc';
      } else {
        sortStates[key] = 'asc';
      }
      var dir = sortStates[key];

      // Update header classes
      var headers = table.querySelectorAll('thead th.sortable');
      headers.forEach(function(th) { th.classList.remove('sort-asc', 'sort-desc'); });
      var activeTh = table.querySelectorAll('thead th')[colIndex];
      if (activeTh) {
        activeTh.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');
      }

      // Collect rows (skip expanded-detail rows)
      var rows = [];
      var allRows = tbody.querySelectorAll('tr');
      for (var i = 0; i < allRows.length; i++) {
        if (!allRows[i].classList.contains('expanded-detail')) {
          rows.push(allRows[i]);
        }
      }

      // Sort
      rows.sort(function(a, b) {
        var aVal = a.getAttribute('data-sort-' + colIndex);
        var bVal = b.getAttribute('data-sort-' + colIndex);
        if (type === 'number') {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        } else {
          aVal = (aVal || '').toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }
        if (aVal < bVal) return dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return dir === 'asc' ? 1 : -1;
        return 0;
      });

      // Re-insert in sorted order, keeping detail rows paired
      rows.forEach(function(row) {
        var detail = row.nextElementSibling;
        if (detail && detail.classList.contains('expanded-detail')) {
          tbody.appendChild(row);
          tbody.appendChild(detail);
        } else {
          tbody.appendChild(row);
        }
      });
    }

    function toggleExpand(row, detailId) {
      var detail = document.getElementById(detailId);
      var arrow = row.querySelector('.expand-arrow');
      if (!detail) return;
      if (detail.classList.contains('visible')) {
        detail.classList.remove('visible');
        if (arrow) arrow.classList.remove('open');
      } else {
        detail.classList.add('visible');
        if (arrow) arrow.classList.add('open');
      }
    }

    // ── Data Fetching ──────────────────────────────────────

    function fetchData() {
      return fetch('/api/scan')
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        });
    }

    function triggerScan() {
      var btn = document.getElementById('btn-scan');
      btn.disabled = true;
      showScanIndicator(true);

      fetch('/api/scan', { method: 'POST' })
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function(data) {
          handleData(data);
        })
        .catch(function(err) {
          console.error('Scan trigger failed:', err);
        })
        .finally(function() {
          btn.disabled = false;
          showScanIndicator(false);
        });
    }

    function showScanIndicator(show) {
      var el = document.getElementById('scan-indicator');
      el.style.display = show ? 'inline-flex' : 'none';
    }

    // ── Data Processing ────────────────────────────────────

    function processData(apiResponse) {
      if (!apiResponse || !apiResponse.scan) return null;

      var scan = apiResponse.scan;
      lastScanTime = apiResponse.lastScanTime || scan.timestamp;

      // Filter out narratives with $0 netflow (display-layer only)
      var narratives = (scan.narratives || []).filter(function(n) {
        return Math.abs(n.totalNetflow24h) > 0;
      }).map(function(n) {
        return {
          key: n.key || n.displayName,
          displayName: n.displayName,
          totalNetflow24h: n.totalNetflow24h,
          totalNetflow7d: n.totalNetflow7d || 0,
          tokenCount: n.tokenCount,
          isHot: n.totalNetflow24h > 0,
          topTokens: (n.topTokens || []).sort(function(a, b) {
            return Math.abs(b.netflow24hUsd) - Math.abs(a.netflow24hUsd);
          })
        };
      });

      // Sort by |netflow| desc
      narratives.sort(function(a, b) {
        return Math.abs(b.totalNetflow24h) - Math.abs(a.totalNetflow24h);
      });

      return {
        timestamp: scan.timestamp,
        creditsUsed: scan.creditsUsed || 0,
        narratives: narratives,
        narrativeCount: narratives.length,
        earlySignals: scan.earlySignals || [],
        screenerHighlights: scan.screenerHighlights || [],
        flowIntelligenceCount: scan.flowIntelligenceCount || 0,
        apiCallsUsed: scan.apiCallsUsed || 0
      };
    }

    // ── Rendering ──────────────────────────────────────────

    function handleData(apiResponse) {
      showScanIndicator(apiResponse.isScanning || false);
      var data = processData(apiResponse);

      if (!data) {
        if (apiResponse && apiResponse.isScanning) {
          // Still scanning, keep loading
          return;
        }
        renderEmpty();
        return;
      }

      currentData = data;
      renderDashboard(data);
    }

    // ── Header Rendering ───────────────────────────────────

    function renderHeader(data) {
      // "Updated X min ago"
      var agoEl = document.getElementById('header-ago');
      if (agoEl) {
        if (data.timestamp) {
          agoEl.textContent = 'Updated ' + minutesAgo(data.timestamp);
        } else {
          agoEl.textContent = 'Updated — ago';
        }
      }

      // Credits
      var creditsEl = document.getElementById('header-credits');
      if (creditsEl && data.creditsUsed) {
        creditsEl.textContent = data.creditsUsed + ' credits';
      }
    }

    // ── Main Dashboard Rendering ───────────────────────────

    function renderDashboard(data) {
      currentData = data;
      narrativeFilter = null;
      renderHeader(data);
      updateAgoText();

      var main = document.getElementById('main-content');
      var html = '';
      html += renderSignalOverview(data.screenerHighlights);
      html += renderSankeySection(data.narratives);
      html += renderMainTable(data.screenerHighlights);
      main.innerHTML = html;
      initFilters(data.screenerHighlights);
      setTimeout(function() { renderSankeyChart(data.narratives); }, 50);
    }

    // ── Signal Overview ────────────────────────────────────

    function renderSignalOverview(highlights) {
      var counts = { hot: 0, accumulating: 0, diverging: 0, pumping: 0, selling: 0 };
      if (highlights && highlights.length > 0) {
        for (var i = 0; i < highlights.length; i++) {
          var c = highlights[i].classification;
          if (c === 'heavy_accumulation') counts.hot++;
          else if (c === 'diverging') { counts.accumulating++; counts.diverging++; }
          else if (c === 'accumulating') counts.accumulating++;
          else if (c === 'pumping') counts.pumping++;
          else counts.selling++; // mixed + distributing
        }
      }

      var total = highlights ? highlights.length : 0;
      var html = '';
      html += '<div class="signal-overview">';

      // HOT card
      html += '<div class="signal-card" onclick="filterBySignalGroup(\\'hot\\')" style="cursor:pointer">';
      html += '<div class="signal-card-icon">\\uD83D\\uDD25</div>';
      html += '<div class="signal-card-value">' + counts.hot + '</div>';
      html += '<div class="signal-card-label">HOT</div>';
      html += '<div class="signal-card-hint">Strong SM buying, price rising</div>';
      html += '</div>';

      // ACCUMULATING card (includes diverging)
      html += '<div class="signal-card" onclick="filterBySignalGroup(\\'accumulating\\')" style="cursor:pointer">';
      html += '<div class="signal-card-icon">\\uD83D\\uDC40</div>';
      html += '<div class="signal-card-value">' + counts.accumulating + '</div>';
      html += '<div class="signal-card-label">ACCUMULATING</div>';
      html += '<div class="signal-card-hint">' + (counts.diverging > 0 ? counts.diverging + ' with divergence signal' : 'SM buying, price stable') + '</div>';
      html += '</div>';

      // PUMPING card
      html += '<div class="signal-card" onclick="filterBySignalGroup(\\'pumping\\')" style="cursor:pointer">';
      html += '<div class="signal-card-icon">\\uD83D\\uDE80</div>';
      html += '<div class="signal-card-value">' + counts.pumping + '</div>';
      html += '<div class="signal-card-label">PUMPING</div>';
      html += '<div class="signal-card-hint">Price surged &gt;30%</div>';
      html += '</div>';

      // SELLING card
      html += '<div class="signal-card" onclick="filterBySignalGroup(\\'selling\\')" style="cursor:pointer">';
      html += '<div class="signal-card-icon">\\u26A0\\uFE0F</div>';
      html += '<div class="signal-card-value">' + counts.selling + '</div>';
      html += '<div class="signal-card-label">SELLING</div>';
      html += '<div class="signal-card-hint">SM outflow or low conviction</div>';
      html += '</div>';

      html += '</div>';
      html += '<div class="signal-explanation">\\u24D8 From 500+ tokens across 5 chains. Top ' + total + ' by composite score: buy/sell ratio, netflow, and SM trader activity.</div>';
      return html;
    }

    // ── Sankey Section ─────────────────────────────────────

    function renderSankeySection(narratives) {
      var html = '<div class="card sankey-card" id="sankey-section">';
      html += '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">';
      html += '<div class="card-title" style="margin-bottom:0">Capital Flow Map</div>';
      html += '<div style="display:flex;gap:16px;font-size:0.72rem;color:var(--text-secondary)">';
      html += '<span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#34d399"></span> SM Inflow</span>';
      html += '<span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f87171"></span> SM Outflow</span>';
      html += '</div>';
      html += '</div>';
      html += '<div id="sankey-chart" style="width:100%;height:280px"></div>';
      html += '<div class="sankey-hint">Click a narrative to filter the table below</div>';
      html += '</div>';
      return html;
    }

    // ── Main Table ─────────────────────────────────────────

    function renderMainTable(highlights) {
      var tableId = 'main-table';
      var html = '<div class="main-section-card">';

      html += '<div class="section-title">\\uD83D\\uDD0D Smart Money Active Tokens</div>';
      html += '<div class="section-subtitle">Top tokens by Smart Money buy/sell ratio and netflow across all narratives</div>';

      // Filter bar
      html += '<div class="filter-bar">';
      html += '<div class="filter-bar-left">';
      html += '<select class="filter-select" id="filter-chain" onchange="applyFilters()"><option value="">All Chains</option></select>';
      html += '<select class="filter-select" id="filter-signal" onchange="applyFilters()"><option value="">All Signals</option></select>';
      html += '<span class="filter-narrative-active" id="clear-narrative-filter">Narrative: <strong id="narrative-filter-name"></strong> <a onclick="clearNarrativeFilter()">\\u2715 Clear</a></span>';
      html += '</div>';
      html += '<div class="filter-count" id="visible-count"></div>';
      html += '</div>';



      html += '<table class="token-table" id="' + tableId + '">';
      html += '<thead><tr>';
      html += '<th data-tooltip="Token symbol and chain">Token</th>';
      html += '<th data-tooltip="Narrative sector">Narrative</th>';
      html += '<th class="sortable" data-tooltip="Smart Money net capital flow over 24 hours (buys minus sells)" onclick="sortTable(\\'' + tableId + '\\', 2, \\'number\\')">Netflow 24h</th>';
      html += '<th data-tooltip="Visual ratio of buy volume (green) vs sell volume (red)">Buy / Sell</th>';
      html += '<th class="sortable" data-tooltip="Buy volume divided by sell volume" onclick="sortTable(\\'' + tableId + '\\', 4, \\'number\\')">Ratio</th>';
      html += '<th class="sortable" data-tooltip="Price change over the last 24 hours" onclick="sortTable(\\'' + tableId + '\\', 5, \\'number\\')">Price \\u0394</th>';
      html += '<th class="sortable" data-tooltip="Current market capitalization" onclick="sortTable(\\'' + tableId + '\\', 6, \\'number\\')">Market Cap</th>';
      html += '<th class="sortable" data-tooltip="Signal classification" onclick="sortTable(\\'' + tableId + '\\', 7, \\'text\\')">Signal</th>';
      html += '</tr></thead><tbody>';

      if (highlights && highlights.length > 0) {
        for (var idx = 0; idx < highlights.length; idx++) {
          var t = highlights[idx];
          html += renderTokenRow(t, idx, tableId);
        }
      }

      html += '</tbody></table>';
      html += '</div>';
      return html;
    }

    function renderTokenRow(t, idx, tableId) {
      var html = '';
      var netflowCls = t.netflowUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
      var priceCls = t.priceChange > 0 ? 'netflow-positive' : (t.priceChange < 0 ? 'netflow-negative' : '');
      var priceText = (t.priceChange === undefined || t.priceChange === null) ? '\\u2014' : formatPercent(t.priceChange);

      var totalVol = Math.abs(t.buyVolume) + Math.abs(t.sellVolume);
      var buyPct = totalVol > 0 ? (Math.abs(t.buyVolume) / totalVol * 100) : 50;
      var sellPct = 100 - buyPct;
      var ratioText = t.buySellRatio >= 99 ? '99x+' : t.buySellRatio.toFixed(1) + 'x';

      var badgeClass = t.classification === 'pumping' ? 'pumping' :
                       t.classification === 'heavy_accumulation' ? 'heavy-accumulation' :
                       t.classification === 'diverging' ? 'diverging' :
                       t.classification === 'accumulating' ? 'accumulating' :
                        t.classification === 'mixed' ? 'distributing' : 'distributing';
      var badgeText = t.classification === 'pumping' ? '\\uD83D\\uDE80 PUMPING' :
                      t.classification === 'heavy_accumulation' ? '\\uD83D\\uDD25 HEAVY ACCUM' :
                      t.classification === 'diverging' ? '\\uD83D\\uDCCA DIVERGING' :
                      t.classification === 'accumulating' ? '\\uD83D\\uDC40 ACCUM' :
                       t.classification === 'mixed' ? '\\u26A0\\uFE0F SELLING' : '\\u26A0\\uFE0F SELLING';
      var badgeTooltip = t.classification === 'pumping' ? 'High SM buying ratio but token already pumped > 30% — caution' :
                         t.classification === 'heavy_accumulation' ? 'Buy/sell ratio \\u2265 3.0: Strong Smart Money buying' :
                         t.classification === 'diverging' ? 'Sustained 7-day SM accumulation but price hasn\\'t moved — potential divergence' :
                         t.classification === 'accumulating' ? 'Buy/sell ratio \\u2265 1.5: Moderate Smart Money buying' :
                          t.classification === 'mixed' ? 'SM netflow positive but low conviction — monitoring' : 'Negative netflow & low ratio: Smart Money is selling';

      var signalSortOrder = t.classification === 'pumping' ? 0 :
                            t.classification === 'diverging' ? 1 :
                            t.classification === 'heavy_accumulation' ? 2 :
                            t.classification === 'accumulating' ? 3 :
                            t.classification === 'mixed' ? 4 : 5;

      // Narrative display: first 2 sectors joined with " + "
      var narrativeDisplay = '\\u2014';
      var narrativeKey = '';
      if (t.tokenSectors && t.tokenSectors.length > 0) {
        var sectors = t.tokenSectors.slice(0, 2);
        narrativeDisplay = sectors.join(' + ');
        if (narrativeDisplay.length > 25) narrativeDisplay = narrativeDisplay.substring(0, 22) + '...';
        narrativeKey = t.tokenSectors[0];
      } else if (t.narrativeKey) {
        narrativeDisplay = t.narrativeKey;
        narrativeKey = t.narrativeKey;
      }

      // Stablecoin indicator: mark tokens pegged near $1.00
      var isStablecoin = t.priceUsd !== undefined && t.priceUsd >= 0.95 && t.priceUsd <= 1.05 && Math.abs(t.priceChange) < 1;

      var detailId = 'detail-' + idx;

      html += '<tr class="expandable-row" onclick="toggleExpand(this, \\'' + detailId + '\\')"';
      html += ' data-chain="' + escapeHtml(t.chain || '') + '"';
      html += ' data-signal="' + escapeHtml(t.classification || '') + '"';
      html += ' data-narrative="' + escapeHtml(narrativeKey) + '"';
      html += ' data-sort-2="' + t.netflowUsd + '"';
      html += ' data-sort-4="' + t.buySellRatio + '"';
      html += ' data-sort-5="' + t.priceChange + '"';
      html += ' data-sort-6="' + (t.marketCapUsd || 0) + '"';
      html += ' data-sort-7="' + signalSortOrder + '-' + escapeHtml(t.token_symbol).toLowerCase() + '"';
      html += '>';
      html += '<td><span class="expand-arrow"></span>' + dexLink(t.chain, t.token_address, '<strong>' + escapeHtml(stripEmoji(t.token_symbol)) + '</strong>') + chainLabel(t.chain) + '</td>';
      html += '<td class="narrative-cell" onclick="filterTableByNarrative(\\'' + escapeHtml(narrativeKey || narrativeDisplay) + '\\')" style="cursor:pointer" data-tooltip="' + escapeHtml(narrativeDisplay) + '"><span class="narrative-pill">' + escapeHtml(narrativeDisplay) + '</span></td>';
      var netflowDisplay = t.netflowUsd === 0 ? '\\u2014' : formatUsd(t.netflowUsd);
      var netflowTooltip = t.netflowUsd === 0 ? 'No netflow data available for this token' : '';
      html += '<td class="mono ' + netflowCls + '"' + (netflowTooltip ? ' data-tooltip="' + netflowTooltip + '"' : '') + '>' + netflowDisplay + '</td>';
      html += '<td><div class="buy-sell-bar"><div class="buy-bar" style="width:' + buyPct.toFixed(1) + '%"></div><div class="sell-bar" style="width:' + sellPct.toFixed(1) + '%"></div></div></td>';
      html += '<td class="mono" style="color: var(--color-positive)">' + ratioText + '</td>';
      html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
      html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
      html += '<td><span class="screener-badge ' + badgeClass + '" data-tooltip="' + badgeTooltip + '">' + badgeText + '</span>';
      if (isStablecoin) {
        html += ' <span class="stablecoin-tag" data-tooltip="Price-pegged asset (~$1.00)">STABLE</span>';
      }
      html += '</td>';
      html += '</tr>';

      // Expanded detail row
      html += '<tr class="expanded-detail" id="' + detailId + '"><td colspan="8">';
      html += renderExpandedDetail(t, detailId);
      html += '</td></tr>';

      return html;
    }

    function renderExpandedDetail(t, detailId) {
      var html = '';

      html += '<div class="expanded-layout">';
      html += '<div class="expanded-left">';

      // Row 1: Price, MCap, FDV, Liq, Vol 24h (only show if present)
      var items = [];

      if (t.priceUsd) {
        items.push({ label: 'Price', value: '$' + t.priceUsd.toFixed(t.priceUsd < 1 ? 6 : t.priceUsd < 100 ? 4 : 2) });
      }
      if (t.marketCapUsd) {
        items.push({ label: 'Market Cap', value: formatMcap(t.marketCapUsd) });
      }
      if (t.fdv) {
        items.push({ label: 'FDV', value: formatMcap(t.fdv) });
      }
      if (t.liquidity) {
        items.push({ label: 'Liquidity', value: formatUsdAbs(t.liquidity) });
      }
      if (t.volume) {
        items.push({ label: 'Volume 24h', value: formatVolume(t.volume) });
      }

      if (items.length > 0) {
        html += '<div class="detail-grid" style="margin-bottom:10px">';
        for (var i = 0; i < items.length; i++) {
          html += '<div><div class="detail-item-label">' + items[i].label + '</div><div class="detail-item-value">' + items[i].value + '</div></div>';
        }
        html += '</div>';
      }

      // Row 2: Netflow 24h (always), 7d and 30d only if non-zero
      html += '<div class="detail-grid" style="margin-bottom:10px">';
      var nf24Cls = t.netflowUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
      html += '<div><div class="detail-item-label">Netflow 24h</div><div class="detail-item-value ' + nf24Cls + '">' + formatUsd(t.netflowUsd) + '</div></div>';
      var nf7d = t.netflow7dUsd ?? 0;
      if (nf7d !== 0) {
        var nf7dCls = nf7d >= 0 ? 'netflow-positive' : 'netflow-negative';
        html += '<div><div class="detail-item-label">Netflow 7d</div><div class="detail-item-value ' + nf7dCls + '">' + formatUsd(nf7d) + '</div></div>';
      }
      var nf30d = t.netflow30dUsd ?? 0;
      if (nf30d !== 0) {
        var nf30dCls = nf30d >= 0 ? 'netflow-positive' : 'netflow-negative';
        html += '<div><div class="detail-item-label">Netflow 30d</div><div class="detail-item-value ' + nf30dCls + '">' + formatUsd(nf30d) + '</div></div>';
      }
      html += '</div>';

      // Row 3: Buy Vol, Sell Vol, Ratio (always show), SM Traders (only if > 0)
      html += '<div class="detail-grid" style="margin-bottom:8px">';
      html += '<div><div class="detail-item-label">Buy Volume</div><div class="detail-item-value netflow-positive">' + formatVolume(t.buyVolume) + '</div></div>';
      html += '<div><div class="detail-item-label">Sell Volume</div><div class="detail-item-value netflow-negative">' + formatVolume(t.sellVolume) + '</div></div>';
      var ratioText = t.buySellRatio >= 99 ? '99x+' : t.buySellRatio.toFixed(1) + 'x';
      html += '<div><div class="detail-item-label">Buy/Sell Ratio</div><div class="detail-item-value">' + ratioText + '</div></div>';
      var smCount = t.traderCount || 0;
      if (smCount > 0) {
        html += '<div><div class="detail-item-label">SM Traders</div><div class="detail-item-value">' + smCount + '</div></div>';
      }
      html += '</div>';

      // Token description (from DexScreener profiles, if available)
      if (t.tokenDescription) {
        html += '<div class="token-description" data-tooltip="' + escapeHtml(t.tokenDescription) + '">';
        var descText = t.tokenDescription;
        if (descText.length > 200) {
          descText = descText.substring(0, 197) + '...';
        }
        html += escapeHtml(descText);
        html += '</div>';
      }

      // Flow Intelligence (optional)
      if (t.flowIntelligence && hasNonZeroFlow(t.flowIntelligence)) {
        html += renderFlowIntelligence(t.flowIntelligence);
      }

      html += '</div>'; // end expanded-left

      // Right column: AI Analysis
      html += '<div class="expanded-right">';
      html += '<div class="ai-analysis-section" id="ai-' + detailId + '">';
      html += '<div class="ai-analysis-blur" onclick="triggerAiAnalysis(\\'' + detailId + '\\')">';
      html += '<div class="ai-analysis-content">';
      html += '<span class="ai-analysis-icon">\\uD83E\\uDD16</span>';
      html += '<span class="ai-analysis-text">AI Analysis</span>';
      html += '<span class="ai-analysis-hint">Click to analyze with AI</span>';
      html += '</div></div></div>';
      html += '</div>'; // end expanded-right

      html += '</div>'; // end expanded-layout

      // Footer: DexScreener link
      html += '<div class="expanded-footer">';
      html += '<a class="detail-link" href="' + dexScreenerUrl(t.chain, t.token_address) + '" target="_blank" rel="noopener">View on DexScreener \\u2197</a>';
      html += '</div>';

      return html;
    }

    // ── AI Analysis ──────────────────────────────────────

    var AI_CONFIG_KEY = 'narrative_pulse_ai_config';

    function getAiConfig() {
      try {
        var stored = localStorage.getItem(AI_CONFIG_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch (e) { return null; }
    }

    function saveAiConfig(config) {
      try {
        localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
      } catch (e) { /* ignore */ }
    }

    function triggerAiAnalysis(detailId) {
      var config = getAiConfig();
      if (!config || !config.apiKey) {
        showAiSetup(detailId);
      } else {
        runAiAnalysis(detailId, config);
      }
    }

    function showAiSetup(detailId) {
      var el = document.getElementById('ai-' + detailId);
      if (!el) return;

      var existingConfig = getAiConfig() || {};

      el.innerHTML = '<div class="ai-setup">' +
        '<div class="ai-setup-title">\\uD83E\\uDD16 AI Analysis Setup</div>' +
        '<div class="ai-setup-desc">Connect your LLM provider to analyze tokens with AI. Your API key is stored locally in this browser only.</div>' +
        '<div class="ai-field" style="margin-bottom:10px"><label>Provider</label>' +
          '<select id="ai-provider" class="filter-select" style="width:100%" onchange="toggleCustomUrl()">' +
            '<option value="openai"' + (existingConfig.provider === 'openai' ? ' selected' : '') + '>OpenAI</option>' +
            '<option value="anthropic"' + (existingConfig.provider === 'anthropic' ? ' selected' : '') + '>Anthropic</option>' +
            '<option value="openrouter"' + (existingConfig.provider === 'openrouter' ? ' selected' : '') + '>OpenRouter</option>' +
            '<option value="custom"' + (existingConfig.provider === 'custom' ? ' selected' : '') + '>Custom (OpenAI Compatible)</option>' +
          '</select>' +
        '</div>' +
        '<div class="ai-setup-grid">' +
          '<div class="ai-field"><label>API Key</label>' +
            '<input type="password" id="ai-key" class="ai-input" placeholder="sk-..." value="' + escapeHtml(existingConfig.apiKey || '') + '">' +
          '</div>' +
          '<div class="ai-field"><label>Model</label>' +
            '<input type="text" id="ai-model" class="ai-input" placeholder="gpt-4o-mini" value="' + escapeHtml(existingConfig.model || '') + '">' +
          '</div>' +
        '</div>' +
        '<div class="ai-field" id="ai-base-url-field" style="display:' + (existingConfig.provider === 'custom' ? 'grid' : 'none') + ';margin-bottom:12px"><label>Base URL</label>' +
          '<input type="text" id="ai-base-url" class="ai-input" placeholder="https://api.example.com/v1" value="' + escapeHtml(existingConfig.baseUrl || '') + '">' +
        '</div>' +
        '<div class="ai-setup-actions">' +
          '<button class="ai-btn-save" onclick="saveAiAndAnalyze(\\'' + detailId + '\\')">Save & Analyze</button>' +
        '</div>' +
      '</div>';
    }

    function saveAiAndAnalyze(detailId) {
      var provider = document.getElementById('ai-provider');
      var key = document.getElementById('ai-key');
      var model = document.getElementById('ai-model');
      if (!provider || !key || !model) return;

      var apiKey = key.value.trim();
      var modelVal = model.value.trim();

      if (!apiKey) {
        key.style.borderColor = 'var(--color-negative)';
        return;
      }
      if (!modelVal) {
        var defaults = { openai: 'gpt-4o-mini', anthropic: 'claude-sonnet-4-20250514', openrouter: 'anthropic/claude-sonnet-4', custom: 'gpt-4o-mini' };
        modelVal = defaults[provider.value] || 'gpt-4o-mini';
      }

      var baseUrlEl = document.getElementById('ai-base-url');
      var baseUrl = baseUrlEl ? baseUrlEl.value.trim() : '';
      var config = { provider: provider.value, apiKey: apiKey, model: modelVal, baseUrl: baseUrl };
      saveAiConfig(config);
      runAiAnalysis(detailId, config);
    }

    function toggleCustomUrl() {
      var provider = document.getElementById('ai-provider');
      var field = document.getElementById('ai-base-url-field');
      if (!provider || !field) return;
      field.style.display = provider.value === 'custom' ? 'grid' : 'none';
    }

    function runAiAnalysis(detailId, config) {
      var el = document.getElementById('ai-' + detailId);
      if (!el) return;

      // Build tokenData from the highlight object (stored in currentData)
      var idx = parseInt(detailId.replace('detail-', ''));
      var highlights = currentData ? currentData.screenerHighlights : [];
      var tokenData = highlights[idx] || null;
      if (!tokenData) {
        el.innerHTML = '<div class="ai-error"><div class="ai-error-text">Token data not available. Try rescanning.</div></div>';
        return;
      }

      // Fade out existing content, then show loading
      var currentContent = el.firstElementChild;
      if (currentContent) {
        currentContent.classList.add('ai-fade-out');
        setTimeout(function() {
          el.innerHTML = '<div class="ai-loading ai-fade-in">' +
            '<div class="ai-loading-header">' +
            '<span class="ai-loading-icon">\\uD83E\\uDD16</span>' +
            '<span class="ai-loading-text">Analyzing with ' + escapeHtml(config.provider) + '...</span>' +
            '</div>' +
            '<div class="ai-skeleton">' +
            '<div class="ai-skeleton-bar" style="width:90%"></div>' +
            '<div class="ai-skeleton-bar" style="width:75%"></div>' +
            '<div class="ai-skeleton-bar" style="width:60%"></div>' +
            '</div>' +
            '</div>';
        }, 250);
      } else {
        el.innerHTML = '<div class="ai-loading ai-fade-in">' +
          '<div class="ai-loading-header">' +
          '<span class="ai-loading-icon">\\uD83E\\uDD16</span>' +
          '<span class="ai-loading-text">Analyzing with ' + escapeHtml(config.provider) + '...</span>' +
          '</div>' +
          '<div class="ai-skeleton">' +
          '<div class="ai-skeleton-bar" style="width:90%"></div>' +
          '<div class="ai-skeleton-bar" style="width:75%"></div>' +
          '<div class="ai-skeleton-bar" style="width:60%"></div>' +
          '</div>' +
          '</div>';
      }

      // Call API
      fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl || undefined,
          tokenData: tokenData
        })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.error) {
          showAiError(detailId, data.error);
        } else {
          showAiResult(detailId, data.analysis, config);
        }
      })
      .catch(function(err) {
        showAiError(detailId, err.message || 'Network error');
      });
    }

    function renderMarkdown(text) {
      // Escape HTML
      var html = escapeHtml(text);

      // Process line by line
      var lines = html.split('\\n');
      var result = [];
      var inUl = false;
      var inOl = false;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        // Headers: ### or ## or #
        if (line.match(/^#{1,3}\\s/)) {
          if (inUl) { result.push('</ul>'); inUl = false; }
          if (inOl) { result.push('</ol>'); inOl = false; }
          var headerText = line.replace(/^#{1,3}\\s/, '');
          result.push('<div style="font-weight:700;font-size:0.85rem;margin:6px 0 3px">' + headerText + '</div>');
          continue;
        }

        // Bullet list: - item or • item
        if (line.match(/^[-•]\\s/)) {
          if (inOl) { result.push('</ol>'); inOl = false; }
          if (!inUl) { result.push('<ul style="margin:4px 0;padding-left:18px">'); inUl = true; }
          var itemText = line.replace(/^[-•]\\s/, '');
          itemText = itemText.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
          itemText = itemText.replace(/(?<!\\*)\\*(?!\\*)(.+?)(?<!\\*)\\*(?!\\*)/g, '<em>$1</em>');
          result.push('<li style="margin-bottom:2px;font-size:0.8rem;line-height:1.5">' + itemText + '</li>');
          continue;
        }

        // Numbered list: 1. item
        if (line.match(/^\\d+\\.\\s/)) {
          if (inUl) { result.push('</ul>'); inUl = false; }
          if (!inOl) { result.push('<ol style="margin:4px 0;padding-left:18px">'); inOl = true; }
          var olItem = line.replace(/^\\d+\\.\\s/, '');
          olItem = olItem.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
          olItem = olItem.replace(/(?<!\\*)\\*(?!\\*)(.+?)(?<!\\*)\\*(?!\\*)/g, '<em>$1</em>');
          result.push('<li style="margin-bottom:2px;font-size:0.8rem;line-height:1.5">' + olItem + '</li>');
          continue;
        }

        // Regular paragraph — close any open list
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }
        line = line.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
        line = line.replace(/(?<!\\*)\\*(?!\\*)(.+?)(?<!\\*)\\*(?!\\*)/g, '<em>$1</em>');
        result.push('<p style="margin:3px 0;font-size:0.8rem;line-height:1.5">' + line + '</p>');
      }

      if (inUl) result.push('</ul>');
      if (inOl) result.push('</ol>');

      return result.join('');
    }

    function showAiResult(detailId, analysis, config) {
      var el = document.getElementById('ai-' + detailId);
      if (!el) return;
      var html = '<div class="ai-result ai-fade-in">';
      html += '<div class="ai-result-header">';
      html += '<span class="ai-result-icon">\\uD83E\\uDD16</span>';
      html += '<span class="ai-result-provider">' + escapeHtml(config.provider + ' / ' + config.model) + '</span>';
      html += '<button class="ai-btn-reanalyze" style="margin-left:auto" onclick="showAiSetup(\\'' + detailId + '\\')">Settings</button>';
      html += '</div>';
      html += '<div class="ai-result-body">' + renderMarkdown(analysis) + '</div>';
      html += '<div style="margin-top:8px">';
      html += '<button class="ai-btn-reanalyze" onclick="triggerAiAnalysis(\\'' + detailId + '\\')">Re-analyze</button>';
      html += '</div></div>';
      el.innerHTML = html;
    }

    function showAiError(detailId, message) {
      var el = document.getElementById('ai-' + detailId);
      if (!el) return;

      el.innerHTML = '<div class="ai-error">' +
        '<div class="ai-error-text">' + escapeHtml(message) + '</div>' +
        '<div class="ai-error-actions">' +
          '<button class="ai-btn-reanalyze" onclick="showAiSetup(\\'' + detailId + '\\')">Change Settings</button>' +
          '<button class="ai-btn-reanalyze" onclick="triggerAiAnalysis(\\'' + detailId + '\\')">Retry</button>' +
        '</div>' +
      '</div>';
    }

    function renderFlowIntelligence(fi) {
      var categories = [
        { label: 'Smart Traders', value: fi.smart_trader_net_flow_usd, wallets: fi.smart_trader_wallet_count },
        { label: 'Public Figures', value: fi.public_figure_net_flow_usd, wallets: fi.public_figure_wallet_count },
        { label: 'Whales', value: fi.whale_net_flow_usd, wallets: fi.whale_wallet_count },
        { label: 'Top PnL Traders', value: fi.top_pnl_net_flow_usd, wallets: fi.top_pnl_wallet_count },
        { label: 'Exchanges', value: fi.exchange_net_flow_usd, wallets: fi.exchange_wallet_count, note: fi.exchange_net_flow_usd < 0 ? 'Leaving exchanges' : '' },
        { label: 'Fresh Wallets', value: fi.fresh_wallets_net_flow_usd, wallets: fi.fresh_wallets_wallet_count, note: fi.fresh_wallets_net_flow_usd > 0 ? 'New participants' : '' }
      ];

      var nonZero = categories.filter(function(c) { return c.value && c.value !== 0; });

      if (nonZero.length === 0) return '';

      if (nonZero.length === 1) {
        // Compact single-line summary
        var c = nonZero[0];
        var color = c.value >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
        var walletText = (c.wallets && c.wallets > 0) ? ' (' + c.wallets + ' wallets)' : '';
        return '<div style="margin-top:8px;padding:8px 12px;background:rgba(15,17,23,0.6);border:1px solid var(--border-color);border-radius:6px;font-size:0.78rem">' +
          '<span style="color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;font-size:0.68rem">Flow Intel</span> ' +
          '<span style="color:' + color + ';font-weight:600">' + escapeHtml(c.label) + ': ' + formatUsd(c.value) + '</span>' +
          '<span style="color:var(--text-muted)">' + walletText + '</span>' +
          (c.note ? '<span style="color:var(--text-muted);font-style:italic;margin-left:8px">' + c.note + '</span>' : '') +
          '</div>';
      }

      // Full grid for 2+ categories — only show non-zero rows
      var html = '';
      html += '<div class="flow-intel-section">';
      html += '<div class="flow-intel-title">FLOW INTELLIGENCE</div>';
      html += '<div class="flow-intel-grid">';
      for (var i = 0; i < nonZero.length; i++) {
        var c = nonZero[i];
        html += flowIntelRow(c.label, c.value, c.wallets, c.note || '');
      }
      html += '</div></div>';
      return html;
    }

    function flowIntelRow(label, netFlow, walletCount, note) {
      if (!netFlow || netFlow === 0) return '';
      var isPositive = netFlow >= 0;
      var color = isPositive ? 'var(--color-positive)' : 'var(--color-negative)';
      var arrow = isPositive ? '\\u2191' : '\\u2193';
      var walletText = (walletCount && walletCount > 0) ? '(' + walletCount + ' wallets)' : '';
      var noteHtml = note ? '<span class="flow-intel-note">' + escapeHtml(note) + '</span>' : '';
      return '<div class="flow-intel-row">' +
        '<span class="flow-intel-label">' + escapeHtml(label) + '</span>' +
        '<span class="flow-intel-value" style="color:' + color + '">' + arrow + ' ' + formatUsd(netFlow) + '</span>' +
        '<span class="flow-intel-meta">' + walletText + '</span>' +
        noteHtml +
        '</div>';
    }

    // ── Filters ────────────────────────────────────────────

    function initFilters(highlights) {
      if (!highlights || highlights.length === 0) return;

      var chainSelect = document.getElementById('filter-chain');
      var signalSelect = document.getElementById('filter-signal');
      if (!chainSelect || !signalSelect) return;

      var chains = {};
      var signals = {};
      for (var i = 0; i < highlights.length; i++) {
        var h = highlights[i];
        if (h.chain) chains[h.chain] = true;
        if (h.classification) signals[h.classification] = true;
      }

      // Populate chain options
      var chainLabels = { ethereum: 'Ethereum', solana: 'Solana', base: 'Base', bnb: 'BNB', arbitrum: 'Arbitrum' };
      var chainKeys = Object.keys(chains).sort();
      chainSelect.innerHTML = '<option value="">All Chains</option>';
      for (var c = 0; c < chainKeys.length; c++) {
        var ck = chainKeys[c];
        chainSelect.innerHTML += '<option value="' + escapeHtml(ck) + '">' + (chainLabels[ck] || ck) + '</option>';
      }

      // Populate signal options — grouped into 4 display categories
      var signalOptions = [
        { value: '', label: 'All Signals' },
        { value: 'heavy_accumulation', label: '\\uD83D\\uDD25 Hot' },
        { value: 'accumulating', label: '\\uD83D\\uDC40 Accumulating' },
        { value: 'diverging', label: '\\uD83D\\uDCCA Diverging' },
        { value: 'pumping', label: '\\uD83D\\uDE80 Pumping' },
        { value: 'mixed', label: '\\u25D0 Mixed' },
        { value: '__selling', label: '\\u26A0\\uFE0F Selling' },
      ];
      signalSelect.innerHTML = '';
      var activeSignals = {};
      for (var s = 0; s < highlights.length; s++) {
        if (highlights[s].classification) activeSignals[highlights[s].classification] = true;
      }
      for (var s = 0; s < signalOptions.length; s++) {
        var opt = signalOptions[s];
        if (!opt.value || activeSignals[opt.value] || opt.value === '__selling') {
          signalSelect.innerHTML += '<option value="' + escapeHtml(opt.value) + '">' + opt.label + '</option>';
        }
      }

      // Apply initial count
      applyFilters();
    }

    function applyFilters() {
      var chainVal = document.getElementById('filter-chain');
      var signalVal = document.getElementById('filter-signal');
      var chainFilter = chainVal ? chainVal.value : '';
      var signalFilter = signalVal ? signalVal.value : '';

      var rows = document.querySelectorAll('#main-table tbody tr.expandable-row');
      var visibleCount = 0;

      for (var i = 0; i < rows.length; i++) {
        var show = true;
        if (chainFilter && rows[i].getAttribute('data-chain') !== chainFilter) show = false;
        if (signalFilter) {
          if (signalFilter === '__selling') {
            var sig = rows[i].getAttribute('data-signal');
            if (sig !== 'mixed' && sig !== 'distributing') show = false;
          } else {
            if (rows[i].getAttribute('data-signal') !== signalFilter) show = false;
          }
        }
        if (narrativeFilter) {
          var rowNarrative = rows[i].getAttribute('data-narrative') || '';
          if (rowNarrative !== narrativeFilter && !rowNarrative.startsWith(narrativeFilter) && !narrativeFilter.startsWith(rowNarrative)) show = false;
        }
        rows[i].style.display = show ? '' : 'none';
        if (show) visibleCount++;

        // Also show/hide paired expanded-detail rows
        var next = rows[i].nextElementSibling;
        if (next && next.classList.contains('expanded-detail')) {
          if (!show) {
            next.style.display = 'none';
          } else {
            // Don't force display — let CSS .visible class control it
            // Only set display back to '' if it was hidden by filter
            if (next.style.display === 'none') {
              next.style.display = '';
            }
          }
          // Remove visible class to collapse on filter change
          next.classList.remove('visible');
          var arrow = rows[i].querySelector('.expand-arrow');
          if (arrow) arrow.classList.remove('open');
        }
      }

      // Update visible count
      var countEl = document.getElementById('visible-count');
      if (countEl) countEl.textContent = visibleCount + ' of ' + rows.length + ' tokens';
    }

    function filterTableByNarrative(narrativeName) {
      narrativeFilter = narrativeName;
      // Reset chain/signal filters for clarity
      var chainSel = document.getElementById('filter-chain');
      var signalSel = document.getElementById('filter-signal');
      if (chainSel) chainSel.value = '';
      if (signalSel) signalSel.value = '';
      applyFilters();
      // Show narrative filter indicator
      var clearBtn = document.getElementById('clear-narrative-filter');
      if (clearBtn) {
        clearBtn.style.display = 'inline-flex';
        var nameEl = document.getElementById('narrative-filter-name');
        if (nameEl) nameEl.textContent = narrativeName;
      }
      // Scroll to main table
      var table = document.getElementById('main-table');
      if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function clearNarrativeFilter() {
      narrativeFilter = null;
      applyFilters();
      var clearBtn = document.getElementById('clear-narrative-filter');
      if (clearBtn) clearBtn.style.display = 'none';
    }

    function filterBySignalGroup(group) {
      var signalSelect = document.getElementById('filter-signal');
      if (!signalSelect) return;

      if (group === 'all') {
        signalSelect.value = '';
      } else if (group === 'hot') {
        signalSelect.value = 'heavy_accumulation';
      } else if (group === 'accumulating') {
        signalSelect.value = 'accumulating';
      } else if (group === 'pumping') {
        signalSelect.value = 'pumping';
      } else if (group === 'selling') {
        signalSelect.value = '__selling';
      }

      // Clear narrative filter
      narrativeFilter = null;
      var clearBtn = document.getElementById('clear-narrative-filter');
      if (clearBtn) clearBtn.style.display = 'none';

      applyFilters();

      // Scroll to table
      var tableSection = document.getElementById('main-table');
      if (tableSection) tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Sankey Chart ───────────────────────────────────────

    function renderSankeyChart(narratives) {
      if (!narratives || narratives.length === 0) {
        var sankeySection = document.getElementById('sankey-section');
        if (sankeySection) sankeySection.style.display = 'none';
        return;
      }

      var chartDom = document.getElementById('sankey-chart');
      if (!chartDom) return;

      // Dispose previous instance to prevent memory leak
      var existingInstance = echarts.getInstanceByDom(chartDom);
      if (existingInstance) {
        existingInstance.dispose();
      }

      var chart = echarts.init(chartDom, null, { renderer: 'canvas' });

      // Take top 10 narratives by absolute netflow (no $100 threshold)
      var sorted = narratives.slice().sort(function(a, b) {
        return Math.abs(b.totalNetflow24h) - Math.abs(a.totalNetflow24h);
      });
      var topNarratives = sorted.slice(0, 10);

      if (topNarratives.length === 0) {
        var section = document.getElementById('sankey-section');
        if (section) section.style.display = 'none';
        return;
      }

      // Sort ascending so outflows (negative) appear at top, inflows (positive) at bottom
      topNarratives.sort(function(a, b) { return a.totalNetflow24h - b.totalNetflow24h; });

      // Count inflows and outflows for hint text
      var outflowCount = 0;
      var inflowCount = 0;
      for (var k = 0; k < topNarratives.length; k++) {
        if (topNarratives[k].totalNetflow24h >= 0) inflowCount++;
        else outflowCount++;
      }

      var hintEl = document.querySelector('#sankey-section .sankey-hint');
      if (hintEl) {
        if (outflowCount === 0) {
          hintEl.textContent = 'All Smart Money flows are inflows. Click a narrative to filter the table.';
        } else if (inflowCount === 0) {
          hintEl.textContent = 'All Smart Money flows are outflows. Click a narrative to filter the table.';
        } else {
          hintEl.textContent = inflowCount + ' inflows, ' + outflowCount + ' outflows. Click a narrative to filter the table.';
        }
      }

      var names = topNarratives.map(function(n) { return n.displayName; });

      chart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#2a2d3a',
          borderColor: '#3a3d4a',
          textStyle: { color: '#e8e9ed', fontSize: 13 },
          padding: [10, 14],
          extraCssText: 'border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);',
          formatter: function(params) {
            var d = params[0];
            var direction = d.value >= 0 ? 'Inflow' : 'Outflow';
            return '<strong>' + d.name + '</strong><br/>SM ' + direction + ': <strong>' + formatUsdAbs(d.value) + '</strong>';
          }
        },
        grid: { top: 10, bottom: 30, left: 130, right: 80 },
        xAxis: {
          type: 'value',
          axisLabel: {
            color: '#5a5e72',
            fontSize: 11,
            formatter: function(v) { return formatUsdAbs(v); }
          },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
          axisLine: { show: true, lineStyle: { color: '#4a4d5a', width: 1 } }
        },
        yAxis: {
          type: 'category',
          data: names,
          inverse: false,
          axisLabel: { color: '#e8e9ed', fontSize: 12, fontWeight: 500 },
          axisLine: { lineStyle: { color: '#2a2d3a' } },
          axisTick: { show: false }
        },
        series: [{
          type: 'bar',
          barMaxWidth: 24,
          label: {
            show: true,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
            formatter: function(p) { return formatUsdAbs(p.value); }
          },
          data: topNarratives.map(function(n) {
            var isInflow = n.totalNetflow24h >= 0;
            return {
              value: n.totalNetflow24h,
              itemStyle: {
                color: isInflow
                  ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: 'rgba(52, 211, 153, 0.3)' },
                      { offset: 1, color: 'rgba(52, 211, 153, 0.8)' }
                    ])
                  : new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                      { offset: 0, color: 'rgba(248, 113, 113, 0.3)' },
                      { offset: 1, color: 'rgba(248, 113, 113, 0.8)' }
                    ]),
                borderRadius: isInflow ? [0, 4, 4, 0] : [4, 0, 0, 4]
              },
              label: {
                position: isInflow ? 'right' : 'left',
                color: isInflow ? '#34d399' : '#f87171'
              }
            };
          })
        }]
      });

      chart.on('click', function(params) {
        if (params.name) {
          filterTableByNarrative(params.name);
        }
      });

      window.addEventListener('resize', function() { chart.resize(); });
    }

    // ── Empty State ────────────────────────────────────────

    function renderEmpty() {
      var main = document.getElementById('main-content');
      main.innerHTML = '<div class="empty-state">' +
        '<p style="font-size:1.2rem;margin-bottom:12px;">No data yet</p>' +
        '<p>Click "Rescan" to fetch the latest Smart Money data.</p>' +
        '</div>';
    }

    // ── Auto-Refresh ───────────────────────────────────────

    function startAutoRefresh() {
      var intervalSelect = document.getElementById('refresh-interval');
      var ms = intervalSelect ? parseInt(intervalSelect.value) : 900000;

      if (ms > 0) {
        refreshTimerId = setInterval(function() {
          fetchData()
            .then(function(data) {
              handleData(data);
            })
            .catch(function(err) {
              console.error('Auto-refresh failed:', err);
            });
        }, ms);
      }

      // Update "X min ago" text every 30 seconds
      updateAgoTimerId = setInterval(updateAgoText, 30000);
    }

    function setRefreshInterval(ms) {
      if (refreshTimerId) clearInterval(refreshTimerId);
      if (parseInt(ms) > 0) {
        refreshTimerId = setInterval(function() {
          fetchData()
            .then(function(data) {
              handleData(data);
            })
            .catch(function(err) {
              console.error('Auto-refresh failed:', err);
            });
        }, parseInt(ms));
      }
    }

    // ── Init ───────────────────────────────────────────────

    fetchData()
      .then(function(data) {
        handleData(data);
        startAutoRefresh();
      })
      .catch(function(err) {
        console.error('Initial load failed:', err);
        var main = document.getElementById('main-content');
        main.innerHTML = '<div class="error-state">' +
          '<p style="font-size:1.2rem;margin-bottom:12px;">Unable to load data</p>' +
          '<p>Retrying... Check connection.</p>' +
          '</div>';
        startAutoRefresh();
      });
  </script>
</body>
</html>`;
}
