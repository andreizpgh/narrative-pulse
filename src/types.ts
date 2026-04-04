// ============================================================
// API Response Types (Nansen API raw data)
// ============================================================

export interface NetflowEntry {
  token_address: string;
  token_symbol: string;
  net_flow_1h_usd: number;
  net_flow_24h_usd: number;
  net_flow_7d_usd: number;
  net_flow_30d_usd: number;
  chain: string;
  token_sectors: string[];
  trader_count: number;
  token_age_days: number;
  market_cap_usd?: number;
}

export interface TokenScreenerEntry {
  chain: string;
  token_address: string;
  token_symbol: string;
  price_usd: number;
  price_change: number | null; // CAN BE NULL (confirmed from API)
  market_cap_usd: number | null; // CAN BE NULL
  volume: number;
  buy_volume: number;
  sell_volume: number;
  netflow: number;
  nof_traders: number;
  // These fields do NOT exist in the API response — keeping for backward compat but they will be 0/undefined
  nof_buyers?: number;
  nof_sellers?: number;
  liquidity: number | null; // CAN BE NULL
  fdv?: number;
  fdv_mc_ratio?: number;
  inflow_fdv_ratio?: number;
  outflow_fdv_ratio?: number;
  token_age_days?: number;
}

export interface HoldingsEntry {
  chain: string;
  token_address: string;
  token_symbol: string;
  token_sectors: string[];
  value_usd: number;
  balance_24h_percent_change: number;
  holders_count: number;
  share_of_holdings_percent: number;
  token_age_days: number;
  market_cap_usd: number;
}

// ============================================================
// Domain Types (internal structures)
// ============================================================

export type NarrativeKey = string; // "AI" | "DeFi" | "AI+Infrastructure" | etc.

export interface NarrativeSummary {
  key: NarrativeKey; // "AI" or "AI+Infrastructure"
  displayName: string; // "AI" or "AI Infrastructure"
  totalNetflow24h: number; // Total SM netflow for 24h
  totalNetflow7d: number; // Total SM netflow for 7d
  tokenCount: number; // Number of tokens
  traderCount: number; // Unique SM traders
  topTokens: ClassifiedToken[]; // Top tokens with classification
  isHot: boolean; // Is the narrative hot overall?
}

export type TokenCategory = "hot" | "watch" | "avoid" | "pumping";

export interface ClassifiedToken {
  token_symbol: string;
  token_address: string;
  chain: string;
  category: TokenCategory;
  netflow24hUsd: number;
  netflow7dUsd?: number;
  priceChange: number;
  buyVolume: number;
  sellVolume: number;
  traderCount: number;
  marketCapUsd: number;
  priceUsd?: number;
  // Enriched fields from DexScreener
  volume24h: number;
  liquidity: number;
  priceChange1h: number;
  isEarlySignal: boolean;
}

export interface SubNarrative {
  name: string; // "AI Agents"
  conviction: "high" | "medium" | "low";
  totalNetflowUsd: number;
  tokens: string[]; // token symbols
}

export interface ScanResult {
  timestamp: string; // ISO timestamp
  sectors: string[]; // All discovered sectors
  narratives: NarrativeSummary[]; // All narratives
  rotations: NarrativeRotation[]; // Flows between narratives
  subNarratives?: SubNarrative[]; // Sub-narratives of top narrative (if any)
  topNarrativeKey?: NarrativeKey; // Key of the top narrative
  earlySignals: EarlySignalToken[];
  screenerHighlights: ScreenerHighlight[];
  enrichedTokens: EnrichedTokenData[];
  holdingsCount: number; // number of unique tokens in SM holdings
  flowIntelligenceCount: number; // number of tokens with flow intelligence data
  apiCallsUsed: number;
  creditsUsed: number;
}

export interface NarrativeRotation {
  from: NarrativeKey;
  to: NarrativeKey;
  valueUsd: number; // Flow volume
  direction: "inflow" | "outflow";
}

// ============================================================
// Screener Highlight — Top Smart Money Active Tokens
// ============================================================

export interface FlowIntelligence {
  token_address: string;
  smart_trader_net_flow_usd: number;
  smart_trader_avg_flow_usd: number;
  smart_trader_wallet_count: number;
  public_figure_net_flow_usd: number;
  public_figure_avg_flow_usd: number;
  public_figure_wallet_count: number;
  whale_net_flow_usd: number;
  whale_avg_flow_usd: number;
  whale_wallet_count: number;
  top_pnl_net_flow_usd: number;
  top_pnl_avg_flow_usd: number;
  top_pnl_wallet_count: number;
  exchange_net_flow_usd: number;
  exchange_avg_flow_usd: number;
  exchange_wallet_count: number;
  fresh_wallets_net_flow_usd: number;
  fresh_wallets_avg_flow_usd: number;
  fresh_wallets_wallet_count: number;
}

export interface ScreenerHighlight {
  token_symbol: string;
  token_address: string;
  chain: string;
  netflowUsd: number;
  buyVolume: number;
  sellVolume: number;
  buySellRatio: number;
  priceChange: number;
  marketCapUsd: number;
  priceUsd?: number;
  nofBuyers: number;
  nofSellers: number;
  volume: number;
  classification: "heavy_accumulation" | "accumulating" | "mixed" | "distributing" | "pumping" | "diverging";
  // From netflow cross-reference (optional — may not match)
  tokenSectors?: string[];       // Full sector list from netflow (e.g. ["AI Agents", "Artificial Intelligence", "DeSci"])
  narrativeKey?: string;         // Primary sector for grouping
  netflow7dUsd?: number;         // 7-day netflow from netflow endpoint
  netflow30dUsd?: number;        // 30-day netflow from netflow endpoint
  traderCount?: number;          // SM trader count from netflow
  // Flow Intelligence (optional — top-5 tokens only)
  flowIntelligence?: FlowIntelligence;
}

// ============================================================
// Config Types
// ============================================================

export interface ExternalApiConfig {
  dexscreener: {
    baseUrl: string;
    cacheTtlMs: number;
    timeoutMs: number;
    maxRetries: number;
    batchSize: number;
  };
}

export interface Config {
  chains: string[];
  minMarketCapUsd: number;
  minTraderCount: number;
  netflowThresholds: {
    hot: { minNetflowUsd: number; minPriceChange: number };
    watch: { minNetflowUsd: number };
    avoid: { maxNetflowUsd: number };
  };
  apiPageSize: number;
  cronSchedule: string;
  external: ExternalApiConfig;
  earlySignal: {
    minNetflowUsd: number;
    maxPriceChangePercent: number;
    minBuySellRatio: number;
    minVolumeUsd: number;
  };
  flowIntelligence: {
    topN: number; // How many top tokens to get flow intelligence for
  };
}

// ============================================================
// DexScreener API Response Types
// ============================================================

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string | null;
    name: string | null;
    symbol: string | null;
  };
  priceNative: string;
  priceUsd: string | null;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  } | null;
  liquidity: {
    usd: number | null;
    base: number;
    quote: number;
  } | null;
  fdv: number | null;
  marketCap: number | null;
  pairCreatedAt: number | null;
}

// ============================================================
// Enriched Token Data (merged Nansen + DexScreener)
// ============================================================

export interface EnrichedTokenData {
  token_address: string;
  token_symbol: string;
  chain: string;
  // DexScreener enrichment
  priceUsd: number;
  priceChange24h: number;
  priceChange1h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  buys24h: number;
  sells24h: number;
  // Nansen data
  netflow24hUsd: number;
  netflow7dUsd: number;
  traderCount: number;
  tokenSectors: string[];
  tokenAgeDays: number;
}

// ============================================================
// Early Signal Token
// ============================================================

export interface EarlySignalToken {
  token_symbol: string;
  token_address: string;
  chain: string;
  netflow24hUsd: number;
  priceChange24h: number;
  volume24h: number;
  buyPressure: number; // buys/sells ratio
  liquidity: number;
  marketCap: number;
  narrativeKey: string;
  narrativeDisplayName: string;
}
