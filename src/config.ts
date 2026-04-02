import type { Config } from "./types.js";

export const config: Config = {
  chains: ["ethereum", "solana", "base", "bnb", "arbitrum"],
  minMarketCapUsd: 10_000,
  minTraderCount: 1,
  netflowThresholds: {
    hot: { minNetflowUsd: 500, minPriceChange: 0.1 },
    watch: { minNetflowUsd: 100 },
    avoid: { maxNetflowUsd: -100 },
  },
  apiPageSize: 50,
  cronSchedule: "0 */4 * * *", // Every 4 hours
};
