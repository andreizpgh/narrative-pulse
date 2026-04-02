# Start Prompt for Narrative Pulse V2

Read docs/HANDOFF-v2.md first. It contains ALL project context, the V2 plan, API research, and implementation order.

Then read these source files to understand current codebase:

- src/types.ts
- src/config.ts  
- src/api/client.ts
- src/engine/scanner.ts
- src/engine/aggregator.ts
- src/engine/classifier.ts
- src/visual/sankey.ts
- src/visual/html-report.ts
- src/index.ts

After reading, confirm understanding by summarizing:

1. What exists (current codebase state)
2. What needs to be built (new features from HANDOFF-v2.md)
3. Implementation order (Phase 1 through 5)

WAIT for user confirmation before writing any code.

Rules:

- Run npx tsc --noEmit after every change
- Commit after each logical unit with format: type colon short description, then blank line, then detailed body
- Never force-push
- TypeScript strict mode, no any
- This is for Nansen CLI Build Challenge, We compete for 1st place
- Quality and reliability are paramount. No nulls, no errors, no broken output
