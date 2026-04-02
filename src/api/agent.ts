// ============================================================
// Agent API wrapper for /agent/fast endpoint (non-streaming)
// Separate from nansenPost — different response format (no data wrapper, no pagination)
// ============================================================

import { getApiKey } from "./client.js";

// ============================================================
// Types
// ============================================================

export interface AgentResponse {
  content: string;
  creditsUsed: number;
  creditsRemaining: number;
}

// ============================================================
// Constants
// ============================================================

const BASE_URL = "https://api.nansen.ai/api/v1";
const AGENT_ENDPOINT = "/agent/fast";
const TIMEOUT_MS = 60_000;
const MIN_REQUEST_INTERVAL_MS = 50;

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
// Agent API Query
// ============================================================

export async function queryAgent(prompt: string): Promise<AgentResponse> {
  const apiKey = await getApiKey();

  // Pre-request rate limit enforcement
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestTime = Date.now();

  const url = `${BASE_URL}${AGENT_ENDPOINT}`;

  const body = {
    text: prompt,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const status = response.status;

    // Handle non-2xx responses
    if (status < 200 || status >= 300) {
      const responseBody = await response.text();
      throw new Error(`Agent API error: ${status} — ${responseBody}`);
    }

    // Parse response body — Agent API returns JSON directly (no { data } wrapper)
    const raw = (await response.json()) as Record<string, unknown>;

    const content = typeof raw.content === "string"
      ? raw.content
      : JSON.stringify(raw);

    // Extract credits: headers first, then body fallback
    const creditsUsedHeader = response.headers.get("X-Nansen-Credits-Used");
    const creditsRemainingHeader = response.headers.get("X-Nansen-Credits-Remaining");

    const creditsUsed = creditsUsedHeader !== null
      ? parseInt(creditsUsedHeader, 10) || 0
      : (typeof raw.credits_used === "number" ? raw.credits_used : 0);

    const creditsRemaining = creditsRemainingHeader !== null
      ? parseInt(creditsRemainingHeader, 10) || 0
      : (typeof raw.credits_remaining === "number" ? raw.credits_remaining : 0);

    log(`Agent API query → ${creditsUsed} credits used (${creditsRemaining} remaining)`);

    return { content, creditsUsed, creditsRemaining };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Agent API timeout after ${TIMEOUT_MS / 1000}s`);
    }
    throw error;
  }
}
