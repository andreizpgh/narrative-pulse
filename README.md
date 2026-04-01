# 🔥 Narrative Pulse

> **Track WHERE Smart Money is rotating between crypto narratives — in real time.**

![Nansen CLI](https://img.shields.io/badge/Nansen-CLI_Build_Challenge-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6)
![Node.js](https://img.shields.io/badge/Node.js-ES2022-339933)
![License](https://img.shields.io/badge/License-MIT-green)

## What It Does

- **Detects Smart Money rotations** across crypto narratives using Nansen on-chain data
- **Classifies tokens** into 🔥 Hot / 👀 Watch / ⛔ Avoid based on netflow, price action, and volume
- **Visualizes narrative flows** with interactive Sankey diagrams and terminal reports

## Quick Start

```bash
# Install dependencies
npm install

# Login to Nansen CLI (one-time)
npx nansen login

# Run a narrative scan
npx narrative-pulse scan

# Start 24/7 watch mode
npx narrative-pulse watch

# List detected sectors
npx narrative-pulse sectors
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `scan` | One-time narrative scan across all chains |
| `watch` | 24/7 autonomous mode with periodic scans |
| `sectors` | Discover and list all detected sectors |

## Development

```bash
npm run dev     # Run in dev mode with tsx
npm run build   # Compile TypeScript
npm start       # Run compiled output
```

---

> ⚠️ **Under Construction** — This is an active scaffold for the Nansen CLI Build Challenge (Week 3). Full functionality coming soon.
