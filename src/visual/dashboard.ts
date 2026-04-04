// ============================================================
// Dynamic Dashboard — Self-contained HTML template that fetches
// data from /api/scan and renders an interactive dashboard.
// No embedded data; all data comes via JavaScript fetch().
//
// V2: Unified table, signal overview, filters, flow intelligence,
//     narrative flows as compact table, Sankey click-to-filter.
// ============================================================

/**
 * Returns a complete HTML string for the dynamic dashboard.
 * The page polls /api/scan every 60 seconds and re-renders.
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

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px 48px;
    }

    /* ── Header ─────────────────────────────────── */

    .header {
      padding: 24px 24px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      margin-bottom: 24px;
      text-align: left;
      background: linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(129, 140, 248, 0.06) 100%);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .header-brand {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
    }

    .header-brand-sub {
      font-size: 0.82rem;
      font-weight: 400;
      color: var(--text-secondary);
      margin-left: 12px;
    }

    .header-date {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .status-text {
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .scan-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: var(--color-warning);
    }

    .scan-indicator .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-warning);
      animation: pulse 1.2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .btn-scan {
      padding: 8px 20px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-card-alt);
      color: var(--text-primary);
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-scan:hover {
      background: rgba(52, 211, 153, 0.15);
      border-color: var(--color-positive);
      box-shadow: 0 0 12px rgba(52, 211, 153, 0.15);
    }

    .btn-scan:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .credits-text {
      font-size: 0.75rem;
      color: var(--text-muted);
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
      transition: border-color 0.2s ease, transform 0.15s ease;
    }

    .signal-card:hover {
      border-color: rgba(139, 143, 163, 0.3);
      transform: translateY(-2px);
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
      padding: 6px 28px 6px 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-card-alt);
      color: var(--text-primary);
      font-size: 0.82rem;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238b8fa3' d='M3 4.5L6 8l3-3.5H3z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
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

    /* ── Main Section Card ──────────────────────── */

    .main-section-card {
      background: var(--bg-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
      border-top: 2px solid rgba(52, 211, 153, 0.3);
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
      height: 450px;
    }

    .sankey-card { margin-bottom: 32px; }
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

    .token-table tbody tr { transition: background 0.15s ease; }
    .token-table tbody tr:hover { background: var(--bg-card-hover); }
    .token-table tbody tr:last-child td { border-bottom: none; }

    .token-table .mono { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; }

    .netflow-positive { color: var(--color-positive) !important; }
    .netflow-negative { color: var(--color-negative) !important; }

    /* ── Expandable Rows ────────────────────────── */

    .token-table tbody tr.expandable-row {
      cursor: pointer;
      transition: background 0.15s ease, border-left 0.15s ease;
      border-left: 2px solid transparent;
    }

    .token-table tbody tr.expandable-row:hover {
      background: var(--bg-card-hover);
      border-left-color: rgba(129, 140, 248, 0.4);
    }

    .expand-arrow {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 4px;
      vertical-align: middle;
      transition: transform 0.2s ease;
      color: var(--text-muted);
      font-size: 0.7rem;
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
      position: relative;
      padding-right: 18px;
    }

    .token-table thead th.sortable:hover {
      color: var(--text-primary);
    }

    .token-table thead th.sortable::after {
      content: '\\2195';
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.65rem;
      color: var(--text-muted);
      opacity: 0.5;
    }

    .token-table thead th.sortable.sort-asc::after {
      content: '\\2191';
      opacity: 1;
      color: var(--color-positive);
    }

    .token-table thead th.sortable.sort-desc::after {
      content: '\\2193';
      opacity: 1;
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
      background: rgba(248, 113, 113, 0.15);
      color: var(--color-negative);
    }

    .screener-badge.mixed {
      background: rgba(139, 143, 163, 0.15);
      color: var(--text-secondary);
    }

    .screener-badge.diverging {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }

    /* ── Custom Tooltips ────────────────────────── */

    .screener-badge, .narrative-pill, .chain-badge {
      position: relative;
    }

    .screener-badge::after, .narrative-pill::after {
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
      text-transform: none;
      letter-spacing: 0;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 100;
    }

    .screener-badge::after {
      max-width: 240px;
      white-space: normal;
      text-align: center;
    }

    .screener-badge:hover::after, .narrative-pill:hover::after {
      opacity: 1;
    }

    /* ── Chain Badges ───────────────────────────── */

    .chain-badge {
      display: inline-block;
      font-size: 0.6rem;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(139, 143, 163, 0.15);
      color: var(--text-secondary);
      margin-left: 4px;
      vertical-align: middle;
      text-transform: uppercase;
    }

    .chain-ethereum { background: rgba(98, 126, 234, 0.2); color: #627eea; }
    .chain-solana { background: rgba(156, 106, 222, 0.2); color: #9c6ade; }
    .chain-base { background: rgba(0, 170, 255, 0.2); color: #00aaff; }
    .chain-bnb { background: rgba(243, 186, 47, 0.2); color: #f3ba2f; }
    .chain-arbitrum { background: rgba(40, 160, 240, 0.2); color: #28a0f0; }

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
      gap: 12px;
      padding: 3px 0;
      font-size: 0.8rem;
    }

    .flow-intel-label {
      flex: 0 0 120px;
      font-weight: 500;
      color: var(--text-secondary);
      font-size: 0.78rem;
    }

    .flow-intel-value {
      flex: 0 0 90px;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-weight: 600;
      font-size: 0.82rem;
    }

    .flow-intel-meta {
      color: var(--text-muted);
      font-size: 0.72rem;
    }

    .flow-intel-note {
      font-size: 0.68rem;
      color: var(--text-muted);
      font-style: italic;
      margin-left: auto;
    }

    /* ── Narrative Flows Table ──────────────────── */

    .narrative-flows-section {
      margin-bottom: 32px;
    }

    .narrative-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    .narrative-table thead th {
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

    .narrative-table tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(42, 45, 58, 0.5);
      color: var(--text-primary);
    }

    .narrative-table tbody tr {
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .narrative-table tbody tr:hover { background: var(--bg-card-hover); }
    .narrative-table tbody tr:last-child td { border-bottom: none; }

    .narrative-table .mono { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; }

    .dot-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      vertical-align: middle;
    }

    .dot-positive { background: var(--color-positive); }
    .dot-negative { background: var(--color-negative); }

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

    .error-state { color: var(--color-negative); }

    /* ── Footer ─────────────────────────────────── */

    .footer {
      text-align: center;
      padding: 24px;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border-color);
      margin-top: 32px;
    }

    /* ── Responsive ─────────────────────────────── */

    @media (max-width: 768px) {
      .signal-overview { grid-template-columns: repeat(2, 1fr); }
      .card { padding: 16px; }
      .main-section-card { padding: 16px; }
      #sankey-chart { height: 350px; }
      .token-table { font-size: 0.78rem; }
      .token-table thead th,
      .token-table tbody td { padding: 8px 6px; }
      .narrative-table { font-size: 0.78rem; }
      .narrative-table thead th,
      .narrative-table tbody td { padding: 8px 6px; }
      .filter-bar { flex-direction: column; align-items: flex-start; }
      .flow-intel-row { flex-wrap: wrap; gap: 4px; }
      .flow-intel-label { flex: 0 0 auto; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header" id="report-header">
      <div class="header-top">
        <div>
          <span class="header-brand">NARRATIVE PULSE</span>
          <span class="header-brand-sub">Smart Money Intelligence</span>
        </div>
        <div class="header-date" id="header-date"></div>
      </div>
      <div class="header-actions">
        <span class="status-text" id="last-updated">Loading...</span>
        <span class="scan-indicator" id="scan-indicator" style="display:none">
          <span class="dot"></span> Scanning...
        </span>
        <button class="btn-scan" id="btn-scan" onclick="triggerScan()">Rescan</button>
        <span class="credits-text" id="credits-text"></span>
      </div>
    </header>

    <!-- Main content area -->
    <div id="main-content">
      <div class="loading-state" id="loading-state">
        <div class="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Powered by Nansen API (4 endpoints) + DexScreener &middot; ~300 credits/scan
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
      if (value <= 0) return '\\u2014';
      if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
      if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
      if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
      return '$' + Math.round(value).toLocaleString('en-US');
    }

    function formatPercent(value) {
      if (value === 0) return '\\u2014';
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
      return str.replace(/[\\u{1F600}-\\u{1F64F}\\u{1F300}-\\u{1F5FF}\\u{1F680}-\\u{1F6FF}\\u{1F1E0}-\\u{1F1FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{FE00}-\\u{FE0F}\\u{1F900}-\\u{1F9FF}\\u{1FA00}-\\u{1FA6F}\\u{1FA70}-\\u{1FAFF}\\u{200D}\\u{20E3}\\u{E0020}-\\u{E007F}\\u2713\\u2717\\u2714\\u2716\\u2605\\u2606\\u25BA\\u25BC\\u25B2}]/gu, '').trim();
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

    function updateAgoText() {
      var el = document.getElementById('last-updated');
      if (!el) return;
      if (!lastScanTime) {
        el.textContent = 'No data yet';
        return;
      }
      el.textContent = 'Updated ' + minutesAgo(lastScanTime);
    }

    function chainBadge(chain) {
      var cls = 'chain-badge chain-' + chain;
      var labels = { ethereum: 'ETH', solana: 'SOL', base: 'BASE', bnb: 'BNB', arbitrum: 'ARB' };
      return '<span class="' + cls + '">' + (labels[chain] || chain) + '</span>';
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
      // Date
      var dateStr = data.timestamp
        ? new Date(data.timestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        : 'N/A';
      document.getElementById('header-date').textContent = dateStr;

      // Credits
      var creditsEl = document.getElementById('credits-text');
      if (creditsEl && data.creditsUsed) {
        creditsEl.textContent = data.creditsUsed + ' credits used';
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
      html += renderMainTable(data.screenerHighlights);
      html += renderSankeySection(data.narratives);
      html += renderNarrativeFlows(data.narratives);
      main.innerHTML = html;
      initFilters(data.screenerHighlights);
      setTimeout(function() { renderSankeyChart(data.narratives); }, 50);
    }

    // ── Signal Overview ────────────────────────────────────

    function renderSignalOverview(highlights) {
      var counts = { heavy_accumulation: 0, accumulating: 0, diverging: 0, pumping: 0 };
      if (highlights && highlights.length > 0) {
        for (var i = 0; i < highlights.length; i++) {
          var c = highlights[i].classification;
          if (c === 'heavy_accumulation') counts.heavy_accumulation++;
          else if (c === 'accumulating') counts.accumulating++;
          else if (c === 'diverging') counts.diverging++;
          else if (c === 'pumping') counts.pumping++;
        }
      }

      var total = highlights ? highlights.length : 0;
      var html = '';
      html += '<div class="signal-overview">';
      html += '<div class="signal-card">';
      html += '<div class="signal-card-icon">\\uD83D\\uDD25</div>';
      html += '<div class="signal-card-value">' + counts.heavy_accumulation + '</div>';
      html += '<div class="signal-card-label">HOT</div>';
      html += '<div class="signal-card-hint">Strong SM flow, rising price</div>';
      html += '</div>';
      html += '<div class="signal-card">';
      html += '<div class="signal-card-icon">\\uD83D\\uDC40</div>';
      html += '<div class="signal-card-value">' + counts.accumulating + '</div>';
      html += '<div class="signal-card-label">WATCH</div>';
      html += '<div class="signal-card-hint">SM accumulating, price flat</div>';
      html += '</div>';
      html += '<div class="signal-card">';
      html += '<div class="signal-card-icon">\\uD83D\\uDCCA</div>';
      html += '<div class="signal-card-value">' + counts.diverging + '</div>';
      html += '<div class="signal-card-label">DIVERGE</div>';
      html += '<div class="signal-card-hint">SM in, price hasn\\'t moved</div>';
      html += '</div>';
      html += '<div class="signal-card">';
      html += '<div class="signal-card-icon">\\uD83D\\uDE80</div>';
      html += '<div class="signal-card-value">' + counts.pumping + '</div>';
      html += '<div class="signal-card-label">PUMPING</div>';
      html += '<div class="signal-card-hint">Price surged >30%</div>';
      html += '</div>';
      html += '</div>';
      html += '<div class="signal-explanation">\\u24D8 From 500+ tokens across 5 chains. Top ' + total + ' by composite score: buy/sell ratio, netflow, and SM trader activity.</div>';
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
      html += '<th title="Token symbol and chain">Token</th>';
      html += '<th title="Narrative sector">Narrative</th>';
      html += '<th class="sortable" title="Smart Money net capital flow over 24 hours (buys minus sells)" onclick="sortTable(\\'' + tableId + '\\', 2, \\'number\\')">Netflow 24h</th>';
      html += '<th title="Visual ratio of buy volume (green) vs sell volume (red)">Buy / Sell</th>';
      html += '<th class="sortable" title="Buy volume divided by sell volume" onclick="sortTable(\\'' + tableId + '\\', 4, \\'number\\')">Ratio</th>';
      html += '<th class="sortable" title="Price change over the last 24 hours" onclick="sortTable(\\'' + tableId + '\\', 5, \\'number\\')">Price \\u0394</th>';
      html += '<th class="sortable" title="Current market capitalization" onclick="sortTable(\\'' + tableId + '\\', 6, \\'number\\')">Market Cap</th>';
      html += '<th class="sortable" title="Signal classification" onclick="sortTable(\\'' + tableId + '\\', 7, \\'text\\')">Signal</th>';
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
      var priceText = t.priceChange === 0 ? '\\u2014' : formatPercent(t.priceChange);

      var totalVol = Math.abs(t.buyVolume) + Math.abs(t.sellVolume);
      var buyPct = totalVol > 0 ? (Math.abs(t.buyVolume) / totalVol * 100) : 50;
      var sellPct = 100 - buyPct;
      var ratioText = t.buySellRatio >= 99 ? '99x+' : t.buySellRatio.toFixed(1) + 'x';

      var badgeClass = t.classification === 'pumping' ? 'pumping' :
                       t.classification === 'heavy_accumulation' ? 'heavy-accumulation' :
                       t.classification === 'diverging' ? 'diverging' :
                       t.classification === 'accumulating' ? 'accumulating' :
                       t.classification === 'mixed' ? 'mixed' : 'distributing';
      var badgeText = t.classification === 'pumping' ? '\\uD83D\\uDE80 PUMPING' :
                      t.classification === 'heavy_accumulation' ? '\\uD83D\\uDD25 HEAVY ACCUM' :
                      t.classification === 'diverging' ? '\\uD83D\\uDCCA DIVERGING' :
                      t.classification === 'accumulating' ? '\\uD83D\\uDC40 ACCUM' :
                      t.classification === 'mixed' ? '\\u25D0 MIXED' : '\\u26A0\\uFE0F DIST';
      var badgeTooltip = t.classification === 'pumping' ? 'High SM buying ratio but token already pumped > 30% — caution' :
                         t.classification === 'heavy_accumulation' ? 'Buy/sell ratio \\u2265 3.0: Strong Smart Money buying' :
                         t.classification === 'diverging' ? 'Sustained 7-day SM accumulation but price hasn\\'t moved — potential divergence' :
                         t.classification === 'accumulating' ? 'Buy/sell ratio \\u2265 1.5: Moderate Smart Money buying' :
                         t.classification === 'mixed' ? 'Positive netflow but buy/sell ratio < 1.5: Mixed signal' : 'Negative netflow & low ratio: Smart Money is selling';

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
      html += '<td><span class="expand-arrow">\\u25B6</span>' + dexLink(t.chain, t.token_address, '<strong>$' + escapeHtml(stripEmoji(t.token_symbol)) + '</strong>') + chainBadge(t.chain) + '</td>';
      html += '<td><span class="narrative-pill" data-tooltip="' + escapeHtml(narrativeDisplay) + '">' + escapeHtml(narrativeDisplay) + '</span></td>';
      html += '<td class="mono ' + netflowCls + '">' + formatUsd(t.netflowUsd) + '</td>';
      html += '<td><div class="buy-sell-bar"><div class="buy-bar" style="width:' + buyPct.toFixed(1) + '%"></div><div class="sell-bar" style="width:' + sellPct.toFixed(1) + '%"></div></div></td>';
      html += '<td class="mono" style="color: var(--color-positive)">' + ratioText + '</td>';
      html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
      html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
      html += '<td><span class="screener-badge ' + badgeClass + '" data-tooltip="' + badgeTooltip + '">' + badgeText + '</span></td>';
      html += '</tr>';

      // Expanded detail row
      html += '<tr class="expanded-detail" id="' + detailId + '"><td colspan="8">';
      html += renderExpandedDetail(t);
      html += '</td></tr>';

      return html;
    }

    function renderExpandedDetail(t) {
      var html = '';

      // Row 1: Price, MCap, FDV, Liq, Vol 24h
      html += '<div class="detail-grid" style="margin-bottom:10px">';
      html += '<div><div class="detail-item-label">Price</div><div class="detail-item-value">' + (t.priceUsd ? ('$' + t.priceUsd.toFixed(t.priceUsd < 1 ? 6 : t.priceUsd < 100 ? 4 : 2)) : '\\u2014') + '</div></div>';
      html += '<div><div class="detail-item-label">Market Cap</div><div class="detail-item-value">' + formatMcap(t.marketCapUsd) + '</div></div>';
      html += '<div><div class="detail-item-label">FDV</div><div class="detail-item-value">' + (t.fdv ? formatMcap(t.fdv) : '\\u2014') + '</div></div>';
      html += '<div><div class="detail-item-label">Liquidity</div><div class="detail-item-value">' + (t.liquidity ? formatUsdAbs(t.liquidity) : '\\u2014') + '</div></div>';
      html += '<div><div class="detail-item-label">Volume 24h</div><div class="detail-item-value">' + formatVolume(t.volume) + '</div></div>';
      html += '</div>';

      // Row 2: Netflow 24h, 7d, 30d
      html += '<div class="detail-grid" style="margin-bottom:10px">';
      var nf24Cls = t.netflowUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
      html += '<div><div class="detail-item-label">Netflow 24h</div><div class="detail-item-value ' + nf24Cls + '">' + formatUsd(t.netflowUsd) + '</div></div>';
      var nf7d = t.netflow7dUsd ?? 0;
      var nf7dCls = nf7d >= 0 ? 'netflow-positive' : 'netflow-negative';
      html += '<div><div class="detail-item-label">Netflow 7d</div><div class="detail-item-value ' + nf7dCls + '">' + formatUsd(nf7d) + '</div></div>';
      var nf30d = t.netflow30dUsd ?? 0;
      var nf30dCls = nf30d >= 0 ? 'netflow-positive' : 'netflow-negative';
      html += '<div><div class="detail-item-label">Netflow 30d</div><div class="detail-item-value ' + nf30dCls + '">' + formatUsd(nf30d) + '</div></div>';
      html += '</div>';

      // Row 3: Buy Vol, Sell Vol, Ratio
      html += '<div class="detail-grid" style="margin-bottom:8px">';
      html += '<div><div class="detail-item-label">Buy Volume</div><div class="detail-item-value netflow-positive">' + formatVolume(t.buyVolume) + '</div></div>';
      html += '<div><div class="detail-item-label">Sell Volume</div><div class="detail-item-value netflow-negative">' + formatVolume(t.sellVolume) + '</div></div>';
      var ratioText = t.buySellRatio >= 99 ? '99x+' : t.buySellRatio.toFixed(1) + 'x';
      html += '<div><div class="detail-item-label">Buy/Sell Ratio</div><div class="detail-item-value">' + ratioText + '</div></div>';
      html += '<div><div class="detail-item-label">SM Traders</div><div class="detail-item-value">' + (t.traderCount || ((t.nofBuyers || 0) + (t.nofSellers || 0))) + '</div></div>';
      html += '</div>';

      // Flow Intelligence (optional)
      if (t.flowIntelligence) {
        html += renderFlowIntelligence(t.flowIntelligence);
      }

      // DexScreener link
      html += '<a class="detail-link" href="' + dexScreenerUrl(t.chain, t.token_address) + '" target="_blank" rel="noopener">View on DexScreener \\u2197</a>';

      return html;
    }

    function renderFlowIntelligence(fi) {
      var html = '';
      html += '<div class="flow-intel-section">';
      html += '<div class="flow-intel-title">FLOW INTELLIGENCE</div>';
      html += '<div class="flow-intel-grid">';
      html += flowIntelRow('Smart Traders', fi.smart_trader_net_flow_usd, fi.smart_trader_wallet_count, '');
      html += flowIntelRow('Public Figures', fi.public_figure_net_flow_usd, fi.public_figure_wallet_count, '');
      html += flowIntelRow('Whales', fi.whale_net_flow_usd, fi.whale_wallet_count, '');
      html += flowIntelRow('Top PnL Traders', fi.top_pnl_net_flow_usd, fi.top_pnl_wallet_count, '');
      // Exchanges: special interpretation
      var exchangeNote = fi.exchange_net_flow_usd < 0 ? 'Tokens leaving exchanges' : 'Tokens entering exchanges';
      html += flowIntelRow('Exchanges', fi.exchange_net_flow_usd, fi.exchange_wallet_count, exchangeNote);
      // Fresh Wallets: special interpretation
      var freshNote = fi.fresh_wallets_net_flow_usd > 0 ? 'New retail participants' : '';
      html += flowIntelRow('Fresh Wallets', fi.fresh_wallets_net_flow_usd, fi.fresh_wallets_wallet_count, freshNote);
      html += '</div></div>';
      return html;
    }

    function flowIntelRow(label, netFlow, walletCount, note) {
      var isPositive = netFlow >= 0;
      var color = isPositive ? 'var(--color-positive)' : 'var(--color-negative)';
      var indicator = '';
      if (label === 'Exchanges') {
        indicator = isPositive ? '\\u2705' : '\\u26A0\\uFE0F';
      } else if (label === 'Fresh Wallets') {
        indicator = isPositive ? '\\uD83D\\uDD04' : '\\u274C';
      } else {
        indicator = isPositive ? '\\u2705' : '\\u274C';
      }
      var walletText = (walletCount && walletCount > 0) ? '(' + walletCount + ' wallets)' : '';
      var noteHtml = note ? '<span class="flow-intel-note">' + escapeHtml(note) + '</span>' : '';
      return '<div class="flow-intel-row">' +
        '<span class="flow-intel-label">' + escapeHtml(label) + '</span>' +
        '<span class="flow-intel-value" style="color:' + color + '">' + formatUsd(netFlow) + '</span>' +
        '<span class="flow-intel-meta">' + walletText + ' ' + indicator + '</span>' +
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

      // Populate signal options
      var signalLabels = {
        pumping: '🚀 Pumping',
        heavy_accumulation: '🔥 Hot',
        accumulating: '👀 Watch',
        diverging: '📊 Diverging',
        mixed: '◐ Mixed',
        distributing: '⚠️ Distributing'
      };
      var signalOrder = ['pumping', 'heavy_accumulation', 'accumulating', 'diverging', 'mixed', 'distributing'];
      signalSelect.innerHTML = '<option value="">All Signals</option>';
      for (var s = 0; s < signalOrder.length; s++) {
        var sk = signalOrder[s];
        if (signals[sk]) {
          signalSelect.innerHTML += '<option value="' + escapeHtml(sk) + '">' + (signalLabels[sk] || sk) + '</option>';
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
        if (signalFilter && rows[i].getAttribute('data-signal') !== signalFilter) show = false;
        if (narrativeFilter && rows[i].getAttribute('data-narrative') !== narrativeFilter) show = false;
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

    // ── Sankey Section ─────────────────────────────────────

    function renderSankeySection(narratives) {
      var html = '<div class="card sankey-card" id="sankey-section">';
      html += '<div class="card-title">Capital Flow Map</div>';
      html += '<div id="sankey-chart" style="width:100%;height:450px"></div>';
      html += '<div class="sankey-hint">Click a narrative to filter the table above</div>';
      html += '</div>';
      return html;
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
      var chart = echarts.init(chartDom, null, { renderer: 'canvas' });

      var outflows = narratives.filter(function(n) { return n.totalNetflow24h < -100; });
      var inflows = narratives.filter(function(n) { return n.totalNetflow24h > 100; });

      // Update hint text
      var hintEl = document.querySelector('#sankey-section .sankey-hint');
      if (hintEl) {
        if (outflows.length === 0) {
          hintEl.textContent = 'Smart Money is flowing into narratives. Click a narrative to filter the table.';
        } else if (inflows.length === 0) {
          hintEl.textContent = 'Smart Money is exiting these narratives. Click a narrative to filter the table.';
        } else {
          hintEl.textContent = 'Outflows \\u2192 Smart Money \\u2192 Inflows. Click a narrative to filter the table.';
        }
      }

      if (outflows.length === 0 && inflows.length === 0) {
        sankeySection = document.getElementById('sankey-section');
        if (sankeySection) sankeySection.style.display = 'none';
        return;
      }

      var nodeAlign = outflows.length === 0 ? 'left' : 'justify';

      var nodes = [];
      var links = [];

      nodes.push({ name: 'Smart Money', itemStyle: { color: '#818cf8' } });

      outflows.forEach(function(n) {
        nodes.push({ name: n.displayName, itemStyle: { color: '#f87171' } });
        var rawValue = Math.abs(n.totalNetflow24h);
        var displayValue = Math.max(Math.pow(rawValue, 0.4), 5);
        links.push({
          source: n.displayName, target: 'Smart Money', value: displayValue,
          _rawValue: rawValue,
          lineStyle: { color: 'rgba(248, 113, 113, 0.5)' }
        });
      });

      inflows.forEach(function(n) {
        nodes.push({ name: n.displayName, itemStyle: { color: '#34d399' } });
        var rawValue = Math.abs(n.totalNetflow24h);
        var displayValue = Math.max(Math.pow(rawValue, 0.4), 5);
        links.push({
          source: 'Smart Money', target: n.displayName, value: displayValue,
          _rawValue: rawValue,
          lineStyle: { color: 'rgba(52, 211, 153, 0.5)' }
        });
      });

      chart.setOption({
        tooltip: {
          trigger: 'item',
          triggerOn: 'mousemove',
          backgroundColor: '#2a2d3a',
          borderColor: '#3a3d4a',
          textStyle: { color: '#e8e9ed', fontSize: 13 },
          padding: [10, 14],
          extraCssText: 'border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);',
          formatter: function(params) {
            if (params.dataType === 'edge') {
              var realValue = params.data._rawValue != null ? params.data._rawValue : params.data.value;
              var direction = params.data.source === 'Smart Money' ? 'Inflow' : 'Outflow';
              return params.data.source + ' \\u2192 ' + params.data.target +
                '<br/>' + direction + ': <strong>' + formatUsdAbs(realValue) + '</strong>';
            }
            return '<strong>' + params.name + '</strong>';
          }
        },
        series: [{
          type: 'sankey',
          layout: 'none',
          emphasis: { focus: 'adjacency' },
          nodeAlign: nodeAlign,
          nodeGap: 20,
          nodeWidth: 24,
          layoutIterations: 32,
          top: 55,
          bottom: 30,
          left: 80,
          right: 120,
          label: { fontSize: 13, color: '#e8e9ed', fontWeight: 500, overflow: 'none', position: 'right' },
          lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.4 },
          data: nodes,
          links: links
        }]
      });

      chart.on('click', function(params) {
        if (params.dataType === 'node' && params.name !== 'Smart Money') {
          filterTableByNarrative(params.name);
        }
      });

      window.addEventListener('resize', function() { chart.resize(); });
    }

    // ── Narrative Flows ────────────────────────────────────

    function renderNarrativeFlows(narratives) {
      if (!narratives || narratives.length === 0) return '';

      // Filter: show all narratives with 2+ tokens (classifier is strict, may not produce topTokens)
      var filtered = narratives.filter(function(n) {
        return n.tokenCount >= 2;
      });

      if (filtered.length === 0) return '';

      var html = '<div class="narrative-flows-section">';
      html += '<h3 class="section-heading">Narrative Flows</h3>';
      html += '<div class="section-body">';
      html += '<table class="narrative-table">';
      html += '<thead><tr>';
      html += '<th>Narrative</th>';
      html += '<th>24h Flow</th>';
      html += '<th>7d Flow</th>';
      html += '<th>Tokens</th>';
      html += '<th>Signal</th>';
      html += '</tr></thead><tbody>';

      for (var i = 0; i < filtered.length; i++) {
        var n = filtered[i];
        var nf24Cls = n.totalNetflow24h >= 0 ? 'netflow-positive' : 'netflow-negative';
        var nf7dCls = n.totalNetflow7d >= 0 ? 'netflow-positive' : 'netflow-negative';
        var dotCls = n.isHot ? 'dot-positive' : 'dot-negative';

        // Top token
        var topTokenSymbol = '\\u2014';
        if (n.topTokens && n.topTokens.length > 0) {
          topTokenSymbol = '$' + escapeHtml(stripEmoji(n.topTokens[0].token_symbol));
        }

        html += '<tr onclick="filterTableByNarrative(\\'' + escapeHtml(n.displayName).replace(/'/g, "\\'") + '\\')" title="Click to filter table by ' + escapeHtml(n.displayName) + '">';
        html += '<td><strong>' + escapeHtml(n.displayName) + '</strong></td>';
        html += '<td class="mono ' + nf24Cls + '">' + formatUsd(n.totalNetflow24h) + '</td>';
        html += '<td class="mono ' + nf7dCls + '">' + (n.totalNetflow7d ? formatUsd(n.totalNetflow7d) : '\\u2014') + '</td>';
        html += '<td class="mono">' + n.tokenCount + '</td>';
        html += '<td><span class="dot-indicator ' + dotCls + '"></span> <span style="font-size:0.78rem;color:var(--text-secondary)">' + topTokenSymbol + '</span></td>';
        html += '</tr>';
      }

      html += '</tbody></table>';
      html += '</div></div>';
      return html;
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
      // Poll every 60 seconds
      refreshTimerId = setInterval(function() {
        fetchData()
          .then(function(data) {
            handleData(data);
          })
          .catch(function(err) {
            console.error('Auto-refresh failed:', err);
          });
      }, 60000);

      // Update "X min ago" text every 30 seconds
      updateAgoTimerId = setInterval(updateAgoText, 30000);
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
          '<p>Retrying in 60 seconds...</p>' +
          '</div>';
        startAutoRefresh();
      });
  </script>
</body>
</html>`;
}
