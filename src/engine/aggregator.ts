import type { NetflowEntry, NarrativeKey, NarrativeSummary } from "../types.js";

/**
 * Converts a list of sectors into a normalized NarrativeKey.
 *
 * Simplification rules to reduce noise:
 *  - 1 sector  → use as-is
 *  - 2 sectors → sorted join with "+" (e.g. "AI+DeFi")
 *  - 3+ sectors → use only the first sector (collapse into broader category)
 */
export function toNarrativeKey(sectors: string[]): string {
  if (sectors.length === 0) return "";
  if (sectors.length === 1) return sectors[0];
  if (sectors.length === 2) return [...sectors].sort().join("+");
  // 3+ sectors: collapse to first sector only
  return sectors[0];
}

/**
 * Groups netflow entries by narrative (derived from token_sectors)
 * and computes aggregate statistics for each narrative.
 *
 * Simplification: tokens with 3+ sectors are collapsed to their first sector.
 * After grouping, narratives with fewer than 2 tokens AND less than $500
 * absolute netflow are filtered out (noise reduction).
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

    // Filter: keep narratives with 2+ tokens OR |netflow| > $500
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
