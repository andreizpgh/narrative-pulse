// ============================================================
// Flow Intelligence endpoint wrapper
// POST /tgm/flow-intelligence — per-token smart money flow breakdown
// Cost: 10 credits per call
// ============================================================

import { nansenPost } from "./client.js";
import type { FlowIntelligence } from "../types.js";

// ============================================================
// Constants
// ============================================================

const ENDPOINT = "/tgm/flow-intelligence";

// Nansen holdings return chain="bsc" but flow-intelligence expects "bnb"
const CHAIN_MAP: Record<string, string> = {
  bsc: "bnb",
};

function normalizeChain(chain: string): string {
  return CHAIN_MAP[chain] ?? chain;
}

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Nansen] ${message}`);
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch flow intelligence data for a list of tokens.
 * Calls API sequentially for each token (rate limiting handled by nansenPost).
 * Returns Map<token_address, FlowIntelligence>.
 * Individual failures are skipped gracefully.
 */
export async function fetchFlowIntelligence(
  tokens: Array<{ chain: string; token_address: string }>
): Promise<Map<string, FlowIntelligence>> {
  const results = new Map<string, FlowIntelligence>();
  let totalCredits = 0;

  for (const token of tokens) {
    try {
      const body: Record<string, unknown> = {
        chain: normalizeChain(token.chain),
        token_address: token.token_address,
      };

      const response = await nansenPost<FlowIntelligence[]>(ENDPOINT, body);
      totalCredits += response.creditsUsed;

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // API returns an array; use the first entry
        const flowData = response.data[0];
        results.set(token.token_address, flowData);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log(`flow-intelligence for ${token.token_address} failed: ${msg} — skipping`);
    }
  }

  log(
    `Fetched flow intelligence for ${results.size}/${tokens.length} tokens (${totalCredits} credits)`
  );

  return results;
}
