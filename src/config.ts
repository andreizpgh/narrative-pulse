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
};
