// ============================================================
// Nansen API Data Explorer — THROWAWAY RESEARCH SCRIPT
// Tests multiple endpoints to discover what data is available.
// Run: npx tsx explore-api.ts
// ============================================================

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// ============================================================
// Config
// ============================================================

const BASE_URL = "https://api.nansen.ai/api/v1";
const CHAINS = ["ethereum", "solana", "base", "bnb", "arbitrum"];
const CREDIT_BUDGET = 500;

// Well-known addresses to test profiler endpoints
const WHALE_ADDRESSES = [
  "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", // Binance hot wallet
  "0x28C6c06298d514Db089934071355E5743bf21d60", // Binance 7
  "0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2", // FTX hot wallet
];

// ============================================================
// Auth
// ============================================================

async function getApiKey(): Promise<string> {
  const envKey = process.env.NANSEN_API_KEY;
  if (envKey && envKey.length > 0) return envKey;

  try {
    const configPath = join(homedir(), ".nansen", "config.json");
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as { apiKey: string };
    if (parsed.apiKey && parsed.apiKey.length > 0) return parsed.apiKey;
  } catch {
    // fall through
  }

  throw new Error("No API key found. Run 'nansen login' or set NANSEN_API_KEY.");
}

// ============================================================
// Types
// ============================================================

interface ProbeResult {
  endpoint: string;
  status: number;
  credits: number;
  itemCount: number;
  sampleKeys: string[];
  richness: "HIGH" | "MEDIUM" | "LOW" | "ERROR";
  insight: string;
  sampleData: unknown;
  error?: string;
}

// ============================================================
// Helpers
// ============================================================

let totalCreditsSpent = 0;
let apiKey: string;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function analyzeRichness(keys: string[], itemCount: number): "HIGH" | "MEDIUM" | "LOW" {
  // Rich = many data fields + many items + has sector/narrative info
  const richKeywords = ["sector", "narrative", "category", "label", "smart_money", "netflow", "flow"];
  const hasRichFields = keys.some((k) => richKeywords.some((kw) => k.toLowerCase().includes(kw)));
  const hasManyFields = keys.length >= 10;
  const hasManyItems = itemCount >= 20;

  if (hasManyFields && hasManyItems && hasRichFields) return "HIGH";
  if (hasManyFields || (hasRichFields && hasManyItems)) return "MEDIUM";
  return "LOW";
}

function truncateStr(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + "...";
}

// ============================================================
// Core: Probe a single endpoint
// ============================================================

async function probeEndpoint(
  endpoint: string,
  body: Record<string, unknown>
): Promise<ProbeResult> {
  if (totalCreditsSpent >= CREDIT_BUDGET) {
    return {
      endpoint,
      status: 0,
      credits: 0,
      itemCount: 0,
      sampleKeys: [],
      richness: "ERROR",
      insight: "SKIPPED — credit budget exhausted",
      sampleData: null,
      error: "Budget exhausted",
    };
  }

  const url = `${BASE_URL}${endpoint}`;
  let status = 0;
  let credits = 0;
  let itemCount = 0;
  let sampleKeys: string[] = [];
  let sampleData: unknown = null;
  let richness: ProbeResult["richness"] = "LOW";
  let insight = "";
  let errorMsg = "";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(body),
    });

    status = response.status;

    // Extract credits from headers
    const creditsHeader = response.headers.get("X-Nansen-Credits-Used");
    credits = creditsHeader !== null ? parseInt(creditsHeader, 10) || 0 : 0;
    totalCreditsSpent += credits;

    if (status >= 400) {
      const text = await response.text();
      errorMsg = truncateStr(text, 300);
      richness = "ERROR";
      insight = `HTTP ${status} — ${truncateStr(text, 200)}`;
      return { endpoint, status, credits, itemCount, sampleKeys, richness, insight, sampleData, error: errorMsg };
    }

    // Try to parse as JSON
    const responseText = await response.text();

    // Handle SSE (agent endpoint)
    if (responseText.startsWith("data: ") || responseText.includes("\ndata: ")) {
      const lines = responseText.split("\n");
      let content = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
            if (typeof event.content === "string") {
              content += event.content;
            }
          } catch {
            // skip malformed
          }
        }
      }
      sampleData = truncateStr(content, 500);
      sampleKeys = ["SSE stream", `content_length: ${content.length}`];
      itemCount = 1;
      richness = content.length > 200 ? "HIGH" : "MEDIUM";
      insight = `SSE response, ${content.length} chars. ${truncateStr(content, 150)}`;
      return { endpoint, status, credits, itemCount, sampleKeys, richness, insight, sampleData };
    }

    // Parse as JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      richness = "LOW";
      insight = `Non-JSON response: ${truncateStr(responseText, 200)}`;
      sampleData = truncateStr(responseText, 300);
      return { endpoint, status, credits, itemCount, sampleKeys, richness, insight, sampleData };
    }

    // Navigate into the data — might be { data: [...] } or direct array/object
    let dataPayload: unknown;
    const parsedObj = parsed as Record<string, unknown>;
    if (parsedObj.data !== undefined) {
      dataPayload = parsedObj.data;
      // Also try to get credits from body as fallback
      if (credits === 0 && typeof parsedObj.credits_used === "number") {
        credits = parsedObj.credits_used;
        totalCreditsSpent += credits;
      }
    } else {
      dataPayload = parsed;
    }

    // Analyze based on type
    if (Array.isArray(dataPayload)) {
      itemCount = dataPayload.length;
      if (itemCount > 0) {
        const first = dataPayload[0] as Record<string, unknown>;
        sampleKeys = Object.keys(first).sort();
        sampleData = itemCount > 0 ? dataPayload.slice(0, 2) : null;
        richness = analyzeRichness(sampleKeys, itemCount);
        insight = `${itemCount} items. Top keys: ${sampleKeys.slice(0, 8).join(", ")}`;
        if (itemCount > 0) {
          const firstItem = dataPayload[0] as Record<string, unknown>;
          insight += `. First: ${truncateStr(JSON.stringify(firstItem), 200)}`;
        }
      } else {
        insight = "Empty array — no data returned";
        richness = "LOW";
      }
    } else if (typeof dataPayload === "object" && dataPayload !== null) {
      const obj = dataPayload as Record<string, unknown>;
      sampleKeys = Object.keys(obj).sort();
      sampleData = obj;

      // Check if it has nested arrays
      const arrayKeys = sampleKeys.filter((k) => Array.isArray(obj[k]));
      if (arrayKeys.length > 0) {
        const biggestArray = arrayKeys.reduce((a, b) =>
          (obj[a] as unknown[]).length > (obj[b] as unknown[]).length ? a : b
        );
        const arr = obj[biggestArray] as Record<string, unknown>[];
        itemCount = arr.length;
        if (arr.length > 0 && typeof arr[0] === "object") {
          sampleKeys = Object.keys(arr[0]).sort();
        }
        insight = `Object with arrays. "${biggestArray}" has ${itemCount} items. Keys: ${sampleKeys.slice(0, 10).join(", ")}`;
      } else {
        itemCount = 1;
        insight = `Single object. Keys: ${sampleKeys.join(", ")}`;
      }
      richness = analyzeRichness(sampleKeys, itemCount);
    } else {
      insight = `Unexpected payload type: ${typeof dataPayload}`;
      sampleData = truncateStr(String(dataPayload), 300);
    }

    // Pagination info
    if (parsedObj.pagination) {
      const pag = parsedObj.pagination as Record<string, unknown>;
      insight += ` | Page ${pag.page}, is_last: ${pag.is_last_page}`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errorMsg = truncateStr(msg, 300);
    richness = "ERROR";
    insight = `Fetch error: ${truncateStr(msg, 200)}`;
  }

  // Rate limit: wait between calls
  await sleep(200);

  return { endpoint, status, credits, itemCount, sampleKeys, richness, insight, sampleData, error: errorMsg };
}

// ============================================================
// Endpoint Definitions
// ============================================================

interface EndpointSpec {
  endpoint: string;
  body: Record<string, unknown>;
  label: string;
}

const endpoints: EndpointSpec[] = [
  // 1. Known working — smart-money/netflow
  {
    endpoint: "/smart-money/netflow",
    label: "Smart Money Netflow (known)",
    body: {
      chains: CHAINS,
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: "net_flow_24h_usd", direction: "DESC" }],
    },
  },

  // 2. Known working — token-screener
  {
    endpoint: "/token-screener",
    label: "Token Screener (known path)",
    body: {
      chains: CHAINS,
      timeframe: "24h",
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: "netflow", direction: "DESC" }],
    },
  },

  // Also try /tgm/token-screener variant
  {
    endpoint: "/tgm/token-screener",
    label: "Token Screener (/tgm/ path)",
    body: {
      chains: CHAINS,
      timeframe: "24h",
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: "netflow", direction: "DESC" }],
    },
  },

  // 3. smart-money/holdings
  {
    endpoint: "/smart-money/holdings",
    label: "Smart Money Holdings",
    body: {
      chains: CHAINS,
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: "value_usd", direction: "DESC" }],
    },
  },

  // 4. tgm/flow-intelligence
  {
    endpoint: "/tgm/flow-intelligence",
    label: "TGM Flow Intelligence",
    body: {
      chains: CHAINS,
      timeframe: "24h",
      pagination: { page: 1, per_page: 10 },
    },
  },

  // 5. tgm/who-bought-sold
  {
    endpoint: "/tgm/who-bought-sold",
    label: "TGM Who Bought/Sold",
    body: {
      chains: CHAINS,
      timeframe: "24h",
      pagination: { page: 1, per_page: 10 },
    },
  },

  // 6. tgm/holders
  {
    endpoint: "/tgm/holders",
    label: "TGM Holders",
    body: {
      chains: CHAINS,
      pagination: { page: 1, per_page: 10 },
    },
  },

  // 7. tgm/indicators
  {
    endpoint: "/tgm/indicators",
    label: "TGM Indicators",
    body: {
      chains: CHAINS,
      timeframe: "24h",
    },
  },

  // 8. smart-money/dex-trades
  {
    endpoint: "/smart-money/dex-trades",
    label: "Smart Money DEX Trades",
    body: {
      chains: CHAINS,
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: "timestamp", direction: "DESC" }],
    },
  },

  // 9. smart-money/perp-trades
  {
    endpoint: "/smart-money/perp-trades",
    label: "Smart Money Perp Trades",
    body: {
      chains: CHAINS,
      pagination: { page: 1, per_page: 10 },
    },
  },

  // 10. profiler/address/pnl-summary (with whale address)
  {
    endpoint: "/profiler/address/pnl-summary",
    label: "Profiler PnL Summary (Binance hot wallet)",
    body: {
      address: WHALE_ADDRESSES[0],
      chain: "ethereum",
    },
  },

  // 11. Also try /smart-money/netflows (with 's')
  {
    endpoint: "/smart-money/netflows",
    label: "Smart Money Netflows (/s variant)",
    body: {
      chains: CHAINS,
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: "net_flow_24h_usd", direction: "DESC" }],
    },
  },
];

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  apiKey = await getApiKey();

  console.log("=== Nansen API Data Explorer ===\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Chains: ${CHAINS.join(", ")}`);
  console.log(`Credit budget: ${CREDIT_BUDGET}`);
  console.log(`Endpoints to test: ${endpoints.length}`);
  console.log("");

  const results: ProbeResult[] = [];

  for (const spec of endpoints) {
    // Check budget before each call
    if (totalCreditsSpent >= CREDIT_BUDGET) {
      console.log(`\n⚠️  CREDIT BUDGET EXHAUSTED (${totalCreditsSpent}/${CREDIT_BUDGET}). Stopping.`);
      break;
    }

    console.log(`\n--- ${spec.label} ---`);
    console.log(`  Endpoint: POST ${spec.endpoint}`);

    const result = await probeEndpoint(spec.endpoint, spec.body);
    results.push(result);

    if (result.richness === "ERROR") {
      console.log(`  Status: ${result.status} | Credits: ${result.credits}`);
      console.log(`  ERROR: ${result.error ?? result.insight}`);
    } else {
      console.log(`  Status: ${result.status} | Credits: ${result.credits} | Items: ${result.itemCount}`);
      console.log(`  Richness: ${result.richness}`);
      console.log(`  Sample keys: ${result.sampleKeys.slice(0, 12).join(", ")}`);
      console.log(`  Insight: ${result.insight}`);

      if (result.sampleData) {
        const dataStr = typeof result.sampleData === "string"
          ? result.sampleData
          : JSON.stringify(result.sampleData, null, 2);
        console.log(`  Sample data:\n    ${truncateStr(dataStr, 600).split("\n").join("\n    ")}`);
      }
    }

    console.log(`  [Running total: ${totalCreditsSpent} credits spent]`);
  }

  // ============================================================
  // SUMMARY TABLE
  // ============================================================

  console.log("\n\n=== SUMMARY TABLE ===\n");

  // Table header
  const header = "| Endpoint".padEnd(40) + "| Status | Credits | Items | Richness |";
  const divider = "|".padEnd(41, "-") + "|".padEnd(9, "-") + "|".padEnd(10, "-") + "|".padEnd(8, "-") + "|".padEnd(11, "-") + "|";
  console.log(header);
  console.log(divider);

  for (const r of results) {
    const endpoint = truncateStr(r.endpoint, 38).padEnd(39) + "|";
    const status = String(r.status).padEnd(8) + "|";
    const credits = String(r.credits).padEnd(9) + "|";
    const items = String(r.itemCount).padEnd(7) + "|";
    const richness = r.richness.padEnd(10) + "|";
    console.log(` ${endpoint} ${status} ${credits} ${items} ${richness}`);
  }

  console.log(divider);
  console.log(`\nTotal credits spent: ${totalCreditsSpent} / ${CREDIT_BUDGET}`);

  // ============================================================
  // DETAILED BREAKDOWN — only for successful endpoints
  // ============================================================

  const successful = results.filter((r) => r.richness !== "ERROR" && r.itemCount > 0);
  if (successful.length > 0) {
    console.log("\n\n=== DETAILED FIELD ANALYSIS ===\n");
    for (const r of successful) {
      console.log(`\n--- ${r.endpoint} ---`);
      console.log(`  All fields (${r.sampleKeys.length}): ${r.sampleKeys.join(", ")}`);

      // Categorize fields
      const moneyFields = r.sampleKeys.filter((k) =>
        /usd|value|price|volume|flow|cap|pnl|cost/i.test(k)
      );
      const timeFields = r.sampleKeys.filter((k) =>
        /time|date|age|hour|day|7d|24h|30d|1h/i.test(k)
      );
      const identityFields = r.sampleKeys.filter((k) =>
        /address|symbol|name|chain|token|sector|label/i.test(k)
      );
      const countFields = r.sampleKeys.filter((k) =>
        /count|number|nof_|num_/i.test(k)
      );

      if (moneyFields.length > 0) console.log(`  💰 Money fields: ${moneyFields.join(", ")}`);
      if (timeFields.length > 0) console.log(`  ⏰ Time fields: ${timeFields.join(", ")}`);
      if (identityFields.length > 0) console.log(`  🏷  Identity fields: ${identityFields.join(", ")}`);
      if (countFields.length > 0) console.log(`  🔢 Count fields: ${countFields.join(", ")}`);
    }
  }

  // ============================================================
  // RECOMMENDATIONS
  // ============================================================

  console.log("\n\n=== RECOMMENDATIONS ===\n");
  const ranked = [...successful].sort((a, b) => {
    const richnessOrder = { HIGH: 3, MEDIUM: 2, LOW: 1, ERROR: 0 };
    return (richnessOrder[b.richness] ?? 0) - (richnessOrder[a.richness] ?? 0);
  });

  if (ranked.length > 0) {
    console.log("Endpoints ranked by data richness:");
    for (const r of ranked) {
      console.log(`  ${r.richness.padEnd(7)} | ${r.credits.toString().padStart(3)} credits | ${r.itemCount.toString().padStart(4)} items | ${r.endpoint}`);
    }
  } else {
    console.log("No endpoints returned data. Check API key and network.");
  }

  console.log("\n✅ Exploration complete.");
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
