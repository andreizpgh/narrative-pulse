// ============================================================
// Express Server — Dynamic web dashboard for Narrative Pulse
// Serves static HTML dashboard + JSON API endpoints.
// Background scan runs on startup and on configurable interval.
// ============================================================

import express from "express";
import type { Request, Response } from "express";

import { runScan } from "../engine/scanner.js";
import { renderDashboardHtml } from "../visual/dashboard.js";
import type { ScanResult } from "../types.js";

// ============================================================
// Types
// ============================================================

export interface ServerOptions {
  port?: number;
  refreshIntervalMs?: number;
  skipAgent?: boolean;
}

interface ApiResponse {
  scan: ScanResult | null;
  lastScanTime: string | null;
  isScanning: boolean;
}

// ============================================================
// AI Analysis — LLM Proxy Helpers
// ============================================================

/** Supported LLM providers for AI analysis proxy. */
type AiProvider = "openai" | "anthropic" | "openrouter" | "custom";

interface AiAnalysisRequest {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  tokenData: Record<string, unknown>;
}

/**
 * Build a structured analysis prompt from token Smart Money data.
 * The prompt asks the LLM to act as a crypto analyst and produce
 * a concise, actionable assessment (3-5 sentences).
 */
function buildAnalysisPrompt(td: Record<string, unknown>): string {
  const fi = td.flowIntelligence as Record<string, unknown> | undefined;

  const flowSection = fi
    ? `Flow Intelligence:
- Smart Traders: ${fmtK(fi.smart_trader_net_flow_usd)} (${fi.smart_trader_wallet_count ?? 0} wallets)
- Whales: ${fmtK(fi.whale_net_flow_usd)} (${fi.whale_wallet_count ?? 0} wallets)
- Exchanges: ${fmtK(fi.exchange_net_flow_usd)} (${fi.exchange_wallet_count ?? 0} wallets)
- Fresh Wallets: ${fmtK(fi.fresh_wallets_net_flow_usd)} (${fi.fresh_wallets_wallet_count ?? 0} wallets)`
    : "";

  return `You are a crypto analyst AI. Analyze this token's Smart Money data and provide a concise, actionable assessment (3-5 sentences max).

Token: ${td.token_symbol}
Chain: ${td.chain}
Price: ${td.priceUsd ?? "N/A"}
Market Cap: ${fmtM(td.marketCapUsd)}
Price Change 24h: ${fmtPct(td.priceChange)}
SM Netflow 24h: ${fmtK(td.netflowUsd)}
SM Netflow 7d: ${fmtK(td.netflow7dUsd)}
Buy/Sell Ratio: ${td.buySellRatio ?? "N/A"}x
Buy Volume: ${fmtK(td.buyVolume)}
Sell Volume: ${fmtK(td.sellVolume)}
Classification: ${td.classification ?? "N/A"}
Narrative: ${td.narrativeKey ?? "N/A"}
${flowSection}

Focus on: What does the Smart Money activity suggest? Is this accumulation or distribution? Any divergence signals? What's the risk/reward? Keep it concise and actionable.`;
}

// ── Number formatting helpers ────────────────────────────────

function fmtM(value: unknown): string {
  if (typeof value !== "number") return "N/A";
  return `$${(value / 1e6).toFixed(1)}M`;
}

function fmtK(value: unknown): string {
  if (typeof value !== "number") return "N/A";
  return `$${(value / 1e3).toFixed(1)}K`;
}

function fmtPct(value: unknown): string {
  if (typeof value !== "number") return "N/A";
  return `${value.toFixed(1)}%`;
}

// ── LLM Provider Callers ─────────────────────────────────────

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    return data.choices[0]?.message?.content ?? "No analysis generated.";
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("OpenAI API request timed out after 30 seconds");
    }
    throw err;
  }
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    return data.content[0]?.text ?? "No analysis generated.";
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Anthropic API request timed out after 30 seconds");
    }
    throw err;
  }
}

async function callOpenRouter(apiKey: string, model: string, prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    return data.choices[0]?.message?.content ?? "No analysis generated.";
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("OpenRouter API request timed out after 30 seconds");
    }
    throw err;
  }
}

async function callCustom(baseUrl: string, apiKey: string, model: string, prompt: string): Promise<string> {
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 500, temperature: 0.3 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom API error (${response.status}): ${error}`);
    }
    const data = (await response.json()) as OpenAIResponse;
    return data.choices[0]?.message?.content ?? "No analysis generated.";
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Custom API request timed out after 30 seconds");
    }
    throw err;
  }
}

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Server] ${message}`);
}

// ============================================================
// Server
// ============================================================

/**
 * Start the Narrative Pulse web dashboard server.
 *
 * - GET /             → Dashboard HTML (no embedded data)
 * - GET /api/scan     → Latest ScanResult as JSON
 * - POST /api/scan    → Trigger new scan, return ScanResult
 * - POST /api/ai-analyze → Proxy LLM analysis (OpenAI/Anthropic/OpenRouter)
 *
 * Runs an initial scan on startup, then periodically re-scans
 * at the configured interval. Graceful shutdown on SIGINT/SIGTERM.
 */
export async function startServer(options?: ServerOptions): Promise<void> {
  const port = options?.port ?? 3000;
  const refreshIntervalMs = options?.refreshIntervalMs ?? 900_000; // 15 min
  const skipAgent = options?.skipAgent ?? true;

  // ── In-memory state (only latest scan) ──────────────────
  let latestScan: ScanResult | null = null;
  let lastScanTime: string | null = null;
  let isScanning = false;

  // ── Express App ─────────────────────────────────────────
  const app = express();
  app.use(express.json());

  // Dashboard HTML
  const dashboardHtml = renderDashboardHtml();

  app.get("/", (_req: Request, res: Response) => {
    res.type("html").send(dashboardHtml);
  });

  // API: Get latest scan
  app.get("/api/scan", (_req: Request, res: Response) => {
    const response: ApiResponse = {
      scan: latestScan,
      lastScanTime,
      isScanning,
    };
    res.json(response);
  });

  // API: Trigger new scan
  app.post("/api/scan", async (_req: Request, res: Response) => {
    if (isScanning) {
      // Already scanning — return current state
      const response: ApiResponse = {
        scan: latestScan,
        lastScanTime,
        isScanning: true,
      };
      res.json(response);
      return;
    }

    try {
      isScanning = true;
      log("Manual scan triggered via API");

      const result = await runScan({ skipAgent });
      latestScan = result;
      lastScanTime = new Date().toISOString();

      const response: ApiResponse = {
        scan: latestScan,
        lastScanTime,
        isScanning: false,
      };
      res.json(response);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log(`Scan failed: ${msg}`);
      isScanning = false;
      res.status(500).json({
        error: "Scan failed",
        message: msg,
        scan: latestScan,
        lastScanTime,
        isScanning: false,
      });
    } finally {
      isScanning = false;
    }
  });

  // ── AI Analysis Proxy ───────────────────────────────────
  // Proxies LLM API calls so the browser can call OpenAI/Anthropic/OpenRouter
  // without CORS issues. API keys are never stored — used only for the request.

  app.post("/api/ai-analyze", async (req: Request, res: Response) => {
    try {
      const { provider, apiKey, model, baseUrl, tokenData } = req.body as Partial<AiAnalysisRequest>;

      if (!provider || !apiKey || !model || !tokenData) {
        res.status(400).json({ error: "Missing required fields: provider, apiKey, model, tokenData" });
        return;
      }

      const prompt = buildAnalysisPrompt(tokenData);
      let analysis: string;

      switch (provider) {
        case "openai":
          analysis = await callOpenAI(apiKey, model, prompt);
          break;
        case "anthropic":
          analysis = await callAnthropic(apiKey, model, prompt);
          break;
        case "openrouter":
          analysis = await callOpenRouter(apiKey, model, prompt);
          break;
        case "custom": {
          if (!baseUrl) {
            res.status(400).json({ error: "Custom provider requires baseUrl" });
            return;
          }
          analysis = await callCustom(baseUrl, apiKey, model, prompt);
          break;
        }
        default:
          res.status(400).json({ error: `Unknown provider: ${provider}` });
          return;
      }

      res.json({ analysis });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[AI] Analysis failed:", message);
      res.status(500).json({ error: message });
    }
  });

  // ── Background Scan ─────────────────────────────────────

  async function runBackgroundScan(): Promise<void> {
    if (isScanning) return;

    try {
      isScanning = true;
      log("Running scheduled scan...");
      const result = await runScan({ skipAgent });
      latestScan = result;
      lastScanTime = new Date().toISOString();
      log(`Scan complete: ${result.narratives.length} narratives, ${result.earlySignals.length} early signals`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log(`Scheduled scan failed: ${msg}`);
    } finally {
      isScanning = false;
    }
  }

  // ── Start Server ────────────────────────────────────────

  const server = app.listen(port, () => {
    log(`Dashboard running at http://localhost:${port}`);
    log(`Auto-refresh interval: ${Math.round(refreshIntervalMs / 60000)} minutes`);
  });

  // ── Initial Scan (non-blocking) ─────────────────────────

  log("Running initial scan...");
  runBackgroundScan().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Initial scan failed: ${msg} — dashboard will show "No data yet"`);
  });

  // ── Periodic Scan ───────────────────────────────────────

  const intervalId = setInterval(() => {
    runBackgroundScan().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Periodic scan error: ${msg}`);
    });
  }, refreshIntervalMs);

  // ── Graceful Shutdown ───────────────────────────────────

  function shutdown(): void {
    log("Shutting down...");
    clearInterval(intervalId);
    server.close(() => {
      log("Server closed");
      process.exit(0);
    });

    // Force exit after 10 seconds if connections are stuck
    setTimeout(() => {
      log("Forcing exit (timeout)");
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
