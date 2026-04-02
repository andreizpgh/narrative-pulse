// ============================================================
// Chart — Smart Money Narrative Flows (SSR)
// PNG: horizontal bar chart (clean, labels never clip)
// HTML: interactive Sankey (kept in html-report.ts)
// ============================================================

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as echarts from "echarts";
import sharp from "sharp";

import type { NarrativeSummary, NarrativeRotation } from "../types.js";

// ============================================================
// Constants
// ============================================================

const CHART_WIDTH = 1600;
const CHART_HEIGHT = 800;
const MAX_NARRATIVES = 10;

// Dark theme palette
const BG_COLOR = "#1a1a2e";
const TEXT_TITLE = "#ffffff";
const TEXT_LABEL = "#e0e0e0";
const TEXT_SECONDARY = "#a0a0b0";

// Minimum absolute netflow to include in the chart
const MIN_CHART_NETFLOW = 500;

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Chart] ${message}`);
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const prefix = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${prefix}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${prefix}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${prefix}$${(abs / 1e3).toFixed(1)}K`;
  return `${prefix}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Pick top N narratives sorted by absolute netflow (descending),
 * excluding those with |netflow| < MIN_CHART_NETFLOW.
 */
function topNarratives(
  narratives: NarrativeSummary[],
  limit: number
): NarrativeSummary[] {
  return [...narratives]
    .filter(n => Math.abs(n.totalNetflow24h) >= MIN_CHART_NETFLOW)
    .sort((a, b) => Math.abs(b.totalNetflow24h) - Math.abs(a.totalNetflow24h))
    .slice(0, limit);
}

// ============================================================
// Bar Chart Option Builder
// ============================================================

function buildBarChartOption(narratives: NarrativeSummary[]): echarts.EChartsOption {
  const top = topNarratives(narratives, MAX_NARRATIVES);

  // Data reversed so largest absolute netflow appears at top of chart
  const reversedData = [...top].reverse();

  return {
    backgroundColor: BG_COLOR,
    title: {
      text: "Smart Money — Narrative Flows (24h)",
      left: "center",
      top: 20,
      textStyle: { fontSize: 20, fontWeight: 700, color: TEXT_TITLE },
    },
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
      backgroundColor: "rgba(26,26,46,0.95)",
      borderColor: "#2a2a4a",
      textStyle: { color: TEXT_LABEL, fontSize: 13 },
      formatter: function (params: unknown): string {
        const p = (params as Array<{ name: string; value: number }>)[0];
        if (!p) return "";
        const direction = p.value >= 0 ? "Inflow" : "Outflow";
        return `<strong>${p.name}</strong><br/>${direction}: <strong>${formatUsd(p.value)}</strong>`;
      },
    },
    grid: {
      left: 160,
      right: 100,
      top: 70,
      bottom: 40,
    },
    xAxis: {
      type: "value" as const,
      axisLabel: {
        color: TEXT_SECONDARY,
        fontSize: 11,
        formatter: function (val: number): string {
          if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + "M";
          if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(0) + "K";
          return val.toString();
        },
      },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    },
    yAxis: {
      type: "category" as const,
      data: reversedData.map(n => n.displayName),
      axisLabel: { color: TEXT_LABEL, fontSize: 13 },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar" as const,
        data: reversedData.map(n => ({
          value: n.totalNetflow24h,
          itemStyle: {
            color:
              n.totalNetflow24h >= 0
                ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: "rgba(46,204,113,0.3)" },
                    { offset: 1, color: "rgba(46,204,113,0.8)" },
                  ])
                : new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: "rgba(231,76,60,0.3)" },
                    { offset: 1, color: "rgba(231,76,60,0.8)" },
                  ]),
          },
        })),
        barWidth: "60%",
        label: {
          show: true,
          position: "right" as const,
          color: TEXT_LABEL,
          fontSize: 12,
          fontFamily: "SF Mono, Fira Code, Consolas, monospace",
          formatter: function (params: unknown): string {
            const p = params as { value: number };
            return formatUsd(p.value);
          },
        },
      },
    ],
  };
}

// ============================================================
// Main Render Function
// ============================================================

/**
 * Render a horizontal bar chart visualising Smart Money narrative flows.
 * Green bars = inflow (accumulation), Red bars = outflow (distribution).
 *
 * @param narratives - List of narrative summaries
 * @param _rotations - Unused (kept for API compatibility). Rotation mode removed.
 * @returns Path to the saved PNG file in the output/ directory
 */
export async function renderSankey(
  narratives: NarrativeSummary[],
  _rotations: NarrativeRotation[]
): Promise<string> {
  if (narratives.length === 0) {
    throw new Error("No narratives to render");
  }

  const filtered = topNarratives(narratives, MAX_NARRATIVES);
  if (filtered.length === 0) {
    throw new Error("No narratives with meaningful netflow to render");
  }

  await mkdir("output", { recursive: true });

  log(`Rendering bar chart with ${filtered.length} narratives`);

  const chart = echarts.init(null, null, {
    renderer: "svg",
    ssr: true,
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  });

  try {
    const option = buildBarChartOption(narratives);
    chart.setOption(option);

    const svgStr = chart.renderToSVGString({ useViewBox: true });

    const pngBuffer = await sharp(Buffer.from(svgStr))
      .resize(CHART_WIDTH, CHART_HEIGHT, { fit: "fill" })
      .png()
      .toBuffer();

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const outputPath = join("output", `narrative-flows-${timestamp}.png`);

    await writeFile(outputPath, pngBuffer);
    log(`Saved bar chart to ${outputPath} (${CHART_WIDTH}x${CHART_HEIGHT})`);

    return outputPath;
  } finally {
    chart.dispose();
  }
}
