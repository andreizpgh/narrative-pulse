// ============================================================
// DexScreener API Wrapper
// Fetches price/volume data for tokens across chains.
// Free, no auth, 300 req/min. Batch up to 30 addresses per request.
// ============================================================

import type { DexScreenerPair } from "../types.js";
import { config } from "../config.js";
import { normalizeAddress } from "../utils/normalize.js";

// ============================================================
// Types
// ============================================================

interface CacheEntry {
  pair: DexScreenerPair;
  expiresAt: number;
}

// ============================================================
// Constants
// ============================================================

const DEXSCREENER_CONFIG = config.external.dexscreener;
const CHAIN_MAP: Record<string, string> = {
  bnb: "bsc",
  // ethereum, solana, base, arbitrum — match exactly
};

// ============================================================
// In-memory cache
// ============================================================

const cache = new Map<string, CacheEntry>();

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[DexScreener] ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map Nansen chain name to DexScreener chain ID.
 * Only `bnb` needs remapping to `bsc`.
 */
function toDexScreenerChain(chain: string): string {
  return CHAIN_MAP[chain] ?? chain;
}

/**
 * From all pairs for a single token, pick the one with highest liquidity.
 * Falls back to highest 24h volume if no pair has liquidity data.
 */
function pickBestPair(pairs: DexScreenerPair[]): DexScreenerPair | null {
  if (pairs.length === 0) return null;
  if (pairs.length === 1) return pairs[0];

  // Try to pick by highest liquidity
  const withLiquidity = pairs.filter(
    (p) => p.liquidity !== null && p.liquidity.usd !== null && p.liquidity.usd > 0
  );

  if (withLiquidity.length > 0) {
    withLiquidity.sort(
      (a, b) => (b.liquidity!.usd ?? 0) - (a.liquidity!.usd ?? 0)
    );
    return withLiquidity[0];
  }

  // Fallback: pick by highest 24h volume
  pairs.sort((a, b) => b.volume.h24 - a.volume.h24);
  return pairs[0];
}

// ============================================================
// Internal fetch with retry + timeout
// ============================================================

async function fetchBatch(
  chainId: string,
  addresses: string[]
): Promise<DexScreenerPair[]> {
  const url = `${DEXSCREENER_CONFIG.baseUrl}/tokens/v1/${chainId}/${addresses.join(",")}`;
  const maxRetries = DEXSCREENER_CONFIG.maxRetries;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        DEXSCREENER_CONFIG.timeoutMs
      );

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} on GET ${url}`);
      }

      const data: unknown = await response.json();

      // /tokens/v1/{chainId}/{addresses} returns a flat JSON array of pairs,
      // NOT an object with a .pairs field. Guard against unexpected shapes.
      if (!Array.isArray(data)) {
        return [] as DexScreenerPair[];
      }

      return data as DexScreenerPair[];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (attempt < maxRetries) {
        log(`Batch fetch failed (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}. Retrying in 1s...`);
        await sleep(1000);
      } else {
        log(`Batch fetch failed after ${maxRetries + 1} attempts: ${msg}`);
        return [];
      }
    }
  }

  return [];
}

// ============================================================
// Cache helpers
// ============================================================

function getCached(key: string): DexScreenerPair | null {
  const entry = cache.get(key);
  if (entry === undefined) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.pair;
}

function setCache(key: string, pair: DexScreenerPair): void {
  cache.set(key, {
    pair,
    expiresAt: Date.now() + DEXSCREENER_CONFIG.cacheTtlMs,
  });
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch DexScreener data for a list of tokens.
 *
 * Groups tokens by chain, batches addresses (up to 30 per request),
 * and returns a Map<normalized_address, best_pair>.
 *
 * Never throws — returns empty data on failure (graceful degradation).
 */
export async function fetchDexScreenerData(
  tokens: Array<{ address: string; chain: string }>
): Promise<Map<string, DexScreenerPair>> {
  const result = new Map<string, DexScreenerPair>();

  if (tokens.length === 0) return result;

  // Deduplicate tokens by normalized address
  const uniqueTokens = new Map<string, { address: string; chain: string }>();
  for (const token of tokens) {
    const key = `${normalizeAddress(token.address)}:${token.chain}`;
    if (!uniqueTokens.has(key)) {
      uniqueTokens.set(key, token);
    }
  }

  // Check cache first and collect uncached tokens
  const uncachedByChain = new Map<string, string[]>(); // chainId → raw addresses
  let cacheHits = 0;

  for (const [, token] of uniqueTokens) {
    const normAddr = normalizeAddress(token.address);
    const dexChain = toDexScreenerChain(token.chain);
    const cached = getCached(`${normAddr}:${dexChain}`);
    if (cached !== null) {
      result.set(normAddr, cached);
      cacheHits++;
    } else {
      const batch = uncachedByChain.get(dexChain);
      if (batch) {
        batch.push(token.address);
      } else {
        uncachedByChain.set(dexChain, [token.address]);
      }
    }
  }

  if (cacheHits > 0) {
    log(`${cacheHits} tokens served from cache`);
  }

  // Fetch uncached tokens, batched by chain
  let totalFetched = 0;
  let totalRequests = 0;

  for (const [chainId, addresses] of uncachedByChain) {
    // Split into batches of 30
    for (let i = 0; i < addresses.length; i += DEXSCREENER_CONFIG.batchSize) {
      const batch = addresses.slice(i, i + DEXSCREENER_CONFIG.batchSize);
      const pairs = await fetchBatch(chainId, batch);
      totalRequests++;

      // Group pairs by base token address, pick best pair per token
      const pairsByToken = new Map<string, DexScreenerPair[]>();
      for (const pair of pairs) {
        const normBaseAddr = normalizeAddress(pair.baseToken.address);
        const existing = pairsByToken.get(normBaseAddr);
        if (existing) {
          existing.push(pair);
        } else {
          pairsByToken.set(normBaseAddr, [pair]);
        }
      }

      for (const [normAddr, tokenPairs] of pairsByToken) {
        const best = pickBestPair(tokenPairs);
        if (best !== null) {
          result.set(normAddr, best);
          setCache(`${normAddr}:${chainId}`, best);
          totalFetched++;
        }
      }
    }
  }

  log(
    `Fetched ${totalFetched} tokens from DexScreener ` +
    `(${totalRequests} requests, ${cacheHits} cache hits, ${result.size} total)`
  );

  return result;
}
