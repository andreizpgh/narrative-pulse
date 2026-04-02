import type { Config } from "./types.js";

export const config: Config = {
  chains: ["ethereum", "solana", "base", "bnb", "arbitrum"],
  minMarketCapUsd: 100_000,
  minTraderCount: 3,
  netflowThresholds: {
    hot: { minNetflowUsd: 1_000, minPriceChange: 0.1 },
    watch: { minNetflowUsd: 500 },
    avoid: { maxNetflowUsd: -500 },
  },
  apiPageSize: 50,
  cronSchedule: "0 */4 * * *", // Every 4 hours
};
