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
// Classification thresholds (buy/sell ratio)
// ============================================================

function classifyToken(buySellRatio: number): ScreenerHighlight["classification"] {
  if (buySellRatio >= 3.0) return "heavy_accumulation";
  if (buySellRatio >= 1.5) return "accumulating";
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

  // Score: ratio × |netflow| normalized by volume for relevance
  // Higher = more conviction + more capital
  return ratio * Math.abs(entry.netflow);
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

    candidates.push({
      token_symbol: entry.token_symbol,
      token_address: entry.token_address,
      chain: entry.chain,
      netflowUsd: entry.netflow,
      buyVolume,
      sellVolume,
      buySellRatio: Math.round(buySellRatio * 100) / 100,
      priceChange: entry.price_change ?? 0,
      marketCapUsd: entry.market_cap_usd ?? 0,
      nofBuyers: entry.nof_buyers ?? 0,
      nofSellers: entry.nof_sellers ?? 0,
      volume: entry.volume ?? 0,
      classification: classifyToken(buySellRatio),
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
