import type {
  NetflowEntry,
  TokenScreenerEntry,
  TokenCategory,
  ClassifiedToken,
  EnrichedTokenData,
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
  thresholds: Config["netflowThresholds"],
  enrichedData?: Map<string, EnrichedTokenData>
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

    // Look up enriched data for this token
    const enriched = enrichedData
      ? enrichedData.get(normalizedAddr)
      : undefined;

    const category: TokenCategory | null = screener
      ? (matchCount++, determineCategory(netflow, screener, thresholds, enriched))
      : (missCount++, determineCategoryNetflowOnly(netflow, enriched));

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
      priceChange: enriched?.priceChange24h ?? screener?.price_change ?? 0,
      buyVolume: enriched?.buys24h ?? screener?.buy_volume ?? 0,
      sellVolume: enriched?.sells24h ?? screener?.sell_volume ?? 0,
      traderCount: netflow.trader_count,
      marketCapUsd: enriched?.marketCap ?? netflow.market_cap_usd ?? 0,
      volume24h: enriched?.volume24h ?? 0,
      liquidity: enriched?.liquidity ?? 0,
      priceChange1h: enriched?.priceChange1h ?? 0,
      isEarlySignal: false,
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
 * When enriched data is provided, uses DexScreener price/buy-sell data
 * for more accurate classification. Otherwise falls back to screener data.
 *
 * Evaluation order: Hot (strict) → Watch → Avoid → null (neutral).
 */
function determineCategory(
  netflow: NetflowEntry,
  screener: TokenScreenerEntry,
  thresholds: Config["netflowThresholds"],
  enriched?: EnrichedTokenData
): TokenCategory | null {
  // Use enriched data when available, otherwise screener
  const priceChange = enriched?.priceChange24h ?? screener.price_change;
  const buyVolume = enriched?.buys24h ?? screener.buy_volume;
  const sellVolume = enriched?.sells24h ?? screener.sell_volume;

  // Hot: SM accumulates AND price already rising
  if (
    netflow.net_flow_24h_usd > thresholds.hot.minNetflowUsd &&
    priceChange > thresholds.hot.minPriceChange &&
    buyVolume > sellVolume
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
 * When enriched data is available, uses it for supplementary checks.
 * Returns null for tokens without meaningful netflow.
 */
function determineCategoryNetflowOnly(
  netflow: NetflowEntry,
  enriched?: EnrichedTokenData
): TokenCategory | null {
  // If we have enriched data, use it for better classification
  if (enriched) {
    const buyVolume = enriched.buys24h;
    const sellVolume = Math.max(enriched.sells24h, 1);

    // Strong accumulation with buy pressure
    if (netflow.net_flow_24h_usd > 5_000 && buyVolume > sellVolume) return "hot";
    // Moderate accumulation
    if (netflow.net_flow_24h_usd > 1_000) return "watch";
    // Distribution
    if (netflow.net_flow_24h_usd < -1_000) return "avoid";
  } else {
    // No enriched data — pure netflow-based classification
    // Strong accumulation without price data
    if (netflow.net_flow_24h_usd > 5_000) return "hot";
    // Moderate accumulation
    if (netflow.net_flow_24h_usd > 1_000) return "watch";
    // Distribution
    if (netflow.net_flow_24h_usd < -1_000) return "avoid";
  }

  // Not enough signal to classify
  return null;
}
