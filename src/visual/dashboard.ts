// ============================================================
// Dynamic Dashboard — Self-contained HTML template that fetches
// data from /api/scan and renders an interactive dashboard.
// No embedded data; all data comes via JavaScript fetch().
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
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 24px;
      text-align: left;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header-brand {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
    }

    .header-date {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .header-highlights {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .highlight-card {
      padding: 18px 22px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--bg-card), var(--bg-card-alt));
      border: 1px solid var(--border-color);
      transition: border-color 0.2s ease;
    }

    .highlight-card:hover {
      border-color: rgba(139, 143, 163, 0.3);
    }

    .highlight-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .highlight-value {
      font-size: 1.3rem;
      font-weight: 700;
      color: #ffffff;
    }

    .highlight-sub {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    /* ── Stats Row ──────────────────────────────── */

    .stats-row {
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
    }

    .stat { text-align: center; }
    .stat-value { font-size: 1.35rem; font-weight: 700; color: #ffffff; }
    .stat-label { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

    .status-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 12px;
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
      transition: all 0.15s ease;
    }

    .btn-scan:hover {
      background: var(--bg-card-hover);
      border-color: var(--color-positive);
    }

    .btn-scan:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

    .section-title {
      font-size: 1.3rem;
      font-weight: 700;
      padding: 14px 20px;
      border-radius: var(--radius) var(--radius) 0 0;
      margin-bottom: 0;
    }

    .section-title.narratives-title {
      background: linear-gradient(135deg, rgba(129, 140, 248, 0.12), rgba(129, 140, 248, 0.04));
      color: #a5b4fc;
      border: 1px solid rgba(129, 140, 248, 0.2);
      border-bottom: none;
    }

    .section-body {
      border: 1px solid var(--border-color);
      border-top: none;
      border-radius: 0 0 var(--radius) var(--radius);
      padding: 16px;
    }

    /* ── Narrative Cards ────────────────────────── */

    .narrative-card {
      background: var(--bg-card);
      border-radius: var(--radius);
      padding: 20px 24px;
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--border-color);
      scroll-margin-top: 24px;
    }

    .narrative-card.border-positive { border-left-color: var(--color-positive); }
    .narrative-card.border-negative { border-left-color: var(--color-negative); }

    .narrative-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
    }

    .narrative-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: #ffffff;
    }

    .narrative-metrics {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;
    }

    .metric { font-size: 0.85rem; color: var(--text-secondary); }
    .metric strong { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; }

    .netflow-positive { color: var(--color-positive) !important; }
    .netflow-negative { color: var(--color-negative) !important; }

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

    /* ── Expandable Rows ────────────────────────── */

    .token-table tbody tr.expandable-row { cursor: pointer; }
    .token-table tbody tr.expandable-row:hover { background: var(--bg-card-hover); }

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
    }

    .expanded-detail.visible { display: table-row; }

    .expanded-detail td {
      padding: 12px 16px !important;
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

    /* ── Early Badge ────────────────────────────── */

    .early-badge {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(52, 211, 153, 0.15);
      color: var(--color-positive);
      margin-left: 6px;
      vertical-align: middle;
    }

    /* ── Sub-narratives ─────────────────────────── */

    .sub-narrative-card {
      background: var(--bg-card-alt);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      border-left: 3px solid var(--text-secondary);
    }

    .sub-narrative-card.conviction-high { border-left-color: var(--color-positive); }
    .sub-narrative-card.conviction-medium { border-left-color: #fbbf24; }
    .sub-narrative-card.conviction-low { border-left-color: var(--color-negative); }

    .sub-narrative-name { font-weight: 600; font-size: 1rem; color: #ffffff; }

    .sub-narrative-meta {
      display: flex;
      gap: 16px;
      margin-top: 6px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      flex-wrap: wrap;
    }

    .sub-narrative-tokens { margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary); }

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

    /* ── Screener Highlights ───────────────────── */

    .screener-highlights-card {
      background: var(--bg-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-left: 4px solid var(--color-warning);
    }

    .screener-title {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 4px;
      color: #ffffff;
    }

    .screener-subtitle {
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

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

    /* ── Responsive ─────────────────────────────── */

    @media (max-width: 768px) {
      .header-highlights { grid-template-columns: 1fr; }
      .stats-row { gap: 20px; }
      .card { padding: 16px; }
      .narrative-card { padding: 14px 16px; }
      #sankey-chart { height: 350px; }
      .narrative-header { flex-direction: column; align-items: flex-start; }
      .token-table { font-size: 0.78rem; }
      .token-table thead th,
      .token-table tbody td { padding: 8px 6px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header" id="report-header">
      <div class="header-top">
        <div class="header-brand">Narrative Pulse</div>
        <div class="header-date" id="header-date"></div>
      </div>
      <div class="header-highlights" id="header-highlights"></div>
      <div class="stats-row" id="header-stats"></div>
      <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-top:12px">
        <span class="status-text" id="last-updated">Loading...</span>
        <span class="scan-indicator" id="scan-indicator" style="display:none">
          <span class="dot"></span> Scanning...
        </span>
        <button class="btn-scan" id="btn-scan" onclick="triggerScan()">Run Scan</button>
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
      Narrative Pulse &mdash; Powered by Nansen Smart Money Data
    </div>
  </div>

  <script>
    // ── State ──────────────────────────────────────────────
    var currentData = null;
    var lastScanTime = null;
    var refreshTimerId = null;
    var updateAgoTimerId = null;

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
          displayName: n.displayName,
          totalNetflow24h: n.totalNetflow24h,
          totalNetflow7d: n.totalNetflow7d,
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
        subNarratives: scan.subNarratives || [],
        topNarrativeKey: scan.topNarrativeKey || null,
        rotations: scan.rotations || []
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

      // Highlight cards
      var highlightsEl = document.getElementById('header-highlights');
      var highlightHtml = '';

      // Card 1: Top SM Activity
      var topScreener = (data.screenerHighlights && data.screenerHighlights.length > 0)
        ? data.screenerHighlights[0] : null;
      if (topScreener) {
        var screenerCls = topScreener.netflowUsd >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
        highlightHtml += '<div class="highlight-card">';
        highlightHtml += '<div class="highlight-label">Top SM Activity</div>';
        highlightHtml += '<div class="highlight-value">$' + escapeHtml(topScreener.token_symbol) + ' <span style="color:' + screenerCls + '">' + formatUsd(topScreener.netflowUsd) + '</span></div>';
        var totalTraders = (topScreener.nofBuyers || 0) + (topScreener.nofSellers || 0);
        var traderText = totalTraders > 0 ? totalTraders + ' SM traders' : 'Active';
        highlightHtml += '<div class="highlight-sub">' + traderText + ' \\u00B7 ' + formatPercent(topScreener.priceChange) + ' 24h</div>';
        highlightHtml += '</div>';
      } else {
        highlightHtml += '<div class="highlight-card"><div class="highlight-label">Top SM Activity</div><div class="highlight-value" style="color:var(--text-muted)">No data</div></div>';
      }

      // Card 2: Top Narrative Inflow
      var strongest = data.narratives && data.narratives.length > 0 ? data.narratives[0] : null;
      if (strongest) {
        var narCls = strongest.totalNetflow24h >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
        var direction = strongest.totalNetflow24h >= 0 ? 'into' : 'out of';
        highlightHtml += '<div class="highlight-card">';
        highlightHtml += '<div class="highlight-label">Top Narrative Signal</div>';
        highlightHtml += '<div class="highlight-value">SM flowing ' + direction + ' <span style="color:' + narCls + '">' + escapeHtml(strongest.displayName) + '</span></div>';
        highlightHtml += '<div class="highlight-sub">' + formatUsd(strongest.totalNetflow24h) + ' 24h \\u00B7 ' + strongest.topTokens.length + ' classified tokens</div>';
        highlightHtml += '</div>';
      } else {
        highlightHtml += '<div class="highlight-card"><div class="highlight-label">Top Narrative Signal</div><div class="highlight-value" style="color:var(--text-muted)">No data</div></div>';
      }

      highlightsEl.innerHTML = highlightHtml;

      // Stats row
      var classifiedTokens = 0;
      data.narratives.forEach(function(n) { classifiedTokens += n.topTokens.length; });

      var statsEl = document.getElementById('header-stats');
      statsEl.innerHTML =
        '<div class="stat"><div class="stat-value">' + data.narrativeCount + '</div><div class="stat-label">Active Narratives</div></div>' +
        '<div class="stat"><div class="stat-value">' + classifiedTokens + '</div><div class="stat-label">Classified Tokens</div></div>' +
        '<div class="stat"><div class="stat-value">' + (data.screenerHighlights ? data.screenerHighlights.length : 0) + '</div><div class="stat-label">SM Active Tokens</div></div>' +
        '<div class="stat"><div class="stat-value">' + data.creditsUsed + '</div><div class="stat-label">Credits Used</div></div>';
    }

    // ── Main Dashboard Rendering ───────────────────────────

    function renderDashboard(data) {
      renderHeader(data);
      updateAgoText();

      var main = document.getElementById('main-content');
      var html = '';

      // Screener Highlights (HERO section — always rich data)
      if (data.screenerHighlights && data.screenerHighlights.length > 0) {
        html += renderScreenerHighlights(data.screenerHighlights);
      }

      // Capital Flow Map (Sankey)
      html += '<div class="card sankey-card" id="sankey-section">';
      html += '<div class="card-title">Capital Flow Map</div>';
      html += '<div id="sankey-chart" style="width:100%;height:450px"></div>';
      html += '<div class="sankey-hint">Outflows \\u2192 Smart Money \\u2192 Inflows</div>';
      html += '</div>';

      // Narrative Breakdown (unified)
      if (data.narratives && data.narratives.length > 0) {
        html += '<section class="section" id="section-narratives">';
        html += '<h2 class="section-title narratives-title">Narrative Breakdown</h2>';
        html += '<div class="section-body" id="narratives-container">';
        data.narratives.forEach(function(n, idx) {
          html += renderNarrativeCard(n, idx);
        });
        html += '</div></section>';
      }

      // Sub-narratives
      if (data.subNarratives && data.subNarratives.length > 0) {
        html += renderSubNarratives(data.subNarratives, data.topNarrativeKey);
      }

      // Early Signals
      if (data.earlySignals && data.earlySignals.length > 0) {
        html += renderEarlySignals(data.earlySignals);
      }

      main.innerHTML = html;

      // Initialize Sankey chart after DOM update
      setTimeout(function() { renderSankeyChart(data.narratives); }, 50);
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
          hintEl.textContent = 'Smart Money is flowing into narratives. Click a node to jump to details.';
        } else if (inflows.length === 0) {
          hintEl.textContent = 'Smart Money is exiting these narratives. Click a node to jump to details.';
        } else {
          hintEl.textContent = 'Outflows \\u2192 Smart Money \\u2192 Inflows. Click a node to jump to details.';
        }
      }

      if (outflows.length === 0 && inflows.length === 0) {
        var sankeySection = document.getElementById('sankey-section');
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
          var slug = slugify(params.name);
          var el = document.getElementById('narrative-' + slug);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      window.addEventListener('resize', function() { chart.resize(); });
    }

    // ── Screener Highlights ────────────────────────────────

    function renderScreenerHighlights(highlights) {
      var tableId = 'screener-table';
      var html = '<div class="screener-highlights-card">';
      html += '<div class="screener-title">\\uD83D\\uDD25 Smart Money Active Tokens</div>';
      html += '<div class="screener-subtitle">Top tokens by Smart Money buy/sell ratio and netflow \\u2014 always fresh data from 500+ tokens</div>';

      html += '<table class="token-table" id="' + tableId + '">';
      html += '<thead><tr>';
      html += '<th title="Token symbol and chain">Token</th>';
      html += '<th class="sortable" title="Smart Money net capital flow over 24 hours (buys minus sells)" onclick="sortTable(\\'' + tableId + '\\', 1, \\'number\\')">Netflow 24h</th>';
      html += '<th title="Visual ratio of buy volume (green) vs sell volume (red)">Buy / Sell</th>';
      html += '<th class="sortable" title="Buy volume divided by sell volume \\u2014 higher means more buying pressure" onclick="sortTable(\\'' + tableId + '\\', 3, \\'number\\')">Ratio</th>';
      html += '<th class="sortable" title="Price change over the last 24 hours" onclick="sortTable(\\'' + tableId + '\\', 4, \\'number\\')">Price \\u0394</th>';
      html += '<th class="sortable" title="Current market capitalization" onclick="sortTable(\\'' + tableId + '\\', 5, \\'number\\')">Market Cap</th>';
      html += '<th class="sortable" title="Signal classification based on buy/sell ratio and netflow direction" onclick="sortTable(\\'' + tableId + '\\', 6, \\'text\\')">Signal</th>';
      html += '</tr></thead><tbody>';

      highlights.forEach(function(t, idx) {
        var netflowCls = t.netflowUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
        var priceCls = t.priceChange > 0 ? 'netflow-positive' : (t.priceChange < 0 ? 'netflow-negative' : '');
        var priceText = t.priceChange === 0 ? '\\u2014' : formatPercent(t.priceChange);

        var totalVol = Math.abs(t.buyVolume) + Math.abs(t.sellVolume);
        var buyPct = totalVol > 0 ? (Math.abs(t.buyVolume) / totalVol * 100) : 50;
        var sellPct = 100 - buyPct;
        var ratioText = t.buySellRatio >= 99 ? '99x+' : t.buySellRatio.toFixed(1) + 'x';

        var badgeClass = t.classification === 'heavy_accumulation' ? 'heavy-accumulation' :
                         t.classification === 'accumulating' ? 'accumulating' :
                         t.classification === 'mixed' ? 'mixed' : 'distributing';
        var badgeText = t.classification === 'heavy_accumulation' ? 'HEAVY ACCUM' :
                        t.classification === 'accumulating' ? 'ACCUM' :
                        t.classification === 'mixed' ? 'MIXED' : 'DIST';
        var badgeTooltip = t.classification === 'heavy_accumulation' ? 'Buy/sell ratio \\u2265 3.0: Strong Smart Money buying' :
                           t.classification === 'accumulating' ? 'Buy/sell ratio \\u2265 1.5: Moderate Smart Money buying' :
                           t.classification === 'mixed' ? 'Positive netflow but buy/sell ratio < 1.5: Mixed signal' : 'Negative netflow & low ratio: Smart Money is selling';

        var signalSortOrder = t.classification === 'heavy_accumulation' ? 0 :
                              t.classification === 'accumulating' ? 1 :
                              t.classification === 'mixed' ? 2 : 3;

        var detailId = 'screener-detail-' + idx;

        html += '<tr class="expandable-row" onclick="toggleExpand(this, \\'' + detailId + '\\')"';
        html += ' data-sort-1="' + t.netflowUsd + '"';
        html += ' data-sort-3="' + t.buySellRatio + '"';
        html += ' data-sort-4="' + t.priceChange + '"';
        html += ' data-sort-5="' + (t.marketCapUsd || 0) + '"';
        html += ' data-sort-6="' + signalSortOrder + '-' + escapeHtml(t.token_symbol).toLowerCase() + '"';
        html += '>';
        html += '<td><span class="expand-arrow">\\u25B6</span>' + dexLink(t.chain, t.token_address, '<strong>$' + escapeHtml(t.token_symbol) + '</strong>') + chainBadge(t.chain) + '</td>';
        html += '<td class="mono ' + netflowCls + '">' + formatUsd(t.netflowUsd) + '</td>';
        html += '<td><div class="buy-sell-bar"><div class="buy-bar" style="width:' + buyPct.toFixed(1) + '%"></div><div class="sell-bar" style="width:' + sellPct.toFixed(1) + '%"></div></div></td>';
        html += '<td class="mono" style="color: var(--color-positive)">' + ratioText + '</td>';
        html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
        html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
        html += '<td><span class="screener-badge ' + badgeClass + '" title="' + badgeTooltip + '">' + badgeText + '</span></td>';
        html += '</tr>';

        // Expanded detail row
        html += '<tr class="expanded-detail" id="' + detailId + '"><td colspan="7">';
        html += '<div class="detail-grid">';
        html += '<div><div class="detail-item-label">Current Price</div><div class="detail-item-value">' + (t.priceUsd ? ('$' + t.priceUsd.toFixed(t.priceUsd < 1 ? 6 : t.priceUsd < 100 ? 4 : 2)) : '\\u2014') + '</div></div>';
        html += '<div><div class="detail-item-label">Buy Volume</div><div class="detail-item-value netflow-positive">' + formatVolume(t.buyVolume) + '</div></div>';
        html += '<div><div class="detail-item-label">Sell Volume</div><div class="detail-item-value netflow-negative">' + formatVolume(t.sellVolume) + '</div></div>';
        html += '<div><div class="detail-item-label">SM Buyers</div><div class="detail-item-value">' + t.nofBuyers + '</div></div>';
        html += '<div><div class="detail-item-label">SM Sellers</div><div class="detail-item-value">' + t.nofSellers + '</div></div>';
        html += '<div><div class="detail-item-label">Total Volume</div><div class="detail-item-value">' + formatVolume(t.volume) + '</div></div>';
        html += '</div>';
        html += '<a class="detail-link" href="' + dexScreenerUrl(t.chain, t.token_address) + '" target="_blank" rel="noopener">View on DexScreener \\u2197</a>';
        html += '</td></tr>';
      });

      html += '</tbody></table>';
      html += '</div>';
      return html;
    }

    // ── Narrative Card Rendering ────────────────────────────

    function renderNarrativeCard(narrative, cardIndex) {
      var slug = slugify(narrative.displayName);
      var netflowClass = narrative.totalNetflow24h >= 0 ? 'netflow-positive' : 'netflow-negative';
      var borderClass = narrative.isHot ? 'border-positive' : 'border-negative';
      var tableId = 'narrative-table-' + cardIndex;

      var html = '<div class="narrative-card ' + borderClass + '" id="narrative-' + slug + '">';
      html += '<div class="narrative-header">';
      html += '<span class="narrative-name">' + escapeHtml(narrative.displayName) + '</span>';
      html += '<div class="narrative-metrics">';
      html += '<span class="metric">24h Netflow: <strong class="' + netflowClass + '">' + formatUsd(narrative.totalNetflow24h) + '</strong></span>';
      html += '<span class="metric">' + narrative.topTokens.length + ' classified tokens</span>';
      html += '</div></div>';

      if (narrative.topTokens.length > 0) {
        html += '<table class="token-table" id="' + tableId + '">';
        html += '<thead><tr>';
        html += '<th title="Token symbol and chain">Token</th>';
        html += '<th class="sortable" title="Smart Money net capital flow over 24 hours" onclick="sortTable(\\'' + tableId + '\\', 1, \\'number\\')">Netflow 24h</th>';
        html += '<th class="sortable" title="Price change over 24 hours" onclick="sortTable(\\'' + tableId + '\\', 2, \\'number\\')">Price \\u0394</th>';
        html += '<th class="sortable" title="Current market capitalization" onclick="sortTable(\\'' + tableId + '\\', 3, \\'number\\')">Market Cap</th>';
        html += '<th class="sortable" title="Classification: HOT = strong SM accumulation + rising price, WATCH = SM accumulating, price flat, AVOID = SM distributing" onclick="sortTable(\\'' + tableId + '\\', 4, \\'text\\')">Category</th>';
        html += '</tr></thead><tbody>';

        narrative.topTokens.forEach(function(t, tidx) {
          var tNetflowCls = t.netflow24hUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
          var priceText = t.priceChange === 0 ? '\\u2014' : formatPercent(t.priceChange);
          var priceCls = t.priceChange > 0 ? 'netflow-positive' : (t.priceChange < 0 ? 'netflow-negative' : '');

          var catBadgeCls = t.category === 'hot' ? 'screener-badge heavy-accumulation' :
                            t.category === 'watch' ? 'screener-badge accumulating' : 'screener-badge distributing';
          var catBadgeText = t.category === 'hot' ? 'HOT' :
                             t.category === 'watch' ? 'WATCH' : 'AVOID';
          var catTooltip = t.category === 'hot' ? 'Strong SM accumulation + rising price' :
                           t.category === 'watch' ? 'SM accumulating, price hasn\\'t moved yet' : 'SM distributing, consider reducing exposure';
          var catSortOrder = t.category === 'hot' ? 0 : t.category === 'watch' ? 1 : 2;

          var detailId = 'narrative-detail-' + cardIndex + '-' + tidx;

          html += '<tr class="expandable-row" onclick="toggleExpand(this, \\'' + detailId + '\\')"';
          html += ' data-sort-1="' + t.netflow24hUsd + '"';
          html += ' data-sort-2="' + t.priceChange + '"';
          html += ' data-sort-3="' + (t.marketCapUsd || 0) + '"';
          html += ' data-sort-4="' + catSortOrder + '-' + escapeHtml(t.token_symbol).toLowerCase() + '"';
          html += '>';

          html += '<td><span class="expand-arrow">\\u25B6</span>' + dexLink(t.chain, t.token_address, '<strong>$' + escapeHtml(t.token_symbol) + '</strong>') + chainBadge(t.chain) + '</td>';
          html += '<td class="mono ' + tNetflowCls + '">' + formatUsd(t.netflow24hUsd) + '</td>';
          html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
          html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
          html += '<td><span class="' + catBadgeCls + '" title="' + catTooltip + '">' + catBadgeText + '</span></td>';
          html += '</tr>';

          // Expanded detail row
          html += '<tr class="expanded-detail" id="' + detailId + '"><td colspan="5">';
          html += '<div class="detail-grid">';
          html += '<div><div class="detail-item-label">Current Price</div><div class="detail-item-value">' + (t.priceUsd ? ('$' + t.priceUsd.toFixed(t.priceUsd < 1 ? 6 : t.priceUsd < 100 ? 4 : 2)) : '\\u2014') + '</div></div>';
          html += '<div><div class="detail-item-label">Buy Volume</div><div class="detail-item-value netflow-positive">' + formatVolume(t.buyVolume) + '</div></div>';
          html += '<div><div class="detail-item-label">Sell Volume</div><div class="detail-item-value netflow-negative">' + formatVolume(t.sellVolume) + '</div></div>';
          html += '<div><div class="detail-item-label">SM Traders</div><div class="detail-item-value">' + t.traderCount + '</div></div>';
          html += '<div><div class="detail-item-label">Volume 24h</div><div class="detail-item-value">' + formatVolume(t.volume24h) + '</div></div>';
          html += '<div><div class="detail-item-label">Liquidity</div><div class="detail-item-value">' + formatMcap(t.liquidity) + '</div></div>';
          html += '</div>';
          html += '<a class="detail-link" href="' + dexScreenerUrl(t.chain, t.token_address) + '" target="_blank" rel="noopener">View on DexScreener \\u2197</a>';
          html += '</td></tr>';
        });

        html += '</tbody></table>';
      } else {
        html += '<p style="color: var(--text-muted); font-size: 0.9rem;">' +
          narrative.tokenCount + ' tokens tracked. Strong SM ' +
          (narrative.totalNetflow24h >= 0 ? 'accumulation' : 'distribution') +
          ' signal.</p>';
      }

      html += '</div>';
      return html;
    }

    // ── Sub-narratives ─────────────────────────────────────

    function renderSubNarratives(subs, topKey) {
      var html = '<div class="card">';
      html += '<div class="card-title">Sub-narratives: ' + escapeHtml(topKey || 'Top Narrative') + '</div>';

      subs.forEach(function(sub) {
        var netflowCls = sub.totalNetflowUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
        html += '<div class="sub-narrative-card conviction-' + sub.conviction + '">';
        html += '<div class="sub-narrative-name">' + escapeHtml(sub.name) + '</div>';
        html += '<div class="sub-narrative-meta">';
        html += '<span>Conviction: <strong>' + sub.conviction.toUpperCase() + '</strong></span>';
        html += '<span>Netflow: <strong class="' + netflowCls + '">' + formatUsd(sub.totalNetflowUsd) + '</strong></span>';
        html += '</div>';
        html += '<div class="sub-narrative-tokens">Tokens: ' + sub.tokens.map(function(t) { return escapeHtml(t); }).join(', ') + '</div>';
        html += '</div>';
      });

      html += '</div>';
      return html;
    }

    // ── Early Signals ──────────────────────────────────────

    function renderEarlySignals(signals) {
      var html = '<div class="early-signals-section">';
      html += '<div class="early-signals-title">Early Signal Tokens \\u2014 Smart Money Accumulating Before Price Move</div>';
      html += '<div class="early-signals-body">';
      html += '<table class="token-table">';
      html += '<thead><tr>';
      html += '<th title="Token symbol">Token</th>';
      html += '<th title="Smart Money net capital flow over 24 hours">Netflow 24h</th>';
      html += '<th title="Price change over 24 hours">Price \\u0394</th>';
      html += '<th title="Total trading volume over 24 hours">Volume 24h</th>';
      html += '<th title="Buy/sell ratio \\u2014 higher means more buying pressure">Buy Pressure</th>';
      html += '<th title="Current market capitalization">Market Cap</th>';
      html += '</tr></thead><tbody>';

      signals.forEach(function(t) {
        var netflowCls = t.netflow24hUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
        var priceCls = t.priceChange24h > 0 ? 'netflow-positive' : (t.priceChange24h < 0 ? 'netflow-negative' : '');
        var pressureText = !t.buyPressure || t.buyPressure <= 0 ? '\\u2014' : t.buyPressure.toFixed(1) + 'x';

        html += '<tr>';
        html += '<td>' + dexLink(t.chain || '', t.token_address, '<strong>$' + escapeHtml(t.token_symbol) + '</strong>') + '<span class="early-badge" title="SM accumulating before significant price move">EARLY SIGNAL</span></td>';
        html += '<td class="mono ' + netflowCls + '">' + formatUsd(t.netflow24hUsd) + '</td>';
        html += '<td class="mono ' + priceCls + '">' + formatPercent(t.priceChange24h) + '</td>';
        html += '<td class="mono">' + formatMcap(t.volume24h) + '</td>';
        html += '<td class="mono">' + pressureText + '</td>';
        html += '<td class="mono">' + formatMcap(t.marketCap) + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
      html += '</div></div>';
      return html;
    }

    // ── Empty State ────────────────────────────────────────

    function renderEmpty() {
      var main = document.getElementById('main-content');
      main.innerHTML = '<div class="empty-state">' +
        '<p style="font-size:1.2rem;margin-bottom:12px;">No data yet</p>' +
        '<p>Click "Run Scan" to fetch the latest Smart Money data.</p>' +
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
