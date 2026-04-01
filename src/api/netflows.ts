// ============================================================
// smart-money/netflows endpoint wrapper
// Fetches Smart Money netflows across chains with pagination
// ============================================================

import { nansenPost } from "./client.js";
import type { NansenResponse } from "./client.js";
import type { NetflowEntry } from "../types.js";
import { config } from "../config.js";

// ============================================================
// Constants
// ============================================================

const ENDPOINT = "/smart-money/netflows";
const MAX_PAGES = 5;

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Nansen] ${message}`);
}

// ============================================================
// Public API
// ============================================================

export async function fetchNetflows(
  chains: string[],
  minMarketCap?: number,
  minTraderCount?: number
): Promise<NetflowEntry[]> {
  const allEntries: NetflowEntry[] = [];
  let totalPages = 0;
  let totalCredits = 0;
  let page = 1;
  let isLastPage = false;

  while (!isLastPage && page <= MAX_PAGES) {
    try {
      // Build request body
      const body: Record<string, unknown> = {
        chains,
        pagination: { page, per_page: config.apiPageSize },
        order_by: [{ field: "net_flow_24h_usd", direction: "DESC" }],
      };

      if (minMarketCap !== undefined) {
        body.filters = { market_cap_usd: { min: minMarketCap } };
      }

      const response: NansenResponse<NetflowEntry[]> = await nansenPost<NetflowEntry[]>(
        ENDPOINT,
        body
      );

      totalPages = page;
      totalCredits += response.creditsUsed;

      if (response.data && Array.isArray(response.data)) {
        allEntries.push(...response.data);
      }

      // Determine if we need to continue paginating
      isLastPage = response.pagination?.is_last_page ?? true;
      page++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log(`netflows page ${page} failed: ${msg}. Returning ${allEntries.length} entries collected so far.`);
      break;
    }
  }

  // Client-side filtering by trader count
  const filtered =
    minTraderCount !== undefined
      ? allEntries.filter((entry) => entry.trader_count >= minTraderCount)
      : allEntries;

  log(
    `Fetched ${filtered.length} netflow entries across ${totalPages} pages (${totalCredits} credits)`
  );

  return filtered;
}
