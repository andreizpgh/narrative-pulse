import type { Config } from "./types.js";

export const config: Config = {
  chains: ["ethereum", "solana", "base", "bnb", "arbitrum"],
  minMarketCapUsd: 50_000,      // $50K — filter out true microcap garbage
  minTraderCount: 3,            // 1 trader is noise, need 3+ for signal
  netflowThresholds: {
    hot: { minNetflowUsd: 5_000, minPriceChange: 0.1 },   // $5K+ AND price up
    watch: { minNetflowUsd: 1_000 },                        // $1K+ SM accumulation
    avoid: { maxNetflowUsd: -1_000 },                       // $1K+ SM distribution
  },
  apiPageSize: 50,
  cronSchedule: "0 */4 * * *", // Every 4 hours
  external: {
    dexscreener: {
      baseUrl: "https://api.dexscreener.com",
      cacheTtlMs: 5 * 60 * 1000,    // 5 minutes
      timeoutMs: 3_000,               // 3 seconds
      maxRetries: 1,
      batchSize: 30,
    },
  },
  earlySignal: {
    minNetflowUsd: 1_000,
    maxPriceChangePercent: 5,
    minBuySellRatio: 1.5,
    minVolumeUsd: 50_000,
  },
};
