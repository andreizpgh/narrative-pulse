// ============================================================
// Rotations — Compute narrative rotation flows between scans
// Tracks capital movement (losers → winners) and persists snapshots
// ============================================================

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NarrativeKey, NarrativeSummary, NarrativeRotation } from "../types.js";

// ============================================================
// Snapshot types
// ============================================================

export interface NarrativeSnapshot {
  key: NarrativeKey;
  totalNetflow24h: number;
}

export interface ScanSnapshot {
  timestamp: string;
  narratives: NarrativeSnapshot[];
}

// ============================================================
// Constants
// ============================================================

const SNAPSHOT_PATH = join("output", "last-scan.json");

/** Minimum rotation value in USD to include (filters noise) */
const MIN_ROTATION_VALUE_USD = 1_000;

// ============================================================
// Core algorithm
// ============================================================

/**
 * Compute narrative rotations by comparing current scan to previous snapshot.
 *
 * Algorithm:
 *   1. If no previous snapshot → first run → return []
 *   2. Calculate delta (change in 24h netflow) per narrative
 *   3. Losers (delta < 0) distribute capital proportionally to winners (delta > 0)
 *   4. Only include rotations >= $1K to filter noise
 *
 * Sankey consumers use: source=from, target=to, value=abs(valueUsd), color=direction
 */
export function computeRotations(
  current: NarrativeSummary[],
  previous: ScanSnapshot | null
): NarrativeRotation[] {
  // First run — no previous data to compare against
  if (previous === null) {
    return [];
  }

  // Build lookup from previous snapshot
  const previousMap = new Map<NarrativeKey, number>();
  for (const snap of previous.narratives) {
    previousMap.set(snap.key, snap.totalNetflow24h);
  }

  // Compute deltas for each current narrative
  const deltas: Array<{ key: NarrativeKey; delta: number }> = [];
  for (const narrative of current) {
    const previousValue = previousMap.get(narrative.key);
    const delta = previousValue !== undefined
      ? narrative.totalNetflow24h - previousValue
      : narrative.totalNetflow24h; // New narrative — treat as pure inflow

    deltas.push({ key: narrative.key, delta });
  }

  // Separate into losers (capital leaving) and winners (capital arriving)
  const losers = deltas
    .filter((d) => d.delta < 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const winners = deltas
    .filter((d) => d.delta > 0)
    .sort((a, b) => b.delta - a.delta);

  // No flow possible if one side is empty
  if (losers.length === 0 || winners.length === 0) {
    return [];
  }

  // Total winner delta for proportional distribution
  const totalWinnerDelta = winners.reduce((sum, w) => sum + w.delta, 0);

  if (totalWinnerDelta <= 0) {
    return [];
  }

  // Generate rotations: each loser distributes to all winners proportionally
  const rotations: NarrativeRotation[] = [];

  for (const loser of losers) {
    for (const winner of winners) {
      const value = Math.abs(loser.delta) * (winner.delta / totalWinnerDelta);

      if (value >= MIN_ROTATION_VALUE_USD) {
        rotations.push({
          from: loser.key,
          to: winner.key,
          valueUsd: Math.round(value),
          direction: "inflow",
        });
      }
    }
  }

  // Sort by value descending (largest rotations first)
  rotations.sort((a, b) => b.valueUsd - a.valueUsd);

  return rotations;
}

// ============================================================
// Snapshot persistence
// ============================================================

/**
 * Save current narrative state to disk for next run's rotation comparison.
 * Writes to output/last-scan.json (gitignored).
 */
export async function saveSnapshot(narratives: NarrativeSummary[]): Promise<void> {
  await mkdir("output", { recursive: true });

  const snapshot: ScanSnapshot = {
    timestamp: new Date().toISOString(),
    narratives: narratives.map((n) => ({
      key: n.key,
      totalNetflow24h: n.totalNetflow24h,
    })),
  };

  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
}

/**
 * Load the previous scan snapshot from disk.
 * Returns null if file doesn't exist or is corrupted (first run).
 */
export async function loadSnapshot(): Promise<ScanSnapshot | null> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf-8");
    return JSON.parse(raw) as ScanSnapshot;
  } catch {
    return null;
  }
}
