// ============================================================
// Nansen API Exploration Script
// Standalone script to explore API endpoints and inspect data
// Run:
//   npx tsx scripts/explore-api.ts                — runs all phases (1-6)
//   npx tsx scripts/explore-api.ts --phase 4      — runs only phase 4
//   npx tsx scripts/explore-api.ts --phase 4,5,6  — runs phases 4, 5, 6
// ============================================================

import { nansenPost, getApiKey } from "../src/api/client.js";

// ============================================================
// Tracking
// ============================================================

let totalCreditsUsed = 0;

// Module-level token caches (populated by phase1a / phase1b)
let netflowTokens: Array<{ chain: string; token_address: string; token_symbol: string }> = [];
let screenerTokens: Array<{ chain: string; token_address: string; token_symbol: string }> = [];

function header(text: string): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${text}`);
  console.log(`${"=".repeat(60)}\n`);
}

function subHeader(text: string): void {
  console.log(`\n--- ${text} ---\n`);
}

function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function trackCredits(creditsUsed: number, creditsRemaining: number): void {
  totalCreditsUsed += creditsUsed;
  console.log(`  Credits: ${creditsUsed} used | ${creditsRemaining} remaining | Total so far: ${totalCreditsUsed}`);
}

// ============================================================
// Date helpers
// ============================================================

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ============================================================
// Phase 1a: token-screener
// ============================================================

async function phase1a(): Promise<void> {
  header("Phase 1a: token-screener (estimated ~1 credit)");

  screenerTokens = [];

  try {
    const resp = await nansenPost<unknown[]>(
      "/token-screener",
      {
        chains: ["ethereum", "solana", "base", "bnb", "arbitrum"],
        timeframe: "24h",
        pagination: { page: 1, per_page: 50 },
        order_by: [{ field: "netflow", direction: "DESC" }],
      }
    );

    trackCredits(resp.creditsUsed, resp.creditsRemaining);

    const entries = resp.data;
    console.log(`Total entries: ${entries.length}`);

    if (entries.length === 0) {
      console.log("No entries returned. Skipping.");
      return;
    }

    // Print top 3 with ALL fields
    const top3 = entries.slice(0, 3);
    subHeader("Top 3 entries (all fields)");
    for (const entry of top3) {
      printJson(entry);
      console.log("");
    }

    // Check nof_buyers / nof_sellers
    subHeader("Checking nof_buyers and nof_sellers");
    for (const entry of top3) {
      const e = entry as Record<string, unknown>;
      console.log(
        `  ${e.token_symbol}: nof_buyers=${e.nof_buyers}, nof_sellers=${e.nof_sellers}`
      );
    }

    // Collect top 3 addresses into module-level variable
    for (const entry of top3) {
      const e = entry as Record<string, unknown>;
      screenerTokens.push({
        chain: e.chain as string,
        token_address: e.token_address as string,
        token_symbol: e.token_symbol as string,
      });
    }
  } catch (err) {
    console.error("Phase 1a FAILED:", err);
  }
}

// ============================================================
// Phase 1b: smart-money/netflow
// ============================================================

async function phase1b(): Promise<void> {
  header("Phase 1b: smart-money/netflow (estimated ~50 credits)");

  netflowTokens = [];

  try {
    const resp = await nansenPost<unknown[]>(
      "/smart-money/netflow",
      {
        chains: ["ethereum", "solana", "base", "bnb", "arbitrum"],
        pagination: { page: 1, per_page: 50 },
        order_by: [{ field: "net_flow_24h_usd", direction: "DESC" }],
      }
    );

    trackCredits(resp.creditsUsed, resp.creditsRemaining);

    const entries = resp.data;
    console.log(`Total entries: ${entries.length}`);

    if (entries.length === 0) {
      console.log("No entries returned. Skipping.");
      return;
    }

    // Print top 3 with ALL fields
    const top3 = entries.slice(0, 3);
    subHeader("Top 3 entries (all fields)");
    for (const entry of top3) {
      printJson(entry);
      console.log("");
    }

    // Check token_sectors
    subHeader("Unique sector combinations across ALL entries");
    const sectorSets = new Set<string>();
    for (const entry of entries) {
      const e = entry as Record<string, unknown>;
      const sectors = e.token_sectors;
      if (Array.isArray(sectors)) {
        sectorSets.add(sectors.sort().join(" + "));
      } else if (typeof sectors === "string") {
        sectorSets.add(String(sectors));
      }
    }
    console.log(`Unique sector combinations (${sectorSets.size}):`);
    for (const s of sectorSets) {
      console.log(`  - ${s}`);
    }

    // Check timeframes populated
    subHeader("Timeframe field check (top 3)");
    for (const entry of top3) {
      const e = entry as Record<string, unknown>;
      console.log(
        `  ${e.token_symbol}: net_flow_1h_usd=${e.net_flow_1h_usd}, net_flow_30d_usd=${e.net_flow_30d_usd}`
      );
    }

    // Collect top 3 addresses into module-level variable
    for (const entry of top3) {
      const e = entry as Record<string, unknown>;
      netflowTokens.push({
        chain: e.chain as string,
        token_address: e.token_address as string,
        token_symbol: e.token_symbol as string,
      });
    }
  } catch (err) {
    console.error("Phase 1b FAILED:", err);
  }
}

// ============================================================
// Phase 2: who-bought-sold
// ============================================================

async function phase2(): Promise<void> {
  header("Phase 2: tgm/who-bought-sold (estimated ~3 credits, 1 per token)");

  if (netflowTokens.length === 0) {
    console.log("No tokens available. Run without --phase first.");
    return;
  }

  for (const token of netflowTokens) {
    subHeader(`who-bought-sold: ${token.token_symbol} (${token.chain})`);
    console.log(`  Token address: ${token.token_address}`);

    try {
      const resp = await nansenPost<unknown>(
        "/tgm/who-bought-sold",
        {
          chain: token.chain,
          token_address: token.token_address,
          buy_or_sell: "BUY",
          date: {
            from: daysAgo(7),
            to: today(),
          },
        }
      );

      trackCredits(resp.creditsUsed, resp.creditsRemaining);

      subHeader("FULL response");
      printJson(resp.data);
    } catch (err) {
      console.error(`  FAILED for ${token.token_symbol}:`, err);
    }
  }
}

// ============================================================
// Phase 3: flow-intelligence
// ============================================================

async function phase3(): Promise<void> {
  header("Phase 3: tgm/flow-intelligence (estimated ~3 credits)");

  if (netflowTokens.length === 0) {
    console.log("No tokens available. Run without --phase first.");
    return;
  }

  const token = netflowTokens[0];
  console.log(`Token: ${token.token_symbol} (${token.chain})`);
  console.log(`Token address: ${token.token_address}`);

  try {
    const resp = await nansenPost<unknown>(
      "/tgm/flow-intelligence",
      {
        chain: token.chain,
        token_address: token.token_address,
      }
    );

    trackCredits(resp.creditsUsed, resp.creditsRemaining);

    subHeader("FULL response");
    printJson(resp.data);
  } catch (err) {
    console.error("Phase 3 FAILED:", err);
  }
}

// ============================================================
// Phase 4: historical-holdings
// ============================================================

async function phase4(): Promise<void> {
  header("Phase 4: smart-money/historical-holdings (estimated ~50 credits)");

  try {
    const resp = await nansenPost<unknown[]>(
      "/smart-money/historical-holdings",
      {
        chains: ["ethereum", "solana"],
        pagination: { page: 1, per_page: 50 },
        order_by: [{ field: "value_usd", direction: "DESC" }],
        date_range: { from: daysAgo(7), to: today() },
      }
    );

    trackCredits(resp.creditsUsed, resp.creditsRemaining);

    const entries = resp.data;
    console.log(`Total entries: ${entries.length}`);

    if (entries.length === 0) {
      console.log("No entries returned.");
      return;
    }

    subHeader("First 3 entries (full fields)");
    for (const entry of entries.slice(0, 3)) {
      printJson(entry);
      console.log("");
    }
  } catch (err) {
    console.error("Phase 4 FAILED:", err);
  }
}

// ============================================================
// Phase 5: perp-screener (tries multiple endpoint paths)
// ============================================================

async function phase5(): Promise<void> {
  header("Phase 5: perp-screener (estimated ~50 credits)");

  const endpoints = [
    "/tgm/perps",
    "/tgm/perpetuals",
    "/smart-money/perp-trades",
  ];

  const body = {
    chain: "ethereum",
    pagination: { page: 1, per_page: 10 },
  };

  for (const endpoint of endpoints) {
    subHeader(`Trying endpoint: ${endpoint}`);
    try {
      const resp = await nansenPost<unknown[]>(endpoint, body);

      trackCredits(resp.creditsUsed, resp.creditsRemaining);

      const entries = resp.data;
      console.log(`Total entries: ${entries.length}`);

      if (entries.length === 0) {
        console.log("No entries returned.");
        return;
      }

      subHeader("FULL response (all entries)");
      printJson(entries);
      return; // Success — stop trying alternatives
    } catch (err) {
      console.log(`  Endpoint ${endpoint} failed: ${err}`);
    }
  }

  console.error("Phase 5 FAILED: All endpoint alternatives returned errors.");
}

// ============================================================
// Phase 6: token-information for top netflow token
// ============================================================

async function phase6(): Promise<void> {
  header("Phase 6: tgm/token-information (estimated ~10 credits)");

  if (netflowTokens.length === 0) {
    console.log("No tokens available. Run without --phase first.");
    return;
  }

  const token = netflowTokens[0];
  console.log(`Token: ${token.token_symbol} (${token.chain})`);
  console.log(`Token address: ${token.token_address}`);

  try {
    const resp = await nansenPost<unknown>(
      "/tgm/token-information",
      {
        chain: token.chain,
        token_address: token.token_address,
      }
    );

    trackCredits(resp.creditsUsed, resp.creditsRemaining);

    subHeader("FULL response");
    printJson(resp.data);
  } catch (err) {
    console.error("Phase 6 FAILED:", err);
  }
}

// ============================================================
// CLI argument parsing
// ============================================================

function parsePhasesArg(args: string[]): number[] | null {
  for (const arg of args) {
    if (arg === "--phase") {
      // next arg is the value
      continue;
    }
    if (arg.startsWith("--phase=")) {
      return arg.slice("--phase=".length).split(",").map(Number);
    }
    if (arg.startsWith("--phase")) {
      // handled below
      continue;
    }
  }
  // Look for --phase <value> pattern
  const idx = args.indexOf("--phase");
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1].split(",").map(Number);
  }
  return null; // no --phase flag → run all
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const phases = parsePhasesArg(process.argv.slice(2));

  if (phases) {
    console.log(`\n=== Nansen API Exploration (phases: ${phases.join(", ")}) ===\n`);
  } else {
    console.log("\n=== Nansen API Exploration ===\n");
  }
  console.log(`Date: ${today()}`);
  console.log("Estimated total credits: ~170\n");

  // Verify API key is available
  try {
    const key = await getApiKey();
    console.log(`API key loaded: ${key.slice(0, 8)}...${key.slice(-4)}`);
  } catch (err) {
    console.error("FATAL: Cannot get API key.", err);
    process.exit(1);
  }

  const shouldRun = (phase: number): boolean =>
    phases === null || phases.includes(phase);

  // Phase 1a: token-screener
  if (shouldRun(1)) {
    await phase1a();
  }

  // Phase 1b: smart-money/netflow
  if (shouldRun(1)) {
    await phase1b();
  }

  // Phase 2: who-bought-sold (uses netflow tokens)
  if (shouldRun(2)) {
    await phase2();
  }

  // Phase 3: flow-intelligence (top 1 token from netflow)
  if (shouldRun(3)) {
    await phase3();
  }

  // Phase 4: historical-holdings
  if (shouldRun(4)) {
    await phase4();
  }

  // Phase 5: perp-screener
  if (shouldRun(5)) {
    await phase5();
  }

  // Phase 6: token-information (top token from netflow)
  if (shouldRun(6)) {
    await phase6();
  }

  // Summary
  header("Summary");
  console.log(`Total credits used: ${totalCreditsUsed}`);
  console.log("\n=== END ===\n");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
