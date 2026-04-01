// ============================================================
// tgm/token-screener endpoint wrapper
// Fetches token screener data across chains with pagination
// Returns Map<token_address, TokenScreenerEntry> for efficient lookup
// ============================================================

import { nansenPost } from "./client.js";
import type { NansenResponse } from "./client.js";
import type { TokenScreenerEntry } from "../types.js";
import { config } from "../config.js";

// ============================================================
// Constants
// ============================================================

const ENDPOINT = "/tgm/token-screener";
const MAX_PAGES = 10; // token-screener costs only 1 credit per request

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Nansen] ${message}`);
}

/**
 * When the same token_address appears on multiple chains,
 * keep the entry with the larger netflow.
 */
function dedupeByAddress(
  entries: TokenScreenerEntry[]
): Map<string, TokenScreenerEntry> {
  const map = new Map<string, TokenScreenerEntry>();

  for (const entry of entries) {
    const existing = map.get(entry.token_address);
    if (existing === undefined || entry.netflow > existing.netflow) {
      map.set(entry.token_address, entry);
    }
  }

  return map;
}

// ============================================================
// Public API
// ============================================================

export async function fetchTokenScreener(
  chains: string[],
  minMarketCap?: number
): Promise<Map<string, TokenScreenerEntry>> {
  const allEntries: TokenScreenerEntry[] = [];
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
        order_by: [{ field: "netflow", direction: "DESC" }],
      };

      if (minMarketCap !== undefined) {
        body.filters = { market_cap_usd: { min: minMarketCap } };
      }

      const response: NansenResponse<TokenScreenerEntry[]> =
        await nansenPost<TokenScreenerEntry[]>(ENDPOINT, body);

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
      log(
        `token-screener page ${page} failed: ${msg}. Returning ${allEntries.length} entries collected so far.`
      );
      break;
    }
  }

  const result = dedupeByAddress(allEntries);

  log(
    `Fetched ${allEntries.length} token screener entries across ${totalPages} pages (${totalCredits} credits)`
  );

  return result;
}
