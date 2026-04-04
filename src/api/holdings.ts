// ============================================================
// smart-money/holdings endpoint wrapper
// Fetches Smart Money holdings across chains with pagination
// Returns Map<token_address, HoldingsEntry> deduped by address
// ============================================================

import { nansenPost } from "./client.js";
import type { NansenResponse } from "./client.js";
import type { HoldingsEntry } from "../types.js";
import { config } from "../config.js";
import { normalizeAddress } from "../utils/normalize.js";

// ============================================================
// Constants
// ============================================================

const ENDPOINT = "/smart-money/holdings";
// Limit to 1 page (50 credits) — used for screener highlights sector enrichment
const MAX_PAGES = 1;

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Nansen] ${message}`);
}

/**
 * Deduplicate holdings by token_address, keeping the entry
 * with the higher value_usd.
 */
function dedupeByAddress(
  entries: HoldingsEntry[]
): Map<string, HoldingsEntry> {
  const map = new Map<string, HoldingsEntry>();

  for (const entry of entries) {
    const key = normalizeAddress(entry.token_address);
    const existing = map.get(key);
    if (existing === undefined || entry.value_usd > existing.value_usd) {
      map.set(key, entry);
    }
  }

  return map;
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch Smart Money holdings data across chains.
 *
 * Returns Map<token_address, HoldingsEntry> deduped by address,
 * keeping entries with the highest value_usd.
 *
 * Never throws on individual page failures — returns whatever
 * data was collected so far.
 */
export async function fetchHoldings(
  chains: string[],
  maxPages: number = MAX_PAGES
): Promise<Map<string, HoldingsEntry>> {
  const allEntries: HoldingsEntry[] = [];
  let totalPages = 0;
  let totalCredits = 0;
  let page = 1;
  let isLastPage = false;

  while (!isLastPage && page <= maxPages) {
    try {
      const body: Record<string, unknown> = {
        chains,
        pagination: { page, per_page: config.apiPageSize },
        order_by: [{ field: "value_usd", direction: "DESC" }],
      };

      const response: NansenResponse<HoldingsEntry[]> =
        await nansenPost<HoldingsEntry[]>(ENDPOINT, body);

      totalPages = page;
      totalCredits += response.creditsUsed;

      if (response.data && Array.isArray(response.data)) {
        allEntries.push(...response.data);
      }

      isLastPage = response.pagination?.is_last_page ?? true;
      page++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log(
        `holdings page ${page} failed: ${msg}. Returning ${allEntries.length} entries collected so far.`
      );
      break;
    }
  }

  const result = dedupeByAddress(allEntries);

  log(
    `Fetched ${allEntries.length} holdings entries across ${totalPages} pages (${totalCredits} credits)`
  );

  return result;
}
