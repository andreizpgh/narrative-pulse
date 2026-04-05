<div align="center">

# Narrative Pulse

### Smart Money Narrative Intelligence Platform

**Track WHERE institutional capital is rotating between crypto narratives — before the crowd notices.**

[![Nansen CLI Build Challenge](https://img.shields.io/badge/Nansen-CLI_Build_Challenge_Week_3-6366F1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.5-Strict_Zero_any-3178C6?style=flat-square&logo=typescript)](#)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js)](#)
[![ESM](https://img.shields.io/badge/ESM-Strict-FF6B35?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#)
[![27 Source Files](https://img.shields.io/badge/Source_Files-27-8B5CF6?style=flat-square)](#)
[![5 Chains](https://img.shields.io/badge/Chains-ETH_SOL_BASE_BNB_ARB-F59E0B?style=flat-square)](#)

</div>

---

## Screenshots

<table>
  <tr>
    <td align="center"><b>Live Dashboard — Narrative Overview</b></td>
    <td align="center"><b>Expanded Token with AI Analysis</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/dashboard-overview.png" width="600" alt="Dashboard Overview"/></td>
    <td><img src="docs/screenshots/expanded-ai-analysis.png" width="600" alt="Expanded Token with AI Analysis"/></td>
  </tr>
  <tr>
    <td align="center"><b>Capital Flow Sankey Diagram</b></td>
    <td align="center"><b>CLI Terminal Output</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/capital-flow-chart.png" width="600" alt="Capital Flow Chart"/></td>
    <td><img src="docs/screenshots/terminal-output.png" width="600" alt="Terminal Output"/></td>
  </tr>
</table>

---

## The Problem

Everyone tracks Smart Money at the **token** level. The result? 500+ tokens with positive netflow — pure noise. No signal.

What actually moves markets is the **macro picture**: Is capital flowing from DeFi → AI? From Memecoins → RWA? Which narratives are heating up *before* the crowd piles in?

No existing tool gives you that signal in one place.

## The Solution

**Narrative Pulse** aggregates Smart Money data at the **narrative level**, not individual tokens. It fuses 5 Nansen API endpoints + DexScreener enrichment into a single 11-step pipeline that answers:

> *Where is the smart money going? What are they exiting? What's about to pump — and why?*

---

## Killer Features

### 1. Divergence Detection — Find Tokens BEFORE They Pump

The single most valuable alpha signal: Smart Money accumulating while price stays flat.

| Criteria | Threshold | Why |
|----------|-----------|-----|
| SM Netflow | > $1,000 (24h) | Institutional capital flowing in |
| Price Change | < 5% | Price hasn't reacted yet — you're early |
| Buy/Sell Ratio | > 1.5x | Conviction, not noise |
| Volume | > $50,000 | Liquid enough to matter |

These tokens surface in terminal output, HTML reports, the live dashboard, and via the MCP `get_early_signals` tool. This is the signal that pays for itself.

### 2. Flow Intelligence — 6-Segment Smart Money Breakdown

For the top-5 tokens, Narrative Pulse queries the Nansen **Flow Intelligence** endpoint to break down capital flows by participant type:

| Segment | What It Tells You |
|---------|-------------------|
| Smart Traders | Proven profitable wallets — highest conviction signal |
| Whales | Large holders moving — indicates major position changes |
| Public Figures | Influential addresses — often leading indicator |
| Top PnL | Highest profit-takers — shows where the money is |
| Exchanges | Exchange flows — indicates selling pressure |
| Fresh Wallets | New entrants — often signals retail FOMO or wash trading |

This granularity lets you distinguish between "Smart Traders accumulating" vs. "Fresh Wallets FOMOing in" — a critical difference for risk assessment.

### 3. AI Analysis (BYOK) — Per-Token LLM Insights

Click any token in the dashboard to get an instant AI-powered analysis. Bring your own API key — we support 4 providers:

| Provider | Models | Setup |
|----------|--------|-------|
| **OpenAI** | GPT-4o, GPT-4o-mini | Paste API key |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus | Paste API key |
| **OpenRouter** | 200+ models | Paste API key |
| **Custom** | Any OpenAI-compatible API | Base URL + API key |

The AI receives structured token data (netflow, flow intelligence, price action, classification) and returns a concise, actionable 3-5 sentence assessment. Keys are **never stored** — used only for the request, proxied server-side to avoid CORS issues.

### 4. MCP Integration — 3 Tools for AI Agents

Ship a Model Context Protocol server that exposes narrative intelligence to Claude Desktop, Cursor, or any MCP-compatible AI tool:

```json
{
  "mcpServers": {
    "narrative-pulse": {
      "command": "npx",
      "args": ["-y", "tsx", "src/index.ts", "mcp"],
      "env": {
        "NANSEN_API_KEY": "your-key-here"
      }
    }
  }
}
```

| Tool | Returns | Use Case |
|------|---------|----------|
| `get_narrative_scan` | Full scan summary — all narratives, netflows, hot flags | "What's the current market narrative?" |
| `get_hot_tokens` | Top tokens from hottest narrative with classification | "Which tokens is smart money buying right now?" |
| `get_early_signals` | Tokens with SM accumulation before price move | "What's about to pump that nobody sees yet?" |

Results are cached for 5 minutes to avoid redundant API calls.

### 5. Multi-Source Enrichment — 5 Nansen Endpoints + DexScreener

No single endpoint gives the full picture. Narrative Pulse fuses **6 data sources** to build a complete view:

```
Nansen Research API (5 endpoints):
├── smart-money/netflows    → Token-level SM capital flows + token_sectors
├── token-screener          → Price, volume, buy/sell breakdown
├── smart-money/holdings    → SM portfolio positions
├── tgm/flow-intelligence   → 6-segment participant breakdown
└── agent/fast              → AI sub-narrative analysis (optional)

External (free):
└── DexScreener             → Real-time price/volume/liquidity for ALL tokens
```

DexScreener fills coverage gaps where token-screener has no data — giving you enrichment on every token, not just ~25%.

---

## Architecture

```
                              ┌──────────────────────────────────────────────┐
                              │          CLI / Server / MCP                  │
                              │  scan · watch · sectors · serve · mcp       │
                              └──────────────────┬───────────────────────────┘
                                                 │
                              ┌──────────────────▼───────────────────────────┐
                              │       Pipeline Orchestrator (11 steps)       │
                              └──────────────────┬───────────────────────────┘
                                                 │
           ┌─────────────────────────────────────┼─────────────────────────────────────┐
           │                                     │                                     │
    ┌──────▼──────────┐            ┌─────────────▼──────────────┐          ┌────────────▼──────────┐
    │   Data Layer     │            │    Processing Engine       │          │    Visual Layer        │
    └──────┬──────────┘            └─────────────┬──────────────┘          └────────────┬──────────┘
           │                                      │                                       │
   ┌───────┴────────┐            ┌────────────────┼───────────────┐            ┌─────────┴─────────┐
   │ Nansen API     │            │                │               │            │                   │
   │ · netflows     │──►        Discovery    Aggregation    Classification   Terminal Report     │
   │ · screener     │            │                │               │            │ HTML Report        │
   │ · holdings     │            │                │               │            │ Live Dashboard     │
   │ · flow-intel   │            │                │               │            │ Research Card      │
   │ · agent/fast   │            │                │               │            └─────────┬─────────┘
   └───────┬────────┘            │                │               │                      │
           │                     │                │               │              Shareable PNG Card
   ┌───────▼────────┐            │                │               │              HTML + JSON API
   │ DexScreener    │──►   Enrichment    Early Signals    Rotations           AI Analysis (BYOK)
   │ (free, cached) │       Screener Highlights
   └────────────────┘            └────────────────┴───────────────┘
```

---

## The 11-Step Pipeline

```
   1. Fetch Smart Money Netflows          ← Nansen (5 chains, paginated)         ~100 credits
   2. Fetch Token Screener Data           ← Nansen (price, volume, buys/sells)   ~100 credits
   3. Fetch Smart Money Holdings          ← Nansen (SM portfolio data)            ~50 credits
   4. Enrich with DexScreener             ← Free API (price/volume for ALL tokens)   $0
   5. Discover Sectors                    ← Extract unique sectors from token_sectors
   6. Aggregate by Narrative              ← Group tokens → narratives, sum netflows
   7. Classify Tokens                     ← 🔥 Hot / 👀 Watch / ⛔ Avoid / 🚀 Pumping
   8. Extract Screener Highlights         ← Top-30 SM active tokens (composite scoring)
   8.5 Fetch Flow Intelligence            ← 6-segment breakdown for top-5 tokens   ~50 credits
   9. Detect Early Signals                ← SM accumulating before price moves
  10. Compute Narrative Rotations         ← Compare vs previous scan snapshot
  11. Generate Sub-Narratives             ← Agent API deep-dive (optional, --deep)  2000 credits
```

**Standard scan: ~300 credits** | **With `--deep`: ~2,300 credits**

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/<your-username>/narrative-pulse.git
cd narrative-pulse && npm install

# 2. Set your Nansen API key
export NANSEN_API_KEY=<YOUR_KEY>

# 3. Run your first scan
npx narrative-pulse scan
```

That's it. You'll see a full terminal report with classified narratives, early signals, screener highlights, and rotation tracking. Open the generated HTML report for the interactive dashboard with Sankey diagrams and token tables.

---

## CLI Commands

### `scan` — One-Time Intelligence Report

```bash
narrative-pulse scan                  # Full scan: terminal + HTML report
narrative-pulse scan --no-html        # Terminal only (skip HTML generation)
narrative-pulse scan --deep           # Include Agent API sub-narratives (+2000 credits)
```

### `watch` — 24/7 Autonomous Monitoring

Runs scans on a cron schedule with graceful shutdown and error recovery.

```bash
narrative-pulse watch                           # Every 4 hours (default)
narrative-pulse watch --schedule "0 */2 * * *"  # Custom: every 2 hours
narrative-pulse watch --no-html                 # Skip HTML in watch mode
```

### `sectors` — List All Discovered Narratives

```bash
narrative-pulse sectors              # Shows all sectors + token counts
```

### `serve` — Live Dashboard Server

Starts an Express server with auto-refreshing web dashboard, AI analysis proxy, and JSON API.

```bash
narrative-pulse serve                # http://localhost:3000
narrative-pulse serve --port 8080    # Custom port
narrative-pulse serve --deep         # Include Agent API in background scans
```

### `mcp` — MCP Server for AI Agents

```bash
narrative-pulse mcp                  # Starts MCP server via stdio transport
```

---

## Web Dashboard

The live dashboard is a dark-themed, Nansen-inspired interface that auto-refreshes every 15 minutes:

**Features:**
- Interactive ECharts Sankey diagram — visualizes capital flow between narratives
- Expandable token cards with full classification + flow intelligence
- **Per-token AI Analysis** — click any token to get LLM-powered assessment (BYOK)
- Auto-refresh via JSON API polling
- Manual scan trigger via button or `POST /api/scan`
- Narrative netflow charts, token tables, rotation tracking
- Zero configuration — just open `http://localhost:3000`

**API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Dashboard HTML (fetches data client-side) |
| `GET` | `/api/scan` | Latest `ScanResult` as JSON |
| `POST` | `/api/scan` | Trigger a new scan, return result |
| `POST` | `/api/ai-analyze` | Proxy LLM analysis (OpenAI / Anthropic / OpenRouter / Custom) |

---

## MCP Integration — AI Agent Tools

Connect Narrative Pulse to your AI workflows via Model Context Protocol:

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

```json
{
  "mcpServers": {
    "narrative-pulse": {
      "command": "npx",
      "args": ["-y", "tsx", "src/index.ts", "mcp"],
      "env": {
        "NANSEN_API_KEY": "your-nansen-key-here"
      }
    }
  }
}
```

### Available Tools

| Tool | Description | Returns |
|------|-------------|---------|
| `get_narrative_scan` | Full scan summary — all narratives, netflows, token counts, hot flags | JSON summary |
| `get_hot_tokens` | Top classified tokens from the hottest narrative | Formatted table |
| `get_early_signals` | Early signal tokens — SM accumulating before price moves | Formatted table |

### Example AI Workflow

> **You**: "What narrative is smart money rotating into right now?"
>
> **Claude** (via MCP): Calls `get_narrative_scan` → "AI Agents is the hottest narrative with +$2.1M in 24h SM netflow across 15 tokens. 3 tokens classified as Hot, 2 as Watch..."
>
> **You**: "Show me early signals — what's about to pump?"
>
> **Claude** (via MCP): Calls `get_early_signals` → "Found 4 early signal tokens. RENDER ($RENDER) has +$45K SM netflow but only +1.2% price change — 3.2x buy/sell ratio..."

---

## Token Classification

| Category | Logic | What It Means |
|----------|-------|---------------|
| 🔥 **Hot** | SM netflow > $2K AND price up AND buy vol > sell vol | Smart Money accumulating **and** price confirming — trend in motion |
| 👀 **Watch** | SM netflow > $500 AND price flat/down | SM accumulating but price hasn't moved — **potential early signal** |
| 🚀 **Pumping** | Price up significantly with high volume | Price already moved — momentum play, not early entry |
| ⛔ **Avoid** | SM netflow < -$500 | Smart Money distributing — exit phase |

### Screener Highlights — Always Actionable

Even during low-activity periods, the **Screener Highlights** section surfaces the top-30 most active tokens by composite scoring (buy/sell ratio × netflow magnitude):

| Signal | Buy/Sell Ratio | Meaning |
|--------|---------------|---------|
| 🔥 **HEAVY ACCUM** | > 3x | Multiple SM wallets aggressively buying |
| 👀 **ACCUMULATING** | > 1.5x | SM is accumulating — moderate conviction |
| 📊 **DIVERGING** | > 1.5x + price flat | SM buying, price not reacting — **pure divergence** |
| ⚠️ **DISTRIBUTING** | < 1.5x | SM is selling — caution advised |

---

## API Usage Per Scan

### Nansen Research API

| Step | Endpoint | Purpose | Credits |
|------|----------|---------|:-------:|
| 1 | `smart-money/netflows` | SM netflows across 5 chains (paginated) | ~100 |
| 2 | `token-screener` | Price, volume, buy/sell breakdown | ~100 |
| 3 | `smart-money/holdings` | SM portfolio positions | ~50 |
| 8.5 | `tgm/flow-intelligence` | 6-segment participant breakdown (top-5) | ~50 |
| 11 | `agent/fast` | Sub-narrative AI analysis (`--deep` only) | 2,000 |
| | | **Total (standard scan)** | **~300** |
| | | **Total (with `--deep`)** | **~2,300** |

### External APIs

| API | Purpose | Auth | Cost |
|-----|---------|------|:----:|
| DexScreener | Price, volume, liquidity for ALL tokens | None | Free |
| | Batch up to 30 addresses per request | 300 req/min limit | |

---

## Configuration

### API Key

```bash
# Option 1: Environment variable
export NANSEN_API_KEY=<your-key>

# Option 2: Nansen CLI
nansen login --api-key <your-key>
```

Read from `~/.nansen/config.json` or `NANSEN_API_KEY` env var.

### Thresholds

All thresholds live in `src/config.ts`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minMarketCapUsd` | $10,000 | Filter out microcap noise |
| `minTraderCount` | 1 | Minimum SM traders for signal |
| `hot.minNetflowUsd` | $2,000 | Minimum netflow for Hot |
| `hot.minPriceChange` | 0.1% | Minimum price change for Hot |
| `watch.minNetflowUsd` | $500 | Minimum netflow for Watch |
| `avoid.maxNetflowUsd` | -$500 | Distribution threshold |
| `earlySignal.minBuySellRatio` | 1.5x | Buy pressure for early signals |
| `earlySignal.minVolumeUsd` | $50,000 | Volume filter for signals |
| `flowIntelligence.topN` | 5 | Number of tokens for flow breakdown |
| `cronSchedule` | `0 */4 * * *` | Default watch interval (4h) |

### Supported Chains

Ethereum · Solana · Base · BNB Chain · Arbitrum

---

## Project Structure

```
src/                                    # 27 TypeScript source files, strict mode, zero `any`
├── index.ts                            # CLI: scan, watch, sectors, serve, mcp
├── types.ts                            # All TypeScript interfaces
├── config.ts                           # Chains, thresholds, API config
├── api/
│   ├── client.ts                       # Nansen HTTP client (auth, retry, rate limit, credits)
│   ├── netflows.ts                     # smart-money/netflows (paginated, 5 chains)
│   ├── token-screener.ts               # token-screener enrichment
│   ├── holdings.ts                     # smart-money/holdings (SM portfolio data)
│   ├── flow-intelligence.ts            # tgm/flow-intelligence (6-segment breakdown)
│   ├── agent.ts                        # agent/fast (SSE, sub-narratives)
│   └── dexscreener.ts                  # DexScreener (free, cached, batch 30)
├── engine/
│   ├── scanner.ts                      # 11-step pipeline orchestrator
│   ├── discovery.ts                    # Sector discovery from netflow data
│   ├── aggregator.ts                   # Narrative aggregation by sector
│   ├── classifier.ts                   # Hot/Watch/Avoid/Pumping classification
│   ├── enricher.ts                     # Merge Nansen + DexScreener + early signals
│   ├── screener-highlights.ts          # Top-30 SM active tokens (composite scoring)
│   ├── sub-narratives.ts              # Agent API sub-narrative analysis
│   └── rotations.ts                    # Narrative rotation tracking (delta between scans)
├── visual/
│   ├── html-report.ts                  # Static HTML with ECharts Sankey + tables
│   ├── terminal-report.ts              # CLI output (chalk 5 + cli-table3)
│   ├── dashboard.ts                    # Dynamic HTML dashboard (JSON API + auto-refresh)
│   ├── research-card.ts                # Shareable PNG card (1200×675, Twitter card)
│   └── sankey.ts                       # (unused — server-side chart removed)
├── server/
│   └── index.ts                        # Express 5 server + AI analysis proxy (BYOK)
├── mcp/
│   └── server.ts                       # MCP server (stdio, 3 tools, 5-min cache)
├── scheduler/
│   └── cron.ts                         # 24/7 cron mode with graceful shutdown
└── utils/
    └── normalize.ts                    # Shared address normalization (EVM + Solana)
```

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | TypeScript 5.5 (ESM, strict) | Type safety, zero `any`, strict null checks |
| Runtime | Node.js 20+ | Nansen CLI compatibility |
| CLI | Commander.js 12 | Command parsing, help generation |
| Server | Express 5 | Dashboard + JSON API + AI proxy |
| Visualization | Apache ECharts (SSR + CDN) | Interactive charts, no build step |
| Image | Sharp | SVG → PNG for research cards |
| AI Integration | MCP SDK | Model Context Protocol for agent tools |
| Validation | Zod | Schema validation for MCP inputs |
| Scheduling | node-cron | 24/7 autonomous monitoring |
| Terminal | chalk 5 + cli-table3 | Beautiful CLI output |

---

## Development

```bash
npm run dev        # Run with tsx (hot reload)
npm run build      # Compile TypeScript → dist/
npm start          # Run compiled output
npm run scan       # Shortcut: tsx src/index.ts scan
npm run watch      # Shortcut: tsx src/index.ts watch
```

---

## License

MIT

---

<div align="center">

**Built for the [Nansen CLI Build Challenge](https://nansen.ai) — Week 3**

*Where Smart Money flows, narratives follow.*

@nansen_ai · #NansenCLI

</div>
