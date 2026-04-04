# Narrative Pulse — Handoff Prompt

Copy the text below to start a new context window. It contains all context needed to continue development.

---

## Prompt for New Context Window

```
Read these files first:
1. `/home/andrei/Programming/narrative-pulse/AGENTS.md` — technical reference
2. `/home/andrei/Programming/narrative-pulse/docs/CONTEXT.md` — full project context (contest, architecture, history, API facts, killer features)
3. `/home/andrei/Programming/narrative-pulse/docs/TODO.md` — current problem list with root causes and fix plans

Then run `npx tsc --noEmit` to verify the project compiles.

## Who We Are
We are building **Narrative Pulse** — a Smart Money Narrative Intelligence Platform for the **Nansen CLI Build Challenge, Week 3** (deadline: April 5, 2026, TODAY). Goal: 1st place (Mac Mini M4).

## What We've Built
- 27 TypeScript files, ~8500 LOC
- 11-step data pipeline: netflow + screener + holdings + DexScreener → sector discovery → narrative aggregation → classification → highlights → flow intelligence → early signals
- Dynamic web dashboard (`npx narrative-pulse serve`) with ECharts Sankey, sortable/filterable table, expandable rows
- AI analysis per-token (BYOK: OpenAI, Anthropic, OpenRouter, Custom) with shimmer animation
- MCP server for AI agents (Claude, Cursor)
- Static HTML reports, terminal output, research cards

## Current State
The dashboard loads and functions, but has ~12 known issues documented in `docs/TODO.md`. The most critical are:
1. **Narrative column empty** for 29/30 tokens (holdings cross-reference has a normalization bug — Map keys are raw addresses but lookup uses lowercase)
2. **Flow Intelligence block** shows mostly zeros, wastes space, only on 5 tokens
3. **AI analysis** — loading animation is instant (no smooth transition), markdown not rendered, block layout suboptimal

## What Needs to Be Done
Work through `docs/TODO.md` in priority order. Each item has root cause analysis and proposed fix. Commit each fix separately with clean conventional commit messages. Run QA after each fix.

## Code Conventions
- TypeScript strict: no `any`, no `as any`
- Commits: `type: description` (feat/fix/refactor/style/docs)
- Dashboard is a single template literal string in `src/visual/dashboard.ts` (~2100 LOC)
- Inside template literals: use `\\'` for escaped single quotes in onclick handlers (NOT `\'` — that's a silent no-op in template literals that produces bare `'` and breaks JS parsing)
- JS inside HTML template uses `var` not `let/const`
- All strings in onclick use escaped quotes: `\\'string\\'`
- Unicode escapes: `\\uD83D\\uDD25` for emojis in template literals
- Graceful degradation: enrichment failure never breaks pipeline
- Run `npx tsc --noEmit` after every change

## Key Technical Facts
- Nansen API real costs: token-screener=10cr/page, netflow=50cr/page, holdings=50cr/page, flow-intelligence=10cr/call
- `nof_buyers`/`nof_sellers` don't exist in Nansen API response
- `token_sectors` is the ONLY source of narrative/sector data (not in screener, not in DexScreener)
- Holdings (portfolio) and screener highlights (activity) are fundamentally different token sets
- `normalizeAddress()`: EVM→lowercase, Solana→as-is
- `price_change` in token-screener is decimal fraction (0.01 = 1%), not percentage
```

---
