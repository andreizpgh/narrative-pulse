# Narrative Pulse — V2 Handoff Document

> **Purpose**: Complete context for continuing development in a new session.
> **Date**: 2026-04-02 (Thursday). **Deadline**: 2026-04-05 (Sunday), 11:59 PM SGT.
> **Credits remaining**: ~2,200 Nansen credits. Budget available for more.
> **Goal**: 1st place in Nansen CLI Build Challenge, Week 3.

---

## 1. WHAT WE BUILT (V1)

Narrative Pulse — CLI tool that tracks Smart Money capital flows between crypto narratives using Nansen API. The core idea: instead of tracking individual tokens, aggregate at the NARRATIVE level (Memecoins, AI, DeFi, etc.) and show where Smart Money is flowing.

**What works:**
- Nansen API client with auth, retry, rate limiting (`src/api/client.ts`)
- Smart Money netflow fetching, multi-chain, paginated (`src/api/netflows.ts`)
- Token screener integration (`src/api/token-screener.ts`)
- Agent API with SSE parsing (`src/api/agent.ts`)
- Sector discovery and narrative aggregation (`src/engine/`)
- Token classification Hot/Watch/Avoid (`src/engine/classifier.ts`)
- Horizontal bar chart PNG via ECharts SSR (`src/visual/sankey.ts`)
- HTML dashboard report (`src/visual/html-report.ts`)
- Terminal report (`src/visual/terminal-report.ts`)
- CLI commands: scan, watch, sectors (`src/index.ts`)
- Cron scheduler for 24/7 mode (`src/scheduler/cron.ts`)
- Credits tracking (`getAndResetStats()` in client.ts)
- `--deep` flag for Agent API (costs 2000 credits, off by default)

**Git history: 22 clean commits on `main`. Working tree clean.**

---

## 2. THE PROBLEM — WHY V1 IS NOT WINNING

Despite a working pipeline, the output is poor:

1. **Sparse data**: Nansen `smart-money/netflow` returns ~59 tokens, but only 5-8 have meaningful netflow (>$1K). The rest are noise with $0 values.
2. **Screener mismatch**: Only 13/59 tokens match between netflow and token-screener by address. So 75% of tokens show Price Δ = 0.
3. **One dominant narrative**: Memecoins +$642K (driven by PUMP token +$648K). Everything else is ±$2-3K — statistically insignificant.
4. **No depth**: Tables show $0 netflow, $0 price change, dashes everywhere. Not actionable for traders.
5. **Static output**: CLI → static PNG/HTML. Nobody in production uses a CLI tool to generate a PNG they open manually.

**Root cause**: We only use 2 Nansen endpoints (netflow + screener). Nansen has 15+ endpoints with much richer data. We also don't use ANY external APIs for enrichment.

---

## 3. THE V2 PLAN — WHAT TO BUILD

### Core Concept (unchanged)
Track Smart Money narrative rotations — which narratives are hot, which tokens within them are accumulating, and find early-signal tokens that haven't pumped yet.

### What Changes in V2

#### A. Enrich data with FREE external APIs

| Data Need | Source | Rate Limit | Auth | Why |
|---|---|---|---|---|
| Token prices, price_change, volume | **DexScreener** API | 300 req/min | None needed | PRIMARY — reliable, fast, no auth |
| Token prices, market_cap | **CoinGecko** Demo | 30 req/min | Free key | FALLBACK — slower, less reliable |
| Protocol TVL | **DeFiLlama** | ~60 req/min | None needed | For narrative-level context |

**DexScreener is the hero**: `/latest/dex/tokens/{address}` returns price, volume_24h, liquidity, price_change (1h/6h/24h), buy/sell counts. FREE. 300 req/min. No auth.

Implementation: `src/api/dexscreener.ts` — wrapper with in-memory cache (5 min TTL), retry logic, 3s timeout. DexScreener primary, CoinGecko fallback.

#### B. "Early Signal" Token Detection — THE VIRAL FEATURE

**This is the killer feature the user specifically requested.** Within the hottest narrative, find tokens that:
- Have POSITIVE Smart Money netflow (accumulation happening)
- BUT price hasn't moved much yet (low price_change)
- Elevated trading volume (buy_volume significantly > sell_volume)

This is a classic "Smart Money is positioning before the pump" signal.

Implementation in classifier or a new `src/engine/early-signals.ts`:
```
Early Signal criteria:
  - netflow_24h_usd > $1,000 (SM is accumulating)
  - price_change < 5% (price hasn't pumped yet)  
  - buy_volume > sell_volume * 1.5 (strong buy pressure)
  - volume_24h > $50K (not illiquid garbage)
```

These tokens get a special "🟢 Early Signal" badge in the dashboard and research cards. This is the VIRAL, shareable insight — "Smart Money is quietly accumulating X before it pumps."

#### C. Dynamic Web Dashboard (Express.js server)

Replace static HTML file with a live web server:
- `npx narrative-pulse serve` → starts Express on localhost:3000
- Auto-refreshes every scan interval
- Can be embedded as widget in other sites
- Clean, professional, dark-theme dashboard

Dashboard layout (top to bottom):
```
[HEADER: Narrative Pulse — Smart Money Narrative Tracker]
[STATS: 7 narratives • 59 tokens scanned • Updated 5 min ago]

[HERO: 🔥 Smart Money is flowing into Memecoins (+$642K in 24h)]

[BAR CHART: Narrative flows — green bars inflow, red bars outflow]

[HOT NARRATIVE DEEP DIVE: Memecoins]
  [TOKEN TABLE: Token | Netflow 24h | Price Δ | Volume | MCap]
  [EARLY SIGNAL TOKENS: 🟢 Tokens with SM accumulation but price not yet moved]
  
[COLD NARRATIVE: Biggest outflow]
  [TOKEN TABLE with distribution data]

[SM ACTIVITY: Top Smart Money wallets buying in hot narrative]
  (from who-bought-sold endpoint — 1 credit per call)

[SHARE AS CARD button → generates Research Card PNG]
```

#### D. Research Cards — Shareable PNG for Twitter

Beautiful PNG cards (1200x675 — Twitter card size) containing:
- Narrative Pulse branding
- Hot narrative + netflow
- Top 3 tokens with real price data
- **Early Signal tokens** — the viral hook
- Cold narrative
- "Powered by Nansen Smart Money Data"

These are generated via ECharts SSR + sharp (already in our stack).
Users share these on X/Twitter → viral potential.

#### E. MCP Server — AI Agent Integration

MCP (Model Context Protocol) server so AI agents can query Narrative Pulse:
- Tool: `get_narrative_scan` — returns current scan data
- Tool: `get_hot_tokens` — returns hot narrative tokens
- Tool: `get_early_signals` — returns early signal tokens
- This taps into the "agent" trend Nansen is pushing

**Decision on Nansen Agent API**: We keep it as `--deep` opt-in (2000 credits). It's too expensive for regular use. The MCP server replaces it for agent interaction — agents query OUR tool, not Nansen directly. This is more elegant and saves credits.

#### F. Use Additional Nansen Endpoints

We currently use only 2. Add:
- `smart-money/holdings` (5 credits) — what SM holds, 24h balance change
- `tgm/who-bought-sold` (1 credit per token) — WHO is buying hot tokens
- `tgm/flow-intelligence` (1 credit per token) — flow breakdown by segment (funds, whales, traders)

These are CHEAP (1-5 credits) and give much richer data.

---

## 4. ARCHITECTURE — NEW FILES TO CREATE

```
src/
├── api/
│   ├── dexscreener.ts      # NEW — DexScreener API wrapper + cache
│   ├── coingecko.ts         # NEW — CoinGecko fallback wrapper
│   └── holdings.ts          # NEW — Nansen holdings endpoint
├── engine/
│   ├── enricher.ts          # NEW — merge Nansen + DexScreener data
│   └── early-signals.ts     # NEW — detect early signal tokens
├── server/
│   ├── index.ts             # NEW — Express.js server
│   └── api-routes.ts        # NEW — API endpoints for dashboard
├── visual/
│   └── research-card.ts     # NEW — shareable PNG card generator
├── mcp/
│   └── server.ts            # NEW — MCP server for AI agents
└── (all existing files stay, with modifications)
```

**Files to MODIFY:**
- `src/engine/scanner.ts` — add enrichment step, holdings, flow-intelligence
- `src/engine/classifier.ts` — add early signal detection
- `src/visual/html-report.ts` — complete rewrite for dynamic dashboard
- `src/index.ts` — add `serve` command
- `src/types.ts` — add new types for enriched data, early signals
- `src/config.ts` — add DexScreener/external API config
- `package.json` — add express dependency

---

## 5. IMPLEMENTATION ORDER (PRIORITY)

### Phase 1: Data Enrichment (highest priority — fixes the core problem)
1. `src/api/dexscreener.ts` — DexScreener wrapper with cache + retry
2. `src/api/holdings.ts` — Nansen holdings endpoint
3. `src/engine/enricher.ts` — merge Nansen + DexScreener data
4. Modify `src/engine/scanner.ts` — add enrichment step
5. **Commit**: `feat: enrich token data with DexScreener prices and volumes`
6. **TEST**: Run scan, verify tokens now have real price/volume data

### Phase 2: Early Signal Detection (the viral feature)
1. `src/engine/early-signals.ts` — detect tokens with SM accumulation but low price change
2. Integrate into scanner pipeline
3. **Commit**: `feat: early signal detection — tokens with SM accumulation before price move`
4. **TEST**: Verify early signal tokens are found and make sense

### Phase 3: Dynamic Web Dashboard
1. `src/server/index.ts` — Express server
2. Rewrite `src/visual/html-report.ts` — dynamic dashboard serving
3. Update `src/index.ts` — add `serve` command
4. **Commit**: `feat: dynamic web dashboard with Express server`

### Phase 4: Research Cards + MCP
1. `src/visual/research-card.ts` — beautiful shareable PNG
2. `src/mcp/server.ts` — MCP integration
3. **Commit**: `feat: shareable research cards and MCP server`

### Phase 5: Polish + Presentation
1. Update README.md with demo screenshots
2. Clean up any rough edges
3. Final test run
4. **Commit**: `docs: final README with demo and screenshots`

---

## 6. RELIABILITY REQUIREMENTS

- **DexScreener**: cache responses for 5 minutes, 3s timeout, retry once
- **CoinGecko**: fallback only, cache for 10 minutes, 5s timeout
- **Nansen**: existing retry logic is fine
- **Dashboard**: if enrichment fails for a token, show Nansen-only data (graceful degradation)
- **Never show "null" or errors to judges** — always have fallback data

---

## 7. DASHBOARD UX PRINCIPLES (from user feedback)

1. **Stats at the top** (7 narratives, 59 tokens, updated X min ago)
2. **Obvious focus on the hero insight** — the hottest narrative
3. **Only show meaningful data** — no rows with all zeros
4. **No emoji confusion** — hot/cold sections with colored borders, not emoji spam
5. **Early Signal tokens prominently displayed** — the "wow" feature
6. **Clickability** — Sankey nodes clickable → scroll to narrative detail
7. **Share button** → generates Research Card PNG
8. **Professional, clean, dark theme** — like Bloomberg terminal meets modern web

---

## 8. JUDGING CRITERIA & WINNER PATTERNS

From Nansen: "Creativity, real-world usefulness, technical depth, presentation clarity."

**Week 1 winner** (@HeavyOT): Autonomous Polymarket copy-trading bot. Found a $2M PnL desk.
**Week 2 winner** (@rien_nft): Alpha Radar — 24/7 autonomous scanner, 6-stage validation.
**Week 2 runner-up** (@edycutjong): NansenTerm TUI + make-alpha Makefile. Used 5 chains, 15 API calls.

**Pattern**: Winners are AUTONOMOUS (24/7), technically deep, and have killer presentations.

**Our advantages for winning**:
- Unique concept (narrative-level tracking, nobody does this)
- Multi-source enrichment (Nansen + DexScreener + CoinGecko)
- Early signal detection (viral, actionable)
- Multiple delivery formats (dashboard + research cards + MCP)
- 24/7 autonomous mode (cron)

---

## 9. CREDITS BUDGET

| Endpoint | Credits/call | Our usage |
|---|---|---|
| smart-money/netflow | 50 per page | 2 pages = 100 |
| token-screener | 10 per page | 10 pages = 100 |
| smart-money/holdings | 5 per page | ~2 pages = 10 |
| tgm/who-bought-sold | 1 per call | ~5 calls = 5 |
| tgm/flow-intelligence | 1 per call | ~5 calls = 5 |
| **Total per scan** | | **~220 credits** |
| **Remaining** | **~2,200** | **~10 scans** |

Agent API (2000 credits) = opt-in only via `--deep`.

User said they can buy 10K-20K more credits if needed for a good use case.

---

## 10. CODE STYLE & GIT CONVENTIONS

- TypeScript strict mode, no `any`
- All types in `src/types.ts`
- File naming: `verbNoun.ts`
- Function naming: `fetchNetflows()`, `classifyTokens()`
- Commit format: `type: description\n\nDetailed body explaining changes`
- Each commit = one logical unit of work
- `npx tsc --noEmit` must pass before every commit

---

## 11. KEY USER FEEDBACK (verbatim)

- "Nobody will use a CLI tool that outputs a PNG they have to open manually"
- "Every element of the interface must carry obvious utility"
- "The product must feel coherent, not a hodgepodge of features"
- "We need viral potential — something shareable on social media"
- "Focus on highlights, don't expose the poverty of our data"
- "Early signal tokens (SM accumulating but price hasn't moved) = killer feature"
- "Think about real workflows: traders, content creators, AI agents"
- "Nansen is pushing agents — we should align with that"
- "Reliability is critical — no nulls or errors when judges open the dashboard"
