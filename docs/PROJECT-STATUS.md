# Narrative Pulse — Project Status & History

> **Last updated**: 2026-04-03
> **Goal**: 1st place in Nansen CLI Build Challenge, Week 3 (deadline April 5, 2026)

---

## 1. V1 — What Was Built

Narrative Pulse V1 was a CLI tool tracking Smart Money capital flows between crypto narratives using Nansen API. 22 commits, 13 source files.

### What V1 Could Do

| Feature | Implementation |
|---------|---------------|
| Multi-chain netflow fetch | `src/api/netflows.ts` — paginated `smart-money/netflow` across 5 chains (Ethereum, Solana, Base, BNB, Arbitrum) |
| Token screener integration | `src/api/token-screener.ts` — price change, volume, buy/sell from Nansen |
| Agent API | `src/api/agent.ts` — SSE-based `agent/fast` for sub-narrative analysis (2000 credits, opt-in) |
| Sector discovery | `src/engine/discovery.ts` — extracts unique sectors from `token_sectors` |
| Narrative aggregation | `src/engine/aggregator.ts` — groups tokens by sector, computes aggregate stats |
| Token classification | `src/engine/classifier.ts` — Hot/Watch/Avoid based on netflow + price + volume |
| Rotation tracking | `src/engine/rotations.ts` — detects narrative flow changes between scans |
| Bar chart PNG | `src/visual/sankey.ts` — ECharts SSR + sharp horizontal bar chart |
| HTML report | `src/visual/html-report.ts` — standalone HTML with embedded ECharts CDN |
| Terminal report | `src/visual/terminal-report.ts` — chalk + cli-table3 formatted output |
| 24/7 cron mode | `src/scheduler/cron.ts` — node-cron scheduler with graceful shutdown |
| CLI commands | `scan`, `watch`, `sectors` |

### V1 Problems & Weaknesses

1. **75% token data mismatch**: Nansen `smart-money/netflow` returns ~59 tokens, but only 13/59 match `token-screener` by address. 75% of tokens show $0 price, 0% price change — useless noise in the dashboard.

2. **One dominant narrative**: Memecoins dominated everything (+$642K driven by PUMP token +$648K). Other narratives were ±$2-3K — statistically insignificant. Tables showed row after row of dashes and zeros.

3. **No external data sources**: Only 2 Nansen endpoints used (netflow + screener). No free enrichment APIs. No real market data for tokens that didn't match screener.

4. **Static output**: CLI generated PNG/HTML files. Nobody in production opens a CLI-generated PNG manually. No web server, no live dashboard, no shareable content.

5. **No actionable signals**: Classification was binary (hot/avoid) with no nuance. No "early signal" detection — the killer feature of identifying tokens before they pump.

---

## 2. V2 — The Solution We Designed

### Core Insight
Enrich Nansen data with free external APIs (DexScreener) to get 100% token coverage, detect early accumulation signals, and deliver insights via multiple formats: live dashboard, shareable cards, and AI agent integration.

### Planned Features

| Feature | Purpose |
|---------|---------|
| **DexScreener enrichment** | Free API, no auth, 300 req/min. Gets real price/volume/liquidity for ALL tokens. Fixes the 75% data gap. |
| **Early Signal Detection** | Find tokens where Smart Money is accumulating BEFORE price moves (the viral feature). |
| **Dynamic Web Dashboard** | Express server at localhost:3000 with auto-refresh, dark theme. Replaces static HTML. |
| **Research Cards** | Shareable PNG cards (1200×675, Twitter card size) for social media. |
| **MCP Server** | Model Context Protocol integration for AI agents (Claude, Cursor, etc.). |
| **Nansen Holdings** | Additional Nansen endpoint `smart-money/holdings` (5 credits/page). |

### Architecture Design

```
Data Layer → Processing Engine → Visual Layer

Data:     Nansen APIs (netflow, screener, agent, holdings)
          DexScreener (free, cached, batched)
                    ↓
Engine:   11-step pipeline:
          1. Fetch netflows (5 chains)
          2. Fetch screener
          3. Fetch Smart Money holdings
          4. Enrich with DexScreener
          5. Discover sectors
          6. Aggregate by narrative
          7. Classify tokens (Hot/Watch/Avoid)
          8. Extract screener highlights (top-30 SM active tokens)
          9. Detect early signals
          10. Track rotations
          11. Generate sub-narratives (optional)
                    ↓
Output:   Terminal report
          Static HTML report
          Bar chart PNG
          Live web dashboard
          Research card PNG
          MCP server (stdio)
```

---

## 3. V2 — What Was Actually Implemented

All planned features were implemented across 11 new commits (33 total). The codebase grew from 13 to 26 source files, ~7,000 lines of TypeScript.

### Phase 1: Data Enrichment (3 commits)

| File | Status | Description |
|------|--------|-------------|
| `src/api/dexscreener.ts` | **NEW** | DexScreener API wrapper with 5-min cache, batch support (30 addresses), retry with backoff, 3s timeout via AbortController, chain mapping (bnb→bsc). Graceful degradation: never throws. |
| `src/api/holdings.ts` | **NEW** | Nansen `smart-money/holdings` endpoint wrapper. Paginated fetch with dedup by address. 5 credits/page. |
| `src/engine/enricher.ts` | **NEW** | Core enrichment module. Two exported functions: `enrichTokenData()` merges Nansen + DexScreener (DexScreener primary, screener fallback, 0 as last resort); `detectEarlySignals()` finds tokens with SM accumulation before price move. |
| `src/utils/normalize.ts` | **NEW** | Shared `normalizeAddress()` — EVM addresses lowercased, Solana kept as-is. Extracted from 4 duplicated copies. |
| `src/types.ts` | Modified | Added: `DexScreenerPair`, `DexScreenerResponse`, `EnrichedTokenData`, `EarlySignalToken`, `HoldingsEntry`, `ScreenerHighlight`. Updated `Config` with `external` and `earlySignal` sections. Updated `ClassifiedToken` with enriched fields. Updated `ScanResult` with `earlySignals`, `screenerHighlights`, `enrichedTokens`, `holdingsCount`. |
| `src/config.ts` | Modified | Added `external.dexscreener` config (baseUrl, cache TTL, timeout, retries, batch size) and `earlySignal` thresholds. Lowered thresholds: minMarketCap $10K, minTraderCount 1, hot $2K, watch $500, avoid -$500. |
| `src/engine/classifier.ts` | Modified | Accepts optional `enrichedData` parameter. Uses DexScreener price/volume as primary source when available, falls back to screener, then defaults to 0. |
| `src/engine/scanner.ts` | Modified | Pipeline expanded from 6 to 11 steps. Added: DexScreener enrichment (step 4), holdings fetch (step 3), screener highlights (step 8). Enrichment failure wrapped in try/catch — pipeline always continues. |

**Early Signal Detection Criteria** (configured in `config.earlySignal`):
- Smart Money netflow > $1,000 (24h) — SM is accumulating
- Price change < 5% — hasn't pumped yet
- Buy/sell ratio > 1.5x — conviction, not noise
- Volume > $50,000 — liquid enough to matter

### Phase 3: Dynamic Web Dashboard (3 commits)

| File | Status | Description |
|------|--------|-------------|
| `src/server/index.ts` | **NEW** | Express server (189 lines). `GET /` serves dashboard HTML. `GET /api/scan` returns latest ScanResult as JSON. `POST /api/scan` triggers new scan. Background scan on startup + 15-min interval. Graceful shutdown (SIGINT/SIGTERM). In-memory state bounded to single scan. |
| `src/visual/dashboard.ts` | **NEW** | Self-contained HTML template (966 lines). Dark theme matching project colors. Auto-refresh every 60s via JSON API polling. Sections: header, stats bar, hero narrative, ECharts bar chart, early signals table, narrative cards, sub-narratives. Filters: |netflow| > $500 for narratives, > $1K for tokens. XSS-safe via `escapeHtml()`. |
| `src/visual/html-report.ts` | Modified | Added early signal tokens section with green border styling. |
| `src/index.ts` | Modified | Added `serve` command with `--port` and `--deep` options. |
| `package.json` | Modified | Added `express` and `@types/express`. |

### Phase 4: Research Cards + MCP Server (1 commit)

| File | Status | Description |
|------|--------|-------------|
| `src/visual/research-card.ts` | **NEW** | PNG card generator (682 lines). 1200×675 Twitter card size. Uses ECharts SSR `graphic` elements for text positioning. Layout: header, hot narrative + top 3 tokens, early signals (up to 2), cold narrative, footer. Graceful fallback when no data. |
| `src/mcp/server.ts` | **NEW** | MCP server (326 lines). Uses `@modelcontextprotocol/sdk` with stdio transport. 3 tools: `get_narrative_scan` (JSON summary), `get_hot_tokens` (formatted table), `get_early_signals` (buy pressure data). 5-minute scan cache. `console.log` redirected to stderr (stdout stays clean for MCP protocol). |
| `src/index.ts` | Modified | Added `mcp` command. |
| `package.json` | Modified | Added `@modelcontextprotocol/sdk` and `zod`. |

### Phase 5: Documentation (1 commit)

| File | Status | Description |
|------|--------|-------------|
| `README.md` | Rewritten | 421 lines. V1→V2 comparison table, ASCII architecture diagram, 11-step pipeline, CLI reference (5 commands), dashboard docs, MCP integration guide, API usage table, configuration reference, project structure. |
| `AGENTS.md` | Rewritten | Updated architecture tree to match actual 26-file codebase. Added pipeline, CLI commands, MCP tools sections. |

### Phase 6: Data Quality & Richness Fixes (7 commits)

| File | Status | Description |
|------|--------|-------------|
| `src/api/dexscreener.ts` | Fixed | Response parsing: DexScreener returns flat array, not `{pairs}`. Was returning 0 enriched tokens. |
| `src/engine/aggregator.ts` | Fixed | `toNarrativeKey()` uses primary sector only → broader narrative groups. Lowered significance filter to $500. |
| `src/engine/classifier.ts` | Fixed | Removed dead code, lowered thresholds (hot $2K, watch $500, avoid -$500). |
| `src/config.ts` | Fixed | Lowered capture thresholds: minMarketCap $10K (was $50K), minTraderCount 1 (was 3). |
| `src/engine/screener-highlights.ts` | **NEW** | HERO section: top-30 SM active tokens from 500 screener entries. Composite scoring (ratio × netflow). Classification: heavy_accumulation, accumulating, distributing. |
| `src/engine/scanner.ts` | Modified | Pipeline 9→11 steps. Added holdings fetch (step 3) and screener highlights (step 8). |
| `src/visual/html-report.ts` | Modified | Added "🔥 Smart Money Active Tokens" section with buy/sell bars. Chain badges. Category badges. Removed MIN_TOKEN_NETFLOW filter. Fixed Sankey right margin 40%→20%. |
| `src/visual/dashboard.ts` | Modified | Same changes as html-report.ts. |
| `src/visual/terminal-report.ts` | Modified | Added screener highlights (top-10). Added category column to token tables. |
| `src/index.ts` | Modified | Removed PNG bar chart from scan output. |
| `src/types.ts` | Modified | Added `ScreenerHighlight` interface. Added `screenerHighlights` and `holdingsCount` to `ScanResult`. |

---

## 4. Current Project State

### Source Files (26 TypeScript files, ~7,000 LOC)

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
│   ├── html-report.ts    # Static HTML report with ECharts CDN + tables + early signals + chain badges
│   ├── terminal-report.ts # CLI output (chalk + cli-table3) + screener highlights + category badges
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

### CLI Commands

| Command | Description | Options |
|---------|-------------|---------|
| `scan` | One-time scan across all chains | `--no-html`, `--deep` |
| `watch` | 24/7 cron mode | `--schedule`, `--no-html` |
| `sectors` | List all discovered sectors | — |
| `serve` | Live dashboard server | `--port` (default 3000), `--deep` |
| `mcp` | MCP server for AI agents (stdio) | — |

### MCP Tools

| Tool | Description | Input |
|------|-------------|-------|
| `get_narrative_scan` | Full scan summary as JSON | None |
| `get_hot_tokens` | Top tokens from hottest narrative (formatted table) | None |
| `get_early_signals` | Early signal tokens with buy pressure | None |

### Dependencies

**Runtime (9):** `@modelcontextprotocol/sdk`, `chalk`, `cli-table3`, `commander`, `echarts`, `express`, `node-cron`, `sharp`, `zod`

**Dev (5):** `@types/express`, `@types/node`, `@types/node-cron`, `tsx`, `typescript`

### Nansen API Endpoints Used

| Endpoint | Credits | Usage |
|----------|---------|-------|
| `smart-money/netflow` | 50/page | Core data, 5 chains, paginated |
| `token-screener` | 10/page | Price/volume enrichment |
| `smart-money/holdings` | 5/page | SM holdings data (wired into pipeline, step 3) |
| `agent/fast` | 2000 | Sub-narratives (opt-in via `--deep`) |

**External API:** DexScreener (free, no auth, 300 req/min, batched)

### API Credits Per Scan

| Scenario | Credits |
|----------|---------|
| Standard scan | ~250 |
| With `--deep` (Agent API) | ~2,250 |

### Git History (40 commits)

```
20cd387 feat: add Smart Money Active Tokens section to terminal output
4b6eabb feat: add Smart Money Active Tokens section to HTML reports
9546fa1 fix: remove aggressive token filter and add category badges
6c42753 feat: integrate smart-money/holdings into scanner pipeline
851eb93 feat: screener highlights — top 30 Smart Money active tokens
75adcd8 fix: lower netflow capture thresholds for richer data
c10c7e7 refactor: remove PNG bar chart from scan output
1747868 docs: fix API credits, reorder endpoints, soften DexScreener framing
68bbde1 fix: DexScreener response parsing, narrative grouping, and classification thresholds
b08e2fa docs: replace planning docs with comprehensive project status
f592d29 docs: comprehensive V2 README with architecture, CLI reference, and MCP docs
24c5059 feat: shareable research cards and MCP server for AI agents
4c061be fix: ECharts bar chart color mismatch and totalNetflow24h typo
8fcd7cd feat: add early signal tokens section to static HTML report
9c55ebc feat: dynamic web dashboard with Express server
74af750 fix: DexScreener cache key mismatch, extract shared normalizeAddress, remove dead code
4079227 feat: enrich token data with DexScreener prices and early signal detection
6c44065 feat: Nansen smart-money/holdings endpoint wrapper
edfbd91 feat: DexScreener API wrapper with cache and batch support
... (22 earlier V1 commits)
```

### Quality Metrics

| Metric | Value |
|--------|-------|
| TypeScript compilation | ✅ Clean (0 errors) |
| `any` types | 0 |
| Source files | 26 |
| Lines of code | ~7,000 |
| Exported functions | 30+ |
| Commit style | Conventional (`feat:`, `fix:`, `docs:`, `refactor:`) |
| QA cycles passed | 5 (1 per phase, all PASS after fixes) |

### Known Limitations

1. **DexScreener SSR rendering** — ECharts `graphic` elements may render emojis inconsistently across platforms. The research card uses Unicode directly; rendering depends on the server's font availability.
2. **Dashboard ECharts memory** — Each auto-refresh creates a new ECharts instance. After 24h of continuous running (1440 refreshes), memory accumulates. Mitigated by the fact the dashboard page would typically be reloaded periodically.
3. **MCP cache is in-memory** — The 5-minute scan cache resets on process restart. Not an issue for stdio-based MCP (short-lived processes).
4. **sankey.ts unused** — `src/visual/sankey.ts` still exists in the codebase but the PNG bar chart is no longer generated during scans. File retained for potential future use.

### Configuration

Set Nansen API key via environment variable:
```bash
export NANSEN_API_KEY=<your-key>
```
Or use Nansen CLI: `nansen login --api-key <your-key>`

Key is read from `~/.nansen/config.json` or `NANSEN_API_KEY` env var.

All thresholds configured in `src/config.ts`.
