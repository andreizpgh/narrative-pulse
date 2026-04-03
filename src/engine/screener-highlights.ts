// ============================================================
// Screener Highlights — Top Smart Money Active Tokens
// Extracts the most active tokens from token-screener data.
// Always produces rich output (~500 screener entries → top 30 highlights).
// ============================================================

import type { TokenScreenerEntry, ScreenerHighlight } from "../types.js";

// ============================================================
// Constants
// ============================================================

const MAX_HIGHLIGHTS = 30;
const MIN_VOLUME_USD = 10_000; // $10K minimum volume to filter noise

// ============================================================
// Stablecoin / wrapped-token filter
// Huge volume, zero trading signal — must exclude from highlights
// ============================================================

const STABLECOIN_PATTERNS = [
  "USDT", "USDC", "DAI", "TUSD", "BUSD", "FRAX", "LUSD", "USDD",
  "GUSD", "USDP", "SUSD", "PYUSD", "FDUSD", "EURA", "USDV",
  "WETH", "WBTC", "WBNB", "WSTETH", "WAVAX", "WMATIC",
  "CBETH", "RETH", "WEETH", "SDETH",
  // Nansen-specific wrapped names
  "SUSDS", "SYRUPUSDC", "RLUSD", "MWETH",
];

function isStablecoin(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return STABLECOIN_PATTERNS.includes(upper);
}

// ============================================================
// Classification thresholds (buy/sell ratio)
// ============================================================

function classifyToken(buySellRatio: number, netflowUsd: number): ScreenerHighlight["classification"] {
  if (buySellRatio >= 3.0) return "heavy_accumulation";
  if (buySellRatio >= 1.5) return "accumulating";
  // Positive netflow but low ratio — mixed signal (SM net inflow but sellers > buyers by volume)
  if (netflowUsd > 0) return "mixed";
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
 */
export function extractScreenerHighlights(
  screenerData: Map<string, TokenScreenerEntry>
): ScreenerHighlight[] {
  const candidates: ScreenerHighlight[] = [];

  for (const entry of screenerData.values()) {
    // Skip low-volume noise
    if (entry.volume < MIN_VOLUME_USD) continue;

    // Skip entries with no trader activity
    if (entry.nof_buyers === 0 && entry.nof_sellers === 0) continue;

    const buyVolume = entry.buy_volume ?? 0;
    const sellVolume = entry.sell_volume ?? 0;
    const buySellRatio = sellVolume > 0 ? buyVolume / sellVolume : buyVolume > 0 ? 99 : 0;

    // Only include tokens with meaningful SM activity
    if (Math.abs(entry.netflow) < 100) continue;

    // Skip stablecoins and wrappers — huge volume, zero trading signal
    if (isStablecoin(entry.token_symbol)) continue;

    // Skip near-zero price movement (likely stablecoins not caught by name)
    const priceChangePct = (entry.price_change ?? 0) * 100;
    if (Math.abs(priceChangePct) < 0.5) continue;

    candidates.push({
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
      nofBuyers: entry.nof_buyers ?? 0,
      nofSellers: entry.nof_sellers ?? 0,
      volume: entry.volume ?? 0,
      classification: classifyToken(buySellRatio, entry.netflow),
    });
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

  return scored;
}
