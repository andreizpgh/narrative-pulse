// ============================================================
// Sankey Diagram — Narrative Rotation Map (SSR via ECharts)
// Renders a capital flow visualization between narratives
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

const COLOR_HOT = "#2ecc71";
const COLOR_COLD = "#e74c3c";
const COLOR_LINK_INFLOW = "rgba(46, 204, 113, 0.5)";
const COLOR_LINK_OUTFLOW = "rgba(231, 76, 60, 0.5)";

// ============================================================
// Types (local, for ECharts data structures)
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

// ============================================================
// Helpers
// ============================================================

function log(message: string): void {
  console.log(`[Sankey] ${message}`);
}

/**
 * Build a lookup map from NarrativeKey → displayName.
 * Falls back to replacing "+" with " " if the key is not found.
 */
function buildNameMap(narratives: NarrativeSummary[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const n of narratives) {
    map.set(n.key, n.displayName);
  }
  return map;
}

/**
 * Resolve a NarrativeKey to a display name for the Sankey diagram.
 */
function resolveName(key: string, nameMap: Map<string, string>): string {
  return nameMap.get(key) ?? key.replace(/\+/g, " ");
}

// ============================================================
// Build Nodes
// ============================================================

function buildNodes(narratives: NarrativeSummary[]): SankeyNode[] {
  return narratives.map((n) => ({
    name: n.displayName,
    itemStyle: {
      color: n.isHot ? COLOR_HOT : COLOR_COLD,
    },
  }));
}

// ============================================================
// Build Links (with cycle deduplication)
// ============================================================

/**
 * Sankey diagrams require a DAG — no cycles allowed.
 * If A→B and B→A both exist, keep only the link with the larger value.
 * This ensures the graph is always acyclic.
 */
function deduplicateCycles(
  rotations: NarrativeRotation[],
  nameMap: Map<string, string>
): NarrativeRotation[] {
  // Track pairs: always store with sorted key so A↔B maps to same entry
  const pairMap = new Map<string, NarrativeRotation>();

  for (const r of rotations) {
    const sourceName = resolveName(r.from, nameMap);
    const targetName = resolveName(r.to, nameMap);
    // Sort names to create a canonical pair key
    const pairKey = [sourceName, targetName].sort().join("||");

    const existing = pairMap.get(pairKey);
    if (!existing) {
      pairMap.set(pairKey, r);
    } else {
      // Keep the rotation with the larger absolute value
      if (Math.abs(r.valueUsd) > Math.abs(existing.valueUsd)) {
        pairMap.set(pairKey, r);
      }
    }
  }

  return Array.from(pairMap.values());
}

function buildLinks(
  rotations: NarrativeRotation[],
  nameMap: Map<string, string>
): SankeyLink[] {
  const dedupedRotations = deduplicateCycles(rotations, nameMap);

  return dedupedRotations.map((r) => ({
    source: resolveName(r.from, nameMap),
    target: resolveName(r.to, nameMap),
    value: Math.abs(r.valueUsd),
    lineStyle: {
      color: r.direction === "inflow" ? COLOR_LINK_INFLOW : COLOR_LINK_OUTFLOW,
    },
  }));
}

// ============================================================
// Main Render Function
// ============================================================

/**
 * Render a Sankey diagram visualizing capital flows between narratives.
 *
 * @param narratives - List of narrative summaries (become nodes)
 * @param rotations - List of rotations between narratives (become links)
 * @returns Path to the saved PNG file in the output/ directory
 */
export async function renderSankey(
  narratives: NarrativeSummary[],
  rotations: NarrativeRotation[]
): Promise<string> {
  if (narratives.length === 0) {
    throw new Error("No narratives to render");
  }

  // Ensure output directory exists
  await mkdir("output", { recursive: true });

  // Build data structures
  const nameMap = buildNameMap(narratives);
  const nodes = buildNodes(narratives);
  const links = buildLinks(rotations, nameMap);

  // Initialize ECharts in SSR mode
  const chart = echarts.init(null, null, {
    renderer: "svg",
    ssr: true,
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  });

  try {
    // Configure chart options
    chart.setOption({
      title: {
        text: "Narrative Rotation Map — Smart Money Flows",
        left: "center",
        textStyle: { fontSize: 24, color: "#333" },
      },
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
      },
      series: [
        {
          type: "sankey",
          layout: "none",
          emphasis: { focus: "adjacency" },
          nodeAlign: "justify",
          nodeGap: 20,
          nodeWidth: 30,
          layoutIterations: 32,
          label: { fontSize: 14, color: "#333" },
          lineStyle: {
            color: "gradient",
            curveness: 0.5,
            opacity: 0.4,
          },
          data: nodes,
          links: links,
        },
      ],
    });

    // Render SVG string
    const svgStr = chart.renderToSVGString({ useViewBox: true });

    // Convert SVG → PNG via sharp
    const pngBuffer = await sharp(Buffer.from(svgStr)).png().toBuffer();

    // Save to output directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outputPath = join("output", `narrative-rotation-${timestamp}.png`);
    await writeFile(outputPath, pngBuffer);

    log(`Saved rotation map to ${outputPath} (${CHART_WIDTH}x${CHART_HEIGHT})`);

    return outputPath;
  } finally {
    chart.dispose();
  }
}
