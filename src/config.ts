import type { Config } from "./types.js";

export const config: Config = {
  chains: ["ethereum", "solana", "base", "bnb", "arbitrum"],
  minMarketCapUsd: 100_000,
  minTraderCount: 3,
  netflowThresholds: {
    hot: { minNetflowUsd: 10_000, minPriceChange: 0.5 },
    watch: { minNetflowUsd: 10_000 },
    avoid: { maxNetflowUsd: -10_000 },
  },
  apiPageSize: 50,
  cronSchedule: "0 */4 * * *", // Every 4 hours
};
