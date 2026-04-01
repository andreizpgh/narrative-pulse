// ============================================================
// Nansen API HTTP Client
// Native fetch, rate limiting, retry, auth, logging
// ============================================================

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// ============================================================
// Types
// ============================================================

export interface NansenResponse<T> {
  data: T;
  pagination?: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
  creditsUsed: number;
  creditsRemaining: number;
}

interface NansenApiRawResponse<T> {
  data: T;
  pagination?: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
  credits_used?: number;
  credits_remaining?: number;
}

interface NansenConfigFile {
  apiKey: string;
}

// ============================================================
// Constants
// ============================================================

const BASE_URL = "https://api.nansen.ai/api/v1";
const MIN_REQUEST_INTERVAL_MS = 50; // ~20 req/sec max
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

// ============================================================
// Rate Limiter State
// ============================================================

let lastRequestTime = 0;

// ============================================================
// Helpers
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string): void {
  console.log(`[Nansen] ${message}`);
}

// ============================================================
// API Key Resolution
// ============================================================

let cachedApiKey: string | null = null;

export async function getApiKey(): Promise<string> {
  // Return cached key if available
  if (cachedApiKey) {
    return cachedApiKey;
  }

  // 1. Check environment variable
  const envKey = process.env.NANSEN_API_KEY;
  if (envKey && envKey.length > 0) {
    cachedApiKey = envKey;
    return cachedApiKey;
  }

  // 2. Read ~/.nansen/config.json
  try {
    const configPath = join(homedir(), ".nansen", "config.json");
    const raw = await readFile(configPath, "utf-8");
    const parsed: NansenConfigFile = JSON.parse(raw) as NansenConfigFile;
    if (parsed.apiKey && parsed.apiKey.length > 0) {
      cachedApiKey = parsed.apiKey;
      return cachedApiKey;
    }
  } catch {
    // File doesn't exist or is malformed — fall through to error
  }

  // 3. Throw descriptive error
  throw new Error(
    "Nansen API key not found. Run 'nansen login' or set NANSEN_API_KEY env variable."
  );
}

// ============================================================
// Rate Limiter
// ============================================================

async function enforceRateLimit(response?: Response): Promise<void> {
  // Pre-request: ensure minimum interval between requests
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }

  // Post-request: check rate limit headers
  if (response) {
    const remainingHeader = response.headers.get("X-RateLimit-Remaining-Second");
    if (remainingHeader !== null) {
      const remaining = parseInt(remainingHeader, 10);
      if (!isNaN(remaining) && remaining <= 1) {
        log("Rate limit nearly exhausted, waiting 1s...");
        await sleep(1000);
      }
    }
  }
}

// ============================================================
// Retry with Exponential Backoff
// ============================================================

function calculateBackoff(attempt: number, retryAfterHeader: string | null): number {
  // If server provides Retry-After header, respect it
  if (retryAfterHeader !== null) {
    const retryAfterSeconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(retryAfterSeconds)) {
      return retryAfterSeconds * 1000;
    }
  }

  // Otherwise: exponential backoff
  return INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
}

// ============================================================
// Main API Call Function
// ============================================================

export async function nansenPost<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<NansenResponse<T>> {
  const apiKey = await getApiKey();
  const url = `${BASE_URL}${endpoint}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Pre-request rate limit enforcement
      await enforceRateLimit();
      lastRequestTime = Date.now();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify(body),
      });

      // Post-request rate limit check
      await enforceRateLimit(response);

      const status = response.status;

      // Handle 429 Too Many Requests
      if (status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const backoffMs = calculateBackoff(attempt, retryAfter);
        log(`POST ${endpoint} → 429 (rate limited). Retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`);
        lastError = new Error(`Rate limited: 429 on ${endpoint}`);
        await sleep(backoffMs);
        continue;
      }

      // Handle 5xx server errors
      if (status >= 500) {
        const backoffMs = calculateBackoff(attempt, null);
        log(`POST ${endpoint} → ${status} (server error). Retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`);
        lastError = new Error(`Server error: ${status} on ${endpoint}`);
        await sleep(backoffMs);
        continue;
      }

      // Handle non-200 success codes (2xx)
      if (status < 200 || status >= 300) {
        const responseBody = await response.text();
        throw new Error(
          `API error: ${status} on POST ${endpoint} — ${responseBody}`
        );
      }

      // Parse successful response
      const raw: NansenApiRawResponse<T> = (await response.json()) as NansenApiRawResponse<T>;

      // Extract credit info: headers are primary source, body is fallback
      const creditsUsedHeader = response.headers.get("X-Nansen-Credits-Used");
      const creditsRemainingHeader = response.headers.get("X-Nansen-Credits-Remaining");

      const creditsUsed = creditsUsedHeader !== null
        ? parseInt(creditsUsedHeader, 10) || 0
        : (raw.credits_used ?? 0);
      const creditsRemaining = creditsRemainingHeader !== null
        ? parseInt(creditsRemainingHeader, 10) || 0
        : (raw.credits_remaining ?? 0);
      const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining-Second") ?? "n/a";

      // Warn if credits exhausted — don't throw, data was returned successfully
      if (creditsRemaining === 0) {
        log("⚠️ Credits exhausted! No remaining credits. Please top up at https://nansen.ai");
      }

      // Log successful request
      log(
        `POST ${endpoint} → ${status} ` +
        `(credits: ${creditsUsed} used, ${creditsRemaining} remaining | ` +
        `rate: ${rateLimitRemaining}/sec remaining)`
      );

      return {
        data: raw.data,
        pagination: raw.pagination,
        creditsUsed,
        creditsRemaining,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // Don't retry on non-retriable errors (auth errors, etc.)
      if (
        err.message.includes("API error: 401") ||
        err.message.includes("API error: 403")
      ) {
        throw err;
      }

      if (attempt < MAX_RETRIES - 1) {
        const backoffMs = calculateBackoff(attempt, null);
        log(`POST ${endpoint} failed: ${err.message}. Retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`);
        await sleep(backoffMs);
      }
    }
  }

  // All retries exhausted
  throw lastError ?? new Error(`All ${MAX_RETRIES} retries exhausted for POST ${endpoint}`);
}
