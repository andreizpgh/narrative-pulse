import type { NetflowEntry, NarrativeKey, NarrativeSummary } from "../types.js";

/**
 * Converts a list of sectors into a normalized NarrativeKey.
 *
 * Always uses the PRIMARY (first) sector for grouping. This produces
 * broader, more meaningful narratives (e.g. "AI", "Memecoins", "DeFi")
 * that include all tokens from that sector regardless of secondary sectors.
 */
export function toNarrativeKey(sectors: string[]): string {
  if (sectors.length === 0) return "";
  // Always use primary sector for broader narrative grouping
  return sectors[0];
}

/**
 * Groups netflow entries by narrative (derived from token_sectors)
 * and computes aggregate statistics for each narrative.
 *
 * Tokens are grouped by their primary sector only, producing broader narratives.
 * After grouping, narratives with meaningful signal are kept.
 *
 * Results are sorted by |totalNetflow24h| descending.
 */
export function aggregateByNarrative(
  entries: NetflowEntry[]
): NarrativeSummary[] {
  const groups = new Map<NarrativeKey, NetflowEntry[]>();

  for (const entry of entries) {
    if (!entry.token_sectors || entry.token_sectors.length === 0) {
      continue;
    }

    const key = toNarrativeKey(entry.token_sectors);
    if (key === "") continue;

    const group = groups.get(key);

    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  const summaries: NarrativeSummary[] = [];

  for (const [key, group] of groups) {
    const totalNetflow24h = group.reduce(
      (sum, entry) => sum + entry.net_flow_24h_usd,
      0
    );
    const totalNetflow7d = group.reduce(
      (sum, entry) => sum + entry.net_flow_7d_usd,
      0
    );
    const traderCount = group.reduce(
      (sum, entry) => sum + entry.trader_count,
      0
    );

    // Filter: keep narratives with meaningful signal
    const isSignificant =
      group.length >= 2 || Math.abs(totalNetflow24h) > 500;
    if (!isSignificant) continue;

    summaries.push({
      key,
      displayName: key.replace(/\+/g, " "),
      totalNetflow24h,
      totalNetflow7d,
      tokenCount: group.length,
      traderCount,
      topTokens: [],
      isHot: totalNetflow24h > 0,
    });
  }

  // Sort by absolute 24h netflow descending (most impactful first)
  summaries.sort((a, b) => Math.abs(b.totalNetflow24h) - Math.abs(a.totalNetflow24h));

  return summaries;
}
