import type { Config } from "./types.js";

export const config: Config = {
  chains: ["ethereum", "solana", "base", "bnb", "arbitrum"],
  minMarketCapUsd: 10_000,      // $10K — lower threshold for richer data capture
  minTraderCount: 1,            // capture all SM activity, even single-trader signals
  netflowThresholds: {
    hot: { minNetflowUsd: 2_000, minPriceChange: 0.1 },   // $2K+ AND price up
    watch: { minNetflowUsd: 500 },                          // $500+ SM accumulation
    avoid: { maxNetflowUsd: -500 },                         // $500+ SM distribution
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
  flowIntelligence: {
    topN: 5,
  },
};
