#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("narrative-pulse")
  .description("Track WHERE Smart Money is rotating between crypto narratives")
  .version("1.0.0");

program
  .command("scan")
  .description("Run a one-time narrative scan across all chains")
  .action(() => {
    console.log("Scanning narratives...");
    // TODO: implement scanner pipeline
  });

program
  .command("watch")
  .description("Start 24/7 watch mode with periodic scans")
  .action(() => {
    console.log("Starting 24/7 watch mode...");
    // TODO: implement cron scheduler
  });

program
  .command("sectors")
  .description("Discover and list all detected sectors")
  .action(() => {
    console.log("Discovering sectors...");
    // TODO: implement sector discovery
  });

program.parse();
