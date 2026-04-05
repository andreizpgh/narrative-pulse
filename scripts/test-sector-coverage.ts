// ============================================================
// Sector Coverage Analysis
// Measures how many tokens have token_sectors in netflow vs holdings
// ============================================================

import { fetchNetflows } from "../src/api/netflows.js";
import { fetchHoldings } from "../src/api/holdings.js";
import { normalizeAddress } from "../src/utils/normalize.js";
import { config } from "../src/config.js";

async function main(): Promise<void> {
  const chains = config.chains;
  console.log("=== Sector Coverage Analysis ===\n");
  console.log(`Chains: ${chains.join(", ")}\n`);

  // ── 1. Fetch netflows (2 pages, 5 chains) ──
  console.log("--- Fetching netflows ---");
  const netflows = await fetchNetflows(
    chains,
    config.minMarketCapUsd,
    config.minTraderCount
  );
  console.log(`Total netflow entries: ${netflows.length}\n`);

  // ── 2. Fetch holdings (1 page, 5 chains) ──
  console.log("--- Fetching holdings ---");
  const holdingsMap = await fetchHoldings(chains);
  const holdings = Array.from(holdingsMap.values());
  console.log(`Total unique holdings entries: ${holdings.length}\n`);

  // ── 3. Netflow sector analysis ──
  console.log("=== NETFLOW SECTOR ANALYSIS ===");

  const netflowWithSectors = netflows.filter(
    (e) => e.token_sectors && e.token_sectors.length > 0
  );
  const netflowWithoutSectors = netflows.filter(
    (e) => !e.token_sectors || e.token_sectors.length === 0
  );

  console.log(`Entries WITH sectors:    ${netflowWithSectors.length} / ${netflows.length} (${((netflowWithSectors.length / netflows.length) * 100).toFixed(1)}%)`);
  console.log(`Entries WITHOUT sectors: ${netflowWithoutSectors.length} / ${netflows.length} (${((netflowWithoutSectors.length / netflows.length) * 100).toFixed(1)}%)`);

  // Unique sectors in netflow
  const netflowSectorSet = new Set<string>();
  for (const entry of netflowWithSectors) {
    for (const sector of entry.token_sectors) {
      netflowSectorSet.add(sector);
    }
  }
  console.log(`\nUnique sectors in netflow (${netflowSectorSet.size}):`);
  const sortedNetflowSectors = Array.from(netflowSectorSet).sort();
  for (const sector of sortedNetflowSectors) {
    console.log(`  - ${sector}`);
  }

  // Top tokens with sectors (by abs netflow)
  console.log("\nTop-10 netflow tokens WITH sectors (by |net_flow_24h_usd|):");
  const topNetflowWithSectors = [...netflowWithSectors]
    .sort((a, b) => Math.abs(b.net_flow_24h_usd) - Math.abs(a.net_flow_24h_usd))
    .slice(0, 10);
  for (const t of topNetflowWithSectors) {
    console.log(
      `  ${t.token_symbol.padEnd(8)} | $${t.net_flow_24h_usd.toLocaleString().padStart(12)} | sectors: [${t.token_sectors.join(", ")}]`
    );
  }

  // Top tokens WITHOUT sectors
  console.log("\nTop-10 netflow tokens WITHOUT sectors (by |net_flow_24h_usd|):");
  const topNetflowWithoutSectors = [...netflowWithoutSectors]
    .sort((a, b) => Math.abs(b.net_flow_24h_usd) - Math.abs(a.net_flow_24h_usd))
    .slice(0, 10);
  for (const t of topNetflowWithoutSectors) {
    console.log(
      `  ${t.token_symbol.padEnd(8)} | $${t.net_flow_24h_usd.toLocaleString().padStart(12)} | chain: ${t.chain}`
    );
  }

  // ── 4. Holdings sector analysis ──
  console.log("\n=== HOLDINGS SECTOR ANALYSIS ===");

  const holdingsWithSectors = holdings.filter(
    (e) => e.token_sectors && e.token_sectors.length > 0
  );
  const holdingsWithoutSectors = holdings.filter(
    (e) => !e.token_sectors || e.token_sectors.length === 0
  );

  console.log(`Entries WITH sectors:    ${holdingsWithSectors.length} / ${holdings.length} (${((holdingsWithSectors.length / holdings.length) * 100).toFixed(1)}%)`);
  console.log(`Entries WITHOUT sectors: ${holdingsWithoutSectors.length} / ${holdings.length} (${((holdingsWithoutSectors.length / holdings.length) * 100).toFixed(1)}%)`);

  // Unique sectors in holdings
  const holdingsSectorSet = new Set<string>();
  for (const entry of holdingsWithSectors) {
    for (const sector of entry.token_sectors) {
      holdingsSectorSet.add(sector);
    }
  }
  console.log(`\nUnique sectors in holdings (${holdingsSectorSet.size}):`);
  const sortedHoldingsSectors = Array.from(holdingsSectorSet).sort();
  for (const sector of sortedHoldingsSectors) {
    console.log(`  - ${sector}`);
  }

  // ── 5. Overlap analysis ──
  console.log("\n=== OVERLAP ANALYSIS ===");

  const netflowAddresses = new Set(
    netflows.map((e) => normalizeAddress(e.token_address))
  );
  const holdingsAddresses = new Set(
    holdings.map((e) => normalizeAddress(e.token_address))
  );

  const overlap = new Set<string>();
  for (const addr of netflowAddresses) {
    if (holdingsAddresses.has(addr)) {
      overlap.add(addr);
    }
  }

  console.log(`Unique token addresses in netflow:  ${netflowAddresses.size}`);
  console.log(`Unique token addresses in holdings:  ${holdingsAddresses.size}`);
  console.log(`Overlap (in both):                   ${overlap.size} (${((overlap.size / Math.max(netflowAddresses.size, 1)) * 100).toFixed(1)}% of netflow, ${((overlap.size / Math.max(holdingsAddresses.size, 1)) * 100).toFixed(1)}% of holdings)`);

  // How many overlap tokens have sectors in at least one source
  let overlapWithSectors = 0;
  for (const addr of overlap) {
    const nf = netflows.find((e) => normalizeAddress(e.token_address) === addr);
    const hd = holdingsMap.get(addr);
    const hasSectors =
      (nf && nf.token_sectors && nf.token_sectors.length > 0) ||
      (hd && hd.token_sectors && hd.token_sectors.length > 0);
    if (hasSectors) overlapWithSectors++;
  }
  console.log(`Overlap tokens with sectors (either source): ${overlapWithSectors} / ${overlap.size}`);

  // ── 6. Total unique tokens with sectors across both sources ──
  console.log("\n=== TOTAL UNIQUE TOKENS WITH SECTORS ===");

  const tokensWithSectors = new Map<string, string[]>(); // address -> sectors

  for (const entry of netflowWithSectors) {
    const addr = normalizeAddress(entry.token_address);
    if (!tokensWithSectors.has(addr)) {
      tokensWithSectors.set(addr, entry.token_sectors);
    } else {
      // Merge sectors
      const existing = tokensWithSectors.get(addr)!;
      for (const s of entry.token_sectors) {
        if (!existing.includes(s)) existing.push(s);
      }
    }
  }

  for (const entry of holdingsWithSectors) {
    const addr = normalizeAddress(entry.token_address);
    if (!tokensWithSectors.has(addr)) {
      tokensWithSectors.set(addr, entry.token_sectors);
    } else {
      const existing = tokensWithSectors.get(addr)!;
      for (const s of entry.token_sectors) {
        if (!existing.includes(s)) existing.push(s);
      }
    }
  }

  console.log(`Total unique tokens with sectors: ${tokensWithSectors.size}`);
  console.log(`  From netflow only:  ${netflowWithSectors.length - overlapWithSectors}`);
  console.log(`  From holdings only: ${holdingsWithSectors.length - overlapWithSectors}`);
  console.log(`  From both:          ${overlapWithSectors}`);

  // All unique sectors across both sources
  const allSectors = new Set([...netflowSectorSet, ...holdingsSectorSet]);
  console.log(`\nTotal unique sectors across both sources: ${allSectors.size}`);

  // Sectors only in netflow
  const onlyNetflow = new Set([...netflowSectorSet].filter((s) => !holdingsSectorSet.has(s)));
  console.log(`Sectors ONLY in netflow (${onlyNetflow.size}):`);
  for (const s of Array.from(onlyNetflow).sort()) {
    console.log(`  - ${s}`);
  }

  // Sectors only in holdings
  const onlyHoldings = new Set([...holdingsSectorSet].filter((s) => !netflowSectorSet.has(s)));
  console.log(`Sectors ONLY in holdings (${onlyHoldings.size}):`);
  for (const s of Array.from(onlyHoldings).sort()) {
    console.log(`  - ${s}`);
  }

  console.log("\n=== DONE ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
