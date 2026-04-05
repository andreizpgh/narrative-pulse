// ============================================================
// Screener Highlights — Top Smart Money Active Tokens
// Extracts the most active tokens from token-screener data.
// Always produces rich output (~500 screener entries → top 30 highlights).
// Cross-references with netflow data for enriched signals.
// ============================================================

import type { TokenScreenerEntry, ScreenerHighlight, NetflowEntry } from "../types.js";
import { normalizeAddress } from "../utils/normalize.js";

// ============================================================
// Constants
// ============================================================

const MAX_HIGHLIGHTS = 30;
const MIN_VOLUME_USD = 10_000; // $10K minimum volume to filter noise

// ============================================================
// Stablecoin / wrapped-token filter
// Huge volume, zero trading signal — must exclude from highlights
// ============================================================

const STRUCTURAL_NOISE_PATTERNS = [
  // Major stablecoins
  "USDT", "USDC", "DAI", "TUSD", "BUSD", "FRAX", "LUSD", "USDD",
  "GUSD", "USDP", "SUSD", "PYUSD", "FDUSD", "EURA", "USDV",
  // Additional stablecoins
  "USDCE", "USDGLO", "USD+", "USDR", "USDX", "USDN", "USDTE",
  "USDS", "USDY", "USDM", "USDE", "USDBC", "USDAP",
  "SAI", "MIM", "USTC", "CUSDT", "IUSDT",
  "AUSD", "XSGD", "EURS", "XEUR", "GBPT", "CNHT",
  // Wrapped base assets
  "WETH", "WBTC", "WBNB", "WSTETH", "WAVAX", "WMATIC",
  "CBETH", "RETH", "WEETH", "SDETH",
  // Nansen-specific wrapped names
  "SUSDS", "SYRUPUSDC", "RLUSD", "MWETH",
  // Liquid Staking and Yield wrappers
  "JUPSOL", "JITOSOL", "BGSOL", "MSOL", "IETHV2", "WTAO", "WSTUSR", "EZETH",
];

function isStructuralNoise(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return STRUCTURAL_NOISE_PATTERNS.includes(upper);
}

// ============================================================
// Classification thresholds (buy/sell ratio)
// ============================================================

function classifyToken(
  buySellRatio: number,
  netflowUsd: number,
  priceChangePct: number,
  netflow7dUsd?: number,
  priceUsd?: number
): ScreenerHighlight["classification"] {
  // 0. Stablecoin guard: near-$1 price + near-zero change → never classify as diverging
  //    Prevents false "accumulation before pump" signals for stablecoins that slipped through
  if (priceUsd !== undefined && priceUsd >= 0.95 && priceUsd <= 1.05) {
    if (Math.abs(priceChangePct) < 0.5) {
      return "mixed";
    }
  }

  // 1. Pumping: price already surged >30%
  if (priceChangePct > 30) return "pumping";

  // 2. Diverging: SM accumulating but price hasn't moved (divergence signal)
  //    Only when we have 7d netflow data showing sustained accumulation
  if (netflow7dUsd !== undefined && netflow7dUsd > 5000 && priceChangePct >= -5 && priceChangePct <= 10) {
    return "diverging";
  }

  // 3. Heavy accumulation: strong buy dominance
  if (buySellRatio >= 3.0) return "heavy_accumulation";

  // 4. Accumulating: moderate buy dominance
  if (buySellRatio >= 1.5) return "accumulating";

  // 5. Mixed: positive netflow but low ratio
  if (netflowUsd > 0) return "mixed";

  // 6. Distributing: net outflow
  return "distributing";
}

// ============================================================
// Scoring: composite of activity and conviction
// ============================================================

function scoreEntry(entry: TokenScreenerEntry): number {
  const totalVolume = entry.buy_volume + entry.sell_volume;
  if (totalVolume === 0) return 0;

  // Buy/sell ratio (capped at 10 to avoid extreme outliers)
  const ratio = entry.buy_volume > 0 && entry.sell_volume > 0
    ? Math.min(entry.buy_volume / entry.sell_volume, 10)
    : entry.buy_volume > 0
      ? 10
      : 0;

  // Price change bonus: volatile tokens are more interesting
  const priceChangePct = Math.abs((entry.price_change ?? 0) * 100);
  const volatilityBonus = 1 + Math.min(priceChangePct / 20, 2); // up to 3x bonus for 40%+ moves

  // Score: conviction × capital × volatility
  return ratio * Math.abs(entry.netflow) * volatilityBonus;
}

// ============================================================
// Public API
// ============================================================

/**
 * Extract top Smart Money active tokens from screener data.
 * Returns up to 30 highlights sorted by a composite score
 * combining buy/sell ratio and netflow magnitude.
 *
 * Optionally cross-references with netflow data to enrich highlights
 * with sector, narrative, and 7d/30d netflow information.
 */
export function extractScreenerHighlights(
  screenerData: Map<string, TokenScreenerEntry>,
  netflowEntries?: NetflowEntry[]
): ScreenerHighlight[] {
  // Build netflow lookup for cross-referencing
  const netflowByAddress = new Map<string, NetflowEntry>();
  const netflowBySymbolChain = new Map<string, NetflowEntry>();
  const netflowBySymbol = new Map<string, NetflowEntry>();

  if (netflowEntries) {
    for (const entry of netflowEntries) {
      const normKey = normalizeAddress(entry.token_address);
      if (!netflowByAddress.has(normKey)) {
        netflowByAddress.set(normKey, entry);
      }
      const symbolKey = `${entry.token_symbol.toLowerCase()}:${entry.chain}`;
      if (!netflowBySymbolChain.has(symbolKey)) {
        netflowBySymbolChain.set(symbolKey, entry);
      }
      // Symbol-only index catches cross-chain matches (e.g., ETH in netflow vs SOL in screener)
      const symbolOnly = entry.token_symbol.toLowerCase();
      if (!netflowBySymbol.has(symbolOnly)) {
        netflowBySymbol.set(symbolOnly, entry);
      }
    }
  }

  // Match rate counters
  let addressMatches = 0;
  let symbolChainMatches = 0;
  let symbolOnlyMatches = 0;

  const candidates: ScreenerHighlight[] = [];

  for (const entry of screenerData.values()) {
    // Skip low-volume noise
    if (entry.volume < MIN_VOLUME_USD) continue;

    const buyVolume = entry.buy_volume ?? 0;
    const sellVolume = entry.sell_volume ?? 0;
    const buySellRatio = sellVolume > 0 ? buyVolume / sellVolume : buyVolume > 0 ? 99 : 0;

    // Only include tokens with meaningful SM activity
    if (Math.abs(entry.netflow) < 100) continue;

    // Skip structural noise — huge volume, zero trading signal
    if (isStructuralNoise(entry.token_symbol)) continue;

    // Price-based stablecoin filter: tokens pegged near $1.00 are stablecoins
    // regardless of symbol (catches unknown/renamed stablecoins)
    if (entry.price_usd >= 0.99 && entry.price_usd <= 1.01) continue;

    // Price change for classification (not filtered — structural noise filter handles stablecoins)
    const priceChangePct = (entry.price_change ?? 0) * 100;

    // Cross-reference with netflow data (3-tier matching):
    //   1. Exact address match (same chain, same token)
    //   2. symbol:chain match (same symbol on same chain — different address format)
    //   3. Symbol-only match (cross-chain, e.g., token on ETH in netflow vs SOL in screener)
    const normAddr = normalizeAddress(entry.token_address);
    const symbolChainKey = `${entry.token_symbol.toLowerCase()}:${entry.chain}`;
    const symbolOnly = entry.token_symbol.toLowerCase();

    const matchByAddress = netflowByAddress.get(normAddr);
    const matchBySymbolChain = netflowBySymbolChain.get(symbolChainKey);
    const matchBySymbol = netflowBySymbol.get(symbolOnly);

    const netflowMatch = matchByAddress ?? matchBySymbolChain ?? matchBySymbol;

    // Track match tier for logging
    if (matchByAddress) addressMatches++;
    else if (matchBySymbolChain) symbolChainMatches++;
    else if (matchBySymbol) symbolOnlyMatches++;

    const highlight: ScreenerHighlight = {
      token_symbol: entry.token_symbol,
      token_address: entry.token_address,
      chain: entry.chain,
      netflowUsd: entry.netflow,
      buyVolume,
      sellVolume,
      buySellRatio: Math.round(buySellRatio * 100) / 100,
      // Nansen token-screener returns price_change as decimal fraction (0.01 = 1%); convert to percentage for consistency with DexScreener
      priceChange: (entry.price_change ?? 0) * 100,
      marketCapUsd: entry.market_cap_usd ?? 0,
      priceUsd: entry.price_usd > 0 ? entry.price_usd : undefined,
      nofBuyers: entry.nof_buyers ?? 0,
      nofSellers: entry.nof_sellers ?? 0,
      volume: entry.volume ?? 0,
      classification: classifyToken(
        buySellRatio,
        entry.netflow,
        priceChangePct,
        netflowMatch?.net_flow_7d_usd,
        entry.price_usd > 0 ? entry.price_usd : undefined
      ),
    };

    // Enrich with netflow data if matched
    if (netflowMatch) {
      highlight.tokenSectors = netflowMatch.token_sectors;
      highlight.narrativeKey = netflowMatch.token_sectors.length > 0
        ? netflowMatch.token_sectors[0]
        : undefined;
      highlight.netflow7dUsd = netflowMatch.net_flow_7d_usd;
      highlight.netflow30dUsd = netflowMatch.net_flow_30d_usd;
      highlight.traderCount = netflowMatch.trader_count;
    }

    candidates.push(highlight);
  }

  // Sort by composite score descending
  const scored = candidates
    .map((c) => {
      const screenerEntry = screenerData.get(c.token_address);
      return { highlight: c, score: screenerEntry ? scoreEntry(screenerEntry) : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGHLIGHTS)
    .map((s) => s.highlight);

  // Log match rate breakdown
  const sectorPopulated = scored.filter(h => h.tokenSectors && h.tokenSectors.length > 0).length;
  console.log(
    `[ScreenerHighlights] Netflow match rates: address=${addressMatches}, symbol:chain=${symbolChainMatches}, symbol-only=${symbolOnlyMatches} | ${sectorPopulated}/${scored.length} highlights with sectors`
  );

  return scored;
}
