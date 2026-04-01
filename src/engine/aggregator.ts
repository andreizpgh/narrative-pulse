import type { NetflowEntry, NarrativeKey, NarrativeSummary } from "../types.js";

/**
 * Converts a list of sectors into a normalized NarrativeKey.
 * Sectors are sorted alphabetically and joined with "+".
 * Example: ["Infrastructure", "AI"] → "AI+Infrastructure"
 */
export function toNarrativeKey(sectors: string[]): string {
  return [...sectors].sort().join("+");
}

/**
 * Groups netflow entries by narrative (derived from token_sectors)
 * and computes aggregate statistics for each narrative.
 *
 * Entries with missing or empty token_sectors are skipped.
 * Results are sorted by totalNetflow24h descending (hottest first).
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

  summaries.sort((a, b) => b.totalNetflow24h - a.totalNetflow24h);

  return summaries;
}
