# Start Prompt for Narrative Pulse V2

You are the senior developer continuing the Narrative Pulse project. 

BEFORE writing ANY code, read `docs/HANDOFF-v2.md` for complete project context. Then read these source files to understand current codebase: `src/types.ts`, `src/config.ts`, `src/api/client.ts`, `src/engine/scanner.ts`, `src/engine/aggregator.ts`, `src/engine/classifier.ts`, `src/visual/sankey.ts`, `src/visual/html-report.ts`, `src/index.ts`.

After reading everything, confirm understanding by summarizing: (1) what exists, (2) what needs to be built, (3) the implementation order. WAIT for user confirmation before starting.

Use `npx tsc --noEmit` after every change. Commit after each logical unit of work with format: `type: short description` followed by a detailed body.

Implementation order:
1. DexScreener API wrapper with cache and retry (`src/api/dexscreener.ts`)
2. Enrich scanner pipeline - integrate DexScreener data into token classification (`src/engine/scanner.ts` modifications)
3. Express web server with dynamic dashboard (`src/server/index.ts` + `src/server/dashboard.html`)
4. Research Card generator - shareable PNG cards (`src/visual/research-card.ts`)
5. MCP server for AI agent integration (`src/mcp/server.ts`)
6. Early Signal detection - tokens with SM netflow but price hasn't moved (`src/engine/early-signal.ts`)
7. Update CLI commands (`src/index.ts` - add `serve` command)
8. Test everything end-to-end
