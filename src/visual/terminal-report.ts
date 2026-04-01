// ============================================================
// Terminal Report — Formatted CLI output for ScanResult
// Tables, colors, and sections for Hot/Watch/Avoid tokens
// ============================================================

import chalk from "chalk";
import Table from "cli-table3";

import type {
  ScanResult,
  NarrativeSummary,
  ClassifiedToken,
  SubNarrative,
  NarrativeRotation,
  TokenCategory,
} from "../types.js";

// ============================================================
// Number Formatting Helpers
// ============================================================

/**
 * Format a USD value with sign and magnitude suffix.
 * Examples: +$2.3M, -$340K, +$12,500
 */
function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value);

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Format a USD value for netflow with color: green if positive, red if negative.
 */
function formatUsdColored(value: number): string {
  const formatted = formatUsd(value);
  if (value >= 0) return chalk.green(formatted);
  return chalk.red(formatted);
}

/**
 * Format a percentage with sign.
 * Examples: +8.2%, -0.3%
 */
function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/**
 * Format a percentage with color: green if positive, red if negative.
 */
function formatPercentColored(value: number): string {
  const formatted = formatPercent(value);
  if (value >= 0) return chalk.green(formatted);
  return chalk.red(formatted);
}

/**
 * Format market cap without sign.
 * Examples: $1.2B, $890M, $456K
 */
function formatMcap(value: number): string {
  if (value <= 0) return "—";
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ============================================================
// Section 1: Summary Header
// ============================================================

function renderHeader(result: ScanResult): void {
  const separator = "═".repeat(55);
  console.log();
  console.log(chalk.gray(separator));
  console.log(
    chalk.bold.white("  🔥 NARRATIVE PULSE — Smart Money Rotation Report")
  );
  console.log(chalk.gray(separator));

  const dateStr = result.timestamp
    ? new Date(result.timestamp).toISOString().replace("T", " ").slice(0, 19) +
      " UTC"
    : "N/A";

  console.log(
    chalk.gray("  Date:       ") + chalk.white(dateStr)
  );
  console.log(
    chalk.gray("  Narratives: ") +
      chalk.white(`${result.narratives.length} detected`)
  );
  console.log(
    chalk.gray("  Sectors:    ") +
      chalk.white(result.sectors.join(", "))
  );
  console.log(
    chalk.gray("  API Calls:  ") +
      chalk.white(`${result.apiCallsUsed} | Credits: ${result.creditsUsed}`)
  );
  console.log();
}

// ============================================================
// Section 2: Narrative Summary Table
// ============================================================

function renderNarrativeSummary(narratives: NarrativeSummary[]): void {
  if (narratives.length === 0) return;

  const table = new Table({
    head: [
      chalk.white("Narrative"),
      chalk.white("24h Netflow"),
      chalk.white("Tokens"),
      chalk.white("Traders"),
      chalk.white("Status"),
    ],
    colWidths: [18, 16, 10, 10, 12],
    style: { head: [], border: ["gray"] },
  });

  for (const n of narratives) {
    const netflow = formatUsdColored(n.totalNetflow24h);
    const status = n.isHot
      ? chalk.green("🔥 HOT")
      : chalk.red("❄ COLD");

    table.push([n.displayName, netflow, String(n.tokenCount), String(n.traderCount), status]);
  }

  console.log(table.toString());
  console.log();
}

// ============================================================
// Section 3: Hot/Watch/Avoid Token Tables per Narrative
// ============================================================

const CATEGORY_LABELS: Record<TokenCategory, string> = {
  hot: "🔥 Hot Tokens",
  watch: "👀 Watch Tokens",
  avoid: "⛔ Avoid Tokens",
};

const CATEGORY_COLORS: Record<TokenCategory, (text: string) => string> = {
  hot: chalk.red,
  watch: chalk.yellow,
  avoid: chalk.gray,
};

function buildTokenTable(tokens: ClassifiedToken[]): Table.Table {
  const table = new Table({
    head: [
      chalk.white("Token"),
      chalk.white("Netflow 24h"),
      chalk.white("Price Δ"),
      chalk.white("Traders"),
      chalk.white("MarketCap"),
    ],
    colWidths: [12, 16, 12, 10, 14],
    style: { head: [], border: ["gray"] },
  });

  for (const t of tokens) {
    table.push([
      t.token_symbol,
      formatUsdColored(t.netflow24hUsd),
      formatPercentColored(t.priceChange),
      String(t.traderCount),
      formatMcap(t.marketCapUsd),
    ]);
  }

  return table;
}

function renderTokenTables(narratives: NarrativeSummary[]): void {
  for (const n of narratives) {
    if (n.topTokens.length === 0) continue;

    const netflow = formatUsdColored(n.totalNetflow24h);
    console.log(
      chalk.bold(
        `━━━ ${n.displayName} (${n.tokenCount} tokens, 24h netflow: ${netflow}) ━━━`
      )
    );
    console.log();

    // Group tokens by category
    const grouped = new Map<TokenCategory, ClassifiedToken[]>();
    grouped.set("hot", []);
    grouped.set("watch", []);
    grouped.set("avoid", []);

    for (const t of n.topTokens) {
      grouped.get(t.category)!.push(t);
    }

    // Render each category section
    const categories: TokenCategory[] = ["hot", "watch", "avoid"];
    for (const cat of categories) {
      const colorize = CATEGORY_COLORS[cat];
      const label = CATEGORY_LABELS[cat];
      const tokens = grouped.get(cat)!;

      console.log(`  ${colorize(label)}`);

      if (tokens.length === 0) {
        console.log(chalk.gray("  (none)"));
      } else {
        const table = buildTokenTable(tokens);
        // Indent each line of the table output
        const lines = table.toString().split("\n");
        for (const line of lines) {
          console.log(`  ${line}`);
        }
      }

      console.log();
    }
  }
}

// ============================================================
// Section 4: Sub-narratives
// ============================================================

function renderSubNarratives(
  subNarratives: SubNarrative[],
  narrativeName: string
): void {
  console.log(
    chalk.bold(
      `━━━ ${narrativeName} Sub-narratives (via Agent API) ━━━`
    )
  );
  console.log();

  for (const sub of subNarratives) {
    let convictionLabel: string;
    switch (sub.conviction) {
      case "high":
        convictionLabel = chalk.green.bold("HIGH");
        break;
      case "medium":
        convictionLabel = chalk.yellow("MEDIUM");
        break;
      case "low":
        convictionLabel = chalk.gray("LOW");
        break;
    }

    const netflow = formatUsdColored(sub.totalNetflowUsd);

    console.log(
      `  🤖 ${chalk.bold(sub.name)}          conviction: ${convictionLabel}   netflow: ${netflow}`
    );
    console.log(`     ${chalk.gray(sub.tokens.join(", "))}`);
    console.log();
  }
}

// ============================================================
// Section 5: Top Rotations
// ============================================================

function renderRotations(rotations: NarrativeRotation[]): void {
  if (rotations.length === 0) return;

  console.log(chalk.bold("━━━ Top Rotations ━━━"));
  console.log();

  // Sort by absolute value, take top 5
  const topRotations = [...rotations]
    .sort((a, b) => Math.abs(b.valueUsd) - Math.abs(a.valueUsd))
    .slice(0, 5);

  for (const r of topRotations) {
    const icon = r.direction === "inflow" ? "💸" : "📉";
    const value =
      r.direction === "inflow"
        ? chalk.green(`+${formatUsd(r.valueUsd).slice(1)}`)
        : chalk.red(formatUsd(r.valueUsd));

    console.log(`  ${icon} ${r.from} → ${r.to}          ${value}`);
  }

  console.log();
}

// ============================================================
// Main Entry Point
// ============================================================

/**
 * Render a complete terminal report from a ScanResult.
 * Outputs a formatted report with 4 sections:
 *   1. Summary header
 *   2. Narrative summary table
 *   3. Hot/Watch/Avoid token tables per narrative
 *   4. Sub-narratives (if present)
 *   5. Top rotations
 */
export function renderTerminalReport(result: ScanResult): void {
  // Section 1: Summary Header
  renderHeader(result);

  // Section 2: Narrative Summary Table
  renderNarrativeSummary(result.narratives);

  // Section 3: Hot/Watch/Avoid Token Tables
  renderTokenTables(result.narratives);

  // Section 4: Sub-narratives (optional)
  if (result.subNarratives && result.subNarratives.length > 0) {
    const narrativeName = result.topNarrativeKey ?? "Top";
    renderSubNarratives(result.subNarratives, narrativeName);
  }

  // Section 5: Top Rotations
  renderRotations(result.rotations);
}
