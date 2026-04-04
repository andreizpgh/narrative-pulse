# Narrative Pulse — Project Status & History

> **Last updated**: 2026-04-04
> **Goal**: 1st place in Nansen CLI Build Challenge, Week 3 (deadline April 5, 2026)

---

## 0. Contest Context — Nansen CLI Build Challenge

### What Is It?

The **Nansen CLI Build Challenge** is a weekly hackathon organized by **Nansen.ai** — a leading blockchain analytics platform (CEO Alex Svanevik). The competition runs for 4 weeks starting March 2026.

**Rules:**
- Developers build tools using the **Nansen CLI / Nansen Research API**
- Minimum **10 API calls** per submission
- Must be a creative project (not a trivial wrapper)
- Must post on X (Twitter) with `@nansen_ai` and `#NansenCLI`
- Submissions due by end of each week (Sunday)

### Prize Structure

| Place | Prize |
|-------|-------|
| 🥇 1st | Mac Mini M4 (16GB RAM, 256GB SSD) |
| 🥈 2nd | Nansen API credits (50K–100K) |
| Honorable | 10K API credits |

### Judging Criteria (from official Nansen announcements)

| # | Criterion | Description |
|---|-----------|-------------|
| 1 | **Creativity** | How creatively the CLI / Research API is used |
| 2 | **Real-world usefulness** | Practical value for traders, analysts, or researchers |
| 3 | **Technical depth** | Engineering quality, architecture, scale |
| 4 | **Presentation clarity** | How well the submission is communicated |

**Nansen pro tip:** *"Submissions with a video demo or images tend to get priority attention."*

**Submission requirements:** GitHub link + proof of 10+ API calls + X post.

### Week 1 Winners (announced March 23, 2026)

| Place | Winner | Project |
|-------|--------|---------|
| 🥇 1st | **@HeavyOT** | Async Python CLI wrapper with "Pulse Check" pinging Gamma API, filtering DeFi users. Won Mac Mini M4. |
| 🥈 2nd | **@0xTakeProfits** | "Non-USD Stablecoin Smart Money Dashboard" tracking smart flows into Hyperliquid. Won 50K API credits. |
| Honorable | **@defiprime** | Automated smart money pipeline system, real-time Hyperliquid signals. |
| Honorable | **@SuperiorTrade_** | Won 10K API credits. |

### Week 2 Winners (announced ~March 27–28, 2026)

| Place | Winner | Project |
|-------|--------|---------|
| 🥇 1st | **@rien_nft / @edycutjong** | Won Mac Mini M4. |
| 🥈 2nd | Runner-up | Won 100K API credits (Nansen increased prizes for Week 2). |

### Notable Submissions from Other Participants

| Project | Author | Description |
|---------|--------|-------------|
| **Shadow-Signal** | @HarishKotra | Autonomous copy-trading bot: Monitor → Analyze → Execute loop. Scans SM netflows on Solana & Base, uses Nansen AI Agent for risk check, generates DEX quotes for swaps. Credit-efficient: AI Agent only called when SM inflow exceeds threshold. |
| **Wyckoff Phase Classifier** | @Ggudman1 | Scans 150 tokens across 8 chains every 5 minutes, detects accumulation before market moves. |
| **Fear & Greed × Smart Money Divergence** | @mkoneth | Combines Fear & Greed Index with Smart Money divergence signals. |
| **Token Accumulation Quality Filter** | @dr_rice1 (Week 3) | Filters structural noise, ranks tokens by accumulation quality. |

### Competition Level

- **40+ submissions per week.** High bar.
- *"The bar is set"* — Nansen community.
- Winners demonstrate both technical depth AND polished presentation.

### What Judges Value (synthesis from winners)

| Factor | Weight | Evidence |
|--------|--------|----------|
| Video Demo / Visuals | **HIGH** | Official Nansen tip: "images tend to get priority" |
| Real-world Usefulness | **HIGH** | All winners built practical trading/analytics tools |
| Technical Depth | **HIGH** | Shadow-Signal (agentic loop), Wyckoff (150 tokens, 8 chains) |
| Creativity | **MEDIUM** | Novel data combinations (Fear & Greed + SM divergence) |
| Clear Presentation | **MEDIUM** | GitHub link, proof of API calls, documentation |

### Our Target

**Week 3** (deadline April 5–6, 2026). **Goal: 1st place.**

---

## 1. Vision — What We Set Out to Build

### The Problem

Everyone tracks Smart Money at the **token level**. The result: 1,000 tokens with positive netflow = noise. What actually matters is the **macro picture**: Is capital flowing from DeFi → AI? From Memecoins → RWA? Which narratives are heating up *before* individual tokens pump?

### Our Solution

**Narrative Pulse** aggregates Smart Money data at the **narrative/sector level**, not individual tokens. It tracks WHERE capital is rotating between crypto narratives in real time using the Nansen Research API enriched with DexScreener market data.

### Competitive Edge (for the contest)

| # | Edge | Why It Matters |
|---|------|----------------|
| 1 | **Multi-source enrichment** | Nansen API (4 endpoints: netflow, screener, agent, holdings) + DexScreener (free external API). Most competitors use 1–2 endpoints. |
| 2 | **Interactive visual output** | ECharts Sankey diagram, sortable tables, expandable rows. Not just CLI text output. |
| 3 | **Early Signal Detection** | Detecting SM accumulation BEFORE price moves — the "viral feature." |
| 4 | **Multiple output formats** | Terminal, static HTML, live dashboard, MCP server, research cards. Nobody else has this breadth. |
| 5 | **MCP integration** | AI agent tools via Model Context Protocol (Claude, Cursor, etc.). |

### Design Principles

- **Nansen API is the backbone** — contest requirement; 4 endpoints, 10+ calls per scan
- **Graceful degradation** — enrichment failure never breaks the pipeline
- **TypeScript strict** — no `any`, all types centralized in `src/types.ts`
- **Self-contained HTML** — reports work offline, CDN-only dependency

---

## 2. Challenges & Solutions

### Problem 1: 75% Token Data Mismatch

**Symptom:** Nansen `smart-money/netflow` returns ~59 tokens per scan, but only ~13/59 match `token-screener` by address. 75% of tokens showed $0 price, 0% price change — useless noise in the dashboard.

**Solution:** Integrated **DexScreener** (free, no auth, 300 req/min) as a supplementary enrichment layer. Now ALL tokens get real price/volume data. Batch up to 30 addresses per request with 5-min cache. Three-tier fallback: DexScreener → token-screener → 0.

### Problem 2: Price Change Unit Mismatch (Critical Bug)

**Symptom:** Nansen `token-screener` returns `price_change` as a raw decimal fraction (0.014487 = +1.45%). DexScreener returns percentage (2.6 = +2.6%). Mixing these caused wild misreporting — tokens showing +145% when they moved +1.45%.

**Solution:** Fixed by multiplying Nansen `price_change` × 100 at consumption points. Applied consistently across classifier, screener-highlights, and visual layers.

### Problem 3: One Dominant Narrative Obscuring Everything Else

**Symptom:** Memecoins dominated with +$642K driven by a single PUMP token +$648K. Other narratives were ±$2–3K — statistically insignificant. Tables showed rows of dashes and zeros.

**Solution:** Lowered capture thresholds (minMarketCap $10K, minTraderCount 1). Filtered out narratives with <$500 netflow. Added **screener highlights** as "always rich" HERO section — independent of narrative grouping, always surfaces top-30 actionable tokens from 500+ screener entries.

### Problem 4: Sankey Diagram Collapsing When All Narratives Have Positive Netflow

**Symptom:** When ALL narratives have positive netflow (no outflows), the 3-column layout (Outflows → Smart Money → Inflows) collapses because the left column is empty.

**Solution:** Dynamic `nodeAlign: 'left'` when no outflows exist. Smart Money node aligns to left edge instead of center. Also updated hint text dynamically.

### Problem 5: "Mixed" Classification Confusion

**Symptom:** Tokens with positive netflow but buy/sell ratio < 1.5 were classified as "distributing" — confusing because SM was actually flowing IN. The classification only looked at ratio, not direction.

**Solution:** Added `mixed` classification: positive netflow + low buy/sell ratio. Now four categories:
- `heavy_accumulation` — ratio ≥ 3.0
- `accumulating` — ratio ≥ 1.5
- `mixed` — positive netflow, ratio < 1.5
- `distributing` — negative netflow or ratio < 1.5 AND netflow ≤ 0

### Problem 6: Dashboard Out of Sync with HTML Report

**Symptom:** Dashboard (dynamic, polls `/api/scan`) and HTML report (static, embedded data) drifted apart. Dashboard had old bar chart, old header, old separate ACCUMULATING/DISTRIBUTING sections while HTML report had Sankey, unified narrative breakdown, expandable rows.

**Solution:** Full sync of `dashboard.ts` with `html-report.ts` (589 insertions, 353 deletions). Both now have identical visual features: Sankey, expandable rows, sortable tables, tooltips, unified narrative section.

### Problem 7: DexScreener Response Parsing

**Symptom:** DexScreener API returns a flat array of pairs, not `{pairs: [...]}`. Initial implementation expected the latter and returned 0 enriched tokens.

**Solution:** Fixed response parsing to handle flat array. Added batch support (30 addresses per request) with retry and backoff.

### Problem 8: Structural Noise & Absolute Metric Flaws

**Symptom:** Liquid Staking Tokens (LSTs like JUPSOL, IETHV2) dominated the `Screener Highlights` due to massive structural DeFi flows being misinterpreted as "accumulation". Meanwhile, meme tokens with microscopic netflows relative to their billion-dollar market caps (e.g., $PUMP) triggered "HOT" alerts, and tokens that had already pumped +116% were falsely flagged as "Early Signals" because the price filter only checked `priceChange < 5%` (allowing negative dumps or missing massive pre-pumps due to Nansen API delays).

**Solution:** Implemented **Surgical Token Filtering & Price Clamping**. 
1. Added a strict blacklist for LSTs/Yield tokens (`STRUCTURAL_NOISE_PATTERNS`) to banish them from highlights, allowing real organic tokens to float to the top 30.
2. Clamped `Early Signals` price change to a strict `[-10%, +10%]` consolidation range.
3. Added a `pumping` classification for tokens that grew >30%, transforming false "HEAVY ACCUMULATION" badges into warning labels ("🚀 PUMPING") without emptying the dashboard.

---

## 3. V1 — What Was Built

Narrative Pulse V1 was a CLI tool tracking Smart Money capital flows between crypto narratives using the Nansen API. 22 commits, 13 source files.

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

1. **75% token data mismatch** — Only 13/59 tokens matched `token-screener`. Most showed $0 price.
2. **One dominant narrative** — Memecoins dominated (+$642K driven by PUMP token). Other narratives statistically insignificant.
3. **No external data sources** — Only 2 Nansen endpoints used. No free enrichment APIs.
4. **Static output** — CLI generated PNG/HTML files. No web server, no live dashboard, no shareable content.
5. **No actionable signals** — Classification was binary (hot/avoid) with no nuance. No early signal detection.

---

## 4. V2 — What We Actually Built (Current Implementation)

All planned V2 features were implemented across 33 commits (55 total including V1). The codebase grew from 13 to 26 source files, ~7,650 lines of TypeScript.

### Architecture (26 source files)

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
│   ├── html-report.ts    # Static HTML report with ECharts Sankey + interactive tables (expandable rows, sortable columns, tooltips, buy/sell bars, early signals, screener highlights)
│   ├── terminal-report.ts # CLI output (chalk + cli-table3) + screener highlights + category badges + mixed classification
│   ├── dashboard.ts      # Dynamic HTML dashboard (same features as html-report, polls /api/scan every 60s)
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

### The 11-Step Pipeline

```
Data Layer → Processing Engine → Visual Layer

Data:     Nansen APIs (netflow, screener, agent, holdings)
          DexScreener (free, cached, batched)
                    ↓
Engine:   11-step pipeline:
          1.  Fetch netflows (5 chains, paginated)
          2.  Fetch screener (price/volume enrichment)
          3.  Fetch Smart Money Holdings (SM portfolio data)
          4.  Enrich with DexScreener (free API, cached, batched)
          5.  Discover sectors (unique sector combinations)
          6.  Aggregate tokens into narratives
          7.  Classify tokens (Hot/Watch/Avoid)
          8.  Extract screener highlights (top-30 SM active tokens)
          9.  Detect early signals (SM accumulating before price move)
          10. Track rotations (delta vs previous scan)
          11. Sub-narratives (optional Agent API deep dive)
                    ↓
Output:   Terminal report (chalk + cli-table3)
          Static HTML report (ECharts Sankey + interactive tables)
          Dynamic web dashboard (Express, auto-refresh)
          Research card PNG (Twitter card size)
          MCP server (stdio transport for AI agents)
```

### Interactive HTML Features (V2+ improvements)

Both `html-report.ts` (static) and `dashboard.ts` (dynamic) share identical interactive features:

| Feature | Description |
|---------|-------------|
| **Expandable rows** | Click any token to see: current price, buy/sell volumes, SM trader count, volume 24h, liquidity, DexScreener link |
| **Sortable columns** | Click column headers to sort (Netflow, Ratio, Price, Market Cap, Category/Signal) |
| **Tooltips** | Tooltips on all 21 column headers explaining what each metric means |
| **$SYMBOL format** | All token symbols displayed with $ prefix ($ETH, $SOL) |
| **Buy/sell visualization bars** | Green/red proportional bars showing buy vs sell pressure |
| **Chain badges** | Color-coded per chain (ETH blue, SOL purple, BASE cyan, BNB yellow, ARB blue) |
| **Sankey Capital Flow Map** | Interactive ECharts Sankey with click-to-scroll navigation, dynamic alignment (left when no outflows) |
| **Unified Narrative Breakdown** | Single section sorted by \|netflow\|, green/red left borders |
| **Compact header** | 2 highlight cards (Top SM Activity + Top Narrative Signal) + stats row |
| **Screener badge classification** | 4 levels: HEAVY ACCUM / ACCUM / MIXED / DIST |

### Implementation Phases

#### Phase 1: Data Enrichment (3 commits)

| File | Status | Description |
|------|--------|-------------|
| `src/api/dexscreener.ts` | **NEW** | DexScreener API wrapper with 5-min cache, batch support (30 addresses), retry with backoff, 3s timeout via AbortController, chain mapping (bnb→bsc). Graceful degradation: never throws. |
| `src/api/holdings.ts` | **NEW** | Nansen `smart-money/holdings` endpoint wrapper. Paginated fetch with dedup by address. 5 credits/page. |
| `src/engine/enricher.ts` | **NEW** | Core enrichment module. `enrichTokenData()` merges Nansen + DexScreener (DexScreener primary, screener fallback, 0 as last resort); `detectEarlySignals()` finds tokens with SM accumulation before price move. |
| `src/utils/normalize.ts` | **NEW** | Shared `normalizeAddress()` — EVM addresses lowercased, Solana kept as-is. |
| `src/types.ts` | Modified | Added: `DexScreenerPair`, `DexScreenerResponse`, `EnrichedTokenData`, `EarlySignalToken`, `HoldingsEntry`, `ScreenerHighlight`. Updated `Config`, `ClassifiedToken`, `ScanResult`. |
| `src/config.ts` | Modified | Added `external.dexscreener` config and `earlySignal` thresholds. Lowered: minMarketCap $10K, minTraderCount 1, hot $2K, watch $500, avoid -$500. |
| `src/engine/classifier.ts` | Modified | Accepts optional `enrichedData`. Uses DexScreener price/volume as primary source, falls back to screener, then defaults to 0. |
| `src/engine/scanner.ts` | Modified | Pipeline expanded from 6 to 11 steps. Enrichment failure wrapped in try/catch — pipeline always continues. |

**Early Signal Detection Criteria** (configured in `config.earlySignal`):
- Smart Money netflow > $1,000 (24h) — SM is accumulating
- Price change < 5% — hasn't pumped yet
- Buy/sell ratio > 1.5x — conviction, not noise
- Volume > $50,000 — liquid enough to matter

#### Phase 2: Dynamic Web Dashboard (3 commits)

| File | Status | Description |
|------|--------|-------------|
| `src/server/index.ts` | **NEW** | Express server (189 lines). `GET /` serves dashboard HTML. `GET /api/scan` returns latest ScanResult as JSON. `POST /api/scan` triggers new scan. Background scan on startup + 15-min interval. Graceful shutdown. |
| `src/visual/dashboard.ts` | **NEW** | Self-contained HTML template. Dark theme. Auto-refresh every 60s via JSON API polling. Sections: header, stats bar, hero narrative, Sankey chart, early signals table, narrative cards, sub-narratives. XSS-safe via `escapeHtml()`. |
| `src/visual/html-report.ts` | Modified | Added early signal tokens section with green border styling. |
| `src/index.ts` | Modified | Added `serve` command with `--port` and `--deep` options. |
| `package.json` | Modified | Added `express` and `@types/express`. |

#### Phase 3: Research Cards + MCP Server (1 commit)

| File | Status | Description |
|------|--------|-------------|
| `src/visual/research-card.ts` | **NEW** | PNG card generator (682 lines). 1200×675 Twitter card size. ECharts SSR `graphic` elements for text positioning. Layout: header, hot narrative + top 3 tokens, early signals (up to 2), cold narrative, footer. |
| `src/mcp/server.ts` | **NEW** | MCP server (326 lines). `@modelcontextprotocol/sdk` with stdio transport. 3 tools: `get_narrative_scan`, `get_hot_tokens`, `get_early_signals`. 5-minute scan cache. `console.log` redirected to stderr. |
| `src/index.ts` | Modified | Added `mcp` command. |
| `package.json` | Modified | Added `@modelcontextprotocol/sdk` and `zod`. |

#### Phase 4: Documentation (1 commit)

| File | Status | Description |
|------|--------|-------------|
| `README.md` | Rewritten | 421 lines. V1→V2 comparison table, ASCII architecture diagram, 11-step pipeline, CLI reference (5 commands), dashboard docs, MCP integration guide, API usage table, configuration reference. |
| `AGENTS.md` | Rewritten | Updated architecture tree to match actual 26-file codebase. Added pipeline, CLI commands, MCP tools sections. |

#### Phase 5: Data Quality & Richness Fixes (7 commits)

| File | Status | Description |
|------|--------|-------------|
| `src/api/dexscreener.ts` | Fixed | Response parsing: DexScreener returns flat array, not `{pairs}`. Was returning 0 enriched tokens. |
| `src/engine/aggregator.ts` | Fixed | `toNarrativeKey()` uses primary sector only → broader narrative groups. Lowered significance filter to $500. |
| `src/engine/classifier.ts` | Fixed | Removed dead code, lowered thresholds (hot $2K, watch $500, avoid -$500). |
| `src/config.ts` | Fixed | Lowered capture thresholds: minMarketCap $10K (was $50K), minTraderCount 1 (was 3). |
| `src/engine/screener-highlights.ts` | **NEW** | HERO section: top-30 SM active tokens from 500 screener entries. Composite scoring (ratio × netflow). Classification: heavy_accumulation, accumulating, distributing. |
| `src/engine/scanner.ts` | Modified | Pipeline 9→11 steps. Added holdings fetch (step 3) and screener highlights (step 8). |
| `src/visual/html-report.ts` | Modified | Added "Smart Money Active Tokens" section with buy/sell bars, chain badges, category badges. Removed MIN_TOKEN_NETFLOW filter. Fixed Sankey right margin 40%→20%. |
| `src/visual/dashboard.ts` | Modified | Same changes as html-report.ts. |
| `src/visual/terminal-report.ts` | Modified | Added screener highlights (top-10). Added category column to token tables. |
| `src/index.ts` | Modified | Removed PNG bar chart from scan output. |
| `src/types.ts` | Modified | Added `ScreenerHighlight` interface. Added `screenerHighlights` and `holdingsCount` to `ScanResult`. |

#### Phase 6: Interactive HTML + Visual Polish (8 commits)

| File | Status | Description |
|------|--------|-------------|
| `src/visual/html-report.ts` | Enhanced | Expandable rows (click to reveal price, volumes, liquidity, DexScreener link). Sortable columns (Netflow, Ratio, Price, Market Cap, Signal). Tooltips on all 21 column headers. $SYMBOL format. Buy/sell visualization bars. Chain badges. Unified narrative breakdown. Compact header with 2 highlight cards. Sankey Capital Flow Map with dynamic alignment. |
| `src/visual/dashboard.ts` | Full sync | Identical feature set to html-report.ts. 589 insertions, 353 deletions. Same Sankey, expandable rows, sortable tables, unified narratives, compact header. |
| `src/visual/terminal-report.ts` | Enhanced | Mixed classification added (4 categories: HEAVY ACCUM, ACCUM, MIXED, DIST). $SYMBOL format in output. |
| `src/engine/screener-highlights.ts` | Fixed | Stablecoin filtering. Improved composite scoring. |
| `src/engine/classifier.ts` | Fixed | Price change unit correction (Nansen decimal → percentage × 100). Improved screener classification logic. |
| `src/config.ts` | Modified | Header card metrics, Sankey alignment config. |

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

### API Endpoints Used

| Endpoint | Credits | Usage |
|----------|---------|-------|
| `smart-money/netflow` | 50/page | Core data, 5 chains, paginated |
| `token-screener` | 10/page | Price/volume enrichment |
| `smart-money/holdings` | 5/page | SM holdings data (pipeline step 3) |
| `agent/fast` | 2000 | Sub-narratives (opt-in via `--deep`) |

**External API:** DexScreener (free, no auth, 300 req/min, batched up to 30 addresses)

### API Credits Per Scan

| Scenario | Credits |
|----------|---------|
| Standard scan | ~250 |
| With `--deep` (Agent API) | ~2,250 |

### Git History (55 commits)

```
5542469 feat: add mixed classification to terminal + $SYMBOL format in HTML tables
7c89468 feat: sync dashboard with html-report — Sankey chart, expandable rows, sortable tables, unified narratives
77a1e0a feat: add current price display to expanded token details
4e86b4f feat: consolidate narrative sections, fix Capital Flow Map, improve header cards
7a39d33 feat: add expandable rows, sortable tables, and tooltips to HTML report
64cfa26 fix: improve screener classification logic and fix header card metrics
5a1f323 fix: filter stablecoins from screener highlights and improve scoring
0ff7dab feat: compact header, DexScreener links, and badge tooltips
414698d feat: redesign Sankey as 3-column capital flow map
fd079db fix: limit holdings to 2 pages and hide empty narratives
becbb56 fix: correct price change unit mismatch (Nansen decimal → percentage)
9e3150f docs: update README, PROJECT-STATUS, AGENTS for 11-step pipeline
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
6efac27 docs: fix START-PROMPT.md formatting
251c029 docs: V2 handoff document, startup prompt, clean up outdated docs
951c805 chore: stabilize pipeline before v2 enrichment
6ca1eb3 refactor: quality over quantity — bar chart PNG, clean dashboard, meaningful data
f6633cc fix: show all tokens, fix PNG clipping, improve dashboard UX
e9492af feat: complete dashboard redesign with interactive UX
1698226 fix: wider Sankey, netflow-only classification, optional Agent API
fcad136 fix: Sankey power scaling, address normalization, JSON sanitization
4fcf6b9 fix: rework Sankey, aggregation, classifier, and Agent API
963824a fix: correct API endpoint paths and null safety
4ca65fe docs: comprehensive README with full documentation
646dee3 feat: narrative rotation tracking (trend detection)
0fd0b9b feat: cron scheduler for 24/7 autonomous mode
ba833d2 feat: scanner orchestrator + CLI commands
1a0b476 feat: HTML report generation
907b698 feat: terminal report with Hot/Watch/Avoid tables
712d61b feat: ECharts Sankey diagram — narrative rotation map
92e502a feat: Nansen Agent API integration for sub-narratives
652e353 feat: Hot/Watch/Avoid token classifier
f688dba feat: token-screener integration for price/volume data
312919d feat: sector discovery and narrative aggregation
a1e5112 feat: smart-money netflows pipeline (multi-chain)
fd17ee8 feat: Nansen API client with auth and rate limiting
e9d37e1 init: project scaffold
```

### Dependencies

**Runtime (9):** `@modelcontextprotocol/sdk`, `chalk`, `cli-table3`, `commander`, `echarts`, `express`, `node-cron`, `sharp`, `zod`

**Dev (5):** `@types/express`, `@types/node`, `@types/node-cron`, `tsx`, `typescript`

### Quality Metrics

| Metric | Value |
|--------|-------|
| TypeScript compilation | ✅ Clean (0 errors) |
| `any` types | 0 |
| Source files | 26 |
| Lines of code | ~7,650 |
| Exported functions | 30+ |
| Commit style | Conventional (`feat:`, `fix:`, `docs:`, `refactor:`) |
| Total commits | 55 |
| QA cycles passed | 8+ |

---

## 5. Known Limitations

1. **DexScreener SSR rendering** — ECharts `graphic` elements may render emojis inconsistently across platforms. The research card uses Unicode directly; rendering depends on the server's font availability.

2. **Dashboard ECharts memory** — Each auto-refresh creates a new ECharts instance. After 24h of continuous running (1440 refreshes), memory accumulates. Mitigated by the fact the dashboard page would typically be reloaded periodically.

3. **MCP cache is in-memory** — The 5-minute scan cache resets on process restart. Not an issue for stdio-based MCP (short-lived processes).

4. **No fresh HTML report for visual QA** — API key not available in development environment; all features verified via source code analysis (49 feature matches confirmed in both `html-report.ts` and `dashboard.ts`).

5. **Holdings limited to 2 pages** — The `smart-money/holdings` endpoint is capped at 2 pages (100 entries) to conserve API credits. Full holdings would require more pages.

---

## 6. Submission Checklist

| Item | Status | Notes |
|------|--------|-------|
| Nansen CLI/API integration | ✅ Done | 4 endpoints, 10+ API calls per scan (~250 credits) |
| GitHub repository with clean commit history | ✅ Done | 55 conventional commits, 26 source files |
| Comprehensive README | ✅ Done | Architecture, CLI reference, API docs, MCP guide |
| Video demo or screenshots | ⬜ TODO | Critical — judges give priority to visual demos |
| X/Twitter post with @nansen_ai #NansenCLI | ⬜ TODO | Must include GitHub link + visuals |
| Proof of API calls | ⬜ TODO | Screenshots or video showing 10+ calls |
| Demonstrate real-world usefulness | ⬜ TODO | Explicitly call out practical trading value |

### Configuration

Set Nansen API key via environment variable:
```bash
export NANSEN_API_KEY=<your-key>
```
Or use Nansen CLI: `nansen login --api-key <your-key>`

Key is read from `~/.nansen/config.json` or `NANSEN_API_KEY` env var.

All thresholds configured in `src/config.ts`.
