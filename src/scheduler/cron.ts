import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import type { ScanResult } from "../types.js";

// ============================================================
// Types
// ============================================================

export interface WatchHandle {
  stop: () => void;
}

export interface ScanFunction {
  (): Promise<ScanResult>;
}

export interface WatchCallbacks {
  onScanStart?: () => void;
  onScanError?: (error: Error) => void;
  onScanComplete?: (result: ScanResult) => void;
}

// ============================================================
// startWatchMode
// ============================================================

export function startWatchMode(
  scanFn: ScanFunction,
  schedule: string,
  callbacks?: WatchCallbacks
): WatchHandle {
  // 1. Validate cron expression
  if (!cron.validate(schedule)) {
    throw new Error(`Invalid cron expression: "${schedule}"`);
  }

  let isRunning = false;
  let task: ScheduledTask | null = null;
  let isShuttingDown = false;

  // ── Single scan execution ─────────────────────────────────

  async function runOnce(): Promise<void> {
    if (isRunning) {
      console.log("[Watch] Previous scan still running — skipping this tick");
      return;
    }
    if (isShuttingDown) return;

    isRunning = true;
    const startTime = Date.now();
    callbacks?.onScanStart?.();
    console.log(`[Watch] Scan started at ${new Date().toISOString()}`);

    try {
      const result = await scanFn();
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[Watch] Scan completed in ${durationSec}s — ${result.narratives.length} narratives, ${result.apiCallsUsed} API calls`
      );
      callbacks?.onScanComplete?.(result);
    } catch (error) {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Watch] Scan failed after ${durationSec}s: ${msg}`);
      callbacks?.onScanError?.(error instanceof Error ? error : new Error(msg));
    } finally {
      isRunning = false;
    }
  }

  // ── Schedule periodic runs ────────────────────────────────

  task = cron.schedule(schedule, () => {
    runOnce().catch((err: unknown) => {
      // Safety net — runOnce has its own try/catch, but guard anyway
      console.error(`[Watch] Unexpected error in scheduler: ${String(err)}`);
    });
  }, { scheduled: false });

  // ── Graceful shutdown ─────────────────────────────────────

  const shutdown = (signal: string): void => {
    if (isShuttingDown) return; // Prevent double-shutdown
    isShuttingDown = true;
    console.log(`\n[Watch] Received ${signal} — shutting down gracefully...`);
    task?.stop();
    task = null;
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // ── Start ─────────────────────────────────────────────────

  task.start();
  console.log(`[Watch] Scheduler started — cron: "${schedule}"`);
  console.log("[Watch] Next scans will run according to schedule.");

  // Run the first scan immediately (no runOnInit)
  console.log("[Watch] Running initial scan...\n");
  runOnce().catch((err: unknown) => {
    console.error(`[Watch] Initial scan failed: ${String(err)}`);
  });

  return {
    stop: () => {
      isShuttingDown = true;
      task?.stop();
      task = null;
      console.log("[Watch] Scheduler stopped.");
    },
  };
}
