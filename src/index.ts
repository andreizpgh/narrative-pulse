#!/usr/bin/env node

import { Command } from "commander";

import { runScan } from "./engine/scanner.js";
import { fetchNetflows } from "./api/netflows.js";
import { discoverSectors } from "./engine/discovery.js";
import { renderTerminalReport } from "./visual/terminal-report.js";
import { renderSankey } from "./visual/sankey.js";
import { renderHtmlReport } from "./visual/html-report.js";
import { config } from "./config.js";
import { startWatchMode } from "./scheduler/cron.js";

const program = new Command();

program
  .name("narrative-pulse")
  .description("Track WHERE Smart Money is rotating between crypto narratives")
  .version("1.0.0");

// ── scan ────────────────────────────────────────────────────

program
  .command("scan")
  .description("Run a one-time narrative scan across all chains")
  .option("--no-sankey", "Skip Sankey diagram generation")
  .option("--no-html", "Skip HTML report generation")
  .action(async (options: { sankey: boolean; html: boolean }) => {
    try {
      const result = await runScan();
      renderTerminalReport(result);

      if (options.sankey) {
        const sankeyPath = await renderSankey(
          result.narratives,
          result.rotations
        );
        console.log(`\nSankey diagram saved: ${sankeyPath}`);
      }

      if (options.html) {
        const htmlPath = await renderHtmlReport(result);
        console.log(`HTML report saved: ${htmlPath}`);
      }
    } catch (error) {
      console.error(
        `\nError: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// ── watch ───────────────────────────────────────────────────

program
  .command("watch")
  .description("Start 24/7 watch mode with periodic scans")
  .option("-s, --schedule <cron>", "Cron schedule expression", config.cronSchedule)
  .option("--no-sankey", "Skip Sankey diagram generation")
  .option("--no-html", "Skip HTML report generation")
  .action(async (options: { schedule: string; sankey: boolean; html: boolean }) => {
    try {
      // Build the scan function with visual output
      const scanWithVisuals = async () => {
        const result = await runScan();
        renderTerminalReport(result);

        if (options.sankey) {
          try {
            const sankeyPath = await renderSankey(
              result.narratives,
              result.rotations
            );
            console.log(`[Watch] Sankey saved: ${sankeyPath}`);
          } catch (err) {
            console.error(
              `[Watch] Sankey generation failed: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }

        if (options.html) {
          try {
            const htmlPath = await renderHtmlReport(result);
            console.log(`[Watch] HTML report saved: ${htmlPath}`);
          } catch (err) {
            console.error(
              `[Watch] HTML report failed: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }

        return result;
      };

      startWatchMode(scanWithVisuals, options.schedule);
    } catch (error) {
      console.error(
        `\nError: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// ── sectors ─────────────────────────────────────────────────

program
  .command("sectors")
  .description("Discover and list all detected sectors")
  .action(async () => {
    try {
      console.log("Discovering sectors...\n");
      const netflows = await fetchNetflows(
        config.chains,
        config.minMarketCapUsd,
        config.minTraderCount
      );
      const sectors = discoverSectors(netflows);

      if (sectors.length === 0) {
        console.log("No sectors found. Try adjusting filters.");
      } else {
        console.log(`Found ${sectors.length} sectors:\n`);
        for (const sector of sectors) {
          const tokenCount = netflows.filter((e) =>
            e.token_sectors.includes(sector)
          ).length;
          console.log(`  ${sector} (${tokenCount} tokens)`);
        }
      }
    } catch (error) {
      console.error(
        `\nError: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// ── Global error handlers ───────────────────────────────────

process.on("uncaughtException", (error: Error) => {
  console.error(`\nFatal error: ${error.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error(`\nUnhandled rejection: ${message}`);
  process.exit(1);
});

program.parse();
