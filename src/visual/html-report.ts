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
  EarlySignalToken,
  ScreenerHighlight,
} from "../types.js";

// ============================================================
// Serializable Data Interface
// ============================================================

interface HtmlReportToken {
  token_symbol: string;
  token_address: string;
  category: string;
  chain: string;
  netflow24hUsd: number;
  priceChange: number;
  marketCapUsd: number;
  priceUsd?: number;
  buyVolume: number;
  sellVolume: number;
  traderCount: number;
  volume24h: number;
  liquidity: number;
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

interface HtmlReportEarlySignal {
  token_symbol: string;
  token_address: string;
  netflow24hUsd: number;
  priceChange24h: number;
  volume24h: number;
  buyPressure: number;
  marketCap: number;
  narrativeDisplayName: string;
}

interface HtmlReportScreenerHighlight {
  token_symbol: string;
  token_address: string;
  chain: string;
  netflowUsd: number;
  buyVolume: number;
  sellVolume: number;
  buySellRatio: number;
  priceChange: number;
  marketCapUsd: number;
  priceUsd?: number;
  nofBuyers: number;
  nofSellers: number;
  volume: number;
  classification: string;
}

interface HtmlReportData {
  timestamp: string;
  creditsUsed: number;
  narratives: HtmlReportNarrative[];
  rotations: HtmlReportRotation[];
  subNarratives?: HtmlReportSubNarrative[];
  topNarrativeKey?: string;
  earlySignals: HtmlReportEarlySignal[];
  screenerHighlights: HtmlReportScreenerHighlight[];
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
    token_address: t.token_address,
    category: t.category,
    chain: t.chain,
    netflow24hUsd: t.netflow24hUsd,
    priceChange: t.priceChange,
    marketCapUsd: t.marketCapUsd,
    priceUsd: t.priceUsd,
    buyVolume: t.buyVolume,
    sellVolume: t.sellVolume,
    traderCount: t.traderCount,
    volume24h: t.volume24h,
    liquidity: t.liquidity,
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

function toHtmlEarlySignal(t: EarlySignalToken): HtmlReportEarlySignal {
  return {
    token_symbol: t.token_symbol,
    token_address: t.token_address,
    netflow24hUsd: t.netflow24hUsd,
    priceChange24h: t.priceChange24h,
    volume24h: t.volume24h,
    buyPressure: t.buyPressure,
    marketCap: t.marketCap,
    narrativeDisplayName: t.narrativeDisplayName,
  };
}

function toHtmlScreenerHighlight(h: ScreenerHighlight): HtmlReportScreenerHighlight {
  return {
    token_symbol: h.token_symbol,
    token_address: h.token_address,
    chain: h.chain,
    netflowUsd: h.netflowUsd,
    buyVolume: h.buyVolume,
    sellVolume: h.sellVolume,
    buySellRatio: h.buySellRatio,
    priceChange: h.priceChange,
    marketCapUsd: h.marketCapUsd,
    priceUsd: h.priceUsd,
    nofBuyers: h.nofBuyers,
    nofSellers: h.nofSellers,
    volume: h.volume,
    classification: h.classification,
  };
}

function toHtmlReportData(result: ScanResult): HtmlReportData {
  // Filter out narratives with $0 netflow at the data layer (display-layer only)
  const activeNarratives = result.narratives.filter(n => Math.abs(n.totalNetflow24h) > 0);

  return {
    timestamp: result.timestamp,
    creditsUsed: result.creditsUsed,
    narratives: activeNarratives.map(toHtmlNarrative),
    rotations: result.rotations.map(toHtmlRotation),
    subNarratives: result.subNarratives?.map(toHtmlSubNarrative),
    topNarrativeKey: result.topNarrativeKey,
    earlySignals: result.earlySignals.map(toHtmlEarlySignal),
    screenerHighlights: result.screenerHighlights.map(toHtmlScreenerHighlight),
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

    /* Header */

    .header {
      padding: 24px 24px 20px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 24px;
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

    .stats-row {
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
    }

    .stat { text-align: center; }
    .stat-value { font-size: 1.35rem; font-weight: 700; color: #ffffff; }
    .stat-label { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

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

    /* Early Signals */

    .early-signals-card {
      background: var(--bg-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid rgba(52, 211, 153, 0.2);
      border-left: 4px solid var(--color-positive);
    }

    .early-signals-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--color-positive);
    }

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

    /* Screener Highlights */

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

    /* Buy/Sell Bar */

    .buy-sell-bar {
      display: flex;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      min-width: 60px;
    }

    .buy-sell-bar .buy-bar { background: var(--color-positive); }
    .buy-sell-bar .sell-bar { background: var(--color-negative); }

    /* Expandable Rows */

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

    /* Sortable Headers */

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

    /* Column header tooltips */
    .token-table thead th[title] { position: relative; }

    /* Responsive */

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
    </header>

    <!-- Screener Highlights (HERO section — always rich data) -->
    <div id="screener-highlights"></div>

    <!-- Capital Flow Map (interactive Sankey) -->
    <div class="card sankey-card" id="sankey-section">
      <div class="card-title">Capital Flow Map</div>
      <div id="sankey-chart"></div>
      <div class="sankey-hint">Outflows &rarr; Smart Money &rarr; Inflows. Click a narrative to jump to details.</div>
    </div>

    <!-- Narrative Breakdown -->
    <section class="section" id="section-narratives">
      <h2 class="section-title narratives-title">Narrative Breakdown</h2>
      <div class="section-body" id="narratives-container"></div>
    </section>

    <!-- Sub-narratives (only rendered if data exists) -->
    <div id="sub-narratives"></div>

    <!-- Early Signals (only rendered if data exists) -->
    <div id="early-signals"></div>

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

    function formatVolume(value) {
      if (!value || value <= 0) return '\\u2014';
      return formatUsdAbs(value);
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

    // ── Data Preprocessing ──────────────────────────────────
    // Filter: only narratives with non-zero netflow
    // Filter: only classified tokens with |netflow| > $1000

    // Show all classified tokens (no minimum netflow filter)

    var processedNarratives = SCAN_DATA.narratives.filter(function(n) {
      // Show narrative if it has classified tokens OR significant netflow (>$500)
      return n.topTokens.length > 0 || Math.abs(n.totalNetflow24h) > 500;
    }).map(function(n) {
      return {
        displayName: n.displayName,
        totalNetflow24h: n.totalNetflow24h,
        totalNetflow7d: n.totalNetflow7d,
        tokenCount: n.tokenCount,
        isHot: n.totalNetflow24h > 0,
        topTokens: n.topTokens
      };
    });

    // ── Header Rendering ────────────────────────────────────

    (function renderHeader() {
      var dateStr = SCAN_DATA.timestamp
        ? new Date(SCAN_DATA.timestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        : 'N/A';
      document.getElementById('header-date').textContent = dateStr;

      var classifiedTokens = 0;
      processedNarratives.forEach(function(n) { classifiedTokens += n.topTokens.length; });

      // Two highlight cards
      var highlightsEl = document.getElementById('header-highlights');
      var highlightHtml = '';

      // Card 1: Top SM Activity
      var topScreener = (SCAN_DATA.screenerHighlights && SCAN_DATA.screenerHighlights.length > 0)
        ? SCAN_DATA.screenerHighlights[0] : null;
      if (topScreener) {
        var screenerCls = topScreener.netflowUsd >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
        highlightHtml += '<div class="highlight-card">';
        highlightHtml += '<div class="highlight-label">Top SM Activity</div>';
        highlightHtml += '<div class="highlight-value">' + escapeHtml(topScreener.token_symbol) + ' <span style="color:' + screenerCls + '">' + formatUsd(topScreener.netflowUsd) + '</span></div>';
        var totalTraders = topScreener.nofBuyers + topScreener.nofSellers;
        var traderText = totalTraders > 0 ? totalTraders + ' SM traders' : 'Active';
        highlightHtml += '<div class="highlight-sub">' + traderText + ' \\u00B7 ' + formatPercent(topScreener.priceChange) + ' 24h</div>';
        highlightHtml += '</div>';
      } else {
        highlightHtml += '<div class="highlight-card"><div class="highlight-label">Top SM Activity</div><div class="highlight-value" style="color:var(--text-muted)">No data</div></div>';
      }

      // Card 2: Top Narrative Inflow
      var strongest = null;
      processedNarratives.forEach(function(n) {
        if (!strongest || Math.abs(n.totalNetflow24h) > Math.abs(strongest.totalNetflow24h)) {
          strongest = n;
        }
      });
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

      // Stats
      var statsEl = document.getElementById('header-stats');
      statsEl.innerHTML =
        '<div class="stat"><div class="stat-value">' + processedNarratives.length + '</div><div class="stat-label">Active Narratives</div></div>' +
        '<div class="stat"><div class="stat-value">' + classifiedTokens + '</div><div class="stat-label">Classified Tokens</div></div>' +
        '<div class="stat"><div class="stat-value">' + (SCAN_DATA.screenerHighlights ? SCAN_DATA.screenerHighlights.length : 0) + '</div><div class="stat-label">SM Active Tokens</div></div>' +
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

      // Separate into outflows (SM exiting) and inflows (SM entering)
      var outflows = processedNarratives.filter(function(n) { return n.totalNetflow24h < -100; });
      var inflows = processedNarratives.filter(function(n) { return n.totalNetflow24h > 100; });

      // Update hint text based on flow direction
      var hintEl = document.querySelector('#sankey-section .sankey-hint');
      if (hintEl) {
        if (outflows.length === 0) {
          hintEl.textContent = 'Smart Money is flowing into narratives. Click a node to jump to details.';
        } else if (inflows.length === 0) {
          hintEl.textContent = 'Smart Money is exiting these narratives. Click a node to jump to details.';
        } else {
          hintEl.textContent = 'Outflows \u2192 Smart Money \u2192 Inflows. Click a node to jump to details.';
        }
      }

      if (outflows.length === 0 && inflows.length === 0) {
        document.getElementById('sankey-section').style.display = 'none';
        return;
      }

      var nodes = [];
      var links = [];

      // When no outflows, align left so Smart Money node is at left edge
      var nodeAlign = outflows.length === 0 ? 'left' : 'justify';

      // Center node: Smart Money
      nodes.push({
        name: 'Smart Money',
        itemStyle: { color: '#818cf8' }
      });

      // Left column: Outflow narratives (SM is selling)
      outflows.forEach(function(n) {
        nodes.push({
          name: n.displayName,
          itemStyle: { color: '#f87171' }
        });
        var rawValue = Math.abs(n.totalNetflow24h);
        var displayValue = Math.max(Math.pow(rawValue, 0.4), 5);
        links.push({
          source: n.displayName,
          target: 'Smart Money',
          value: displayValue,
          _rawValue: rawValue,
          lineStyle: { color: 'rgba(248, 113, 113, 0.5)' }
        });
      });

      // Right column: Inflow narratives (SM is buying)
      inflows.forEach(function(n) {
        nodes.push({
          name: n.displayName,
          itemStyle: { color: '#34d399' }
        });
        var rawValue = Math.abs(n.totalNetflow24h);
        var displayValue = Math.max(Math.pow(rawValue, 0.4), 5);
        links.push({
          source: 'Smart Money',
          target: n.displayName,
          value: displayValue,
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
          label: {
            fontSize: 13,
            color: '#e8e9ed',
            fontWeight: 500,
            overflow: 'none',
            position: 'right'
          },
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
            opacity: 0.4
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
        var sorted = narrative.topTokens.slice().sort(function(a, b) {
          return Math.abs(b.netflow24hUsd) - Math.abs(a.netflow24hUsd);
        });

        html += '<table class="token-table" id="' + tableId + '">';
        html += '<thead><tr>';
        html += '<th title="Token symbol and chain">Token</th>';
        html += '<th class="sortable" title="Smart Money net capital flow over 24 hours" onclick="sortTable(\\'' + tableId + '\\', 1, \\'number\\')">Netflow 24h</th>';
        html += '<th class="sortable" title="Price change over 24 hours" onclick="sortTable(\\'' + tableId + '\\', 2, \\'number\\')">Price \\u0394</th>';
        html += '<th class="sortable" title="Current market capitalization" onclick="sortTable(\\'' + tableId + '\\', 3, \\'number\\')">Market Cap</th>';
        html += '<th class="sortable" title="Classification: HOT = strong SM accumulation + rising price, WATCH = SM accumulating, price flat, AVOID = SM distributing" onclick="sortTable(\\'' + tableId + '\\', 4, \\'text\\')">Category</th>';
        html += '</tr></thead><tbody>';

        sorted.forEach(function(t, tidx) {
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

          html += '<td><span class="expand-arrow">\\u25B6</span>' + dexLink(t.chain, t.token_address, '<strong>' + escapeHtml(t.token_symbol) + '</strong>') + chainBadge(t.chain) + '</td>';
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

    // ── Unified Narrative Rendering ──────────────────────

    (function renderNarratives() {
      var container = document.getElementById('narratives-container');
      var section = document.getElementById('section-narratives');

      if (processedNarratives.length === 0) {
        section.style.display = 'none';
        return;
      }

      // Sort: by |netflow| descending — strongest signals first
      processedNarratives.sort(function(a, b) {
        return Math.abs(b.totalNetflow24h) - Math.abs(a.totalNetflow24h);
      });

      var html = '';
      processedNarratives.forEach(function(n, idx) {
        html += renderNarrativeCard(n, 'nar-' + idx);
      });
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

    // ── Early Signals (only if data exists) ─────────────

    (function renderEarlySignals() {
      if (!SCAN_DATA.earlySignals || SCAN_DATA.earlySignals.length === 0) return;

      var container = document.getElementById('early-signals');

      var html = '<div class="early-signals-card">';
      html += '<div class="early-signals-title">Early Signal Tokens \\u2014 Smart Money Accumulating Before Price Move</div>';

      html += '<table class="token-table">';
        html += '<thead><tr>';
        html += '<th title="Token symbol and chain">Token</th>';
        html += '<th title="Smart Money net capital flow over 24 hours">Netflow 24h</th>';
        html += '<th title="Price change over 24 hours">Price \\u0394</th>';
        html += '<th title="Total trading volume over 24 hours">Volume 24h</th>';
        html += '<th title="Buy/sell ratio — higher means more buying pressure">Buy Pressure</th>';
        html += '<th title="Current market capitalization">Market Cap</th>';
        html += '</tr></thead><tbody>';

      SCAN_DATA.earlySignals.forEach(function(t) {
        var netflowCls = t.netflow24hUsd >= 0 ? 'netflow-positive' : 'netflow-negative';
        var priceCls = t.priceChange24h > 0 ? 'netflow-positive' : (t.priceChange24h < 0 ? 'netflow-negative' : '');
        var pressureText = !t.buyPressure || t.buyPressure <= 0 ? '\\u2014' : t.buyPressure.toFixed(1) + 'x';

        html += '<tr>';
        html += '<td>' + dexLink(t.chain, t.token_address, '<strong>' + escapeHtml(t.token_symbol) + '</strong>') + '<span class="early-badge" title="SM accumulating before significant price move">EARLY SIGNAL</span></td>';
        html += '<td class="mono ' + netflowCls + '">' + formatUsd(t.netflow24hUsd) + '</td>';
        html += '<td class="mono ' + priceCls + '">' + formatPercent(t.priceChange24h) + '</td>';
        html += '<td class="mono">' + formatMcap(t.volume24h) + '</td>';
        html += '<td class="mono">' + pressureText + '</td>';
        html += '<td class="mono">' + formatMcap(t.marketCap) + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
      html += '</div>';
      container.innerHTML = html;
    })();

    // ── Screener Highlights (HERO section) ──────────────────

    (function renderScreenerHighlights() {
      if (!SCAN_DATA.screenerHighlights || SCAN_DATA.screenerHighlights.length === 0) return;

      var container = document.getElementById('screener-highlights');
      var tableId = 'screener-table';

      var html = '<div class="screener-highlights-card">';
      html += '<div class="screener-title">\\uD83D\\uDD25 Smart Money Active Tokens</div>';
      html += '<div class="screener-subtitle">Top tokens by Smart Money buy/sell ratio and netflow — always fresh data from 500+ tokens</div>';

      html += '<table class="token-table" id="' + tableId + '">';
      html += '<thead><tr>';
      html += '<th title="Token symbol and chain">Token</th>';
      html += '<th class="sortable" title="Smart Money net capital flow over 24 hours (buys minus sells)" onclick="sortTable(\\'' + tableId + '\\', 1, \\'number\\')">Netflow 24h</th>';
      html += '<th title="Visual ratio of buy volume (green) vs sell volume (red)">Buy / Sell</th>';
      html += '<th class="sortable" title="Buy volume divided by sell volume — higher means more buying pressure" onclick="sortTable(\\'' + tableId + '\\', 3, \\'number\\')">Ratio</th>';
      html += '<th class="sortable" title="Price change over the last 24 hours" onclick="sortTable(\\'' + tableId + '\\', 4, \\'number\\')">Price \\u0394</th>';
      html += '<th class="sortable" title="Current market capitalization" onclick="sortTable(\\'' + tableId + '\\', 5, \\'number\\')">Market Cap</th>';
      html += '<th class="sortable" title="Signal classification based on buy/sell ratio and netflow direction" onclick="sortTable(\\'' + tableId + '\\', 6, \\'text\\')">Signal</th>';
      html += '</tr></thead><tbody>';

      SCAN_DATA.screenerHighlights.forEach(function(t, idx) {
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

        // Sort order for signal: heavy_accumulation=0, accumulating=1, mixed=2, distributing=3
        var signalSortOrder = t.classification === 'heavy_accumulation' ? 0 :
                              t.classification === 'accumulating' ? 1 :
                              t.classification === 'mixed' ? 2 : 3;

        var detailId = 'screener-detail-' + idx;

        // Main row (clickable to expand)
        html += '<tr class="expandable-row" onclick="toggleExpand(this, \\'' + detailId + '\\')"';
        html += ' data-sort-1="' + t.netflowUsd + '"';
        html += ' data-sort-3="' + t.buySellRatio + '"';
        html += ' data-sort-4="' + t.priceChange + '"';
        html += ' data-sort-5="' + (t.marketCapUsd || 0) + '"';
        html += ' data-sort-6="' + signalSortOrder + '-' + escapeHtml(t.token_symbol).toLowerCase() + '"';
        html += '>';
        html += '<td><span class="expand-arrow">\\u25B6</span>' + dexLink(t.chain, t.token_address, '<strong>' + escapeHtml(t.token_symbol) + '</strong>') + chainBadge(t.chain) + '</td>';
        html += '<td class="mono ' + netflowCls + '">' + formatUsd(t.netflowUsd) + '</td>';
        html += '<td><div class="buy-sell-bar"><div class="buy-bar" style="width:' + buyPct.toFixed(1) + '%"></div><div class="sell-bar" style="width:' + sellPct.toFixed(1) + '%"></div></div></td>';
        html += '<td class="mono" style="color: var(--color-positive)">' + ratioText + '</td>';
        html += '<td class="mono ' + priceCls + '">' + priceText + '</td>';
        html += '<td class="mono">' + formatMcap(t.marketCapUsd) + '</td>';
        html += '<td><span class="screener-badge ' + badgeClass + '" title="' + badgeTooltip + '">' + badgeText + '</span></td>';
        html += '</tr>';

        // Expanded detail row (hidden by default)
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
