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
 * Classifies tokens into Hot / Watch / Avoid categories based on
 * Smart Money netflow data (from netflows API) and market data
 * (from token-screener API).
 *
 * Tokens without matching screener data are skipped.
 * Tokens that don't match any category (neutral) are excluded.
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
  const classified: ClassifiedToken[] = [];

  for (const netflow of netflows) {
    const screener = screenerData.get(netflow.token_address);

    // Cannot classify without price/volume data
    if (!screener) {
      continue;
    }

    const category = determineCategory(netflow, screener, thresholds);

    // Neutral tokens are excluded from the result
    if (category === null) {
      continue;
    }

    classified.push({
      token_symbol: netflow.token_symbol,
      token_address: netflow.token_address,
      chain: netflow.chain,
      category,
      netflow24hUsd: netflow.net_flow_24h_usd,
      priceChange: screener.price_change,
      buyVolume: screener.buy_volume,
      sellVolume: screener.sell_volume,
      traderCount: netflow.trader_count,
      marketCapUsd: netflow.market_cap_usd,
    });
  }

  classified.sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    return b.netflow24hUsd - a.netflow24hUsd;
  });

  return classified;
}

/**
 * Determines the category for a single token.
 * Returns null for neutral (unclassified) tokens.
 *
 * Evaluation order matters: Hot is checked before Watch
 * because Hot is a stricter subset of Watch.
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

  // Neutral — between watch and avoid thresholds
  return null;
}
