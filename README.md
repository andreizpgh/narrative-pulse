# Narrative Pulse

> **Track WHERE smart money rotates between crypto narratives — before the crowd notices.**

[![Nansen CLI Challenge](https://img.shields.io/badge/Nansen-CLI_Build_Challenge_Week_3-6366F1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+)](#)
[![TypeScript 5.5](https://img.shields.io/badge/TypeScript_5.5-Strict-3178C6?style=flat-square&logo=typescript)](#)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#)
[![5 Chains](https://img.shields.io/badge/Chains-ETH%20%7C%20SOL%20%7C%20BASE%20%7C%20BNB%20%7C%20ARB-F59E0B?style=flat-square)](#)

<p align="center"><img src="baner.png" width="1200" alt="Narrative Pulse Banner"/></p>

## What it does

Narrative Pulse aggregates Nansen smart-money data at the **narrative level**, not individual tokens. It fuses 5 Nansen API endpoints with DexScreener enrichment into an 11-step pipeline that shows where capital is rotating between crypto narratives — DeFi, AI, RWA, Memecoins, and beyond.

The result: instead of 500+ tokens with positive netflow (noise), you get a ranked view of which narratives are heating up, which are cooling down, and which tokens show smart-money accumulation **before price moves**.

## Screenshots

<table>
  <tr>
    <td align="center"><b>Live Dashboard — Narrative Overview</b></td>
    <td align="center"><b>Expanded Token with AI Analysis</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/dashboard-overview.png" width="500" alt="Dashboard Overview"/></td>
    <td><img src="docs/screenshots/expanded-ai-analysis.png" width="500" alt="Expanded AI Analysis"/></td>
  </tr>
</table>

## Key Features

1. **Narrative-Level Aggregation** — groups tokens by Nansen sectors so you see "AI Agents +$2.1M" instead of 15 individual tickers.

2. **Divergence Detection** — finds tokens where smart money is accumulating but price hasn't moved yet (buy/sell ratio > 1.5x, price change < 5%).

3. **Flow Intelligence** — breaks down capital flows for top tokens into 6 segments: Smart Traders, Whales, Exchanges, Fresh Wallets, Public Figures, Top PnL.

4. **AI Analysis (BYOK)** — per-token LLM insights via OpenAI, Anthropic, OpenRouter, or any OpenAI-compatible endpoint. Keys are never stored.

5. **MCP Server** — 3 tools (`get_narrative_scan`, `get_hot_tokens`, `get_early_signals`) for Claude Desktop / Cursor integration.

6. **Live Dashboard** — dark-themed web UI with ECharts Sankey diagrams, sortable tables, auto-refresh, and one-click scan triggers.

## How to run

```bash
git clone https://github.com/andrei-zakharov/narrative-pulse.git
cd narrative-pulse && npm install
export NANSEN_API_KEY=<your-key>
npx narrative-pulse scan
```

For the live dashboard:

```bash
npx narrative-pulse serve          # http://localhost:3000
npx narrative-pulse serve --port 8080
```

## Architecture

```
Nansen API (5 endpoints) + DexScreener (free)
                |
          11-Step Pipeline
                |
    Terminal | HTML Report | Live Dashboard | MCP
```

**The 11 steps** (~300 credits per standard scan):

1. Fetch smart-money netflows (5 chains, paginated)
2. Fetch token-screener data (price, volume, buy/sell)
3. Fetch smart-money holdings (SM portfolio positions)
4. Enrich with DexScreener (free, cached, all tokens)
4.5. Fetch token profiles (DexScreener descriptions)
5. Discover sectors (extract unique narratives)
6. Aggregate by narrative (group tokens, sum netflows)
7. Classify tokens (Hot / Accumulating / Pumping / Selling)
8. Extract narrative highlights (top-30 SM active tokens)
8.5. Fetch flow intelligence (6-segment breakdown, top-5)
9. Detect early signals (SM accumulation before price move)
10. Compute narrative rotations (delta vs previous scan)
11. Generate sub-narratives (Agent API, `--deep` flag only)

## CLI Commands

| Command | Description |
|---------|-------------|
| `scan` | One-time intelligence report (terminal + HTML) |
| `serve` | Live dashboard at `localhost:3000` |
| `watch` | 24/7 cron monitoring (`--schedule "0 */2 * * *"`) |
| `mcp` | MCP server for AI agents (stdio transport) |
| `sectors` | List all discovered narratives |

## MCP Integration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

| Tool | Returns |
|------|---------|
| `get_narrative_scan` | Full scan summary — all narratives, netflows, hot flags |
| `get_hot_tokens` | Top tokens from hottest narrative with classification |
| `get_early_signals` | Tokens with SM accumulation before price moves |

Results are cached for 5 minutes to avoid redundant API calls.

## Tech Stack

TypeScript 5.5 (strict, ESM) · Express 5 · ECharts · MCP SDK · chalk 5 · Zod · node-cron · Commander.js 12

## Project Structure

```
src/
├── index.ts              # CLI entry (scan, watch, sectors, serve, mcp)
├── types.ts              # All TypeScript interfaces
├── config.ts             # Chains, thresholds, API config
├── api/
│   ├── client.ts         # Nansen HTTP client (auth, retry, rate limit)
│   ├── netflows.ts       # smart-money/netflows (5 chains, paginated)
│   ├── token-screener.ts # token-screener enrichment
│   ├── holdings.ts       # smart-money/holdings
│   ├── flow-intelligence.ts  # 6-segment participant breakdown
│   ├── agent.ts          # agent/fast (SSE, sub-narratives)
│   └── dexscreener.ts    # DexScreener (free, cached, batch 30)
├── engine/
│   ├── scanner.ts        # 11-step pipeline orchestrator
│   ├── discovery.ts      # Sector discovery
│   ├── aggregator.ts     # Narrative aggregation
│   ├── classifier.ts     # Hot/Watch/Avoid/Pumping
│   ├── enricher.ts       # Merge Nansen + DexScreener + early signals
│   ├── screener-highlights.ts  # Top-30 SM active tokens
│   ├── sub-narratives.ts # Agent API sub-narrative analysis
│   └── rotations.ts      # Narrative rotation tracking
├── visual/
│   ├── html-report.ts    # Static HTML with ECharts
│   ├── terminal-report.ts # CLI output (chalk + cli-table3)
│   └── dashboard.ts      # Dynamic HTML dashboard (JSON API)
├── server/
│   └── index.ts          # Express server + AI analysis proxy
├── mcp/
│   └── server.ts         # MCP server (stdio, 3 tools)
├── scheduler/
│   └── cron.ts           # 24/7 cron mode
└── utils/
    └── normalize.ts      # Address normalization (EVM + Solana)
```

## License

MIT

---

Built for [Nansen CLI Build Challenge](https://nansen.ai) — Week 3 | @nansen_ai · #NansenCLI
