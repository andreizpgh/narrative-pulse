// ============================================================
// MCP Server — AI agent integration via Model Context Protocol
// Provides tools for AI agents to query Narrative Pulse data
// Uses stdio transport (separate process from Express server)
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { runScan } from "../engine/scanner.js";
import type {
  ScanResult,
  NarrativeSummary,
  EarlySignalToken,
} from "../types.js";

// ============================================================
// Cache — Avoid redundant scans within short time windows
// ============================================================

let cachedResult: ScanResult | null = null;
let cachedAt: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getOrRunScan(): Promise<ScanResult> {
  if (cachedResult && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedResult;
  }
  const result = await runScan({ skipAgent: true });
  cachedResult = result;
  cachedAt = Date.now();
  return result;
}

// ============================================================
// Number Formatting (shared across tool handlers)
// ============================================================

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function formatMcap(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(abs / 1e3).toFixed(1)}K`;
  return `$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ============================================================
// Tool: get_narrative_scan
// ============================================================

interface NarrativeScanSummary {
  name: string;
  netflow24h: string;
  tokenCount: number;
  isHot: boolean;
}

interface ScanSummary {
  timestamp: string;
  narratives: NarrativeScanSummary[];
  earlySignalsCount: number;
  creditsUsed: number;
}

function buildScanSummary(result: ScanResult): ScanSummary {
  const narratives: NarrativeScanSummary[] = result.narratives.map((n) => ({
    name: n.displayName,
    netflow24h: formatUsd(n.totalNetflow24h),
    tokenCount: n.topTokens.length,
    isHot: n.isHot,
  }));

  return {
    timestamp: result.timestamp,
    narratives,
    earlySignalsCount: result.earlySignals.length,
    creditsUsed: result.creditsUsed,
  };
}

// ============================================================
// Tool: get_hot_tokens
// ============================================================

function pickHottestNarrative(
  narratives: NarrativeSummary[]
): NarrativeSummary | null {
  if (narratives.length === 0) return null;
  const positive = narratives.filter((n) => n.totalNetflow24h > 0);
  if (positive.length > 0) {
    return positive.sort(
      (a, b) => b.totalNetflow24h - a.totalNetflow24h
    )[0];
  }
  return [...narratives].sort(
    (a, b) => Math.abs(b.totalNetflow24h) - Math.abs(a.totalNetflow24h)
  )[0];
}

function formatHotTokensTable(result: ScanResult): string {
  const hottest = pickHottestNarrative(result.narratives);
  if (!hottest) {
    return "No narratives found in scan data.";
  }

  const tokens = [...hottest.topTokens]
    .sort(
      (a, b) => Math.abs(b.netflow24hUsd) - Math.abs(a.netflow24hUsd)
    )
    .slice(0, 10);

  if (tokens.length === 0) {
    return `Hottest narrative: ${hottest.displayName} (${formatUsd(hottest.totalNetflow24h)} in 24h)\nNo classified tokens found.`;
  }

  const lines: string[] = [
    `Hottest Narrative: ${hottest.displayName} (${formatUsd(hottest.totalNetflow24h)} in 24h)`,
    "",
    "Symbol     | Netflow 24h  | Price Δ   | Volume 24h  | Market Cap   | Category",
    "-----------|-------------|-----------|-------------|-------------|----------",
  ];

  for (const t of tokens) {
    const sym = t.token_symbol.padEnd(10);
    const nf = formatUsd(t.netflow24hUsd).padStart(12);
    const pc = formatPercent(t.priceChange).padStart(10);
    const vol = formatMcap(t.volume24h).padStart(12);
    const mcap = formatMcap(t.marketCapUsd).padStart(12);
    const cat = t.category.padEnd(8);
    lines.push(`${sym}| ${nf} | ${pc} | ${vol} | ${mcap} | ${cat}`);
  }

  return lines.join("\n");
}

// ============================================================
// Tool: get_early_signals
// ============================================================

function formatEarlySignalsTable(result: ScanResult): string {
  if (result.earlySignals.length === 0) {
    return "No early signal tokens detected in this scan.";
  }

  const signals: EarlySignalToken[] = [...result.earlySignals]
    .sort(
      (a, b) => Math.abs(b.netflow24hUsd) - Math.abs(a.netflow24hUsd)
    )
    .slice(0, 10);

  const lines: string[] = [
    `Early Signal Tokens (${signals.length} detected)`,
    "",
    "Symbol     | Netflow 24h  | Price Δ   | Volume 24h  | Buy Pressure | Narrative",
    "-----------|-------------|-----------|-------------|-------------|-----------",
  ];

  for (const s of signals) {
    const sym = s.token_symbol.padEnd(10);
    const nf = formatUsd(s.netflow24hUsd).padStart(12);
    const pc = formatPercent(s.priceChange24h).padStart(10);
    const vol = formatMcap(s.volume24h).padStart(12);
    const bp = `${s.buyPressure.toFixed(1)}x`.padStart(12);
    const nar = s.narrativeDisplayName;
    lines.push(`${sym}| ${nf} | ${pc} | ${vol} | ${bp} | ${nar}`);
  }

  return lines.join("\n");
}

// ============================================================
// MCP Server Setup
// ============================================================

/**
 * Start the MCP server with stdio transport.
 * Registers 3 tools for AI agents to query narrative scan data.
 *
 * Tools:
 *   - get_narrative_scan: Full scan summary as JSON
 *   - get_hot_tokens: Top tokens from hottest narrative
 *   - get_early_signals: Early signal tokens with buy pressure
 */
export async function startMcpServer(): Promise<void> {
  // Redirect console.log to stderr so stdout stays clean for MCP protocol
  const originalLog = console.log;
  const originalError = console.error;

  console.log = ((...data: unknown[]) => {
    process.stderr.write(
      data.map((d) => (typeof d === "string" ? d : JSON.stringify(d))).join(" ") +
        "\n"
    );
  }) as typeof console.log;

  console.error = ((...data: unknown[]) => {
    process.stderr.write(
      data.map((d) => (typeof d === "string" ? d : JSON.stringify(d))).join(" ") +
        "\n"
    );
  }) as typeof console.error;

  const mcpServer = new McpServer(
    { name: "narrative-pulse", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // ── Tool: get_narrative_scan ──────────────────────────

  mcpServer.registerTool(
    "get_narrative_scan",
    {
      description:
        "Run a fresh Smart Money narrative scan and return the full result summary. " +
        "Includes all narratives with netflow data, token counts, and classification status.",
      inputSchema: {},
    },
    async (args) => {
      try {
        const result = await getOrRunScan();
        const summary = buildScanSummary(result);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        originalError(`[MCP] get_narrative_scan error: ${msg}`);
        return {
          content: [{ type: "text" as const, text: `Error: ${msg}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tool: get_hot_tokens ──────────────────────────────

  mcpServer.registerTool(
    "get_hot_tokens",
    {
      description:
        "Get the top classified tokens from the hottest narrative. " +
        "Returns a formatted table with netflow, price change, volume, market cap, and category.",
    },
    async () => {
      try {
        const result = await getOrRunScan();
        const text = formatHotTokensTable(result);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        originalError(`[MCP] get_hot_tokens error: ${msg}`);
        return {
          content: [{ type: "text" as const, text: `Error: ${msg}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tool: get_early_signals ───────────────────────────

  mcpServer.registerTool(
    "get_early_signals",
    {
      description:
        "Get early signal tokens — small-cap tokens showing unusual smart money activity " +
        "before significant price moves. Returns tokens with buy pressure data.",
    },
    async () => {
      try {
        const result = await getOrRunScan();
        const text = formatEarlySignalsTable(result);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        originalError(`[MCP] get_early_signals error: ${msg}`);
        return {
          content: [{ type: "text" as const, text: `Error: ${msg}` }],
          isError: true,
        };
      }
    }
  );

  // ── Connect via stdio ─────────────────────────────────

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  originalLog("[MCP] Narrative Pulse server started (stdio transport)");
}
