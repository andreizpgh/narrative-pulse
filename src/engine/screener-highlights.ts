// ============================================================
// Screener Highlights — Top Smart Money Active Tokens
// SECTOR-FIRST approach: starts from netflow + holdings (which
// have sectors), then enriches with screener buy/sell data.
// Guarantees every highlight has a real Nansen sector.
// ============================================================

import type { TokenScreenerEntry, ScreenerHighlight, NetflowEntry, HoldingsEntry } from "../types.js";
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
  priceUsd?: number,
  netflow30dUsd?: number,
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
  //    Requires: 7d netflow positive, 24h price flat, AND 30d netflow not extremely positive
  //    (if 30d netflow is very high, the price likely already moved — not a divergence)
  if (
    netflow7dUsd !== undefined && netflow7dUsd > 5000 &&
    priceChangePct >= -5 && priceChangePct <= 10 &&
    (netflow30dUsd === undefined || netflow30dUsd < 100_000)
  ) {
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
// Public API — Sector-First Highlights
// ============================================================

/**
 * Extract top Smart Money active tokens using a SECTOR-FIRST approach.
 *
 * Sources:
 *   1. Netflow entries WITH sectors (primary — every entry has token_sectors)
 *   2. Holdings entries WITH sectors (secondary — adds unique narratives)
 *
 * Both sources are cross-referenced with screener data for buy/sell ratio.
 * Every returned highlight is guaranteed to have a real Nansen sector.
 */
export function extractNarrativeHighlights(
  netflowEntries: NetflowEntry[],
  holdingsEntries: Map<string, HoldingsEntry>,
  screenerData: Map<string, TokenScreenerEntry>,
): ScreenerHighlight[] {
  // Build screener lookup maps (3-tier matching)
  const screenerByAddress = new Map<string, TokenScreenerEntry>();
  const screenerBySymbolChain = new Map<string, TokenScreenerEntry>();
  const screenerBySymbol = new Map<string, TokenScreenerEntry>();

  for (const entry of screenerData.values()) {
    const normKey = normalizeAddress(entry.token_address);
    if (!screenerByAddress.has(normKey)) {
      screenerByAddress.set(normKey, entry);
    }
    const symbolChainKey = `${entry.token_symbol.toLowerCase()}:${entry.chain}`;
    if (!screenerBySymbolChain.has(symbolChainKey)) {
      screenerBySymbolChain.set(symbolChainKey, entry);
    }
    const symbolOnly = entry.token_symbol.toLowerCase();
    if (!screenerBySymbol.has(symbolOnly)) {
      screenerBySymbol.set(symbolOnly, entry);
    }
  }

  // Track which token addresses we've already added (dedup between netflow + holdings)
  const seenAddresses = new Set<string>();
  const candidates: ScreenerHighlight[] = [];

  // --- SOURCE 1: Netflow entries WITH sectors (primary — 64/100) ---
  let netflowWithSectors = 0;
  let netflowScreenerMatches = 0;

  for (const entry of netflowEntries) {
    // Only entries WITH token_sectors
    if (!entry.token_sectors || entry.token_sectors.length === 0) continue;
    netflowWithSectors++;

    const normAddr = normalizeAddress(entry.token_address);

    // Skip structural noise
    if (isStructuralNoise(entry.token_symbol)) continue;

    // Cross-reference with screener for buy/sell ratio
    const symbolChainKey = `${entry.token_symbol.toLowerCase()}:${entry.chain}`;
    const screenerMatch = screenerByAddress.get(normAddr)
      ?? screenerBySymbolChain.get(symbolChainKey)
      ?? screenerBySymbol.get(entry.token_symbol.toLowerCase());

    const buyVolume = screenerMatch?.buy_volume ?? 0;
    const sellVolume = screenerMatch?.sell_volume ?? 0;
    const buySellRatio = sellVolume > 0 ? buyVolume / sellVolume : buyVolume > 0 ? 99 : 0;
    const priceChangePct = (screenerMatch?.price_change ?? 0) * 100;
    const volume = screenerMatch?.volume ?? 0;
    const marketCapUsd = screenerMatch?.market_cap_usd ?? entry.market_cap_usd ?? 0;
    const priceUsd = (screenerMatch && screenerMatch.price_usd > 0) ? screenerMatch.price_usd : undefined;

    if (screenerMatch) netflowScreenerMatches++;

    const highlight: ScreenerHighlight = {
      token_symbol: entry.token_symbol,
      token_address: entry.token_address,
      chain: entry.chain,
      netflowUsd: entry.net_flow_24h_usd,
      buyVolume,
      sellVolume,
      buySellRatio: Math.round(buySellRatio * 100) / 100,
      priceChange: priceChangePct,
      marketCapUsd,
      priceUsd,
      nofBuyers: screenerMatch?.nof_buyers ?? 0,
      nofSellers: screenerMatch?.nof_sellers ?? 0,
      volume,
      classification: classifyToken(
        buySellRatio,
        entry.net_flow_24h_usd,
        priceChangePct,
        entry.net_flow_7d_usd,
        priceUsd,
        entry.net_flow_30d_usd,
      ),
      // ALWAYS has sectors — this is the whole point
      tokenSectors: entry.token_sectors,
      narrativeKey: entry.token_sectors[0],
      netflow7dUsd: entry.net_flow_7d_usd,
      netflow30dUsd: entry.net_flow_30d_usd,
      traderCount: entry.trader_count,
    };

    seenAddresses.add(normAddr);
    candidates.push(highlight);
  }

  // --- SOURCE 2: Holdings entries WITH sectors (secondary — adds unique narratives) ---
  let holdingsWithSectors = 0;
  let holdingsAdded = 0;

  for (const [, entry] of holdingsEntries) {
    if (!entry.token_sectors || entry.token_sectors.length === 0) continue;
    holdingsWithSectors++;

    const normAddr = normalizeAddress(entry.token_address);

    // Dedup: skip if already in from netflow
    if (seenAddresses.has(normAddr)) continue;

    // Skip structural noise
    if (isStructuralNoise(entry.token_symbol)) continue;

    // Cross-reference with screener
    const symbolChainKey = `${entry.token_symbol.toLowerCase()}:${entry.chain}`;
    const screenerMatch = screenerByAddress.get(normAddr)
      ?? screenerBySymbolChain.get(symbolChainKey)
      ?? screenerBySymbol.get(entry.token_symbol.toLowerCase());

    const buyVolume = screenerMatch?.buy_volume ?? 0;
    const sellVolume = screenerMatch?.sell_volume ?? 0;
    const buySellRatio = sellVolume > 0 ? buyVolume / sellVolume : buyVolume > 0 ? 99 : 0;
    const priceChangePct = (screenerMatch?.price_change ?? 0) * 100;
    const volume = screenerMatch?.volume ?? 0;
    const marketCapUsd = entry.market_cap_usd ?? screenerMatch?.market_cap_usd ?? 0;
    const priceUsd = (screenerMatch && screenerMatch.price_usd > 0) ? screenerMatch.price_usd : undefined;

    const highlight: ScreenerHighlight = {
      token_symbol: entry.token_symbol,
      token_address: entry.token_address,
      chain: entry.chain,
      // Holdings don't have netflow data — use 0 as netflow
      netflowUsd: 0,
      buyVolume,
      sellVolume,
      buySellRatio: Math.round(buySellRatio * 100) / 100,
      priceChange: priceChangePct,
      marketCapUsd,
      priceUsd,
      nofBuyers: screenerMatch?.nof_buyers ?? 0,
      nofSellers: screenerMatch?.nof_sellers ?? 0,
      volume,
      classification: classifyToken(
        buySellRatio,
        0, // no netflow from holdings
        priceChangePct,
        undefined,
        priceUsd,
        undefined,
      ),
      tokenSectors: entry.token_sectors,
      narrativeKey: entry.token_sectors[0],
    };

    seenAddresses.add(normAddr);
    candidates.push(highlight);
    holdingsAdded++;
  }

  // --- SCORE AND SORT ---
  // Score: |netflow| × buy/sell ratio × volatility bonus
  // Holdings tokens without netflow get scored by buy/sell ratio × volume only
  const scored = candidates
    .map((c) => {
      const ratio = Math.min(c.buySellRatio, 10);
      const volatilityBonus = 1 + Math.min(Math.abs(c.priceChange) / 20, 2);
      const netflowScore = Math.abs(c.netflowUsd);
      const volumeScore = c.volume > 0 ? Math.min(c.volume / 100_000, 5) : 0;
      // Tokens with netflow get higher score (they're in netflow for a reason)
      const score = c.netflowUsd !== 0
        ? ratio * netflowScore * volatilityBonus
        : ratio * volumeScore * volatilityBonus;
      return { highlight: c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGHLIGHTS)
    .map((s) => s.highlight);

  // Log
  const sectorPopulated = scored.filter(h => h.tokenSectors && h.tokenSectors.length > 0).length;
  console.log(
    `[NarrativeHighlights] Sources: ${netflowWithSectors} netflow with sectors (${netflowScreenerMatches} screener-matched), ` +
    `${holdingsWithSectors} holdings with sectors (${holdingsAdded} added) | ` +
    `${sectorPopulated}/${scored.length} highlights with sectors`
  );

  return scored;
}

// ============================================================
// Deprecated — backward compatibility wrapper
// ============================================================

/** @deprecated Use extractNarrativeHighlights instead */
export function extractScreenerHighlights(
  _screenerData: Map<string, TokenScreenerEntry>,
  _netflowEntries?: NetflowEntry[]
): ScreenerHighlight[] {
  // Legacy wrapper — no longer used by the pipeline
  return [];
}
