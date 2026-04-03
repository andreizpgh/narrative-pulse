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
      text-align: center;
      padding: 36px 24px 28px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 28px;
    }

    .header h1 {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 4px;
      color: #ffffff;
    }

    .header .subtitle {
      font-size: 0.95rem;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    /* ── Stats Bar ──────────────────────────────── */

    .stats-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 32px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .stat { text-align: center; }
    .stat-value { font-size: 1.3rem; font-weight: 700; color: #ffffff; }
    .stat-label { font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

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

    /* ── Hero Section ───────────────────────────── */

    .hero-section {
      text-align: center;
      padding: 32px 24px;
      margin-bottom: 28px;
      border-radius: var(--radius);
      background: var(--bg-card);
      border: 1px solid var(--border-color);
    }

    .hero-label {
      font-size: 1rem;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .hero-narrative {
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
    }

    .hero-netflow {
      font-size: 2.8rem;
      font-weight: 800;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    }

    .hero-netflow.positive { color: var(--color-positive); }
    .hero-netflow.negative { color: var(--color-negative); }

    .hero-subtitle {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-top: 6px;
    }

    /* ── Bar Chart ──────────────────────────────── */

    #bar-chart {
      width: 100%;
      height: 420px;
    }

    /* ── Early Signals ──────────────────────────── */

    .early-signals-section {
      margin-bottom: 28px;
      background: var(--bg-card);
      border-radius: var(--radius);
      border: 1px solid rgba(52, 211, 153, 0.2);
      border-left: 4px solid var(--color-positive);
      overflow: hidden;
    }

    .early-signals-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-positive);
      padding: 16px 20px;
      background: rgba(52, 211, 153, 0.06);
      border-bottom: 1px solid rgba(52, 211, 153, 0.15);
    }

    .early-signal-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(52, 211, 153, 0.15);
      color: var(--color-positive);
      margin-left: 8px;
      letter-spacing: 0.04em;
    }

    .early-signals-body {
      padding: 16px 20px;
    }

    /* ── Sections ───────────────────────────────── */

    .section { margin-bottom: 28px; }

    .section-title {
      font-size: 1.3rem;
      font-weight: 700;
      padding: 14px 20px;
      border-radius: var(--radius) var(--radius) 0 0;
      margin-bottom: 0;
    }

    .section-title.accumulating {
      background: linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(52, 211, 153, 0.04));
      color: var(--color-positive);
      border: 1px solid rgba(52, 211, 153, 0.2);
      border-bottom: none;
    }

    .section-title.distributing {
      background: linear-gradient(135deg, rgba(248, 113, 113, 0.10), rgba(248, 113, 113, 0.03));
      color: var(--color-negative);
      border: 1px solid rgba(248, 113, 113, 0.15);
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
      .header h1 { font-size: 1.5rem; }
      .hero-narrative { font-size: 1.4rem; }
      .hero-netflow { font-size: 2rem; }
      .stats-bar { gap: 16px; }
      .card { padding: 16px; }
      .narrative-card { padding: 14px 16px; }
      #bar-chart { height: 320px; }
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
    <header class="header">
      <h1>Narrative Pulse</h1>
      <p class="subtitle">Smart Money Narrative Tracker</p>
      <div class="stats-bar" id="stats-bar">
        <div class="stat">
          <div class="stat-value" id="stat-narratives">&mdash;</div>
          <div class="stat-label">Narratives</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="stat-tokens">&mdash;</div>
          <div class="stat-label">Tokens Scanned</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="stat-credits">&mdash</div>
          <div class="stat-label">Credits</div>
        </div>
      </div>
      <div class="status-bar">
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

    function formatPressure(ratio) {
      if (!ratio || ratio <= 0) return '\\u2014';
      return ratio.toFixed(1) + 'x';
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
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

    var MIN_NARRATIVE_NETFLOW = 500;

    function processData(apiResponse) {
      if (!apiResponse || !apiResponse.scan) return null;

      var scan = apiResponse.scan;
      lastScanTime = apiResponse.lastScanTime || scan.timestamp;

      // Filter narratives with meaningful netflow
      var narratives = (scan.narratives || []).filter(function(n) {
        return Math.abs(n.totalNetflow24h) >= MIN_NARRATIVE_NETFLOW;
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

      var accumulating = narratives.filter(function(n) { return n.isHot; })
        .sort(function(a, b) { return b.totalNetflow24h - a.totalNetflow24h; });
      var distributing = narratives.filter(function(n) { return !n.isHot; })
        .sort(function(a, b) { return a.totalNetflow24h - b.totalNetflow24h; });

      // Hero: biggest absolute netflow
      var hero = narratives.length > 0 ? narratives[0] : null;

      // Total classified tokens
      var totalTokens = 0;
      narratives.forEach(function(n) { totalTokens += n.topTokens.length; });

      return {
        timestamp: scan.timestamp,
        creditsUsed: scan.creditsUsed || 0,
        narratives: narratives,
        accumulating: accumulating,
        distributing: distributing,
        hero: hero,
        totalTokens: totalTokens,
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

    function renderDashboard(data) {
      var main = document.getElementById('main-content');
      var html = '';

      // Stats
      document.getElementById('stat-narratives').textContent = data.narrativeCount;
      document.getElementById('stat-tokens').textContent = data.totalTokens;
      document.getElementById('stat-credits').textContent = data.creditsUsed;
      updateAgoText();

      // Update stats bar with screener highlights count
      var statsBar = document.getElementById('stats-bar');
      if (statsBar && !document.getElementById('stat-screener')) {
        var screenerStat = document.createElement('div');
        screenerStat.className = 'stat';
        screenerStat.id = 'stat-screener';
        screenerStat.innerHTML = '<div class="stat-value" id="stat-screener-val">&mdash;</div><div class="stat-label">SM Active Tokens</div>';
        statsBar.appendChild(screenerStat);
      }
      var screenerValEl = document.getElementById('stat-screener-val');
      if (screenerValEl) screenerValEl.textContent = data.screenerHighlights ? data.screenerHighlights.length : 0;

      // Hero Section
      html += renderHero(data.hero);

      // Bar Chart
      html += '<div class="card" style="margin-bottom:28px">';
      html += '<div class="card-title">Narrative Netflows (24h)</div>';
      html += '<div id="bar-chart"></div>';
      html += '</div>';

      // Screener Highlights (HERO section)
      if (data.screenerHighlights && data.screenerHighlights.length > 0) {
        html += renderScreenerHighlights(data.screenerHighlights);
      }

      // Early Signals
      if (data.earlySignals && data.earlySignals.length > 0) {
        html += renderEarlySignals(data.earlySignals);
      }

      // Hot Narrative Deep Dive
      if (data.hero && data.hero.topTokens.length > 0) {
        html += renderDeepDive(data.hero);
      }

      // Accumulating
      if (data.accumulating.length > 0) {
        html += '<section class="section">';
        html += '<h2 class="section-title accumulating">Smart Money is ACCUMULATING</h2>';
        html += '<div class="section-body">';
        data.accumulating.forEach(function(n) { html += renderNarrativeCard(n); });
        html += '</div></section>';
      }

      // Distributing
      if (data.distributing.length > 0) {
        html += '<section class="section">';
        html += '<h2 class="section-title distributing">Smart Money is DISTRIBUTING</h2>';
        html += '<div class="section-body">';
        data.distributing.forEach(function(n) { html += renderNarrativeCard(n); });
        html += '</div></section>';
      }

      // Sub-narratives
      if (data.subNarratives && data.subNarratives.length > 0) {
        html += renderSubNarratives(data.subNarratives, data.topNarrativeKey);
      }

      main.innerHTML = html;

      // Initialize ECharts bar chart after DOM update
      setTimeout(function() { renderBarChart(data.narratives); }, 50);
    }

    function renderHero(hero) {
      if (!hero) return '';
      var cls = hero.totalNetflow24h >= 0 ? 'positive' : 'negative';
      var direction = hero.totalNetflow24h >= 0 ? 'flowing into' : 'exiting';
      return '<div class="hero-section">' +
        '<div class="hero-label">Smart Money is ' + direction + '</div>' +
        '<div class="hero-narrative">' + escapeHtml(hero.displayName) + '</div>' +
        '<div class="hero-netflow ' + cls + '">' + formatUsd(hero.totalNetflow24h) + '</div>' +
        '<div class="hero-subtitle">in the last 24h</div>' +
        '</div>';
    }

    function renderEarlySignals(signals) {
      var html = '<div class="early-signals-section">';
      html += '<div class="early-signals-title">Early Signal Tokens \\u2014 Smart Money Accumulating Before Price Move</div>';
      html += '<div class="early-signals-body">';
      html += '<table class="token-table">';
      html += '<thead><tr>';
      html += '<th>Token</th><th>Netflow 24h</th><th>Price \\u0394</th><th>Volume 24h</th><th>Buy Pressure</th><th>Market Cap</th>';
      html += '</tr></thead><tbody>';

      signals.forEach(function(t) {
        var netflowCls = t.netflow24hUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
        var priceCls = t.priceChange24h > 0 ? 'netflow-positive' : (t.priceChange24h < 0 ? 'netflow-negative' : '');
        html += '<tr>';
        html += '<td><strong>' + escapeHtml(t.token_symbol) + '</strong><span class="early-signal-badge">\\uD83D\\uDFE1 EARLY SIGNAL</span></td>';
        html += '<td class="mono ' + netflowCls + '">' + formatUsd(t.netflow24hUsd) + '</td>';
        html += '<td class="mono ' + priceCls + '">' + formatPercent(t.priceChange24h) + '</td>';
        html += '<td class="mono">' + formatMcap(t.volume24h) + '</td>';
        html += '<td class="mono">' + formatPressure(t.buyPressure) + '</td>';
        html += '<td class="mono">' + formatMcap(t.marketCap) + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
      html += '</div></div>';
      return html;
    }

    function renderDeepDive(narrative) {
      var netflowCls = narrative.totalNetflow24h >= 0 ? 'netflow-positive' : 'netflow-negative';
      var html = '<div class="card" style="margin-bottom:28px">';
      html += '<div class="card-title">Hot Narrative Deep Dive: ' + escapeHtml(narrative.displayName) +
        ' <span class="mono ' + netflowCls + '" style="font-size:0.95rem">' + formatUsd(narrative.totalNetflow24h) + '</span></div>';

      html += '<table class="token-table">';
      html += '<thead><tr>';
      html += '<th>Token</th><th>Netflow 24h</th><th>Price \\u0394</th><th>Volume 24h</th><th>Market Cap</th>';
      html += '</tr></thead><tbody>';

      narrative.topTokens.forEach(function(t) {
        var tNetflowCls = t.netflow24hUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
        var priceText = t.priceChange === 0 ? '\\u2014' : formatPercent(t.priceChange);
        var priceCls = t.priceChange > 0 ? 'netflow-positive' : (t.priceChange < 0 ? 'netflow-negative' : '');
        var vol = t.volume24h || 0;

        html += '<tr>';
        html += '<td><strong>' + escapeHtml(t.token_symbol) + '</strong></td>';
        html += '<td class="mono ' + tNetflowCls + '">' + formatUsd(t.netflow24hUsd) + '</td>';
        html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
        html += '<td class="mono">' + formatMcap(vol) + '</td>';
        html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
      html += '</div>';
      return html;
    }

    function renderScreenerHighlights(highlights) {
      var html = '<div class="screener-highlights-card">';
      html += '<div class="screener-title">🔥 Smart Money Active Tokens</div>';
      html += '<div class="screener-subtitle">Top tokens by Smart Money buy/sell ratio and netflow — always fresh data from 500+ tokens</div>';

      html += '<table class="token-table">';
      html += '<thead><tr>';
      html += '<th>Token</th><th>Netflow 24h</th><th>Buy / Sell</th><th>Ratio</th><th>Price \\u0394</th><th>Market Cap</th><th>Signal</th>';
      html += '</tr></thead><tbody>';

      highlights.forEach(function(t) {
        var netflowCls = t.netflowUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
        var priceCls = t.priceChange > 0 ? 'netflow-positive' : (t.priceChange < 0 ? 'netflow-negative' : '');
        var priceText = t.priceChange === 0 ? '\\u2014' : formatPercent(t.priceChange);

        // Buy/sell bar
        var totalVol = Math.abs(t.buyVolume) + Math.abs(t.sellVolume);
        var buyPct = totalVol > 0 ? (Math.abs(t.buyVolume) / totalVol * 100) : 50;
        var sellPct = 100 - buyPct;

        var ratioText = t.buySellRatio >= 99 ? '99x+' : t.buySellRatio.toFixed(1) + 'x';

        // Classification badge
        var badgeClass = t.classification === 'heavy_accumulation' ? 'heavy-accumulation' :
                         t.classification === 'accumulating' ? 'accumulating' : 'distributing';
        var badgeText = t.classification === 'heavy_accumulation' ? 'HEAVY ACCUM' :
                        t.classification === 'accumulating' ? 'ACCUM' : 'DIST';

        html += '<tr>';
        html += '<td><strong>' + escapeHtml(t.token_symbol) + '</strong>' + chainBadge(t.chain) + '</td>';
        html += '<td class="mono ' + netflowCls + '">' + formatUsd(t.netflowUsd) + '</td>';
        html += '<td><div class="buy-sell-bar"><div class="buy-bar" style="width:' + buyPct.toFixed(1) + '%"></div><div class="sell-bar" style="width:' + sellPct.toFixed(1) + '%"></div></div></td>';
        html += '<td class="mono" style="color: var(--color-positive)">' + ratioText + '</td>';
        html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
        html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
        html += '<td><span class="screener-badge ' + badgeClass + '">' + badgeText + '</span></td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
      html += '</div>';
      return html;
    }

    function renderNarrativeCard(narrative) {
      var netflowClass = narrative.totalNetflow24h >= 0 ? 'netflow-positive' : 'netflow-negative';
      var borderClass = narrative.isHot ? 'border-positive' : 'border-negative';

      var html = '<div class="narrative-card ' + borderClass + '">';
      html += '<div class="narrative-header">';
      html += '<span class="narrative-name">' + escapeHtml(narrative.displayName) + '</span>';
      html += '<div class="narrative-metrics">';
      html += '<span class="metric">24h: <strong class="' + netflowClass + '">' + formatUsd(narrative.totalNetflow24h) + '</strong></span>';
      html += '<span class="metric">' + narrative.topTokens.length + ' tokens</span>';
      html += '</div></div>';

      if (narrative.topTokens.length > 0) {
        html += '<table class="token-table">';
        html += '<thead><tr>';
        html += '<th>Token</th><th>Netflow 24h</th><th>Price \\u0394</th><th>Market Cap</th><th>Category</th>';
        html += '</tr></thead><tbody>';

        narrative.topTokens.forEach(function(t) {
          var tNetflowCls = t.netflow24hUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
          var priceText = t.priceChange === 0 ? '\\u2014' : formatPercent(t.priceChange);
          var priceCls = t.priceChange > 0 ? 'netflow-positive' : (t.priceChange < 0 ? 'netflow-negative' : '');

          var catBadgeCls = t.category === 'hot' ? 'screener-badge heavy-accumulation' :
                            t.category === 'watch' ? 'screener-badge accumulating' : 'screener-badge distributing';
          var catBadgeText = t.category === 'hot' ? 'HOT' :
                             t.category === 'watch' ? 'WATCH' : 'AVOID';

          html += '<tr>';
          html += '<td><strong>' + escapeHtml(t.token_symbol) + '</strong>' + chainBadge(t.chain) + '</td>';
          html += '<td class="mono ' + tNetflowCls + '">' + formatUsd(t.netflow24hUsd) + '</td>';
          html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
          html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
          html += '<td><span class="' + catBadgeCls + '">' + catBadgeText + '</span></td>';
          html += '</tr>';
        });

        html += '</tbody></table>';
      } else {
        html += '<p style="color:var(--text-muted);font-size:0.9rem;">' +
          narrative.tokenCount + ' tokens tracked.</p>';
      }

      html += '</div>';
      return html;
    }

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

    function renderEmpty() {
      var main = document.getElementById('main-content');
      main.innerHTML = '<div class="empty-state">' +
        '<p style="font-size:1.2rem;margin-bottom:12px;">No data yet</p>' +
        '<p>Click "Run Scan" to fetch the latest Smart Money data.</p>' +
        '</div>';
    }

    // ── ECharts Bar Chart ──────────────────────────────────

    function renderBarChart(narratives) {
      var chartDom = document.getElementById('bar-chart');
      if (!chartDom) return;

      var chart = echarts.init(chartDom, null, { renderer: 'canvas' });

      // Take top 15 by |netflow|
      var top = narratives.slice(0, 15);

      // Reverse for display (top = highest |netflow| at bottom of chart)
      var reversed = top.slice().reverse();

      var names = reversed.map(function(n) { return n.displayName; });
      var values = reversed.map(function(n) { return n.totalNetflow24h; });
      var colors = reversed.map(function(n) {
        return n.totalNetflow24h >= 0 ? '#34d399' : '#f87171';
      });

      chart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: function(params) {
            var p = params[0];
            return p.name + '<br/>Netflow: <strong>' + formatUsd(p.value) + '</strong>';
          }
        },
        grid: {
          top: 16,
          right: 40,
          bottom: 60,
          left: 120,
          containLabel: false
        },
        xAxis: {
          type: 'value',
          axisLabel: {
            color: '#8b8fa3',
            formatter: function(v) {
              if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(0) + 'M';
              if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'K';
              return v;
            }
          },
          splitLine: { lineStyle: { color: '#2a2d3a' } }
        },
        yAxis: {
          type: 'category',
          data: names,
          axisLabel: { color: '#e8e9ed', fontSize: 13, fontWeight: 500 },
          axisLine: { lineStyle: { color: '#2a2d3a' } }
        },
        series: [{
          type: 'bar',
          data: values.map(function(v, i) {
            return {
              value: v,
              itemStyle: { color: colors[i], borderRadius: v >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] }
            };
          }),
          barWidth: '60%'
        }]
      });

      window.addEventListener('resize', function() { chart.resize(); });
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
