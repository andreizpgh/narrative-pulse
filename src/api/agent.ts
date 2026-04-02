// ============================================================
// Agent API wrapper for /agent/fast endpoint
// Separate from nansenPost — different response format (no data wrapper, no pagination)
// Handles SSE streaming responses: "data: {json}\n" events are concatenated into a single content string
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

    // Read as text — Agent API may return SSE format or plain JSON
    const responseText = await response.text();

    // Extract credits from headers first (primary source)
    const creditsUsedHeader = response.headers.get("X-Nansen-Credits-Used");
    const creditsRemainingHeader = response.headers.get("X-Nansen-Credits-Remaining");

    let creditsUsed = creditsUsedHeader !== null
      ? parseInt(creditsUsedHeader, 10) || 0
      : 0;
    let creditsRemaining = creditsRemainingHeader !== null
      ? parseInt(creditsRemainingHeader, 10) || 0
      : 0;

    // ---- Parse SSE events ----
    // SSE format: "data: {json}\n\n" per event
    // Event types: {"ty":"delta","content":"..."} or {"ty":"finish","content":""}
    let content = "";
    let sseFound = false;

    const lines = responseText.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6); // Remove "data: " prefix
        if (jsonStr.trim() === "") continue;

        sseFound = true;
        try {
          const event = JSON.parse(jsonStr) as Record<string, unknown>;
          if (typeof event.content === "string") {
            content += event.content;
          }
          // Fallback: extract credits from body if not in headers
          if (typeof event.credits_used === "number" && creditsUsed === 0) {
            creditsUsed = event.credits_used;
          }
          if (typeof event.credits_remaining === "number" && creditsRemaining === 0) {
            creditsRemaining = event.credits_remaining;
          }
        } catch {
          // Malformed SSE line — treat the whole response as raw text
          content = responseText;
          break;
        }
      }
    }

    // ---- Fallback: try plain JSON if no SSE events found ----
    if (!sseFound || !content) {
      try {
        const raw = JSON.parse(responseText) as Record<string, unknown>;
        content = typeof raw.content === "string"
          ? raw.content
          : JSON.stringify(raw);
        // Extract credits from body if not in headers
        if (typeof raw.credits_used === "number" && creditsUsed === 0) {
          creditsUsed = raw.credits_used;
        }
        if (typeof raw.credits_remaining === "number" && creditsRemaining === 0) {
          creditsRemaining = raw.credits_remaining;
        }
      } catch {
        // Not JSON either — use raw text as content
        content = responseText;
      }
    }

    log(`Agent API query → ${content.length} chars, ${creditsUsed} credits used (${creditsRemaining} remaining)`);

    return { content, creditsUsed, creditsRemaining };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Agent API timeout after ${TIMEOUT_MS / 1000}s`);
    }
    throw error;
  }
}
