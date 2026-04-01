# 🔥 Narrative Pulse

> **Track WHERE Smart Money is rotating between crypto narratives — in real time.**

![Nansen CLI](https://img.shields.io/badge/Nansen-CLI_Build_Challenge-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📸 What It Looks Like

<!--
  IMPORTANT: Judges scan README in 30-60 seconds.
  This section should be the FIRST thing they see after the title.
  TODO: Add actual screenshots after first real API run:

  ![Sankey Diagram](docs/demo-sankey.png)
  ![Terminal Report](docs/demo-terminal.png)
  ![HTML Report](docs/demo-html.png)
-->

> 📸 **Screenshots coming soon** — Sankey diagram, CLI output, HTML report

---

## 🧠 The Problem

Everyone tracks Smart Money at the **token** level.

1,000 tokens with positive netflow is **noise**. What actually matters is *where capital is flowing at the macro level*: from DeFi → AI? From Memecoins → RWA? That's the **narrative** level — and nobody covers it.

---

## 💡 The Solution

**Narrative Pulse** aggregates Smart Money data at the **narrative** (sector) level, not individual tokens:

1. **🔍 Discovery** — Fetches Smart Money netflows across 5 chains, discovers all sectors
2. **📊 Aggregation** — Groups tokens by narrative (AI, DeFi, RWA, DePIN...) using `token_sectors`
3. **🏷 Classification** — Labels tokens as 🔥 Hot / 👀 Watch / ⛔ Avoid
4. **🤖 Deep Dive** — Uses Nansen Agent API to break down the top narrative into sub-narratives
5. **🗺 Visualization** — Generates Sankey rotation maps, terminal tables, and HTML reports
6. **⏰ 24/7 Mode** — Runs autonomously on a cron schedule, tracking rotations over time

---

## 🏗 How It Works

```
Nansen API ──► Sector Discovery
     │
     ├──► Smart Money Netflows (5 chains)
     │         │
     │         ▼
     │    Narrative Aggregation
     │         │
     │    ┌────┴────────┐
     │    ▼              ▼
     │  Hot/Watch/Avoid   Sub-narratives (Agent API)
     │    │
     │    ▼
     │  Visual Reports (Sankey + Tables + HTML)
     │
     └──► Rotation Tracking (delta between scans)
     │
     └──► Cron Scheduler (24/7 autonomous)
```

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/<your-username>/narrative-pulse.git
cd narrative-pulse
npm install

# 2. Authenticate with Nansen (one-time)
nansen login --api-key <YOUR_KEY>
# or: export NANSEN_API_KEY=<YOUR_KEY>

# 3. Run your first scan
npx narrative-pulse scan

# 4. Start 24/7 watch mode (optional)
npx narrative-pulse watch
```

### Expected Output

```
═════════════════════════════════════════════════════════════
  🔥 NARRATIVE PULSE — Smart Money Rotation Report
═════════════════════════════════════════════════════════════
  Date:       2026-04-01 12:00:00 UTC
  Narratives: 8 detected
  Sectors:    AI, DeFi, Meme, RWA, Infrastructure, Gaming...

━━━ AI (32 tokens, 24h netflow: +$2.3M) ━━━

  🔥 Hot Tokens
  ┌──────────┬───────────────┬────────────┬─────────┬──────────┐
  │ Token    │ Netflow 24h   │ Price Δ    │ Traders │ MarketCap│
  ├──────────┼───────────────┼────────────┼─────────┼──────────┤
  │ RENDER   │ +$890K        │ +8.2%      │ 47      │ $1.2B    │
  │ FET      │ +$650K        │ +5.1%      │ 31      │ $890M    │
  └──────────┴───────────────┴────────────┴─────────┴──────────┘

  👀 Watch Tokens
  │ AKT      │ +$340K        │ -0.3%      │ 12      │ $456M    │

  ⛔ Avoid Tokens
  (none)

━━━ Top Rotations ━━━
  💸 DeFi → AI          +$47M
  💸 Memecoins → RWA    +$12M
  📉 Gaming → DePIN     -$8.5M
```

---

## 📋 CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `scan` | One-time narrative scan across all chains | `npx narrative-pulse scan` |
| `scan --no-sankey` | Skip Sankey diagram generation | `npx narrative-pulse scan --no-sankey` |
| `scan --no-html` | Skip HTML report generation | `npx narrative-pulse scan --no-html` |
| `watch` | Start 24/7 autonomous mode (every 4h) | `npx narrative-pulse watch` |
| `watch --schedule "0 */2 * * *"` | Custom cron schedule (every 2h) | `npx narrative-pulse watch -s "0 */2 * * *"` |
| `watch --no-sankey` | Skip Sankey diagram in watch mode | `npx narrative-pulse watch --no-sankey` |
| `watch --no-html` | Skip HTML report in watch mode | `npx narrative-pulse watch --no-html` |
| `sectors` | Discover and list all detected sectors | `npx narrative-pulse sectors` |

---

## 🏷 Hot / Watch / Avoid Classification

| Category | Logic | Interpretation |
|----------|-------|---------------|
| 🔥 **Hot** | SM netflow > 0 AND price change > 0 AND buy volume > sell volume | Smart Money is accumulating AND price is moving — trend confirmed |
| 👀 **Watch** | SM netflow > 0 AND price change ≤ 0 | Smart Money is accumulating but price hasn't moved yet — early signal |
| ⛔ **Avoid** | SM netflow < -threshold | Smart Money is distributing — exit phase |

---

## 📊 API Calls Per Scan

| # | Endpoint | Purpose | Credits |
|---|----------|---------|:-------:|
| 1-5 | `smart-money/netflows` | SM netflows per chain (5 chains) | 25 |
| 6-10 | `tgm/token-screener` | Price/volume data per chain | 5 |
| 11 | `agent/fast` | Sub-narrative analysis for top narrative | 200 |
| | **Total** | | **~230** |

---

## 🗂 Project Structure

```
src/
├── index.ts              # CLI entry point (commander)
├── types.ts              # All TypeScript interfaces
├── config.ts             # Chains, thresholds, cron schedule
├── api/
│   ├── client.ts         # HTTP client (auth, rate limits, retry)
│   ├── netflows.ts       # smart-money/netflows wrapper
│   ├── token-screener.ts # tgm/token-screener wrapper
│   └── agent.ts          # agent/fast (Nansen AI agent)
├── engine/
│   ├── discovery.ts      # Sector discovery from netflow data
│   ├── aggregator.ts     # Token-to-narrative aggregation
│   ├── classifier.ts     # Hot/Watch/Avoid classification
│   ├── sub-narratives.ts # Agent API sub-narrative generation
│   ├── rotations.ts      # Rotation tracking (delta between scans)
│   └── scanner.ts        # Full pipeline orchestrator (6 steps)
├── visual/
│   ├── sankey.ts         # ECharts SSR → SVG → PNG
│   ├── html-report.ts    # Standalone HTML with ECharts CDN
│   └── terminal-report.ts # chalk + cli-table3 formatted output
└── scheduler/
    └── cron.ts           # node-cron 24/7 autonomous mode
```

---

## 🎯 Key Features

- **Multi-chain** — Tracks Smart Money across Ethereum, Solana, Base, BNB, Arbitrum
- **Narrative-level aggregation** — Groups tokens by sector combinations (AI, AI+Infrastructure, DeFi+Layer2...)
- **Smart classification** — Hot/Watch/Avoid based on netflow, price, and volume signals
- **Sub-narrative AI** — Nansen Agent API deep-dives into the hottest narrative
- **Rotation tracking** — Detects capital flows between narratives over time
- **Visual reports** — Sankey rotation map (PNG) + terminal tables + interactive HTML
- **24/7 autonomous** — Cron scheduler with graceful shutdown and error recovery
- **Snapshot persistence** — Saves scan state for trend detection between runs

---

## ⚡ Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | TypeScript (ESM, strict) | Type safety, developer experience |
| Runtime | Node.js 20+ | Nansen CLI compatibility |
| Data Source | Nansen Research API + Agent API | Core requirement of the challenge |
| Visualization | Apache ECharts (SSR) | Server-side rendering, no browser needed |
| Image | Sharp | SVG → PNG conversion |
| CLI | Commander.js | Command parsing and help generation |
| Scheduling | node-cron | 24/7 autonomous mode |
| Terminal | chalk + cli-table3 | Beautiful CLI output |

---

## 🔧 Development

```bash
npm run dev       # Run with tsx (hot reload)
npm run build     # Compile TypeScript → dist/
npm start         # Run compiled output
npm run scan      # Shortcut: tsx src/index.ts scan
npm run watch     # Shortcut: tsx src/index.ts watch
```

---

## 📝 Nansen API Integration

Narrative Pulse leverages **3 Nansen API endpoints**:

### 1. Smart Money Netflows (`smart-money/netflows`)
The core data source. Returns token-level Smart Money net flow with `token_sectors` — the key field that enables narrative-level aggregation.

### 2. Token Screener (`tgm/token-screener`)
Provides price change, volume, and buy/sell breakdown — essential for Hot/Watch/Avoid classification.

### 3. Agent API (`agent/fast`)
AI-powered analysis that breaks down the top narrative into sub-narratives with conviction ratings. Used selectively for the #1 narrative only.

---

## 📄 License

MIT

---

> Built for the [Nansen CLI Build Challenge](https://nansen.ai) — Week 3
>
> Tag: @nansen_ai · #NansenCLI
