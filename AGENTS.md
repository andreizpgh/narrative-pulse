# Narrative Pulse — Technical Reference for AI Agents

## 1. Project Overview

**Narrative Pulse** — Smart Money Narrative Intelligence Platform. Tracks capital flows between crypto narratives using Nansen API + DexScreener + CoinGecko enrichment.

**Contest**: Nansen CLI Build Challenge, Week 3. **Deadline**: April 5, 2026. **Goal**: 1st place.

## 2. Architecture (V2)

```
src/
├── index.ts              # CLI commands (commander)
├── types.ts              # All TypeScript interfaces
├── config.ts             # Configuration
├── api/
│   ├── client.ts         # Nansen HTTP client
│   ├── netflows.ts       # smart-money/netflow
│   ├── token-screener.ts # token-screener
│   ├── agent.ts          # agent/fast (SSE)
│   └── dexscreener.ts    # DexScreener price/volume enrichment [NEW]
├── engine/
│   ├── discovery.ts      # Sector discovery
│   ├── aggregator.ts     # Narrative aggregation
│   ├── classifier.ts     # Hot/Watch/Avoid
│   ├── early-signal.ts   # Early signal detection [NEW]
│   ├── sub-narratives.ts # Agent API sub-narratives
│   ├── rotations.ts      # Narrative rotation tracking
│   └── scanner.ts        # Pipeline orchestrator
├── visual/
│   ├── sankey.ts         # Bar chart PNG (ECharts SSR)
│   ├── html-report.ts    # HTML report template
│   ├── terminal-report.ts # CLI output
│   └── research-card.ts  # Shareable PNG cards [NEW]
├── server/
│   └── index.ts          # Express dynamic dashboard [NEW]
├── mcp/
│   └── server.ts          # MCP server for AI agents [NEW]
└── scheduler/
    └── cron.ts            # 24/7 cron mode
```

## 3. Code Conventions

- **TypeScript strict**: no `any`. All types in `src/types.ts`
- **Error handling**: try/catch on all API calls, retry with backoff
- **File naming**: `verbNoun.ts`
- **Commits**: one logical unit per commit, format: `type: description`

## 4. Documentation Map

| Document | Purpose |
|---|---|
| `docs/HANDOFF-v2.md` | **READ FIRST** - Complete V2 context, plan, API research |
| `START-PROMPT.md` | Start prompt for new context window |

## 5. MCP Integration

- **MiniMax** - Web search + AI Vision
- **Context7** - Framework documentation
- **Jina Reader** - Web page reading
