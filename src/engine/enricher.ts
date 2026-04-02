// ============================================================
// Enricher — Merges Nansen netflow data with DexScreener price/volume
// Also detects early signal tokens (SM accumulating before price pumps)
// ============================================================

import { fetchDexScreenerData } from "../api/dexscreener.js";
import { normalizeAddress } from "../utils/normalize.js";
import type {
  NetflowEntry,
  TokenScreenerEntry,
  DexScreenerPair,
  EnrichedTokenData,
  EarlySignalToken,
  NarrativeSummary,
  NarrativeKey,
  Config,
} from "../types.js";

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Enricher] ${message}`);
}

// ============================================================
// Public API
// ============================================================

/**
 * Build EnrichedTokenData for a single token by merging data sources.
 * DexScreener is the primary source; falls back to screener data.
 * Always returns numeric values — never null.
 */
function buildEnrichedToken(
  netflow: NetflowEntry,
  dexPair: DexScreenerPair | null,
  screener: TokenScreenerEntry | null
): EnrichedTokenData {
  const priceUsd = dexPair?.priceUsd
    ? parseFloat(dexPair.priceUsd)
    : screener?.price_usd ?? 0;

  const priceChange24h = dexPair?.priceChange?.h24
    ?? screener?.price_change
    ?? 0;

  const priceChange1h = dexPair?.priceChange?.h1 ?? 0;

  const volume24h = dexPair?.volume?.h24 ?? screener?.volume ?? 0;

  const liquidity = dexPair?.liquidity?.usd ?? screener?.liquidity ?? 0;

  const marketCap = dexPair?.marketCap
    ?? screener?.market_cap_usd
    ?? netflow.market_cap_usd
    ?? 0;

  const fdv = dexPair?.fdv ?? 0;

  const buys24h = dexPair?.txns?.h24?.buys ?? screener?.nof_buyers ?? 0;
  const sells24h = dexPair?.txns?.h24?.sells ?? screener?.nof_sellers ?? 0;

  return {
    token_address: netflow.token_address,
    token_symbol: netflow.token_symbol,
    chain: netflow.chain,
    priceUsd,
    priceChange24h,
    priceChange1h,
    volume24h,
    liquidity,
    marketCap,
    fdv,
    buys24h,
    sells24h,
    netflow24hUsd: netflow.net_flow_24h_usd,
    netflow7dUsd: netflow.net_flow_7d_usd,
    traderCount: netflow.trader_count,
    tokenSectors: netflow.token_sectors,
    tokenAgeDays: netflow.token_age_days,
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Enrich Nansen netflow data with DexScreener price/volume data.
 *
 * 1. Fetches DexScreener data for all unique tokens from netflowEntries.
 * 2. For each netflow entry, builds EnrichedTokenData:
 *    - DexScreener is the primary source for price/volume
 *    - Falls back to screenerData if DexScreener has no data
 *    - Uses 0 if neither source has data (graceful degradation)
 * 3. Returns sorted by |netflow24hUsd| descending.
 */
export async function enrichTokenData(
  netflowEntries: NetflowEntry[],
  screenerData: Map<string, TokenScreenerEntry>
): Promise<EnrichedTokenData[]> {
  if (netflowEntries.length === 0) {
    log("No netflow entries to enrich");
    return [];
  }

  // Build screener lookup with normalized keys
  const screenerNormalized = new Map<string, TokenScreenerEntry>();
  const screenerBySymbolChain = new Map<string, TokenScreenerEntry>();
  for (const [, entry] of screenerData) {
    const normKey = normalizeAddress(entry.token_address);
    if (!screenerNormalized.has(normKey)) {
      screenerNormalized.set(normKey, entry);
    }
    const symbolKey = `${entry.token_symbol.toLowerCase()}:${entry.chain}`;
    if (!screenerBySymbolChain.has(symbolKey)) {
      screenerBySymbolChain.set(symbolKey, entry);
    }
  }

  // Step 1: Fetch DexScreener data for all unique tokens
  const dexData = await fetchDexScreenerData(
    netflowEntries.map((e) => ({
      address: e.token_address,
      chain: e.chain,
    }))
  );

  // Step 2: Build enriched data for each netflow entry
  const enriched: EnrichedTokenData[] = [];
  let dexMatches = 0;
  let screenerFallback = 0;
  let noData = 0;

  for (const netflow of netflowEntries) {
    const normAddr = normalizeAddress(netflow.token_address);

    // Look up DexScreener data
    const dexPair = dexData.get(normAddr) ?? null;

    // Look up screener data as fallback
    const symbolChainKey = `${netflow.token_symbol.toLowerCase()}:${netflow.chain}`;
    const screener = screenerNormalized.get(normAddr)
      ?? screenerBySymbolChain.get(symbolChainKey)
      ?? null;

    if (dexPair) {
      dexMatches++;
    } else if (screener) {
      screenerFallback++;
    } else {
      noData++;
    }

    enriched.push(buildEnrichedToken(netflow, dexPair, screener));
  }

  log(
    `Enriched ${enriched.length} tokens: ` +
    `${dexMatches} from DexScreener, ${screenerFallback} screener fallback, ${noData} no market data`
  );

  // Sort by absolute 24h netflow descending
  enriched.sort((a, b) => Math.abs(b.netflow24hUsd) - Math.abs(a.netflow24hUsd));

  return enriched;
}

/**
 * Detect early signal tokens: Smart Money is accumulating but price hasn't pumped yet.
 *
 * Filters tokens by:
 *   - netflow24hUsd > minNetflowUsd (SM is accumulating)
 *   - priceChange24h < maxPriceChangePercent (price hasn't moved much)
 *   - buys24h > sells24h * minBuySellRatio (strong buy pressure)
 *   - volume24h > minVolumeUsd (not illiquid)
 *
 * Returns top 10 sorted by netflow24hUsd descending.
 */
export function detectEarlySignals(
  enrichedTokens: EnrichedTokenData[],
  narratives: NarrativeSummary[],
  tokenNarrativeMap: Map<string, NarrativeKey>,
  thresholds: Config["earlySignal"]
): EarlySignalToken[] {
  const signals: EarlySignalToken[] = [];

  // Build narrative display name lookup
  const narrativeDisplayNames = new Map<string, string>();
  for (const n of narratives) {
    narrativeDisplayNames.set(n.key, n.displayName);
  }

  for (const token of enrichedTokens) {
    // Filter: SM accumulating
    if (token.netflow24hUsd <= thresholds.minNetflowUsd) continue;

    // Filter: price hasn't pumped yet
    if (token.priceChange24h >= thresholds.maxPriceChangePercent) continue;

    // Filter: strong buy pressure
    const sells = Math.max(token.sells24h, 1);
    if (token.buys24h <= sells * thresholds.minBuySellRatio) continue;

    // Filter: not illiquid
    if (token.volume24h < thresholds.minVolumeUsd) continue;

    // Look up narrative
    const narrativeKey = tokenNarrativeMap.get(token.token_address);
    if (narrativeKey === undefined) continue;

    signals.push({
      token_symbol: token.token_symbol,
      token_address: token.token_address,
      chain: token.chain,
      netflow24hUsd: token.netflow24hUsd,
      priceChange24h: token.priceChange24h,
      volume24h: token.volume24h,
      buyPressure: token.buys24h / sells,
      liquidity: token.liquidity,
      marketCap: token.marketCap,
      narrativeKey,
      narrativeDisplayName: narrativeDisplayNames.get(narrativeKey) ?? narrativeKey,
    });
  }

  // Sort by netflow descending, cap at 10
  signals.sort((a, b) => b.netflow24hUsd - a.netflow24hUsd);

  const result = signals.slice(0, 10);

  if (result.length > 0) {
    log(`Detected ${result.length} early signal tokens`);
  } else {
    log("No early signal tokens detected");
  }

  return result;
}
