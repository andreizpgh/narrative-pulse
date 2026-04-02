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
 * - GET /        → Dashboard HTML (no embedded data)
 * - GET /api/scan  → Latest ScanResult as JSON
 * - POST /api/scan → Trigger new scan, return ScanResult
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
