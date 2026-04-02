// ============================================================
// Sub-narrative generation via Agent API
// Builds prompt from token data, calls Agent API, parses response into SubNarrative[]
// ============================================================

import { queryAgent } from "../api/agent.js";
import type { SubNarrative, NetflowEntry, NarrativeKey } from "../types.js";

// ============================================================
// Types (raw Agent response items)
// ============================================================

type ConvictionLevel = "high" | "medium" | "low";

interface RawSubNarrativeItem {
  sub_narrative: string;
  tokens: string[];
  conviction: string;
  total_netflow_usd: number;
}

// ============================================================
// Constants
// ============================================================

const MAX_TOKENS_IN_PROMPT = 20;

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[SubNarratives] ${message}`);
}

function formatUsd(value: number): string {
  const prefix = value >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toLocaleString("en-US")}`;
}

function formatMcap(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

function buildTokenList(tokens: NetflowEntry[]): string {
  const topTokens = tokens.slice(0, MAX_TOKENS_IN_PROMPT);
  return topTokens
    .map((t) =>
      `${t.token_symbol} | chain: ${t.chain} | netflow_24h: ${formatUsd(t.net_flow_24h_usd)} | mcap: ${formatMcap(t.market_cap_usd ?? 0)}`
    )
    .join("\n");
}

function buildPrompt(narrativeKey: NarrativeKey, tokenCount: number, tokenList: string): string {
  return [
    `Analyze these ${tokenCount} crypto tokens from the "${narrativeKey}" narrative.`,
    "They are ranked by Smart Money netflow (24h).",
    "",
    tokenList,
    "",
    `Group them into 3-5 sub-narratives based on their function (e.g., for AI: AI Agents, AI Compute, AI Data, AI Memecoins, AI Infrastructure).`,
    "",
    "For each sub-narrative, rate Smart Money conviction: high, medium, or low.",
    "",
    "Return ONLY valid JSON, no markdown:",
    '[{"sub_narrative": "AI Agents", "tokens": ["FET", "VIRTUAL"], "conviction": "high", "total_netflow_usd": 2300000}]',
  ].join("\n");
}

// ============================================================
// JSON Extraction from Agent Response
// ============================================================

/**
 * Remove control characters that break JSON.parse.
 * Keeps already-escaped sequences (\\n, \\t) intact.
 */
function sanitizeJsonString(str: string): string {
  return str.replace(/[\x00-\x1f]/g, (ch) => {
    if (ch === "\n" || ch === "\r") return " ";
    if (ch === "\t") return " ";
    return "";
  });
}

function extractJson(content: string): string {
  // 1. Try direct JSON parse
  try {
    JSON.parse(content);
    return content;
  } catch {
    // Not direct JSON — try other strategies
  }

  // 2. Extract from ```json ... ``` markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // 3. Find outermost array brackets as last resort
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return content;
}

// ============================================================
// Response Validation & Parsing
// ============================================================

function isValidConviction(value: string): value is ConvictionLevel {
  return value === "high" || value === "medium" || value === "low";
}

function isValidRawItem(item: unknown): item is RawSubNarrativeItem {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.sub_narrative === "string" &&
    Array.isArray(obj.tokens) &&
    obj.tokens.every((t): t is string => typeof t === "string") &&
    typeof obj.conviction === "string" &&
    typeof obj.total_netflow_usd === "number"
  );
}

function parseResponse(content: string): SubNarrative[] | undefined {
  try {
    const jsonStr = extractJson(content);
    const sanitized = sanitizeJsonString(jsonStr);
    const parsed: unknown = JSON.parse(sanitized);

    if (!Array.isArray(parsed)) {
      log("Agent response is not a JSON array — skipping sub-narratives");
      return undefined;
    }

    const result: SubNarrative[] = [];

    for (const item of parsed) {
      if (!isValidRawItem(item)) {
        log("Skipping invalid sub-narrative item — missing or wrong-type fields");
        continue;
      }

      if (!isValidConviction(item.conviction)) {
        log(`Skipping sub-narrative "${item.sub_narrative}" — invalid conviction: "${item.conviction}"`);
        continue;
      }

      result.push({
        name: item.sub_narrative,
        conviction: item.conviction,
        totalNetflowUsd: item.total_netflow_usd,
        tokens: item.tokens,
      });
    }

    if (result.length === 0) {
      log("No valid sub-narratives found in Agent response");
      return undefined;
    }

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Failed to parse Agent response as JSON: ${msg}`);
    return undefined;
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Generates sub-narratives for a given narrative by querying the Agent API.
 * Returns undefined on any error (graceful — pipeline continues without sub-narratives).
 */
export async function generateSubNarratives(
  narrativeKey: NarrativeKey,
  tokens: NetflowEntry[]
): Promise<SubNarrative[] | undefined> {
  if (tokens.length === 0) {
    log(`No tokens for "${narrativeKey}" — skipping sub-narrative generation`);
    return undefined;
  }

  try {
    const tokenList = buildTokenList(tokens);
    const prompt = buildPrompt(narrativeKey, Math.min(tokens.length, MAX_TOKENS_IN_PROMPT), tokenList);

    log(`Querying Agent API for "${narrativeKey}" sub-narratives (${Math.min(tokens.length, MAX_TOKENS_IN_PROMPT)} tokens in prompt)...`);

    const response = await queryAgent(prompt);

    return parseResponse(response.content);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Agent API failed for "${narrativeKey}": ${msg}`);
    return undefined;
  }
}
