// ============================================================
// HTML Report — Standalone interactive Smart Money dashboard
// Generates a self-contained HTML file with ECharts Sankey,
// narrative cards, and token tables. Opens in any browser.
// ============================================================

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  ScanResult,
  NarrativeSummary,
  ClassifiedToken,
  SubNarrative,
  NarrativeRotation,
} from "../types.js";

// ============================================================
// Serializable Data Interface
// ============================================================

interface HtmlReportToken {
  token_symbol: string;
  category: string;
  netflow24hUsd: number;
  netflow7dUsd: number;
  priceChange: number;
  buyVolume: number;
  sellVolume: number;
  marketCapUsd: number;
}

interface HtmlReportNarrative {
  displayName: string;
  totalNetflow24h: number;
  totalNetflow7d: number;
  tokenCount: number;
  isHot: boolean;
  topTokens: HtmlReportToken[];
}

interface HtmlReportRotation {
  from: string;
  to: string;
  valueUsd: number;
  direction: string;
}

interface HtmlReportSubNarrative {
  name: string;
  conviction: string;
  totalNetflowUsd: number;
  tokens: string[];
}

interface HtmlReportData {
  timestamp: string;
  creditsUsed: number;
  narratives: HtmlReportNarrative[];
  rotations: HtmlReportRotation[];
  subNarratives?: HtmlReportSubNarrative[];
  topNarrativeKey?: string;
}

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[HTML] ${message}`);
}

function toHtmlToken(t: ClassifiedToken): HtmlReportToken {
  return {
    token_symbol: t.token_symbol,
    category: t.category,
    netflow24hUsd: t.netflow24hUsd,
    netflow7dUsd: t.netflow7dUsd ?? 0,
    priceChange: t.priceChange,
    buyVolume: t.buyVolume,
    sellVolume: t.sellVolume,
    marketCapUsd: t.marketCapUsd,
  };
}

function toHtmlNarrative(n: NarrativeSummary): HtmlReportNarrative {
  return {
    displayName: n.displayName,
    totalNetflow24h: n.totalNetflow24h,
    totalNetflow7d: n.totalNetflow7d,
    tokenCount: n.tokenCount,
    isHot: n.isHot,
    topTokens: n.topTokens.map(toHtmlToken),
  };
}

function toHtmlRotation(r: NarrativeRotation): HtmlReportRotation {
  return {
    from: r.from,
    to: r.to,
    valueUsd: r.valueUsd,
    direction: r.direction,
  };
}

function toHtmlSubNarrative(s: SubNarrative): HtmlReportSubNarrative {
  return {
    name: s.name,
    conviction: s.conviction,
    totalNetflowUsd: s.totalNetflowUsd,
    tokens: s.tokens,
  };
}

function toHtmlReportData(result: ScanResult): HtmlReportData {
  return {
    timestamp: result.timestamp,
    creditsUsed: result.creditsUsed,
    narratives: result.narratives.map(toHtmlNarrative),
    rotations: result.rotations.map(toHtmlRotation),
    subNarratives: result.subNarratives?.map(toHtmlSubNarrative),
    topNarrativeKey: result.topNarrativeKey,
  };
}

// ============================================================
// HTML Template
// ============================================================

function generateHtml(data: HtmlReportData): string {
  const jsonData = JSON.stringify(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Narrative Pulse — Smart Money Narrative Tracker</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    :root {
      --bg-primary: #0f1117;
      --bg-card: #181b25;
      --bg-card-alt: #1e2230;
      --bg-card-hover: #252a3a;
      --text-primary: #e8e9ed;
      --text-secondary: #8b8fa3;
      --text-muted: #5a5e72;
      --color-hot: #34d399;
      --color-watch: #fbbf24;
      --color-avoid: #f87171;
      --color-inflow: rgba(52, 211, 153, 0.5);
      --color-outflow: rgba(248, 113, 113, 0.5);
      --color-accent: #818cf8;
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

    /* ── Header ─────────────────────────────────────────── */

    .header {
      text-align: center;
      padding: 48px 24px 36px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 32px;
    }

    .header h1 {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 4px;
      color: #ffffff;
    }

    .header .tagline {
      font-size: 0.95rem;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .header .date {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    .header .hero-metric {
      display: inline-block;
      padding: 8px 24px;
      border-radius: 8px;
      background: rgba(129, 140, 248, 0.1);
      border: 1px solid rgba(129, 140, 248, 0.25);
      margin-bottom: 24px;
    }

    .hero-metric .hero-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
    }

    .hero-metric .hero-value {
      font-size: 1.6rem;
      font-weight: 700;
    }

    .stats-row {
      display: flex;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffffff;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: 2px;
    }

    /* ── Cards ──────────────────────────────────────────── */

    .card {
      background: var(--bg-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ── Sankey Chart ───────────────────────────────────── */

    #sankey-chart {
      width: 100%;
      height: 500px;
    }

    .sankey-card {
      margin-bottom: 32px;
    }

    .sankey-hint {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 8px;
      text-align: center;
    }

    /* ── Section Headers ────────────────────────────────── */

    .section-hot {
      margin-bottom: 32px;
    }

    .section-cold {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 1.4rem;
      font-weight: 700;
      padding: 14px 20px;
      border-radius: var(--radius) var(--radius) 0 0;
      margin-bottom: 0;
    }

    .hot-title {
      background: linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(52, 211, 153, 0.04));
      color: var(--color-hot);
      border: 1px solid rgba(52, 211, 153, 0.2);
      border-bottom: none;
    }

    .cold-title {
      background: linear-gradient(135deg, rgba(96, 165, 250, 0.10), rgba(96, 165, 250, 0.03));
      color: #60a5fa;
      border: 1px solid rgba(96, 165, 250, 0.15);
      border-bottom: none;
    }

    .section-body {
      border: 1px solid var(--border-color);
      border-top: none;
      border-radius: 0 0 var(--radius) var(--radius);
      padding: 16px;
    }

    .empty-section {
      text-align: center;
      padding: 24px;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    /* ── Narrative Cards ────────────────────────────────── */

    .narrative-card {
      background: var(--bg-card);
      border-radius: var(--radius);
      padding: 20px 24px;
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
      scroll-margin-top: 24px;
    }

    .narrative-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .narrative-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
    }

    .narrative-metrics {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;
    }

    .metric {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .metric strong {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    }

    .netflow-positive { color: var(--color-hot) !important; }
    .netflow-negative { color: var(--color-avoid) !important; }

    /* ── Token Groups & Badges ──────────────────────────── */

    .token-group {
      margin-bottom: 16px;
    }

    .token-group:last-child {
      margin-bottom: 0;
    }

    .group-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }

    .badge-hot {
      background: rgba(52, 211, 153, 0.12);
      color: var(--color-hot);
      border: 1px solid rgba(52, 211, 153, 0.25);
    }

    .badge-watch {
      background: rgba(251, 191, 36, 0.12);
      color: var(--color-watch);
      border: 1px solid rgba(251, 191, 36, 0.25);
    }

    .badge-avoid {
      background: rgba(248, 113, 113, 0.12);
      color: var(--color-avoid);
      border: 1px solid rgba(248, 113, 113, 0.25);
    }

    /* ── Tables ─────────────────────────────────────────── */

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

    .token-table tbody tr {
      transition: background 0.15s ease;
    }

    .token-table tbody tr:hover {
      background: var(--bg-card-hover);
    }

    .token-table tbody tr:last-child td {
      border-bottom: none;
    }

    .token-table .mono {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    }

    /* ── Sub-narratives ─────────────────────────────────── */

    .sub-narrative-card {
      background: var(--bg-card-alt);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      border-left: 3px solid var(--text-secondary);
    }

    .sub-narrative-card.conviction-high { border-left-color: var(--color-hot); }
    .sub-narrative-card.conviction-medium { border-left-color: var(--color-watch); }
    .sub-narrative-card.conviction-low { border-left-color: var(--color-avoid); }

    .sub-narrative-name {
      font-weight: 600;
      font-size: 1rem;
      color: #ffffff;
    }

    .sub-narrative-meta {
      display: flex;
      gap: 16px;
      margin-top: 6px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      flex-wrap: wrap;
    }

    .sub-narrative-tokens {
      margin-top: 8px;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .conviction-tag {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .conviction-tag.high { color: var(--color-hot); }
    .conviction-tag.medium { color: var(--color-watch); }
    .conviction-tag.low { color: var(--color-avoid); }

    /* ── Footer ─────────────────────────────────────────── */

    .footer {
      text-align: center;
      padding: 24px;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border-color);
      margin-top: 32px;
    }

    /* ── Narrative Border Accents ───────────────────────── */

    .narrative-card.hot-border {
      border-left: 4px solid var(--color-hot);
    }

    .narrative-card.cold-border {
      border-left: 4px solid #60a5fa;
    }

    /* ── Signal Bar ─────────────────────────────────────── */

    .signal-bar-container {
      width: 60px;
      height: 8px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      overflow: hidden;
    }

    .signal-bar {
      height: 100%;
      border-radius: 4px;
      min-width: 2px;
    }

    .signal-bar.positive { background: var(--color-hot); }
    .signal-bar.negative { background: var(--color-avoid); }

    /* ── Toggle Button ──────────────────────────────────── */

    .toggle-tokens-btn {
      display: inline-block;
      margin-top: 8px;
      padding: 6px 16px;
      background: var(--bg-card-alt);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      color: var(--color-accent);
      font-size: 0.82rem;
      cursor: pointer;
      transition: background 0.15s;
    }

    .toggle-tokens-btn:hover {
      background: var(--bg-card-hover);
    }

    /* ── Responsive ─────────────────────────────────────── */

    @media (max-width: 768px) {
      .header h1 { font-size: 1.5rem; }
      .stats-row { gap: 20px; }
      .hero-metric .hero-value { font-size: 1.2rem; }
      .card { padding: 16px; }
      .narrative-card { padding: 14px 16px; }
      #sankey-chart { height: 400px; }
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
      <h1>Narrative Pulse</h1>
      <p class="tagline">Smart Money Narrative Tracker</p>
      <p class="date" id="header-date"></p>
      <div id="hero-metric"></div>
      <div class="stats-row" id="header-stats"></div>
    </header>

    <!-- Sankey Chart -->
    <div class="card sankey-card" id="sankey-section">
      <div class="card-title">Narrative Rotation Map</div>
      <div id="sankey-chart"></div>
      <div class="sankey-hint">Click a narrative node to jump to its detail section</div>
    </div>

    <!-- Hot Narratives -->
    <section class="section-hot" id="section-hot">
      <h2 class="section-title hot-title">Hot Narratives</h2>
      <div class="section-body" id="hot-narratives"></div>
    </section>

    <!-- Cold Narratives -->
    <section class="section-cold" id="section-cold">
      <h2 class="section-title cold-title">Cold Narratives</h2>
      <div class="section-body" id="cold-narratives"></div>
    </section>

    <!-- Sub-narratives (only rendered if data exists) -->
    <div id="sub-narratives"></div>

    <!-- Footer -->
    <div class="footer">
      Narrative Pulse &mdash; Powered by Nansen Smart Money Data
    </div>
  </div>

  <script>
    // ── Embedded Scan Data ──────────────────────────────────
    var SCAN_DATA = ${jsonData};

    // ── Utility Functions ───────────────────────────────────

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
      var sign = value >= 0 ? '+' : '-';
      return sign + Math.abs(value).toFixed(1) + '%';
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function slugify(name) {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // ── Data Preprocessing ──────────────────────────────────
    // Show ALL classified tokens — no minimum netflow filter

    var processedNarratives = SCAN_DATA.narratives.map(function(n) {
      return {
        displayName: n.displayName,
        totalNetflow24h: n.totalNetflow24h,
        totalNetflow7d: n.totalNetflow7d,
        tokenCount: n.tokenCount,
        isHot: n.totalNetflow24h > 0,
        topTokens: n.topTokens
      };
    }).filter(function(n) {
      return n.topTokens.length > 0 || Math.abs(n.totalNetflow24h) > 0;
    });

    var hotNarratives = processedNarratives.filter(function(n) { return n.isHot; });
    var coldNarratives = processedNarratives.filter(function(n) { return !n.isHot; });

    // ── Header Rendering ────────────────────────────────────

    (function renderHeader() {
      var dateStr = SCAN_DATA.timestamp
        ? new Date(SCAN_DATA.timestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        : 'N/A';
      document.getElementById('header-date').textContent = dateStr;

      // Compute stats
      var totalTokens = processedNarratives.reduce(function(sum, n) { return sum + n.topTokens.length; }, 0);
      var totalNarratives = processedNarratives.length;

      // Strongest signal: narrative with highest absolute netflow
      var strongest = null;
      processedNarratives.forEach(function(n) {
        if (!strongest || Math.abs(n.totalNetflow24h) > Math.abs(strongest.totalNetflow24h)) {
          strongest = n;
        }
      });

      // 3 meaningful metrics instead of "Total SM Netflow"
      var heroEl = document.getElementById('hero-metric');
      var html = '<div class="stats-row">';
      html += '<div class="stat"><div class="stat-value">' + totalTokens + ' tokens across ' + totalNarratives + ' narratives</div><div class="stat-label">Scanned</div></div>';
      if (strongest) {
        var sCls = strongest.totalNetflow24h >= 0 ? 'netflow-positive' : 'netflow-negative';
        html += '<div class="stat"><div class="stat-value">\\uD83D\\uDD25 Strongest Signal: ' + escapeHtml(strongest.displayName) + ' (<strong class="' + sCls + '">' + formatUsd(strongest.totalNetflow24h) + '</strong>)</div><div class="stat-label">Focus Here</div></div>';
      }
      html += '<div class="stat"><div class="stat-value">' + (SCAN_DATA.creditsUsed || 0) + '</div><div class="stat-label">Credits Used</div></div>';
      html += '</div>';
      heroEl.innerHTML = html;

      // Hide old stats row — metrics are now in hero-metric
      document.getElementById('header-stats').innerHTML = '';
    })();

    // ── Sankey Chart ────────────────────────────────────────

    (function renderSankey() {
      if (processedNarratives.length === 0) {
        document.getElementById('sankey-section').style.display = 'none';
        return;
      }

      var chartDom = document.getElementById('sankey-chart');
      var chart = echarts.init(chartDom, null, { renderer: 'canvas' });

      // Build Sankey data: Smart Money -> Narratives (allocation mode)
      // Only show narratives with meaningful netflow
      var sankeyNarratives = processedNarratives.slice(0, 15);

      var nodes = [{ name: 'Smart Money', itemStyle: { color: '#818cf8' } }];
      var links = [];

      sankeyNarratives.forEach(function(n) {
        var isPositive = n.totalNetflow24h >= 0;
        nodes.push({
          name: n.displayName,
          itemStyle: { color: isPositive ? '#34d399' : '#f87171' }
        });

        var rawValue = Math.abs(n.totalNetflow24h) || 1;
        var displayValue = Math.max(Math.pow(rawValue, 0.4), 5);

        links.push({
          source: 'Smart Money',
          target: n.displayName,
          value: displayValue,
          _rawValue: rawValue,
          _realNetflow: n.totalNetflow24h,
          lineStyle: {
            color: isPositive
              ? 'rgba(52, 211, 153, 0.45)'
              : 'rgba(248, 113, 113, 0.45)'
          }
        });
      });

      // Rotation mode: if we have enough rotations, show inter-narrative flows
      var hasRotations = SCAN_DATA.rotations && SCAN_DATA.rotations.length > 5;

      if (hasRotations) {
        // Build rotation nodes and links instead
        nodes = [];
        links = [];
        var nameSet = {};

        SCAN_DATA.rotations.forEach(function(r) {
          var src = r.from.replace(/\\+/g, ' ');
          var tgt = r.to.replace(/\\+/g, ' ');
          nameSet[src] = true;
          nameSet[tgt] = true;
        });

        var narrativeByName = {};
        processedNarratives.forEach(function(n) {
          narrativeByName[n.displayName] = n;
        });

        Object.keys(nameSet).forEach(function(name) {
          var narr = narrativeByName[name];
          var isPositive = narr ? narr.totalNetflow24h >= 0 : false;
          nodes.push({
            name: name,
            itemStyle: { color: isPositive ? '#34d399' : '#f87171' }
          });
        });

        // Deduplicate cycles: keep only the larger flow per pair
        var pairMap = {};
        SCAN_DATA.rotations.forEach(function(r) {
          var src = r.from.replace(/\\+/g, ' ');
          var tgt = r.to.replace(/\\+/g, ' ');
          var pairKey = [src, tgt].sort().join('||');
          if (!pairMap[pairKey] || Math.abs(r.valueUsd) > Math.abs(pairMap[pairKey].valueUsd)) {
            pairMap[pairKey] = { from: src, to: tgt, valueUsd: r.valueUsd, direction: r.direction };
          }
        });

        Object.keys(pairMap).forEach(function(key) {
          var r = pairMap[key];
          var rawValue = Math.abs(r.valueUsd) || 1;
          var displayValue = Math.max(Math.pow(rawValue, 0.4), 5);
          links.push({
            source: r.from,
            target: r.to,
            value: displayValue,
            _rawValue: rawValue,
            _realNetflow: r.valueUsd,
            lineStyle: {
              color: r.direction === 'inflow'
                ? 'rgba(52, 211, 153, 0.45)'
                : 'rgba(248, 113, 113, 0.45)'
            }
          });
        });
      }

      chart.setOption({
        title: {
          text: hasRotations ? 'Capital Flows Between Narratives' : 'Smart Money Capital Allocation',
          left: 'center',
          textStyle: { fontSize: 15, color: '#e8e9ed', fontWeight: 600 }
        },
        tooltip: {
          trigger: 'item',
          triggerOn: 'mousemove',
          formatter: function(params) {
            if (params.dataType === 'edge') {
              var realValue = params.data._rawValue != null ? params.data._rawValue : params.data.value;
              return params.data.source + ' \\u2192 ' + params.data.target +
                '<br/>Flow: ' + formatUsdAbs(realValue);
            }
            return '<strong>' + params.name + '</strong>';
          }
        },
        series: [{
          type: 'sankey',
          layout: 'none',
          emphasis: { focus: 'adjacency' },
          nodeAlign: 'justify',
          nodeGap: 20,
          nodeWidth: 28,
          layoutIterations: 32,
          top: 60,
          bottom: 40,
          left: 50,
          right: '40%',
          label: {
            position: 'right',
            fontSize: 14,
            color: '#e8e9ed',
            fontWeight: 500,
            overflow: 'none'
          },
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
            opacity: 0.35
          },
          data: nodes,
          links: links
        }]
      });

      // Click handler: scroll to narrative section
      chart.on('click', function(params) {
        if (params.dataType === 'node' && params.name !== 'Smart Money') {
          var slug = slugify(params.name);
          var el = document.getElementById('narrative-' + slug);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });

      window.addEventListener('resize', function() { chart.resize(); });
    })();

    // ── Narrative Card Rendering ────────────────────────────

    function renderNarrativeCard(narrative) {
      var slug = slugify(narrative.displayName);
      var netflowClass = narrative.totalNetflow24h >= 0 ? 'netflow-positive' : 'netflow-negative';
      var netflow7dClass = narrative.totalNetflow7d >= 0 ? 'netflow-positive' : 'netflow-negative';
      var borderClass = narrative.isHot ? 'hot-border' : 'cold-border';

      var html = '<div class="narrative-card ' + borderClass + '" id="narrative-' + slug + '">';
      html += '<div class="narrative-header">';
      html += '<span class="narrative-name">' + escapeHtml(narrative.displayName) + '</span>';
      html += '<div class="narrative-metrics">';
      html += '<span class="metric">24h: <strong class="' + netflowClass + '">' + formatUsd(narrative.totalNetflow24h) + '</strong></span>';
      html += '<span class="metric">7d: <strong class="' + netflow7dClass + '">' + formatUsd(narrative.totalNetflow7d) + '</strong></span>';
      html += '<span class="metric">' + narrative.topTokens.length + ' tokens</span>';
      html += '</div></div>';

      if (narrative.topTokens.length > 0) {
        // Group tokens by category
        var grouped = { hot: [], watch: [], avoid: [] };
        narrative.topTokens.forEach(function(t) {
          if (grouped[t.category]) {
            grouped[t.category].push(t);
          }
        });

        // Sort each group by |netflow| DESC
        ['hot', 'watch', 'avoid'].forEach(function(cat) {
          grouped[cat].sort(function(a, b) { return Math.abs(b.netflow24hUsd) - Math.abs(a.netflow24hUsd); });
        });

        var categoryLabels = { hot: 'ACCUMULATING', watch: 'EARLY SIGNAL', avoid: 'DISTRIBUTING' };

        // Calculate max netflow for signal bars
        var maxNetflow = 0;
        narrative.topTokens.forEach(function(t) {
          var absVal = Math.abs(t.netflow24hUsd);
          if (absVal > maxNetflow) maxNetflow = absVal;
        });

        // Track global token index for "show all" toggle
        var globalTokenIndex = 0;
        var MAX_VISIBLE = 10;
        var totalTokensInNarrative = grouped.hot.length + grouped.watch.length + grouped.avoid.length;
        var hasToggle = totalTokensInNarrative > MAX_VISIBLE;

        // Only render categories that have tokens
        ['hot', 'watch', 'avoid'].forEach(function(cat) {
          var tokens = grouped[cat];
          if (tokens.length === 0) return;

          html += '<div class="token-group">';
          html += '<span class="group-badge badge-' + cat + '">' + categoryLabels[cat] + '</span>';
          html += '<table class="token-table">';
          html += '<thead><tr>';
          html += '<th>Token</th><th>Signal</th><th>Netflow 24h</th><th>7d Netflow</th><th>Price \\u0394</th><th>Market Cap</th>';
          html += '</tr></thead><tbody>';

          tokens.forEach(function(t) {
            var isHidden = hasToggle && globalTokenIndex >= MAX_VISIBLE;
            globalTokenIndex++;

            var tNetflowCls = t.netflow24hUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
            var tNetflow7dCls = t.netflow7dUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
            var priceText = t.priceChange === 0 ? '\\u2014' : formatPercent(t.priceChange);
            var priceCls = t.priceChange > 0 ? 'netflow-positive' : (t.priceChange < 0 ? 'netflow-negative' : '');

            var signalWidth = maxNetflow > 0 ? Math.round(Math.abs(t.netflow24hUsd) / maxNetflow * 100) : 0;
            var signalColor = t.netflow24hUsd >= 0 ? 'positive' : 'negative';

            html += '<tr' + (isHidden ? ' data-hidden="true" style="display:none"' : '') + '>';
            html += '<td><strong>' + escapeHtml(t.token_symbol) + '</strong></td>';
            html += '<td><div class="signal-bar-container"><div class="signal-bar ' + signalColor + '" style="width:' + signalWidth + '%"></div></div></td>';
            html += '<td class="mono ' + tNetflowCls + '">' + formatUsd(t.netflow24hUsd) + '</td>';
            html += '<td class="mono ' + tNetflow7dCls + '">' + formatUsd(t.netflow7dUsd) + '</td>';
            html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
            html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
            html += '</tr>';
          });

          html += '</tbody></table>';
          html += '</div>';
        });

        if (hasToggle) {
          html += '<button class="toggle-tokens-btn" onclick="var rows=this.parentElement.querySelectorAll(\\'tr[data-hidden]\\');for(var i=0;i<rows.length;i++){rows[i].style.display=\\'table-row\\';rows[i].removeAttribute(\\'data-hidden\\');}this.style.display=\\'none\\';">Show all ' + totalTokensInNarrative + ' tokens</button>';
        }
      }

      html += '</div>';
      return html;
    }

    // ── Hot Narratives Section ──────────────────────────────

    (function renderHotNarratives() {
      var container = document.getElementById('hot-narratives');
      var section = document.getElementById('section-hot');

      if (hotNarratives.length === 0) {
        section.style.display = 'none';
        return;
      }

      // Sort: highest netflow first
      hotNarratives.sort(function(a, b) { return b.totalNetflow24h - a.totalNetflow24h; });

      var html = '';
      hotNarratives.forEach(function(n) {
        html += renderNarrativeCard(n);
      });
      container.innerHTML = html;
    })();

    // ── Cold Narratives Section ─────────────────────────────

    (function renderColdNarratives() {
      var container = document.getElementById('cold-narratives');
      var section = document.getElementById('section-cold');

      if (coldNarratives.length === 0) {
        section.style.display = 'none';
        return;
      }

      // Sort: least negative first (closest to zero)
      coldNarratives.sort(function(a, b) { return b.totalNetflow24h - a.totalNetflow24h; });

      var html = '';
      coldNarratives.forEach(function(n) {
        html += renderNarrativeCard(n);
      });
      container.innerHTML = html;
    })();

    // ── Sub-narratives ──────────────────────────────────────

    (function renderSubNarratives() {
      if (!SCAN_DATA.subNarratives || SCAN_DATA.subNarratives.length === 0) return;

      var container = document.getElementById('sub-narratives');
      var narrativeName = SCAN_DATA.topNarrativeKey || 'Top';

      var html = '<div class="card">';
      html += '<div class="card-title">Sub-narratives: ' + escapeHtml(narrativeName) + '</div>';

      SCAN_DATA.subNarratives.forEach(function(sub) {
        var netflowCls = sub.totalNetflowUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
        html += '<div class="sub-narrative-card conviction-' + sub.conviction + '">';
        html += '<div class="sub-narrative-name">' + escapeHtml(sub.name) + '</div>';
        html += '<div class="sub-narrative-meta">';
        html += '<span>Conviction: <span class="conviction-tag ' + sub.conviction + '">' + sub.conviction.toUpperCase() + '</span></span>';
        html += '<span>Netflow: <strong class="' + netflowCls + '">' + formatUsd(sub.totalNetflowUsd) + '</strong></span>';
        html += '</div>';
        html += '<div class="sub-narrative-tokens">Tokens: ' + sub.tokens.map(function(t) { return escapeHtml(t); }).join(', ') + '</div>';
        html += '</div>';
      });

      html += '</div>';
      container.innerHTML = html;
    })();
  </script>
</body>
</html>`;
}

// ============================================================
// Main Export
// ============================================================

/**
 * Render a standalone interactive HTML report from a ScanResult.
 * The report embeds all data and ECharts via CDN — opens in any browser.
 *
 * @param result - Complete scan result with narratives, rotations, etc.
 * @returns Path to the saved HTML file in the output/ directory
 */
export async function renderHtmlReport(result: ScanResult): Promise<string> {
  await mkdir("output", { recursive: true });

  const data = toHtmlReportData(result);
  const html = generateHtml(data);

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const outputPath = join("output", `narrative-pulse-report-${timestamp}.html`);

  await writeFile(outputPath, html, "utf-8");

  log(`Saved report to ${outputPath}`);

  return outputPath;
}
