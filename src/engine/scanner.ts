// ============================================================
// Scanner — Orchestrator for the full Narrative Pulse pipeline
// Fetches data → discovers sectors → aggregates → classifies → sub-narratives → ScanResult
// ============================================================

import { fetchNetflows } from "../api/netflows.js";
import { fetchTokenScreener } from "../api/token-screener.js";
import { getAndResetStats } from "../api/client.js";
import { discoverSectors } from "./discovery.js";
import { aggregateByNarrative, toNarrativeKey } from "./aggregator.js";
import { classifyTokens } from "./classifier.js";
import { generateSubNarratives } from "./sub-narratives.js";
import { computeRotations, loadSnapshot, saveSnapshot } from "./rotations.js";
import { config } from "../config.js";
import type {
  ScanResult,
  NetflowEntry,
  NarrativeSummary,
  ClassifiedToken,
  NarrativeKey,
  NarrativeRotation,
  SubNarrative,
} from "../types.js";

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Scanner] ${message}`);
}

/**
 * Build a map from token_address → NarrativeKey using netflow entries.
 * This lets us look up which narrative a classified token belongs to.
 */
function buildTokenNarrativeMap(
  entries: NetflowEntry[]
): Map<string, NarrativeKey> {
  const map = new Map<string, NarrativeKey>();
  for (const entry of entries) {
    if (entry.token_sectors && entry.token_sectors.length > 0) {
      map.set(entry.token_address, toNarrativeKey(entry.token_sectors));
    }
  }
  return map;
}

/**
 * Assign classified tokens to their corresponding narratives.
 * For each narrative, filters ClassifiedToken[] by matching NarrativeKey.
 */
function assignTopTokens(
  narratives: NarrativeSummary[],
  classified: ClassifiedToken[],
  tokenNarrativeMap: Map<string, NarrativeKey>
): void {
  // Build a lookup: NarrativeKey → index in narratives array
  const narrativeIndex = new Map<NarrativeKey, number>();
  for (let i = 0; i < narratives.length; i++) {
    narrativeIndex.set(narratives[i].key, i);
  }

  for (const token of classified) {
    const narrativeKey = tokenNarrativeMap.get(token.token_address);
    if (narrativeKey === undefined) continue;

    const idx = narrativeIndex.get(narrativeKey);
    if (idx === undefined) continue;

    narratives[idx].topTokens.push(token);
  }
}

// ============================================================
// Pipeline Steps
// ============================================================

async function stepFetchNetflows(): Promise<NetflowEntry[]> {
  log("Step 1/6: Fetching Smart Money netflows...");
  const entries = await fetchNetflows(
    config.chains,
    config.minMarketCapUsd,
    config.minTraderCount
  );
  log(`Step 1/6: Got ${entries.length} netflow entries`);
  return entries;
}

async function stepFetchScreener(): Promise<Map<string, import("../types.js").TokenScreenerEntry>> {
  log("Step 2/6: Fetching token screener data...");
  const screenerData = await fetchTokenScreener(
    config.chains,
    config.minMarketCapUsd
  );
  log(`Step 2/6: Got ${screenerData.size} screener entries`);
  return screenerData;
}

function stepDiscovery(entries: NetflowEntry[]): string[] {
  const sectors = discoverSectors(entries);
  log(`Step 3/6: Discovering sectors (found ${sectors.length})`);
  return sectors;
}

function stepAggregation(entries: NetflowEntry[]): NarrativeSummary[] {
  const narratives = aggregateByNarrative(entries);
  log(`Step 4/6: Aggregating by narrative (found ${narratives.length} narratives)`);
  return narratives;
}

function stepClassification(
  entries: NetflowEntry[],
  screenerData: Map<string, import("../types.js").TokenScreenerEntry>,
  narratives: NarrativeSummary[]
): ClassifiedToken[] {
  const classified = classifyTokens(
    entries,
    screenerData,
    config.netflowThresholds
  );

  const hotCount = classified.filter((t) => t.category === "hot").length;
  const watchCount = classified.filter((t) => t.category === "watch").length;
  const avoidCount = classified.filter((t) => t.category === "avoid").length;
  log(
    `Step 5/6: Classifying tokens (${hotCount} hot, ${watchCount} watch, ${avoidCount} avoid)`
  );

  return classified;
}

async function stepRotations(
  narratives: NarrativeSummary[]
): Promise<NarrativeRotation[]> {
  log("Step 5.5/6: Computing narrative rotations...");

  const previous = await loadSnapshot();
  const rotations = computeRotations(narratives, previous);

  log(
    `Step 5.5/6: ${rotations.length} rotations detected` +
    `${previous ? " (vs previous scan)" : " (first run — no previous data)"}`
  );

  return rotations;
}

async function stepSubNarratives(
  topNarrative: NarrativeSummary | undefined,
  entries: NetflowEntry[]
): Promise<SubNarrative[] | undefined> {
  if (!topNarrative) {
    log("Step 6/6: No top narrative — skipping sub-narrative generation");
    return undefined;
  }

  log(`Step 6/6: Generating sub-narratives for "${topNarrative.displayName}"...`);

  // Filter netflow entries that belong to the top narrative
  const topEntries = entries.filter(
    (e) =>
      e.token_sectors &&
      e.token_sectors.length > 0 &&
      toNarrativeKey(e.token_sectors) === topNarrative.key
  );

  try {
    const result = await generateSubNarratives(topNarrative.key, topEntries);
    if (result) {
      log(`Step 6/6: Generated ${result.length} sub-narratives`);
    } else {
      log("Step 6/6: No sub-narratives generated");
    }
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Step 6/6: Sub-narrative generation failed (${msg}) — continuing without`);
    return undefined;
  }
}

// ============================================================
// Main Orchestrator
// ============================================================

/**
 * Runs the full Narrative Pulse scan pipeline:
 *   1. Fetch Smart Money netflows
 *   2. Fetch token screener data
 *   3. Discover sectors
 *   4. Aggregate by narrative
 *   5. Classify tokens (Hot/Watch/Avoid) and assign to narratives
 *   6. Generate sub-narratives for the top narrative
 *
 * Steps 1 and 2 are critical — if they fail, an error is thrown.
 * Step 6 is optional — failures are swallowed gracefully.
 */
export async function runScan(): Promise<ScanResult> {
  // Step 1: Fetch netflows (critical)
  const netflowEntries = await stepFetchNetflows();

  if (netflowEntries.length === 0) {
    throw new Error(
      "No netflow data returned. Check your API key, chain filters, or try again later."
    );
  }

  // Step 2: Fetch token screener (critical)
  const screenerData = await stepFetchScreener();

  // Step 3: Discover sectors
  const sectors = stepDiscovery(netflowEntries);

  // Step 4: Aggregate by narrative
  const narratives = stepAggregation(netflowEntries);

  // Step 5: Classify tokens and assign to narratives
  const classified = stepClassification(netflowEntries, screenerData, narratives);
  const tokenNarrativeMap = buildTokenNarrativeMap(netflowEntries);
  assignTopTokens(narratives, classified, tokenNarrativeMap);

  // Step 5.5: Compute rotations (needs previous snapshot)
  const rotations = await stepRotations(narratives);

  // Step 6: Sub-narratives for top narrative
  const topNarrative = narratives.length > 0 ? narratives[0] : undefined;
  const subNarratives = await stepSubNarratives(topNarrative, netflowEntries);

  // Build result
  const stats = getAndResetStats();
  const result: ScanResult = {
    timestamp: new Date().toISOString(),
    sectors,
    narratives,
    rotations,
    subNarratives: subNarratives ?? undefined,
    topNarrativeKey: topNarrative?.key,
    apiCallsUsed: stats.apiCalls,
    creditsUsed: stats.creditsUsed,
  };

  // Save snapshot for next run's rotation tracking
  await saveSnapshot(narratives);

  log(
    `Scan complete! ${narratives.length} narratives, ${classified.length} classified tokens`
  );

  return result;
}
