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
  priceChange: number;
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
    priceChange: t.priceChange,
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
  <title>Narrative Pulse</title>
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

    /* Header */

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

    .header .date {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    .hero-metric {
      display: inline-block;
      padding: 10px 28px;
      border-radius: 8px;
      background: rgba(52, 211, 153, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.2);
      margin-bottom: 16px;
      font-size: 1.1rem;
      color: var(--text-primary);
    }

    .hero-metric strong {
      font-weight: 700;
    }

    .hero-metric.positive { border-color: rgba(52, 211, 153, 0.3); background: rgba(52, 211, 153, 0.08); }
    .hero-metric.negative { border-color: rgba(248, 113, 113, 0.3); background: rgba(248, 113, 113, 0.08); }

    .stats-row {
      display: flex;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .stat { text-align: center; }
    .stat-value { font-size: 1.3rem; font-weight: 700; color: #ffffff; }
    .stat-label { font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

    /* Sankey Chart */

    #sankey-chart {
      width: 100%;
      height: 450px;
    }

    .sankey-card { margin-bottom: 32px; }
    .sankey-hint { font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; text-align: center; }

    /* Section Headers */

    .section { margin-bottom: 32px; }

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

    /* Narrative Cards */

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

    /* Tables */

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

    /* Sub-narratives */

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

    /* Card utility */

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

    /* Footer */

    .footer {
      text-align: center;
      padding: 24px;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border-color);
      margin-top: 32px;
    }

    /* Responsive */

    @media (max-width: 768px) {
      .header h1 { font-size: 1.5rem; }
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
      <h1>Narrative Pulse</h1>
      <p class="date" id="header-date"></p>
      <div id="hero-metric"></div>
      <div class="stats-row" id="header-stats"></div>
    </header>

    <!-- Sankey Chart (interactive, labels can wrap) -->
    <div class="card sankey-card" id="sankey-section">
      <div class="card-title">Smart Money Capital Allocation</div>
      <div id="sankey-chart"></div>
      <div class="sankey-hint">Click a narrative node to jump to its detail section</div>
    </div>

    <!-- Accumulating Narratives -->
    <section class="section" id="section-accumulating">
      <h2 class="section-title accumulating">Smart Money is ACCUMULATING</h2>
      <div class="section-body" id="accumulating-narratives"></div>
    </section>

    <!-- Distributing Narratives -->
    <section class="section" id="section-distributing">
      <h2 class="section-title distributing">Smart Money is DISTRIBUTING</h2>
      <div class="section-body" id="distributing-narratives"></div>
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
      if (value === 0) return '\\u2014';
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
    // Filter: only narratives with non-zero netflow
    // Filter: only classified tokens with |netflow| > $1000

    var MIN_TOKEN_NETFLOW = 1000;

    var processedNarratives = SCAN_DATA.narratives.filter(function(n) {
      return Math.abs(n.totalNetflow24h) > 0;
    }).map(function(n) {
      return {
        displayName: n.displayName,
        totalNetflow24h: n.totalNetflow24h,
        totalNetflow7d: n.totalNetflow7d,
        tokenCount: n.tokenCount,
        isHot: n.totalNetflow24h > 0,
        topTokens: n.topTokens.filter(function(t) {
          return Math.abs(t.netflow24hUsd) >= MIN_TOKEN_NETFLOW;
        })
      };
    });

    var accumulatingNarratives = processedNarratives.filter(function(n) { return n.isHot; });
    var distributingNarratives = processedNarratives.filter(function(n) { return !n.isHot; });

    // ── Header Rendering ────────────────────────────────────

    (function renderHeader() {
      var dateStr = SCAN_DATA.timestamp
        ? new Date(SCAN_DATA.timestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        : 'N/A';
      document.getElementById('header-date').textContent = dateStr;

      // Count classified tokens (those with |netflow| >= $1000)
      var classifiedTokens = 0;
      processedNarratives.forEach(function(n) { classifiedTokens += n.topTokens.length; });
      var narrativeCount = processedNarratives.length;

      // Strongest signal: narrative with highest absolute netflow
      var strongest = null;
      processedNarratives.forEach(function(n) {
        if (!strongest || Math.abs(n.totalNetflow24h) > Math.abs(strongest.totalNetflow24h)) {
          strongest = n;
        }
      });

      // Hero metric
      var heroEl = document.getElementById('hero-metric');
      if (strongest) {
        var cls = strongest.totalNetflow24h >= 0 ? 'positive' : 'negative';
        var direction = strongest.totalNetflow24d >= 0 ? 'into' : 'out of';
        var netflowCls = strongest.totalNetflow24h >= 0 ? 'netflow-positive' : 'netflow-negative';
        heroEl.className = 'hero-metric ' + cls;
        heroEl.innerHTML = 'Strongest signal: Smart Money is flowing <strong>' +
          (strongest.totalNetflow24h >= 0 ? 'into' : 'out of') +
          '</strong> <strong>' + escapeHtml(strongest.displayName) + '</strong>' +
          ' (<strong class="' + netflowCls + '">' + formatUsd(strongest.totalNetflow24h) + '</strong> in 24h)';
      }

      // Stats
      var statsEl = document.getElementById('header-stats');
      statsEl.innerHTML =
        '<div class="stat"><div class="stat-value">' + narrativeCount + '</div><div class="stat-label">Narratives Tracked</div></div>' +
        '<div class="stat"><div class="stat-value">' + classifiedTokens + '</div><div class="stat-label">Classified Tokens</div></div>' +
        '<div class="stat"><div class="stat-value">' + (SCAN_DATA.creditsUsed || 0) + '</div><div class="stat-label">Credits Used</div></div>';
    })();

    // ── Sankey Chart (interactive HTML — keeps Sankey here) ──

    (function renderSankey() {
      if (processedNarratives.length === 0) {
        document.getElementById('sankey-section').style.display = 'none';
        return;
      }

      var chartDom = document.getElementById('sankey-chart');
      var chart = echarts.init(chartDom, null, { renderer: 'canvas' });

      // Only include narratives with |netflow| > $500
      var sankeyNarratives = processedNarratives.filter(function(n) {
        return Math.abs(n.totalNetflow24h) > 500;
      }).slice(0, 15);

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
          lineStyle: {
            color: isPositive
              ? 'rgba(52, 211, 153, 0.45)'
              : 'rgba(248, 113, 113, 0.45)'
          }
        });
      });

      chart.setOption({
        title: {
          text: 'Smart Money Capital Allocation',
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
                '<br/>Flow: <strong>' + formatUsdAbs(realValue) + '</strong>';
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
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      window.addEventListener('resize', function() { chart.resize(); });
    })();

    // ── Narrative Card Rendering ────────────────────────────

    function renderNarrativeCard(narrative) {
      var slug = slugify(narrative.displayName);
      var netflowClass = narrative.totalNetflow24h >= 0 ? 'netflow-positive' : 'netflow-negative';
      var borderClass = narrative.isHot ? 'border-positive' : 'border-negative';

      var html = '<div class="narrative-card ' + borderClass + '" id="narrative-' + slug + '">';
      html += '<div class="narrative-header">';
      html += '<span class="narrative-name">' + escapeHtml(narrative.displayName) + '</span>';
      html += '<div class="narrative-metrics">';
      html += '<span class="metric">24h Netflow: <strong class="' + netflowClass + '">' + formatUsd(narrative.totalNetflow24h) + '</strong></span>';
      html += '<span class="metric">' + narrative.topTokens.length + ' classified tokens</span>';
      html += '</div></div>';

      if (narrative.topTokens.length > 0) {
        // Sort all tokens by |netflow| DESC
        var sorted = narrative.topTokens.slice().sort(function(a, b) {
          return Math.abs(b.netflow24hUsd) - Math.abs(a.netflow24hUsd);
        });

        html += '<table class="token-table">';
        html += '<thead><tr>';
        html += '<th>Token</th><th>Netflow 24h</th><th>Price \\u0394</th><th>Market Cap</th>';
        html += '</tr></thead><tbody>';

        sorted.forEach(function(t) {
          var tNetflowCls = t.netflow24hUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
          var priceText = t.priceChange === 0 ? '\\u2014' : formatPercent(t.priceChange);
          var priceCls = t.priceChange > 0 ? 'netflow-positive' : (t.priceChange < 0 ? 'netflow-negative' : '');

          html += '<tr>';
          html += '<td><strong>' + escapeHtml(t.token_symbol) + '</strong></td>';
          html += '<td class="mono ' + tNetflowCls + '">' + formatUsd(t.netflow24hUsd) + '</td>';
          html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
          html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
          html += '</tr>';
        });

        html += '</tbody></table>';
      } else {
        // No classified tokens — show summary only
        html += '<p style="color: var(--text-muted); font-size: 0.9rem;">' +
          narrative.tokenCount + ' tokens tracked. Strong SM ' +
          (narrative.totalNetflow24h >= 0 ? 'accumulation' : 'distribution') +
          ' signal.</p>';
      }

      html += '</div>';
      return html;
    }

    // ── Accumulating Section ────────────────────────────────

    (function renderAccumulating() {
      var container = document.getElementById('accumulating-narratives');
      var section = document.getElementById('section-accumulating');

      if (accumulatingNarratives.length === 0) {
        section.style.display = 'none';
        return;
      }

      // Sort: highest netflow first
      accumulatingNarratives.sort(function(a, b) { return b.totalNetflow24h - a.totalNetflow24h; });

      var html = '';
      accumulatingNarratives.forEach(function(n) { html += renderNarrativeCard(n); });
      container.innerHTML = html;
    })();

    // ── Distributing Section ────────────────────────────────

    (function renderDistributing() {
      var container = document.getElementById('distributing-narratives');
      var section = document.getElementById('section-distributing');

      if (distributingNarratives.length === 0) {
        section.style.display = 'none';
        return;
      }

      // Sort: most negative first
      distributingNarratives.sort(function(a, b) { return a.totalNetflow24h - b.totalNetflow24h; });

      var html = '';
      distributingNarratives.forEach(function(n) { html += renderNarrativeCard(n); });
      container.innerHTML = html;
    })();

    // ── Sub-narratives (only if data exists) ────────────────

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
        html += '<span>Conviction: <strong>' + sub.conviction.toUpperCase() + '</strong></span>';
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
