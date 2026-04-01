import type { NetflowEntry } from "../types.js";

/**
 * Extracts all unique sectors from netflow entries.
 * Returns an alphabetically sorted list of sector names.
 */
export function discoverSectors(entries: NetflowEntry[]): string[] {
  const sectors = new Set<string>();

  for (const entry of entries) {
    if (!entry.token_sectors || entry.token_sectors.length === 0) {
      continue;
    }

    for (const sector of entry.token_sectors) {
      sectors.add(sector);
    }
  }

  return Array.from(sectors).sort();
}
