// ============================================================
// HTML Report — Standalone interactive report with ECharts
// Generates a self-contained HTML file that opens in any browser
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
  priceChange: number;
  buyVolume: number;
  sellVolume: number;
  traderCount: number;
  marketCapUsd: number;
}

interface HtmlReportNarrative {
  displayName: string;
  totalNetflow24h: number;
  totalNetflow7d: number;
  tokenCount: number;
  traderCount: number;
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
  apiCallsUsed: number;
  creditsUsed: number;
  sectors: string[];
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
    priceChange: t.priceChange,
    buyVolume: t.buyVolume,
    sellVolume: t.sellVolume,
    traderCount: t.traderCount,
    marketCapUsd: t.marketCapUsd,
  };
}

function toHtmlNarrative(n: NarrativeSummary): HtmlReportNarrative {
  return {
    displayName: n.displayName,
    totalNetflow24h: n.totalNetflow24h,
    totalNetflow7d: n.totalNetflow7d,
    tokenCount: n.tokenCount,
    traderCount: n.traderCount,
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
    apiCallsUsed: result.apiCallsUsed,
    creditsUsed: result.creditsUsed,
    sectors: result.sectors,
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
  <title>Narrative Pulse — Smart Money Rotation Report</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-card: #16213e;
      --bg-card-alt: #1a2744;
      --text-primary: #e0e0e0;
      --text-secondary: #a0a0b0;
      --color-hot: #2ecc71;
      --color-watch: #f39c12;
      --color-avoid: #e74c3c;
      --color-inflow: rgba(46, 204, 113, 0.5);
      --color-outflow: rgba(231, 76, 60, 0.5);
      --border-color: #2a2a4a;
      --shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px 48px;
    }

    /* ── Header ─────────────────────────────────────────── */

    .header {
      text-align: center;
      padding: 48px 24px 32px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 32px;
    }

    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      color: #ffffff;
    }

    .header .subtitle {
      font-size: 0.95rem;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    .header .stats {
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
    }

    .header .stat {
      text-align: center;
    }

    .header .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffffff;
    }

    .header .stat-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Cards ──────────────────────────────────────────── */

    .card {
      background: var(--bg-card);
      border-radius: 12px;
      box-shadow: var(--shadow);
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
    }

    .card-title {
      font-size: 1.2rem;
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
      min-height: 400px;
    }

    .sankey-card {
      margin-bottom: 32px;
    }

    /* ── Narrative Tables ───────────────────────────────── */

    .narrative-section {
      margin-bottom: 24px;
    }

    .narrative-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .narrative-name {
      font-size: 1.15rem;
      font-weight: 600;
      color: #ffffff;
    }

    .narrative-stats {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .narrative-stat {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .narrative-stat strong {
      color: var(--text-primary);
    }

    .netflow-positive { color: var(--color-hot) !important; }
    .netflow-negative { color: var(--color-avoid) !important; }

    /* ── Category Badges ────────────────────────────────── */

    .category-section {
      margin-bottom: 16px;
    }

    .category-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 10px;
    }

    .badge-hot {
      background: rgba(46, 204, 113, 0.15);
      color: var(--color-hot);
      border: 1px solid rgba(46, 204, 113, 0.3);
    }

    .badge-watch {
      background: rgba(243, 156, 18, 0.15);
      color: var(--color-watch);
      border: 1px solid rgba(243, 156, 18, 0.3);
    }

    .badge-avoid {
      background: rgba(231, 76, 60, 0.15);
      color: var(--color-avoid);
      border: 1px solid rgba(231, 76, 60, 0.3);
    }

    .empty-category {
      font-size: 0.85rem;
      color: var(--text-secondary);
      padding-left: 8px;
      font-style: italic;
    }

    /* ── Tables ─────────────────────────────────────────── */

    .token-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .token-table thead th {
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-card-alt);
    }

    .token-table tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(42, 42, 74, 0.5);
      color: var(--text-primary);
    }

    .token-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .token-table tbody tr:last-child td {
      border-bottom: none;
    }

    /* ── Sub-narratives ─────────────────────────────────── */

    .sub-narrative-card {
      background: var(--bg-card-alt);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      border-left: 3px solid var(--text-secondary);
    }

    .sub-narrative-card.conviction-high {
      border-left-color: var(--color-hot);
    }

    .sub-narrative-card.conviction-medium {
      border-left-color: var(--color-watch);
    }

    .sub-narrative-card.conviction-low {
      border-left-color: var(--color-avoid);
    }

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
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .conviction-tag.high { color: var(--color-hot); }
    .conviction-tag.medium { color: var(--color-watch); }
    .conviction-tag.low { color: var(--color-avoid); }

    /* ── Rotations List ─────────────────────────────────── */

    .rotation-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(42, 42, 74, 0.5);
      font-size: 0.9rem;
    }

    .rotation-item:last-child {
      border-bottom: none;
    }

    .rotation-arrow {
      color: var(--text-secondary);
      font-size: 1.1rem;
    }

    .rotation-value {
      margin-left: auto;
      font-weight: 600;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    }

    /* ── Footer ─────────────────────────────────────────── */

    .footer {
      text-align: center;
      padding: 24px;
      font-size: 0.8rem;
      color: var(--text-secondary);
      border-top: 1px solid var(--border-color);
      margin-top: 32px;
    }

    /* ── Responsive ─────────────────────────────────────── */

    @media (max-width: 768px) {
      .header h1 { font-size: 1.5rem; }
      .header .stats { gap: 16px; }
      .card { padding: 16px; }
      #sankey-chart { height: 400px; min-height: 300px; }
      .narrative-header { flex-direction: column; align-items: flex-start; }
      .token-table { font-size: 0.8rem; }
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
      <p class="subtitle" id="header-subtitle">Smart Money Rotation Report</p>
      <div class="stats" id="header-stats"></div>
    </header>

    <!-- Sankey Chart -->
    <div class="card sankey-card">
      <div class="card-title">&#x1F30A; Narrative Rotation Map</div>
      <div id="sankey-chart"></div>
    </div>

    <!-- Narrative Tables -->
    <div id="narrative-tables"></div>

    <!-- Sub-narratives -->
    <div id="sub-narratives"></div>

    <!-- Footer -->
    <div class="footer">
      Narrative Pulse &mdash; Powered by Nansen Smart Money Data
    </div>
  </div>

  <script>
    // ── Embedded Scan Data ──────────────────────────────────
    const SCAN_DATA = ${jsonData};

    // ── Utility Functions ───────────────────────────────────

    function formatUsd(value) {
      var sign = value >= 0 ? '+' : '-';
      var abs = Math.abs(value);
      if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(1) + 'B';
      if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
      if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
      return sign + '$' + abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    function formatMcap(value) {
      if (value <= 0) return '\u2014';
      if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
      if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
      if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
      return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
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

    // ── Header Rendering ────────────────────────────────────

    (function renderHeader() {
      var dateStr = SCAN_DATA.timestamp
        ? new Date(SCAN_DATA.timestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        : 'N/A';

      var subtitle = document.getElementById('header-subtitle');
      subtitle.textContent = 'Smart Money Rotation Report \u2014 ' + dateStr;

      var totalTokens = SCAN_DATA.narratives.reduce(function(sum, n) { return sum + n.tokenCount; }, 0);
      var hotCount = SCAN_DATA.narratives.filter(function(n) { return n.isHot; }).length;

      document.getElementById('header-stats').innerHTML =
        '<div class="stat"><div class="stat-value">' + SCAN_DATA.narratives.length + '</div><div class="stat-label">Narratives</div></div>' +
        '<div class="stat"><div class="stat-value">' + hotCount + '</div><div class="stat-label">Hot</div></div>' +
        '<div class="stat"><div class="stat-value">' + totalTokens + '</div><div class="stat-label">Tokens</div></div>' +
        '<div class="stat"><div class="stat-value">' + SCAN_DATA.rotations.length + '</div><div class="stat-label">Rotations</div></div>' +
        '<div class="stat"><div class="stat-value">' + SCAN_DATA.apiCallsUsed + '</div><div class="stat-label">API Calls</div></div>';
    })();

    // ── Sankey Chart ────────────────────────────────────────

    (function renderSankey() {
      if (SCAN_DATA.narratives.length === 0) return;

      var chartDom = document.getElementById('sankey-chart');
      var chart = echarts.init(chartDom, null, { renderer: 'canvas' });

      // Build name resolution map
      var nameMap = {};
      SCAN_DATA.narratives.forEach(function(n) {
        nameMap[n.displayName] = n.displayName;
      });

      function resolveName(key) {
        return nameMap[key] || key.replace(/\\+/g, ' ');
      }

      // Build nodes
      var nodes = SCAN_DATA.narratives.map(function(n) {
        return {
          name: n.displayName,
          itemStyle: { color: n.isHot ? '#2ecc71' : '#e74c3c' }
        };
      });

      // Deduplicate cycles: keep only the larger flow per pair
      var pairMap = {};
      SCAN_DATA.rotations.forEach(function(r) {
        var src = resolveName(r.from);
        var tgt = resolveName(r.to);
        var pairKey = [src, tgt].sort().join('||');
        if (!pairMap[pairKey] || Math.abs(r.valueUsd) > Math.abs(pairMap[pairKey].valueUsd)) {
          pairMap[pairKey] = r;
        }
      });

      var links = Object.values(pairMap).map(function(r) {
        return {
          source: resolveName(r.from),
          target: resolveName(r.to),
          value: Math.abs(r.valueUsd),
          lineStyle: {
            color: r.direction === 'inflow'
              ? 'rgba(46, 204, 113, 0.5)'
              : 'rgba(231, 76, 60, 0.5)'
          }
        };
      });

      chart.setOption({
        title: {
          text: 'Capital Flows Between Narratives',
          left: 'center',
          textStyle: { fontSize: 16, color: '#e0e0e0' }
        },
        tooltip: {
          trigger: 'item',
          triggerOn: 'mousemove',
          formatter: function(params) {
            if (params.dataType === 'edge') {
              return params.data.source + ' \u2192 ' + params.data.target + '<br/>Flow: ' + formatUsd(params.data.value);
            }
            return params.name;
          }
        },
        series: [{
          type: 'sankey',
          layout: 'none',
          emphasis: { focus: 'adjacency' },
          nodeAlign: 'justify',
          nodeGap: 20,
          nodeWidth: 30,
          layoutIterations: 32,
          label: { fontSize: 13, color: '#e0e0e0' },
          lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.4 },
          data: nodes,
          links: links
        }]
      });

      window.addEventListener('resize', function() { chart.resize(); });
    })();

    // ── Narrative Tables ────────────────────────────────────

    (function renderNarrativeTables() {
      var container = document.getElementById('narrative-tables');
      var html = '';

      var categories = ['hot', 'watch', 'avoid'];
      var categoryLabels = { hot: 'Hot', watch: 'Watch', avoid: 'Avoid' };
      var categoryIcons = { hot: '\uD83D\uDD25', watch: '\uD83D\uDC40', avoid: '\u26D4' };

      SCAN_DATA.narratives.forEach(function(narrative) {
        if (narrative.topTokens.length === 0) return;

        var netflowClass = narrative.totalNetflow24h >= 0 ? 'netflow-positive' : 'netflow-negative';

        html += '<div class="card narrative-section">';
        html += '<div class="narrative-header">';
        html += '<span class="narrative-name">' + (narrative.isHot ? '\uD83D\uDD25 ' : '') + escapeHtml(narrative.displayName) + '</span>';
        html += '<div class="narrative-stats">';
        html += '<span class="narrative-stat">Tokens: <strong>' + narrative.tokenCount + '</strong></span>';
        html += '<span class="narrative-stat">Traders: <strong>' + narrative.traderCount + '</strong></span>';
        html += '<span class="narrative-stat">24h Netflow: <strong class="' + netflowClass + '">' + formatUsd(narrative.totalNetflow24h) + '</strong></span>';
        html += '<span class="narrative-stat">7d Netflow: <strong class="' + (narrative.totalNetflow7d >= 0 ? 'netflow-positive' : 'netflow-negative') + '">' + formatUsd(narrative.totalNetflow7d) + '</strong></span>';
        html += '</div></div>';

        // Group tokens by category
        var grouped = { hot: [], watch: [], avoid: [] };
        narrative.topTokens.forEach(function(t) {
          if (grouped[t.category]) {
            grouped[t.category].push(t);
          }
        });

        categories.forEach(function(cat) {
          html += '<div class="category-section">';
          html += '<span class="category-badge badge-' + cat + '">' + categoryIcons[cat] + ' ' + categoryLabels[cat] + '</span>';

          var tokens = grouped[cat];
          if (tokens.length === 0) {
            html += '<div class="empty-category">No tokens in this category</div>';
          } else {
            html += '<table class="token-table">';
            html += '<thead><tr>';
            html += '<th>Token</th><th>Netflow 24h</th><th>Price \u0394</th><th>Traders</th><th>Market Cap</th>';
            html += '</tr></thead><tbody>';

            tokens.forEach(function(t) {
              var netflowCls = t.netflow24hUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
              var priceCls = t.priceChange >= 0 ? 'netflow-positive' : 'netflow-negative';

              html += '<tr>';
              html += '<td><strong>' + escapeHtml(t.token_symbol) + '</strong></td>';
              html += '<td class="' + netflowCls + '">' + formatUsd(t.netflow24hUsd) + '</td>';
              html += '<td class="' + priceCls + '">' + formatPercent(t.priceChange) + '</td>';
              html += '<td>' + t.traderCount + '</td>';
              html += '<td>' + formatMcap(t.marketCapUsd) + '</td>';
              html += '</tr>';
            });

            html += '</tbody></table>';
          }

          html += '</div>';
        });

        html += '</div>';
      });

      container.innerHTML = html;
    })();

    // ── Sub-narratives ──────────────────────────────────────

    (function renderSubNarratives() {
      if (!SCAN_DATA.subNarratives || SCAN_DATA.subNarratives.length === 0) return;

      var container = document.getElementById('sub-narratives');
      var narrativeName = SCAN_DATA.topNarrativeKey || 'Top';

      var html = '<div class="card">';
      html += '<div class="card-title">\uD83E\uDD16 ' + escapeHtml(narrativeName) + ' Sub-narratives</div>';

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
