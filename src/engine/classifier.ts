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
 * Tokens without matching screener data are classified via netflow-only rules.
 * Every token is classified — none are excluded as "neutral".
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
    // Keep first match only (avoid overwriting with duplicate entries)
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

  for (const netflow of netflows) {
    // Try normalized address match first, then fallback to symbol+chain
    const normalizedAddr = normalizeAddress(netflow.token_address);
    const symbolChainKey = `${netflow.token_symbol.toLowerCase()}:${netflow.chain}`;
    const screener = screenerNormalized.get(normalizedAddr) 
      ?? screenerBySymbolChain.get(symbolChainKey);

    let category: TokenCategory;

    if (screener) {
      // Full classification with price/volume data
      matchCount++;
      category = determineCategory(netflow, screener, thresholds);
    } else {
      // Netflow-only: classify even tiny amounts — any SM activity is useful signal
      missCount++;
      if (netflow.net_flow_24h_usd > 500) {
        category = "hot";
      } else if (netflow.net_flow_24h_usd > 0) {
        category = "watch"; // ANY positive SM netflow is interesting
      } else if (netflow.net_flow_24h_usd < -100) {
        category = "avoid";
      } else {
        // Small negative netflow (-100 to 0) — SM was recently there, still worth watching
        category = "watch";
      }
    }

    // Every token must be classified — no null/neutral exclusion

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
    `[Classifier] Screener match: ${matchCount}/${netflows.length} tokens (${missCount} unmatched, classified via netflow-only)`
  );

  // Debug: show some examples of unmatched tokens
  if (missCount > 0) {
    const unmatched = netflows.filter(n => {
      const addr = normalizeAddress(n.token_address);
      const sym = `${n.token_symbol.toLowerCase()}:${n.chain}`;
      return !screenerNormalized.has(addr) && !screenerBySymbolChain.has(sym);
    }).slice(0, 3);
    console.log(
      `[Classifier] Unmatched examples: ${unmatched.map(t => `${t.token_symbol}(${t.chain}:${t.token_address.slice(0, 10)}...)`).join(", ")}`
    );
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
 * Always returns a category — even tokens in the "neutral" zone are classified as "watch"
 * because any SM activity is useful signal.
 *
 * Evaluation order matters: Hot is checked before Watch
 * because Hot is a stricter subset of Watch.
 */
function determineCategory(
  netflow: NetflowEntry,
  screener: TokenScreenerEntry,
  thresholds: Config["netflowThresholds"]
): TokenCategory {
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

  // Neutral — between watch and avoid thresholds, still classify as watch
  // (SM was active on this token — that's useful data)
  return "watch";
}
