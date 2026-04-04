# Narrative Pulse — Technical Reference for AI Agents

## 1. Project Overview

**Narrative Pulse** — Smart Money Narrative Intelligence Platform. Tracks capital flows between crypto narratives using Nansen API + DexScreener enrichment.

**Contest**: Nansen CLI Build Challenge, Week 3. **Deadline**: April 5, 2026. **Goal**: 1st place.

> **Full context**: See `docs/CONTEXT.md` for complete project history, known issues, and next steps.

## 2. Architecture (V2 — 26 source files)

```
src/
├── index.ts              # CLI commands: scan, watch, sectors, serve, mcp
├── types.ts              # All TypeScript interfaces (strict, no any)
├── config.ts             # Chains, thresholds, DexScreener config, early signal config
├── api/
│   ├── client.ts         # Nansen HTTP client (auth, retry, rate limit, credits tracking)
│   ├── netflows.ts       # smart-money/netflow (paginated, 5 chains)
│   ├── token-screener.ts # token-screener enrichment
│   ├── agent.ts          # agent/fast (SSE, sub-narratives — 2000 credits)
│   ├── dexscreener.ts    # DexScreener price/volume (free, 5-min cache, batch 30)
│   └── holdings.ts       # smart-money/holdings (wired into pipeline, 5 credits/page)
├── engine/
│   ├── discovery.ts      # Sector discovery from netflow data
│   ├── aggregator.ts     # Narrative aggregation by sector
│   ├── classifier.ts     # Hot/Watch/Avoid (uses enriched data when available)
│   ├── enricher.ts       # Merge Nansen + DexScreener + early signal detection
│   ├── screener-highlights.ts # Top-30 SM active tokens (composite scoring)
│   ├── sub-narratives.ts # Agent API sub-narrative analysis
│   ├── rotations.ts      # Narrative rotation tracking (delta between scans)
│   └── scanner.ts        # 11-step pipeline orchestrator
├── visual/
│   ├── sankey.ts         # (unused — PNG bar chart removed from output)
│   ├── html-report.ts    # Static HTML report with ECharts Sankey + tables + early signals
│   ├── terminal-report.ts # CLI output (chalk + cli-table3) + screener highlights
│   ├── dashboard.ts      # Dynamic HTML dashboard (JSON API polling, auto-refresh)
│   └── research-card.ts  # Shareable PNG card (1200×675, Twitter card size)
├── server/
│   └── index.ts          # Express server (GET /, GET/POST /api/scan, background scan)
├── mcp/
│   └── server.ts         # MCP server (stdio transport, 3 tools for AI agents)
├── scheduler/
│   └── cron.ts           # 24/7 cron mode with graceful shutdown
└── utils/
    └── normalize.ts      # Shared address normalization (EVM lowercase, Solana as-is)
```

## 3. Pipeline (11 steps)

1. Fetch netflows (5 chains, paginated)
2. Fetch screener (price/volume enrichment)
3. **Fetch Smart Money Holdings** (SM portfolio data, graceful degradation)
4. **Enrich with DexScreener** (free API, cached, batched)
5. Discover sectors (unique sector combinations)
6. Aggregate tokens into narratives
7. Classify tokens (Hot/Watch/Avoid)
8. **Extract screener highlights** (top-30 SM active tokens by conviction)
9. **Detect early signals** (SM accumulating before price move)
10. Track rotations (delta vs previous scan)
11. Sub-narratives (optional Agent API deep dive)

## 4. CLI Commands

| Command | Description |
|---------|-------------|
| `scan` | One-time scan (options: --no-html, --deep) |
| `watch` | 24/7 cron mode (options: --schedule, --no-html) |
| `sectors` | List all discovered sectors |
| `serve` | Live dashboard at localhost:3000 (options: --port, --deep) |
| `mcp` | MCP server for AI agents (stdio transport) |

## 5. MCP Tools

| Tool | Description |
|------|-------------|
| `get_narrative_scan` | Full scan summary as JSON |
| `get_hot_tokens` | Top tokens from hottest narrative |
| `get_early_signals` | Early signal tokens with buy pressure |

## 6. Code Conventions

- **TypeScript strict**: no `any`. All types in `src/types.ts`
- **Error handling**: try/catch on all API calls, retry with backoff
- **File naming**: `verbNoun.ts`
- **Commits**: one logical unit per commit, format: `type: description`
- **Graceful degradation**: enrichment failure never breaks the pipeline

## 7. External Dependencies

- **Nansen Research API**: netflow, screener, agent, holdings
- **DexScreener API**: free price/volume data (no auth, 300 req/min)
- **ECharts SSR**: server-side chart rendering
- **Sharp**: SVG → PNG conversion
- **Express**: dynamic dashboard server
- **MCP SDK**: Model Context Protocol for AI agent integration
