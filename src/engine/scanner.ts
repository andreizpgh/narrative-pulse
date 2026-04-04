// ============================================================
// Scanner — Orchestrator for the full Narrative Pulse pipeline
// Fetches data → discovers sectors → aggregates → classifies → sub-narratives → ScanResult
// ============================================================

import { fetchNetflows } from "../api/netflows.js";
import { fetchTokenScreener } from "../api/token-screener.js";
import { fetchHoldings } from "../api/holdings.js";
import { fetchFlowIntelligence } from "../api/flow-intelligence.js";
import { getAndResetStats } from "../api/client.js";
import { discoverSectors } from "./discovery.js";
import { aggregateByNarrative, toNarrativeKey } from "./aggregator.js";
import { classifyTokens } from "./classifier.js";
import { generateSubNarratives } from "./sub-narratives.js";
import { computeRotations, loadSnapshot, saveSnapshot } from "./rotations.js";
import { enrichTokenData, detectEarlySignals } from "./enricher.js";
import { extractScreenerHighlights } from "./screener-highlights.js";
import { config } from "../config.js";
import { normalizeAddress } from "../utils/normalize.js";
import type {
  ScanResult,
  NetflowEntry,
  NarrativeSummary,
  ClassifiedToken,
  NarrativeKey,
  NarrativeRotation,
  SubNarrative,
  EnrichedTokenData,
  EarlySignalToken,
  TokenScreenerEntry,
  ScreenerHighlight,
  FlowIntelligence,
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

  let unmatchedCount = 0;
  for (const token of classified) {
    const narrativeKey = tokenNarrativeMap.get(token.token_address);
    if (narrativeKey === undefined) { unmatchedCount++; continue; }

    let idx = narrativeIndex.get(narrativeKey);

    // If exact key not found (narrative was filtered out),
    // try to find a parent/child narrative that partially matches
    if (idx === undefined) {
      for (const [nKey, nIdx] of narrativeIndex) {
        if (
          narrativeKey.startsWith(nKey + "+") ||
          nKey.startsWith(narrativeKey + "+")
        ) {
          idx = nIdx;
          break;
        }
      }
    }

    if (idx === undefined) { unmatchedCount++; continue; }
    narratives[idx].topTokens.push(token);
  }

  const totalAssigned = narratives.reduce((sum, n) => sum + n.topTokens.length, 0);
  log(`Assigned ${totalAssigned} classified tokens to narratives (${unmatchedCount} unmatched)`);
}

// ============================================================
// Pipeline Steps
// ============================================================

async function stepFetchNetflows(): Promise<NetflowEntry[]> {
  log("Step 1/11: Fetching Smart Money netflows...");
  const entries = await fetchNetflows(
    config.chains,
    config.minMarketCapUsd,
    config.minTraderCount
  );
  log(`Step 1/11: Got ${entries.length} netflow entries`);
  return entries;
}

async function stepFetchScreener(): Promise<Map<string, TokenScreenerEntry>> {
  log("Step 2/11: Fetching token screener data...");
  const screenerData = await fetchTokenScreener(
    config.chains,
    config.minMarketCapUsd
  );
  log(`Step 2/11: Got ${screenerData.size} screener entries`);
  return screenerData;
}

async function stepFetchHoldings(): Promise<number> {
  log("Step 3/11: Fetching Smart Money holdings...");
  try {
    const holdings = await fetchHoldings(config.chains);
    log(`Step 3/11: Got ${holdings.size} holdings entries`);
    return holdings.size;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Step 3/11: Holdings fetch failed (${msg}) — continuing without`);
    return 0;
  }
}

async function stepEnrich(
  netflowEntries: NetflowEntry[],
  screenerData: Map<string, TokenScreenerEntry>
): Promise<EnrichedTokenData[]> {
  log("Step 4/11: Enriching tokens with DexScreener data...");
  try {
    const enriched = await enrichTokenData(netflowEntries, screenerData);
    log(`Step 4/11: Enriched ${enriched.length} tokens`);
    return enriched;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Step 4/11: DexScreener enrichment failed (${msg}) — continuing without enrichment`);
    return [];
  }
}

function stepDiscovery(entries: NetflowEntry[]): string[] {
  const sectors = discoverSectors(entries);
  log(`Step 5/11: Discovering sectors (found ${sectors.length})`);
  return sectors;
}

function stepAggregation(entries: NetflowEntry[]): NarrativeSummary[] {
  const narratives = aggregateByNarrative(entries);
  log(`Step 6/11: Aggregating by narrative (found ${narratives.length} narratives)`);
  return narratives;
}

function stepClassification(
  entries: NetflowEntry[],
  screenerData: Map<string, TokenScreenerEntry>,
  enrichedData: EnrichedTokenData[]
): ClassifiedToken[] {
  // Build enriched lookup map for classifier
  const enrichedMap = new Map<string, EnrichedTokenData>();
  for (const token of enrichedData) {
    enrichedMap.set(normalizeAddress(token.token_address), token);
  }

  const classified = classifyTokens(
    entries,
    screenerData,
    config.netflowThresholds,
    enrichedMap
  );

  const pumpingCount = classified.filter((t) => t.category === "pumping").length;
  const hotCount = classified.filter((t) => t.category === "hot").length;
  const watchCount = classified.filter((t) => t.category === "watch").length;
  const avoidCount = classified.filter((t) => t.category === "avoid").length;
  log(
    `Step 7/11: Classifying tokens (${pumpingCount} pumping, ${hotCount} hot, ${watchCount} watch, ${avoidCount} avoid)`
  );

  return classified;
}

function stepScreenerHighlights(
  screenerData: Map<string, TokenScreenerEntry>,
  netflowEntries?: NetflowEntry[]
): ScreenerHighlight[] {
  log("Step 8/11: Extracting screener highlights...");
  const highlights = extractScreenerHighlights(screenerData, netflowEntries);
  const heavy = highlights.filter(h => h.classification === "heavy_accumulation").length;
  const accum = highlights.filter(h => h.classification === "accumulating").length;
  const diverging = highlights.filter(h => h.classification === "diverging").length;
  const pumping = highlights.filter(h => h.classification === "pumping").length;
  const mixed = highlights.filter(h => h.classification === "mixed").length;
  const dist = highlights.filter(h => h.classification === "distributing").length;
  log(`Step 8/11: ${highlights.length} highlights (${heavy} heavy accumulation, ${accum} accumulating, ${diverging} diverging, ${pumping} pumping, ${mixed} mixed, ${dist} distributing)`);
  return highlights;
}

async function stepFlowIntelligence(
  highlights: ScreenerHighlight[]
): Promise<Map<string, FlowIntelligence>> {
  log("Step 8.5: Fetching flow intelligence for top tokens...");
  try {
    // Take top N highlights that have chain + address
    const topTokens = highlights
      .filter(h => h.token_address && h.chain)
      .slice(0, config.flowIntelligence.topN)
      .map(h => ({ chain: h.chain, token_address: h.token_address }));

    const flowData = await fetchFlowIntelligence(topTokens);
    log(`Step 8.5: Got flow intelligence for ${flowData.size} tokens`);
    return flowData;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Step 8.5: Flow intelligence failed (${msg}) — continuing without`);
    return new Map();
  }
}

function stepEarlySignals(
  enrichedTokens: EnrichedTokenData[],
  narratives: NarrativeSummary[],
  tokenNarrativeMap: Map<string, NarrativeKey>
): EarlySignalToken[] {
  log("Step 9/11: Detecting early signal tokens...");
  const signals = detectEarlySignals(
    enrichedTokens,
    narratives,
    tokenNarrativeMap,
    config.earlySignal
  );
  log(`Step 9/11: ${signals.length} early signals detected`);
  return signals;
}

async function stepRotations(
  narratives: NarrativeSummary[]
): Promise<NarrativeRotation[]> {
  log("Step 10/11: Computing narrative rotations...");

  const previous = await loadSnapshot();
  const rotations = computeRotations(narratives, previous);

  log(
    `Step 10/11: ${rotations.length} rotations detected` +
    `${previous ? " (vs previous scan)" : " (first run — no previous data)"}`
  );

  return rotations;
}

async function stepSubNarratives(
  topNarrative: NarrativeSummary | undefined,
  entries: NetflowEntry[]
): Promise<SubNarrative[] | undefined> {
  if (!topNarrative) {
    log("Step 11/11: No top narrative — skipping sub-narrative generation");
    return undefined;
  }

  log(`Step 11/11: Generating sub-narratives for "${topNarrative.displayName}"...`);

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
      log(`Step 11/11: Generated ${result.length} sub-narratives`);
    } else {
      log("Step 11/11: No sub-narratives generated");
    }
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Step 11/11: Sub-narrative generation failed (${msg}) — continuing without`);
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
 *   3. Fetch Smart Money holdings (graceful degradation)
 *   4. Enrich with DexScreener price/volume data
 *   5. Discover sectors
 *   6. Aggregate by narrative
 *   7. Classify tokens (Hot/Watch/Avoid) with enriched data
 *   8. Extract screener highlights (top SM active tokens)
 *   9. Detect early signal tokens
 *   10. Compute narrative rotations
 *   11. Generate sub-narratives for the top narrative
 *
 * Steps 1 and 2 are critical — if they fail, an error is thrown.
 * Steps 3 and 4 (enrichment) gracefully degrade on failure.
 * Step 11 is optional — failures are swallowed gracefully.
 */
export async function runScan(options?: { skipAgent?: boolean }): Promise<ScanResult> {
  const skipAgent = options?.skipAgent ?? true;
  // Step 1: Fetch netflows (critical)
  const netflowEntries = await stepFetchNetflows();

  if (netflowEntries.length === 0) {
    throw new Error(
      "No netflow data returned. Check your API key, chain filters, or try again later."
    );
  }

  // Step 2: Fetch token screener (critical)
  const screenerData = await stepFetchScreener();

  // Step 3: Fetch Smart Money holdings (graceful degradation)
  const holdingsCount = await stepFetchHoldings();

  // Step 4: Enrich with DexScreener (graceful — failures return empty array)
  const enrichedTokens = await stepEnrich(netflowEntries, screenerData);

  // Step 5: Discover sectors
  const sectors = stepDiscovery(netflowEntries);

  // Step 6: Aggregate by narrative
  const narratives = stepAggregation(netflowEntries);

  // Step 7: Classify tokens with enriched data and assign to narratives
  const classified = stepClassification(netflowEntries, screenerData, enrichedTokens);
  const tokenNarrativeMap = buildTokenNarrativeMap(netflowEntries);
  assignTopTokens(narratives, classified, tokenNarrativeMap);

  // Step 8: Extract screener highlights (HERO section — always rich data)
  const screenerHighlights = stepScreenerHighlights(screenerData, netflowEntries);

  // Step 7.5: Cross-reference screener highlights with enriched data
  // EnrichedTokenData has tokenSectors, fdv, liquidity from netflow + DexScreener merge
  const enrichedByAddress = new Map<string, EnrichedTokenData>();
  const enrichedBySymbolChain = new Map<string, EnrichedTokenData>();
  for (const et of enrichedTokens) {
    const normAddr = normalizeAddress(et.token_address);
    if (!enrichedByAddress.has(normAddr)) {
      enrichedByAddress.set(normAddr, et);
    }
    const symKey = `${et.token_symbol.toLowerCase()}:${et.chain}`;
    if (!enrichedBySymbolChain.has(symKey)) {
      enrichedBySymbolChain.set(symKey, et);
    }
  }

  for (const h of screenerHighlights) {
    // Skip if already enriched by netflow cross-reference
    if (h.tokenSectors && h.tokenSectors.length > 0) continue;

    const normAddr = normalizeAddress(h.token_address);
    const symKey = `${h.token_symbol.toLowerCase()}:${h.chain}`;
    const match = enrichedByAddress.get(normAddr) ?? enrichedBySymbolChain.get(symKey);

    if (match) {
      if (match.tokenSectors && match.tokenSectors.length > 0) {
        h.tokenSectors = match.tokenSectors;
        h.narrativeKey = match.tokenSectors[0];
      }
      if (match.netflow7dUsd) h.netflow7dUsd = match.netflow7dUsd;
      if (match.liquidity) h.liquidity = match.liquidity;
      if (match.fdv) h.fdv = match.fdv;
    }
  }

  // Step 8.5: Fetch flow intelligence for top highlights
  const flowData = await stepFlowIntelligence(screenerHighlights);
  // Merge flow intelligence into highlights
  let flowIntelligenceCount = 0;
  for (const highlight of screenerHighlights) {
    const flow = flowData.get(highlight.token_address);
    if (flow) {
      highlight.flowIntelligence = flow;
      flowIntelligenceCount++;
    }
  }

  // Step 9: Detect early signals
  const earlySignals = stepEarlySignals(enrichedTokens, narratives, tokenNarrativeMap);

  // Mark classified tokens that are early signals
  const earlySignalAddresses = new Set(earlySignals.map((s) => s.token_address));
  for (const token of classified) {
    if (earlySignalAddresses.has(token.token_address)) {
      token.isEarlySignal = true;
    }
  }

  // Step 10: Compute narrative rotations (needs previous snapshot)
  const rotations = await stepRotations(narratives);

  // Step 11: Sub-narratives for top narrative (OPTIONAL — costs 2000 credits)
  const topNarrative = narratives.length > 0 ? narratives[0] : undefined;
  const subNarratives = skipAgent
    ? (log("Step 11/11: Agent API skipped (use --deep to enable, costs 2000 credits)"), undefined)
    : await stepSubNarratives(topNarrative, netflowEntries);

  // Build result
  const stats = getAndResetStats();
  const result: ScanResult = {
    timestamp: new Date().toISOString(),
    sectors,
    narratives,
    rotations,
    subNarratives: subNarratives ?? undefined,
    topNarrativeKey: topNarrative?.key,
    earlySignals,
    screenerHighlights,
    enrichedTokens,
    holdingsCount,
    flowIntelligenceCount,
    apiCallsUsed: stats.apiCalls,
    creditsUsed: stats.creditsUsed,
  };

  // Save snapshot for next run's rotation tracking
  await saveSnapshot(narratives);

  log(
    `Scan complete! ${narratives.length} narratives, ${classified.length} classified tokens, ${earlySignals.length} early signals`
  );

  return result;
}
