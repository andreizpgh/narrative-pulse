# 🔥 Narrative Pulse

> **Smart Money Narrative Intelligence** — Track WHERE institutional capital is rotating between crypto narratives, in real time.

![Nansen CLI Build Challenge](https://img.shields.io/badge/Nansen-CLI_Build_Challenge_Week_3-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square)
![ESM](https://img.shields.io/badge/ESM-Strict-FF6B35?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📸 Demo

<!-- TODO: Add real screenshots after first API run
![Terminal Output](docs/demo-terminal.png)
![Sankey Diagram](docs/demo-sankey.png)
![Web Dashboard](docs/demo-dashboard.png)
![Research Card](docs/demo-card.png)
-->

> 📸 Screenshots coming soon — terminal tables, Sankey rotation maps, live dashboard, shareable research cards

---

## 🧠 The Problem

Everyone tracks Smart Money at the **token** level. The result? 1,000 tokens with positive netflow — pure noise.

What actually matters is the **macro picture**: Is capital flowing from DeFi → AI? From Memecoins → RWA? Which narratives are heating up *before* the crowd notices?

Nobody gives you that signal — until now.

---

## 💡 The Solution

**Narrative Pulse** aggregates Smart Money data at the **narrative level**, not individual tokens. It answers: *Where is the smart money going? What are they exiting? What's about to pump?*

### What makes V2 different

| Feature | V1 | V2 |
|---------|----|----|
| Token enrichment | Token Screener only | **DexScreener enrichment for ALL tokens** (free, no auth) |
| Early signals | None | **Detects SM accumulation before price moves** |
| Web dashboard | Static HTML only | **Live auto-refresh dashboard** at localhost:3000 |
| Social sharing | None | **Research Cards** — 1200×675 PNG for Twitter |
| AI integration | None | **MCP Server** — 3 tools for AI agent workflows |
| Holdings data | None | **Smart Money Holdings** — 5 credits/page enrichment |

---

## 🏗 Architecture

```
                          ┌─────────────────────────────────────────────┐
                          │           CLI / Server / MCP                │
                          │  scan · watch · sectors · serve · mcp      │
                          └─────────────────┬───────────────────────────┘
                                            │
                          ┌─────────────────▼───────────────────────────┐
                          │         Pipeline Orchestrator (9 steps)     │
                          └─────────────────┬───────────────────────────┘
                                            │
          ┌─────────────────────────────────┼─────────────────────────────────┐
          │                                 │                                 │
   ┌──────▼──────┐              ┌───────────▼───────────┐          ┌─────────▼─────────┐
   │  Data Layer  │              │    Processing Engine   │          │    Visual Layer    │
   └──────┬──────┘              └───────────┬───────────┘          └─────────┬─────────┘
          │                                  │                                │
  ┌───────┴───────┐            ┌────────────┼────────────┐          ┌────────┴────────┐
  │ Nansen APIs   │            │            │            │          │                 │
  │ · netflows    │──► Discovery  Aggregation  Classification    Terminal Report    │
  │ · screener    │            │            │            │          │ HTML Report      │
  │ · agent/fast  │            │            │            │          │ Sankey Diagram   │
  │ · holdings    │            │            │            │          │ Research Card    │
  └───────┬───────┘            │            │            │          │ Web Dashboard    │
          │                    │            │            │          └────────┬────────┘
  ┌───────▼───────┐            │            │            │                   │
  │ DexScreener   │──► Enrichment  Early Signals  Rotations         Shareable PNG
  │ (free, no auth)│           │            │            │            HTML + JSON API
  └───────────────┘            └────────────┴────────────┘
```

### The 9-Step Pipeline

```
  1. Fetch Smart Money Netflows     ← Nansen (5 chains, paginated)
  2. Fetch Token Screener Data      ← Nansen (price, volume, buys/sells)
  3. Enrich with DexScreener        ← Free API (real-time price/volume for all tokens)
  4. Discover Sectors               ← Extract unique sectors from token_sectors
  5. Aggregate by Narrative         ← Group tokens → narratives, sum netflows
  6. Classify Tokens                ← 🔥 Hot / 👀 Watch / ⛔ Avoid
  7. Detect Early Signals           ← SM accumulating before price moves
  8. Compute Narrative Rotations    ← Compare vs previous scan snapshot
  9. Generate Sub-Narratives        ← Agent API deep-dive on #1 narrative (optional)
```

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/<your-username>/narrative-pulse.git
cd narrative-pulse
npm install

# 2. Set your Nansen API key (one of these)
export NANSEN_API_KEY=<YOUR_KEY>
# ─ or ─
nansen login --api-key <YOUR_KEY>

# 3. Run your first scan
npx narrative-pulse scan
```

That's it. You'll see a full terminal report with narratives, classified tokens, early signals, and rotation data.

---

## 📋 CLI Commands

### `narrative-pulse scan` — One-Time Scan

Runs the full 9-step pipeline and outputs results to the terminal, Sankey diagram, and HTML report.

```bash
narrative-pulse scan                  # Full scan (terminal + sankey + html)
narrative-pulse scan --no-sankey      # Skip Sankey diagram generation
narrative-pulse scan --no-html        # Skip HTML report generation
narrative-pulse scan --deep           # Include Agent API sub-narratives (+2000 credits)
```

### `narrative-pulse watch` — 24/7 Autonomous Mode

Runs scans on a cron schedule with graceful shutdown and error recovery.

```bash
narrative-pulse watch                          # Every 4 hours (default)
narrative-pulse watch --schedule "0 */2 * * *" # Custom: every 2 hours
narrative-pulse watch --no-sankey              # Skip Sankey in watch mode
narrative-pulse watch --no-html                # Skip HTML in watch mode
```

### `narrative-pulse sectors` — List All Discovered Sectors

Fetches netflow data and outputs all unique sectors found across the 5 chains.

```bash
narrative-pulse sectors
```

### `narrative-pulse serve` — Live Dashboard Server

Starts an Express server with an auto-refreshing web dashboard.

```bash
narrative-pulse serve                 # http://localhost:3000 (default)
narrative-pulse serve --port 8080     # Custom port
narrative-pulse serve --deep          # Include Agent API in background scans
```

### `narrative-pulse mcp` — MCP Server for AI Agents

Starts a Model Context Protocol server via stdio transport. Use it with Claude, Cursor, or any MCP-compatible AI tool.

```bash
narrative-pulse mcp
```

---

## 🖥 Web Dashboard

Start a live dashboard that auto-refreshes every 15 minutes:

```bash
narrative-pulse serve --port 3000
```

**Features:**
- Dark-themed interactive dashboard (ECharts CDN)
- Auto-refresh via JSON API (`GET /api/scan`)
- Manual scan trigger (`POST /api/scan`)
- Narrative netflow charts, token tables, rotation maps
- Zero configuration — just open `http://localhost:3000`

**API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Dashboard HTML (fetches data client-side) |
| `GET` | `/api/scan` | Latest `ScanResult` as JSON |
| `POST` | `/api/scan` | Trigger a new scan, return result |

---

## 🤖 MCP Integration (AI Agent Tools)

Narrative Pulse ships with a **Model Context Protocol** server that exposes 3 tools for AI agents:

```bash
narrative-pulse mcp
```

### Available Tools

| Tool | Description | Input |
|------|-------------|-------|
| `get_narrative_scan` | Full scan summary — all narratives, netflows, token counts, hot flags | None |
| `get_hot_tokens` | Top classified tokens from the hottest narrative — formatted table with netflow, price, volume, market cap | None |
| `get_early_signals` | Early signal tokens — small-caps where SM is accumulating before price moves | None |

### How to Use with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "narrative-pulse": {
      "command": "npx",
      "args": ["narrative-pulse", "mcp"],
      "env": {
        "NANSEN_API_KEY": "your-key-here"
      }
    }
  }
}
```

All scan results are cached for 5 minutes to avoid redundant API calls.

---

## 🔎 Early Signal Detection

Narrative Pulse finds tokens where Smart Money is **accumulating before the price moves** — the strongest alpha signal.

**Detection criteria:**
- Smart Money netflow > $1,000 (24h)
- Price change < 5% (SM is buying quietly)
- Buy/sell ratio > 1.5x (conviction, not noise)
- Volume > $50,000 (liquid enough to matter)

These tokens surface in the terminal output, HTML report, and via the MCP `get_early_signals` tool.

---

## 🏷 Token Classification

| Category | Logic | What it means |
|----------|-------|---------------|
| 🔥 **Hot** | SM netflow > 0 AND price up AND buy volume > sell volume | Smart Money accumulating **and** price confirming — trend in motion |
| 👀 **Watch** | SM netflow > 0 AND price flat/down | Smart Money accumulating but price hasn't moved — **early signal** |
| ⛔ **Avoid** | SM netflow < -$1,000 | Smart Money distributing — exit phase |

---

## 📊 API Usage Per Scan

### Nansen Research API

| Step | Endpoint | Purpose | Credits |
|------|----------|---------|:-------:|
| 1 | `smart-money/netflows` | SM netflows across 5 chains (paginated) | 50/page × ~2 pages ≈ 100 |
| 2 | `token-screener` | Price, volume, buy/sell breakdown | 10/page × ~10 pages ≈ 100 |
| 3 | `smart-money/holdings` | Holdings enrichment (not used in pipeline yet) | 5/page |
| 4 | `agent/fast` | Sub-narrative AI analysis (optional, `--deep` only) | 2000 |
| | | **Total (standard scan)** | **~200** |

### External APIs

| API | Purpose | Auth | Rate Limit |
|-----|---------|------|------------|
| DexScreener | Price, volume, liquidity for ALL tokens | None (free) | 300 req/min |
| | Batch up to 30 addresses per request | | |

DexScreener enriches all tokens with real-time price/volume data, filling gaps where token-screener has no coverage.

---

## ⚙️ Configuration

### API Key

Set your Nansen API key via environment variable:

```bash
export NANSEN_API_KEY=<your-key>
```

Or use the Nansen CLI:

```bash
nansen login --api-key <your-key>
```

The key is read from `~/.nansen/config.json` (created by `nansen login`) or the `NANSEN_API_KEY` environment variable.

### Thresholds

All thresholds are configured in `src/config.ts`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minMarketCapUsd` | $50,000 | Filter out microcap noise |
| `minTraderCount` | 3 | Minimum SM traders for signal |
| `hot.minNetflowUsd` | $5,000 | Minimum netflow for Hot |
| `hot.minPriceChange` | 0.1% | Minimum price change for Hot |
| `watch.minNetflowUsd` | $1,000 | Minimum netflow for Watch |
| `avoid.maxNetflowUsd` | -$1,000 | Distribution threshold |
| `earlySignal.minBuySellRatio` | 1.5x | Buy pressure for early signals |
| `cronSchedule` | `0 */4 * * *` | Default watch interval (4h) |

### Supported Chains

Ethereum, Solana, Base, BNB Chain, Arbitrum — configured in `config.chains`.

---

## 📂 Project Structure

```
src/
├── index.ts              # CLI commands (commander): scan, watch, sectors, serve, mcp
├── types.ts              # All TypeScript interfaces (strict, no `any`)
├── config.ts             # Configuration + thresholds
├── api/
│   ├── client.ts         # Nansen HTTP client (auth, retry, rate limit)
│   ├── netflows.ts       # smart-money/netflow (paginated, 5 chains)
│   ├── token-screener.ts # token-screener enrichment
│   ├── agent.ts          # agent/fast (SSE, sub-narratives)
│   ├── dexscreener.ts    # DexScreener price/volume (free, cached, batched)
│   └── holdings.ts       # smart-money/holdings
├── engine/
│   ├── discovery.ts      # Sector discovery from netflow data
│   ├── aggregator.ts     # Narrative aggregation by sector
│   ├── classifier.ts     # Hot/Watch/Avoid + early signal detection
│   ├── enricher.ts       # Merge Nansen + DexScreener + early signals
│   ├── sub-narratives.ts # Agent API sub-narrative analysis
│   ├── rotations.ts      # Narrative rotation tracking between scans
│   └── scanner.ts        # Pipeline orchestrator (9 steps)
├── visual/
│   ├── sankey.ts         # Bar chart PNG (ECharts SSR + sharp)
│   ├── html-report.ts    # Static HTML report with Sankey + tables
│   ├── terminal-report.ts # CLI terminal output (chalk + cli-table3)
│   ├── dashboard.ts      # Dynamic HTML dashboard (auto-refresh via JSON API)
│   └── research-card.ts  # Shareable PNG card (1200×675, Twitter card size)
├── server/
│   └── index.ts          # Express server (GET /, GET/POST /api/scan)
├── mcp/
│   └── server.ts         # MCP server (stdio, 3 tools for AI agents)
├── scheduler/
│   └── cron.ts           # 24/7 cron mode with graceful shutdown
└── utils/
    └── normalize.ts      # Shared address normalization
```

---

## 🛠 Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | TypeScript 5.5 (ESM, strict) | Type safety, zero `any`, developer experience |
| Runtime | Node.js 20+ | Nansen CLI compatibility |
| CLI | Commander.js 12 | Command parsing, help generation |
| Server | Express 5 | Dashboard + JSON API |
| Visualization | Apache ECharts (SSR) | Server-side charts, no browser needed |
| Image | Sharp | SVG → PNG conversion for Sankey + research cards |
| AI Integration | MCP SDK | Model Context Protocol for AI agent tools |
| Validation | Zod | Schema validation for MCP tool inputs |
| Scheduling | node-cron | 24/7 autonomous mode |
| Terminal | chalk 5 + cli-table3 | Beautiful CLI output |

---

## 💻 Development

```bash
npm run dev       # Run with tsx (development)
npm run build     # Compile TypeScript → dist/
npm start         # Run compiled output
npm run scan      # Shortcut: tsx src/index.ts scan
npm run watch     # Shortcut: tsx src/index.ts watch
```

---

## 🔧 Nansen API Integration

Narrative Pulse leverages **4 Nansen endpoints** plus **1 external API**:

### 1. Smart Money Netflows (`smart-money/netflows`)
The core data source. Returns token-level Smart Money net flow with `token_sectors` — the key field that enables narrative-level aggregation. Paginated across 5 chains.

### 2. Token Screener (`token-screener`)
Provides price change, volume, and buy/sell breakdown — essential for Hot/Watch/Avoid classification. Covers ~25% of tokens.

### 3. Agent API (`agent/fast`)
AI-powered analysis that breaks down the top narrative into sub-narratives with conviction ratings. Optional (`--deep` flag), costs 2000 credits.

### 4. Smart Money Holdings (`smart-money/holdings`)
Portfolio-level Smart Money data — what they're holding, not just what's flowing. 5 credits per page.

### 5. DexScreener (External, Free)
Fills coverage gaps where token-screener has no data. Free, no auth, 300 req/min. Batch up to 30 addresses per request. Provides real-time price, volume, liquidity for ALL tokens.

---

## 📄 License

MIT

---

> Built for the [Nansen CLI Build Challenge](https://nansen.ai) — Week 3
>
> Tag: @nansen_ai · #NansenCLI
