import type {
  NetflowEntry,
  TokenScreenerEntry,
  TokenCategory,
  ClassifiedToken,
  Config,
} from "../types.js";

/** Sort order for token categories: hot first, watch second, avoid last. */
export const CATEGORY_ORDER: Record<TokenCategory, number> = {
  hot: 0,
  watch: 1,
  avoid: 2,
};

/**
 * Normalize a blockchain address for comparison.
 * EVM addresses (0x-prefixed) are lowercased.
 * Solana and other non-EVM addresses are kept as-is (case-sensitive).
 */
function normalizeAddress(address: string): string {
  if (address.startsWith("0x") || address.startsWith("0X")) {
    return address.toLowerCase();
  }
  return address;
}

/**
 * Classifies tokens into Hot / Watch / Avoid categories based on
 * Smart Money netflow data (from netflows API) and market data
 * (from token-screener API).
 *
 * Matching logic:
 *  1. Exact match by token_address (primary)
 *  2. Fallback match by token_symbol + chain (handles address format differences)
 *
 * Tokens without a meaningful signal (neutral zone) are EXCLUDED.
 * Only tokens with actionable signals are returned.
 *
 * Results are sorted:
 *  1. By category: hot → watch → avoid
 *  2. Within category: by 24h netflow descending
 */
export function classifyTokens(
  netflows: NetflowEntry[],
  screenerData: Map<string, TokenScreenerEntry>,
  thresholds: Config["netflowThresholds"]
): ClassifiedToken[] {
  // Build normalized screener lookup: normalized_address → entry
  const screenerNormalized = new Map<string, TokenScreenerEntry>();
  // Build secondary lookup: "symbol:chain" → screener entry (lowercase key)
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

  const classified: ClassifiedToken[] = [];
  let matchCount = 0;
  let missCount = 0;
  let skippedCount = 0;

  for (const netflow of netflows) {
    // Try normalized address match first, then fallback to symbol+chain
    const normalizedAddr = normalizeAddress(netflow.token_address);
    const symbolChainKey = `${netflow.token_symbol.toLowerCase()}:${netflow.chain}`;
    const screener = screenerNormalized.get(normalizedAddr)
      ?? screenerBySymbolChain.get(symbolChainKey);

    const category: TokenCategory | null = screener
      ? (matchCount++, determineCategory(netflow, screener, thresholds))
      : (missCount++, determineCategoryNetflowOnly(netflow));

    // Skip tokens with no meaningful signal (null = neutral)
    if (category === null) {
      skippedCount++;
      continue;
    }

    classified.push({
      token_symbol: netflow.token_symbol,
      token_address: netflow.token_address,
      chain: netflow.chain,
      category,
      netflow24hUsd: netflow.net_flow_24h_usd,
      netflow7dUsd: netflow.net_flow_7d_usd,
      priceChange: screener?.price_change ?? 0,
      buyVolume: screener?.buy_volume ?? 0,
      sellVolume: screener?.sell_volume ?? 0,
      traderCount: netflow.trader_count,
      marketCapUsd: netflow.market_cap_usd ?? 0,
    });
  }

  console.log(
    `[Classifier] Screener match: ${matchCount}/${netflows.length}, ` +
    `classified: ${classified.length}, skipped: ${skippedCount} (neutral/no signal)`
  );

  classified.sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    return b.netflow24hUsd - a.netflow24hUsd;
  });

  return classified;
}

/**
 * Determines the category for a token that has screener data.
 * Returns null for tokens without a strong signal.
 *
 * Evaluation order: Hot (strict) → Watch → Avoid → null (neutral).
 */
function determineCategory(
  netflow: NetflowEntry,
  screener: TokenScreenerEntry,
  thresholds: Config["netflowThresholds"]
): TokenCategory | null {
  // Hot: SM accumulates AND price already rising
  if (
    netflow.net_flow_24h_usd > thresholds.hot.minNetflowUsd &&
    screener.price_change > thresholds.hot.minPriceChange &&
    screener.buy_volume > screener.sell_volume
  ) {
    return "hot";
  }

  // Watch: SM accumulates but price hasn't moved yet
  if (netflow.net_flow_24h_usd > thresholds.watch.minNetflowUsd) {
    return "watch";
  }

  // Avoid: SM is distributing (negative netflow below threshold)
  if (netflow.net_flow_24h_usd < thresholds.avoid.maxNetflowUsd) {
    return "avoid";
  }

  // Neutral — has screener data but no strong signal
  return null;
}

/**
 * Determines the category for a token WITHOUT screener data.
 * Uses netflow-only thresholds (higher than screener-backed classification).
 * Returns null for tokens without meaningful netflow.
 */
function determineCategoryNetflowOnly(
  netflow: NetflowEntry
): TokenCategory | null {
  // Strong accumulation without price data
  if (netflow.net_flow_24h_usd > 5_000) return "hot";
  // Moderate accumulation
  if (netflow.net_flow_24h_usd > 1_000) return "watch";
  // Distribution
  if (netflow.net_flow_24h_usd < -1_000) return "avoid";

  // Not enough signal to classify
  return null;
}
