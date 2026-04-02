// ============================================================
// Sankey Diagram — Smart Money Capital Allocation Map (SSR)
// Two modes:
//   1. Allocation Sankey: "Smart Money" → Top 12 narratives
//      (always works, even on first run with zero rotations)
//   2. Rotation Sankey: narrative → narrative flows
//      (only when 2+ scans produced meaningful rotations)
// ============================================================

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as echarts from "echarts";
import sharp from "sharp";

import type { NarrativeSummary, NarrativeRotation } from "../types.js";

// ============================================================
// Constants
// ============================================================

const CHART_WIDTH = 1200;
const CHART_HEIGHT = 800;
const MAX_NARRATIVES = 12;

// Dark theme palette (matches HTML report)
const BG_COLOR = "#1a1a2e";
const TEXT_TITLE = "#ffffff";
const TEXT_LABEL = "#e0e0e0";
const TEXT_SECONDARY = "#a0a0b0";

// Node / link colors
const COLOR_SM_SOURCE = "#6c5ce7"; // purple for "Smart Money" node
const COLOR_INFLOW = "#2ecc71";
const COLOR_OUTFLOW = "#e74c3c";
const COLOR_LINK_INFLOW = "rgba(46, 204, 113, 0.45)";
const COLOR_LINK_OUTFLOW = "rgba(231, 76, 60, 0.45)";

// Minimum rotation links required to use rotation mode
const MIN_ROTATION_LINKS = 3;

// ============================================================
// Local Types (ECharts data structures)
// ============================================================

interface SankeyNode {
  name: string;
  itemStyle: { color: string };
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  lineStyle: { color: string };
}

interface SankeyData {
  title: string;
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Sankey] ${message}`);
}

/**
 * Format USD value for tooltip display.
 */
function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Resolve a NarrativeKey to a display name.
 * Falls back to replacing "+" with space.
 */
function resolveName(
  key: string,
  nameMap: Map<string, string>
): string {
  return nameMap.get(key) ?? key.replace(/\+/g, " ");
}

/**
 * Build lookup map: NarrativeKey → displayName
 */
function buildNameMap(narratives: NarrativeSummary[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const n of narratives) {
    map.set(n.key, n.displayName);
  }
  return map;
}

/**
 * Pick top N narratives sorted by absolute netflow (descending).
 */
function topNarratives(
  narratives: NarrativeSummary[],
  limit: number
): NarrativeSummary[] {
  return [...narratives]
    .sort((a, b) => Math.abs(b.totalNetflow24h) - Math.abs(a.totalNetflow24h))
    .slice(0, limit);
}

// ============================================================
// Allocation Sankey — Smart Money → Narratives
// ============================================================

/**
 * Build the "allocation" Sankey: one source node ("Smart Money")
 * linked to each of the top narratives.
 */
function buildAllocationData(narratives: NarrativeSummary[]): SankeyData {
  const top = topNarratives(narratives, MAX_NARRATIVES);

  const sourceNode: SankeyNode = {
    name: "Smart Money",
    itemStyle: { color: COLOR_SM_SOURCE },
  };

  const narrativeNodes: SankeyNode[] = top.map((n) => ({
    name: n.displayName,
    itemStyle: {
      color: n.totalNetflow24h >= 0 ? COLOR_INFLOW : COLOR_OUTFLOW,
    },
  }));

  const links: SankeyLink[] = top.map((n) => {
    const isInflow = n.totalNetflow24h >= 0;
    return {
      source: "Smart Money",
      target: n.displayName,
      // Minimum value of 1 so zero-netflow narratives still show as thin lines
      value: Math.abs(n.totalNetflow24h) || 1,
      lineStyle: {
        color: isInflow ? COLOR_LINK_INFLOW : COLOR_LINK_OUTFLOW,
      },
    };
  });

  return {
    title: "Smart Money — Capital Allocation Map",
    nodes: [sourceNode, ...narrativeNodes],
    links,
  };
}

// ============================================================
// Rotation Sankey — Narrative → Narrative
// ============================================================

/**
 * Deduplicate bidirectional cycles (A↔B): keep only the larger flow.
 * Sankey requires a DAG — no cycles allowed.
 */
function deduplicateCycles(
  rotations: NarrativeRotation[],
  nameMap: Map<string, string>
): NarrativeRotation[] {
  const pairMap = new Map<string, NarrativeRotation>();

  for (const r of rotations) {
    const src = resolveName(r.from, nameMap);
    const tgt = resolveName(r.to, nameMap);
    const pairKey = [src, tgt].sort().join("||");

    const existing = pairMap.get(pairKey);
    if (!existing || Math.abs(r.valueUsd) > Math.abs(existing.valueUsd)) {
      pairMap.set(pairKey, r);
    }
  }

  return Array.from(pairMap.values());
}

/**
 * Build the "rotation" Sankey: narrative → narrative capital flows.
 */
function buildRotationData(
  narratives: NarrativeSummary[],
  rotations: NarrativeRotation[],
  nameMap: Map<string, string>
): SankeyData {
  const deduped = deduplicateCycles(rotations, nameMap);

  // Collect unique narrative names that appear in any rotation
  const nameSet = new Set<string>();
  for (const r of deduped) {
    nameSet.add(resolveName(r.from, nameMap));
    nameSet.add(resolveName(r.to, nameMap));
  }

  // Build a quick lookup: displayName → NarrativeSummary (for coloring)
  const narrativeLookup = new Map<string, NarrativeSummary>();
  for (const n of narratives) {
    narrativeLookup.set(n.displayName, n);
  }

  const nodes: SankeyNode[] = Array.from(nameSet).map((name) => {
    const n = narrativeLookup.get(name);
    const color = n
      ? n.totalNetflow24h >= 0
        ? COLOR_INFLOW
        : COLOR_OUTFLOW
      : TEXT_SECONDARY;
    return { name, itemStyle: { color } };
  });

  const links: SankeyLink[] = deduped.map((r) => ({
    source: resolveName(r.from, nameMap),
    target: resolveName(r.to, nameMap),
    value: Math.abs(r.valueUsd) || 1,
    lineStyle: {
      color:
        r.direction === "inflow" ? COLOR_LINK_INFLOW : COLOR_LINK_OUTFLOW,
    },
  }));

  return {
    title: "Narrative Rotation Map — Capital Flows",
    nodes,
    links,
  };
}

// ============================================================
// ECharts Option Builder
// ============================================================

function buildEchartsOption(data: SankeyData): echarts.EChartsOption {
  return {
    backgroundColor: BG_COLOR,
    title: {
      text: data.title,
      left: "center",
      top: 16,
      textStyle: {
        fontSize: 22,
        fontWeight: 700,
        color: TEXT_TITLE,
      },
    },
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      backgroundColor: "rgba(26, 26, 46, 0.95)",
      borderColor: "#2a2a4a",
      textStyle: { color: TEXT_LABEL, fontSize: 13 },
      formatter: (params: unknown) => {
        // ECharts tooltip formatter in SSR — return plain string
        const p = params as {
          dataType?: string;
          name?: string;
          data?: { source?: string; target?: string; value?: number };
        };
        if (p.dataType === "edge" && p.data) {
          const { source, target, value } = p.data;
          const formatted = value != null ? formatUsd(value) : "N/A";
          return `${source} → ${target}<br/>Flow: ${formatted}`;
        }
        return p.name ?? "";
      },
    },
    series: [
      {
        type: "sankey",
        emphasis: { focus: "adjacency" },
        nodeAlign: "justify",
        nodeGap: 16,
        nodeWidth: 24,
        layoutIterations: 32,
        top: 70,
        bottom: 40,
        left: 60,
        right: 60,
        label: {
          fontSize: 13,
          color: TEXT_LABEL,
          fontWeight: 500,
        },
        lineStyle: {
          color: "gradient",
          curveness: 0.5,
          opacity: 0.35,
        },
        data: data.nodes,
        links: data.links,
      },
    ],
  };
}

// ============================================================
// Main Render Function
// ============================================================

/**
 * Render a Sankey diagram visualising Smart Money capital allocation.
 *
 * Two modes:
 *  - **Allocation** (default): "Smart Money" → top 12 narratives.
 *    Always renders, even on the first run when rotations are empty.
 *  - **Rotation**: narrative → narrative capital flows.
 *    Used only when enough rotation links exist (requires 2+ scans).
 *
 * @param narratives - List of narrative summaries
 * @param rotations  - List of rotations between narratives (empty on first run)
 * @returns Path to the saved PNG file in the output/ directory
 */
export async function renderSankey(
  narratives: NarrativeSummary[],
  rotations: NarrativeRotation[]
): Promise<string> {
  if (narratives.length === 0) {
    throw new Error("No narratives to render");
  }

  await mkdir("output", { recursive: true });

  // Decide which mode to use
  const nameMap = buildNameMap(narratives);
  const useRotationMode =
    rotations.length >= MIN_ROTATION_LINKS;

  const data: SankeyData = useRotationMode
    ? buildRotationData(narratives, rotations, nameMap)
    : buildAllocationData(narratives);

  const mode = useRotationMode ? "rotation" : "allocation";
  log(`Mode: ${mode} (${data.nodes.length} nodes, ${data.links.length} links)`);

  // Initialize ECharts in SSR mode
  const chart = echarts.init(null, null, {
    renderer: "svg",
    ssr: true,
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  });

  try {
    const option = buildEchartsOption(data);
    chart.setOption(option);

    // Render SVG string
    const svgStr = chart.renderToSVGString({ useViewBox: true });

    // Convert SVG → PNG via sharp, compositing on dark background
    // (ECharts SVG may not include a rect for backgroundColor in SSR mode)
    const pngBuffer = await sharp({
      create: {
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
        channels: 4,
        background: { r: 26, g: 26, b: 46, alpha: 1 }, // #1a1a2e
      },
    })
      .composite([{ input: Buffer.from(svgStr), blend: "over" }])
      .png()
      .toBuffer();

    // Save to output directory with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const prefix = useRotationMode ? "narrative-rotation" : "capital-allocation";
    const outputPath = join("output", `${prefix}-${timestamp}.png`);

    await writeFile(outputPath, pngBuffer);
    log(`Saved ${mode} map to ${outputPath} (${CHART_WIDTH}x${CHART_HEIGHT})`);

    return outputPath;
  } finally {
    chart.dispose();
  }
}
