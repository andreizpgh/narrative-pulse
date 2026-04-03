// ============================================================
// Research Card — Shareable PNG card (Twitter card size)
// ECharts SSR + sharp: renders a styled summary card from ScanResult
// ============================================================

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as echarts from "echarts";
import sharp from "sharp";

import type {
  ScanResult,
  NarrativeSummary,
  ClassifiedToken,
  EarlySignalToken,
} from "../types.js";

// ============================================================
// Constants
// ============================================================

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 675;

// Dark theme colors (matching dashboard)
const BG_COLOR = "#0f1117";
const TEXT_WHITE = "#ffffff";
const TEXT_SECONDARY = "#8b8fa3";
const TEXT_LABEL = "#a0a4b8";
const DIVIDER_COLOR = "#2a2d3a";
const COLOR_GREEN = "#34d399";
const COLOR_RED = "#f87171";
const COLOR_YELLOW = "#fbbf24";
const COLOR_EMOJI_HOT = "#ef4444";
const COLOR_EMOJI_COLD = "#60a5fa";

const FONT_DISPLAY = "SF Pro Display, Helvetica Neue, Arial, sans-serif";
const FONT_MONO = "SF Mono, Fira Code, Consolas, monospace";

// ============================================================
// Number Formatting Helpers
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
  if (abs >= 1e9) return `$${(abs / 1e9).toFixed(1)}B mcap`;
  if (abs >= 1e6) return `$${(abs / 1e6).toFixed(1)}M mcap`;
  if (abs >= 1e3) return `$${(abs / 1e3).toFixed(1)}K mcap`;
  return `$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })} mcap`;
}

function formatDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================================
// Data Selection Helpers
// ============================================================

function pickHottestNarrative(
  narratives: NarrativeSummary[]
): NarrativeSummary | null {
  if (narratives.length === 0) return null;

  // Prefer narratives with positive netflow
  const positive = narratives.filter((n) => n.totalNetflow24h > 0);
  if (positive.length > 0) {
    return positive.sort(
      (a, b) => b.totalNetflow24h - a.totalNetflow24h
    )[0];
  }

  // If all negative, pick the one with highest absolute netflow
  return [...narratives].sort(
    (a, b) => Math.abs(b.totalNetflow24h) - Math.abs(a.totalNetflow24h)
  )[0];
}

function pickColdestNarrative(
  narratives: NarrativeSummary[],
  hottestKey: string | undefined
): NarrativeSummary | null {
  if (narratives.length <= 1) return null;

  // Filter out the hottest narrative to show a different one
  const candidates = narratives.filter((n) => n.key !== hottestKey);
  if (candidates.length === 0) return null;

  // Pick the most negative netflow
  return candidates.sort(
    (a, b) => a.totalNetflow24h - b.totalNetflow24h
  )[0];
}

function pickTopTokens(
  tokens: ClassifiedToken[],
  limit: number
): ClassifiedToken[] {
  return [...tokens]
    .sort((a, b) => Math.abs(b.netflow24hUsd) - Math.abs(a.netflow24hUsd))
    .slice(0, limit);
}

function pickEarlySignals(
  signals: EarlySignalToken[],
  limit: number
): EarlySignalToken[] {
  return [...signals]
    .sort((a, b) => Math.abs(b.netflow24hUsd) - Math.abs(a.netflow24hUsd))
    .slice(0, limit);
}

// ============================================================
// Graphic Element Builders
// ============================================================

interface GraphicText {
  type: "text";
  left?: number;
  right?: number;
  top: number;
  style: {
    text: string;
    fill: string;
    fontSize: number;
    fontWeight?: number | string;
    fontFamily?: string;
    textAlign?: "left" | "center" | "right";
  };
}

interface GraphicRect {
  type: "rect";
  left: number;
  top: number;
  shape: { width: number; height: number };
  style: { fill: string };
}

type GraphicElement = GraphicText | GraphicRect;

function buildHeaderElements(): GraphicElement[] {
  return [
    {
      type: "text",
      left: 40,
      top: 28,
      style: {
        text: "NARRATIVE PULSE",
        fill: TEXT_WHITE,
        fontSize: 22,
        fontWeight: 800,
        fontFamily: FONT_DISPLAY,
      },
    },
    {
      type: "text",
      right: 40,
      top: 32,
      style: {
        text: "Smart Money Narrative Tracker",
        fill: TEXT_SECONDARY,
        fontSize: 13,
        fontFamily: FONT_DISPLAY,
      },
    },
    // Divider line below header
    {
      type: "rect",
      left: 40,
      top: 65,
      shape: { width: 1120, height: 1 },
      style: { fill: DIVIDER_COLOR },
    },
  ];
}

function buildHotNarrativeElements(
  narrative: NarrativeSummary,
  yOffset: number
): GraphicElement[] {
  const emoji = narrative.totalNetflow24h >= 0 ? "\uD83D\uDD25" : "\u2B06\uFE0F"; // 🔥 or ⬆️
  const label = narrative.totalNetflow24h >= 0 ? "Hot" : "Top";
  const netflowColor =
    narrative.totalNetflow24h >= 0 ? COLOR_GREEN : COLOR_RED;

  return [
    {
      type: "text",
      left: 40,
      top: yOffset,
      style: {
        text: `${emoji} ${label}:`,
        fill: COLOR_EMOJI_HOT,
        fontSize: 20,
        fontWeight: 700,
        fontFamily: FONT_DISPLAY,
      },
    },
    {
      type: "text",
      left: 160,
      top: yOffset,
      style: {
        text: narrative.displayName,
        fill: TEXT_WHITE,
        fontSize: 20,
        fontWeight: 700,
        fontFamily: FONT_DISPLAY,
      },
    },
    {
      type: "text",
      left: 380,
      top: yOffset + 2,
      style: {
        text: `${formatUsd(narrative.totalNetflow24h)} in 24h`,
        fill: netflowColor,
        fontSize: 16,
        fontFamily: FONT_MONO,
      },
    },
  ];
}

function buildTokenRowElements(
  token: ClassifiedToken,
  yOffset: number,
  leftMargin: number
): GraphicElement[] {
  const netflowColor = token.netflow24hUsd >= 0 ? COLOR_GREEN : COLOR_RED;
  const priceColor = token.priceChange >= 0 ? COLOR_GREEN : COLOR_RED;

  return [
    // Token symbol
    {
      type: "text",
      left: leftMargin,
      top: yOffset,
      style: {
        text: token.token_symbol.padEnd(8),
        fill: TEXT_WHITE,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: FONT_MONO,
      },
    },
    // Netflow
    {
      type: "text",
      left: leftMargin + 120,
      top: yOffset,
      style: {
        text: formatUsd(token.netflow24hUsd),
        fill: netflowColor,
        fontSize: 14,
        fontFamily: FONT_MONO,
      },
    },
    // Price change
    {
      type: "text",
      left: leftMargin + 260,
      top: yOffset,
      style: {
        text: formatPercent(token.priceChange),
        fill: priceColor,
        fontSize: 14,
        fontFamily: FONT_MONO,
      },
    },
    // Market cap
    {
      type: "text",
      left: leftMargin + 370,
      top: yOffset,
      style: {
        text: formatMcap(token.marketCapUsd),
        fill: TEXT_LABEL,
        fontSize: 13,
        fontFamily: FONT_MONO,
      },
    },
  ];
}

function buildTopTokensElements(
  tokens: ClassifiedToken[],
  yOffset: number
): GraphicElement[] {
  if (tokens.length === 0) return [];

  const elements: GraphicElement[] = [
    {
      type: "text",
      left: 40,
      top: yOffset,
      style: {
        text: "Top Tokens:",
        fill: TEXT_LABEL,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: FONT_DISPLAY,
      },
    },
  ];

  let rowY = yOffset + 30;
  for (const token of tokens) {
    elements.push(...buildTokenRowElements(token, rowY, 70));
    rowY += 28;
  }

  return elements;
}

function buildEarlySignalsElements(
  signals: EarlySignalToken[],
  yOffset: number
): GraphicElement[] {
  if (signals.length === 0) return [];

  const elements: GraphicElement[] = [
    {
      type: "text",
      left: 40,
      top: yOffset,
      style: {
        text: "\uD83D\uDFE2 Early Signals:", // 🟢
        fill: COLOR_YELLOW,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: FONT_DISPLAY,
      },
    },
  ];

  let rowY = yOffset + 30;
  for (const signal of signals) {
    const netflowColor =
      signal.netflow24hUsd >= 0 ? COLOR_GREEN : COLOR_RED;
    const priceColor =
      signal.priceChange24h >= 0 ? COLOR_GREEN : COLOR_RED;

    // Symbol
    elements.push({
      type: "text",
      left: 70,
      top: rowY,
      style: {
        text: signal.token_symbol.padEnd(8),
        fill: TEXT_WHITE,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: FONT_MONO,
      },
    });
    // Netflow
    elements.push({
      type: "text",
      left: 190,
      top: rowY,
      style: {
        text: formatUsd(signal.netflow24hUsd),
        fill: netflowColor,
        fontSize: 14,
        fontFamily: FONT_MONO,
      },
    });
    // Price change
    elements.push({
      type: "text",
      left: 330,
      top: rowY,
      style: {
        text: formatPercent(signal.priceChange24h),
        fill: priceColor,
        fontSize: 14,
        fontFamily: FONT_MONO,
      },
    });
    // Buy pressure
    elements.push({
      type: "text",
      left: 440,
      top: rowY,
      style: {
        text: `${signal.buyPressure.toFixed(1)}x buy pressure`,
        fill: COLOR_YELLOW,
        fontSize: 13,
        fontFamily: FONT_MONO,
      },
    });

    rowY += 28;
  }

  return elements;
}

function buildColdNarrativeElements(
  narrative: NarrativeSummary,
  yOffset: number
): GraphicElement[] {
  const netflowColor =
    narrative.totalNetflow24h >= 0 ? COLOR_GREEN : COLOR_RED;

  return [
    {
      type: "text",
      left: 40,
      top: yOffset,
      style: {
        text: "\u2744\uFE0F Cold:", // ❄️
        fill: COLOR_EMOJI_COLD,
        fontSize: 18,
        fontWeight: 700,
        fontFamily: FONT_DISPLAY,
      },
    },
    {
      type: "text",
      left: 140,
      top: yOffset,
      style: {
        text: narrative.displayName,
        fill: TEXT_WHITE,
        fontSize: 18,
        fontWeight: 700,
        fontFamily: FONT_DISPLAY,
      },
    },
    {
      type: "text",
      left: 350,
      top: yOffset + 2,
      style: {
        text: `${formatUsd(narrative.totalNetflow24h)} in 24h`,
        fill: netflowColor,
        fontSize: 15,
        fontFamily: FONT_MONO,
      },
    },
  ];
}

function buildFooterElements(
  isoTimestamp: string
): GraphicElement[] {
  return [
    // Divider line
    {
      type: "rect",
      left: 40,
      top: 628,
      shape: { width: 1120, height: 1 },
      style: { fill: DIVIDER_COLOR },
    },
    // Powered by
    {
      type: "text",
      left: 40,
      top: 645,
      style: {
        text: "Powered by Nansen Smart Money Data",
        fill: TEXT_SECONDARY,
        fontSize: 12,
        fontFamily: FONT_DISPLAY,
      },
    },
    // Date
    {
      type: "text",
      right: 40,
      top: 645,
      style: {
        text: formatDate(isoTimestamp),
        fill: TEXT_SECONDARY,
        fontSize: 12,
        fontFamily: FONT_DISPLAY,
      },
    },
  ];
}

function buildNoDataElements(): GraphicElement[] {
  return [
    {
      type: "text",
      left: 40,
      top: 28,
      style: {
        text: "NARRATIVE PULSE",
        fill: TEXT_WHITE,
        fontSize: 22,
        fontWeight: 800,
        fontFamily: FONT_DISPLAY,
      },
    },
    {
      type: "text",
      right: 40,
      top: 32,
      style: {
        text: "Smart Money Narrative Tracker",
        fill: TEXT_SECONDARY,
        fontSize: 13,
        fontFamily: FONT_DISPLAY,
      },
    },
    {
      type: "rect",
      left: 40,
      top: 65,
      shape: { width: 1120, height: 1 },
      style: { fill: DIVIDER_COLOR },
    },
    {
      type: "text",
      left: 40,
      top: 300,
      style: {
        text: "No data available",
        fill: TEXT_SECONDARY,
        fontSize: 24,
        fontFamily: FONT_DISPLAY,
        textAlign: "left",
      },
    },
    {
      type: "text",
      left: 40,
      top: 335,
      style: {
        text: "Run a scan first to generate a research card.",
        fill: TEXT_SECONDARY,
        fontSize: 14,
        fontFamily: FONT_DISPLAY,
      },
    },
    {
      type: "rect",
      left: 40,
      top: 628,
      shape: { width: 1120, height: 1 },
      style: { fill: DIVIDER_COLOR },
    },
    {
      type: "text",
      left: 40,
      top: 645,
      style: {
        text: "Powered by Nansen Smart Money Data",
        fill: TEXT_SECONDARY,
        fontSize: 12,
        fontFamily: FONT_DISPLAY,
      },
    },
  ];
}

// ============================================================
// Main Render Function
// ============================================================

/**
 * Render a shareable PNG research card (1200x675 — Twitter card size).
 * Shows the hottest narrative with top tokens, early signals, and the
 * coldest narrative in a dark-themed card layout.
 *
 * @param result - ScanResult from a completed scan
 * @returns Path to the saved PNG file in the output/ directory
 */
export async function renderResearchCard(result: ScanResult): Promise<string> {
  await mkdir("output", { recursive: true });

  // Build graphic elements
  const elements: GraphicElement[] = [];

  const hasNarratives =
    result.narratives && result.narratives.length > 0;

  if (!hasNarratives) {
    elements.push(...buildNoDataElements());
  } else {
    // Header
    elements.push(...buildHeaderElements());

    // Hottest narrative
    const hottest = pickHottestNarrative(result.narratives);
    let currentY = 88;

    if (hottest) {
      elements.push(...buildHotNarrativeElements(hottest, currentY));
      currentY += 40;

      // Top tokens from hottest narrative
      const topTokens = pickTopTokens(hottest.topTokens, 3);
      if (topTokens.length > 0) {
        elements.push(...buildTopTokensElements(topTokens, currentY));
        currentY += 30 + topTokens.length * 28 + 15;
      }
    }

    // Early signals (if any)
    const earlySignals = pickEarlySignals(result.earlySignals, 2);
    if (earlySignals.length > 0) {
      elements.push(...buildEarlySignalsElements(earlySignals, currentY));
      currentY += 30 + earlySignals.length * 28 + 20;
    }

    // Coldest narrative
    const coldest = pickColdestNarrative(
      result.narratives,
      hottest?.key
    );
    if (coldest) {
      elements.push(...buildColdNarrativeElements(coldest, currentY));
    }

    // Footer
    elements.push(...buildFooterElements(result.timestamp));
  }

  // Create ECharts instance in SSR mode
  const option = {
    backgroundColor: BG_COLOR,
    graphic: elements,
  };

  const chart = echarts.init(null, null, {
    renderer: "svg",
    ssr: true,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });

  try {
    chart.setOption(option as echarts.EChartsOption);

    const svgStr = chart.renderToSVGString({ useViewBox: true });

    const pngBuffer = await sharp(Buffer.from(svgStr))
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "fill" })
      .png()
      .toBuffer();

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const outputPath = join(
      "output",
      `research-card-${timestamp}.png`
    );

    await writeFile(outputPath, pngBuffer);

    return outputPath;
  } finally {
    chart.dispose();
  }
}
