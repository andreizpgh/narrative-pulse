# Narrative Pulse — Problem List & Fix Plan

> **Created**: 2026-04-05
> **Last Updated**: 2026-04-05 (end of session — major progress)
> **Status**: Nearly submission-ready, only P2 polish remaining
> **Deadline**: April 5, 2026
> **Credits Remaining**: ~6520

## Priority Legend
- 🔴 P0 — Blocks core functionality or makes product look broken
- 🟡 P1 — Significant quality issue, hurts presentation for judges
- 🟢 P2 — Polish, nice to have
- ✅ RESOLVED — Fixed and verified

---

## ✅ RESOLVED ISSUES

### ✅ P0-01: Narrative column empty for 29/30 tokens
**Fix**: Heuristic narrative classifier (`src/engine/narrative-heuristic.ts`) + symbol-only matching fallback. Tokens without `token_sectors` from API now get narratives from a keyword-based classifier matching token names/symbols against known sector keywords (AI, DeFi, Gaming, Meme, etc.). Also added `netflowBySymbol` map for cross-chain matching.

**Commits**: `ed0386b`, `2c7b62a`

---

### ✅ P0-03: Stablecoins appearing in highlights — false divergence signals
**Fix**: Expanded `STRUCTURAL_NOISE_PATTERNS`, added price-based stablecoin filter ($0.99–$1.01 → stablecoin), and added 30d netflow guard + AI prompt guardrails to prevent false "accumulation before pump" classification for long-term accumulated tokens.

**Commits**: `ed0386b`, `e43e12b`

---

### ✅ P0-02: Bar chart shows too few narratives
**Fix**: Smart threshold — show top-10 narratives by absolute netflow, not arbitrary $100 cutoff. Now shows both inflow (green) and outflow (red) bars.

**Commit**: `0abdfe0`

---

### ✅ P1-09: Red narratives (outflows) not shown
**Fix**: Diverging bar chart with inflows (green, right) and outflows (red, left). Both are clickable and filter the table.

**Commit**: `0abdfe0`

---

### ✅ P1-01: Expanded card layout wastes space
**Fix**: Restructured to 2-column layout. Left column: metrics + flow intelligence. Right column: AI Analysis (square block, not thin strip). DexScreener link spans full width.

**Commit**: `f55f3e5`

---

### ✅ P1-04: Selling card doesn't filter the table
**Fix**: Added "Selling" label with distinct "Distributing" option in dropdown. SELLING card now properly filters to show mixed + distributing tokens.

**Commit**: `3b9dc95`

---

### ✅ P1-05: Header looks ugly
**Fix**: Uniform 34px height, center alignment, premium header styling with gradient accent line, proper spacing and visual hierarchy.

**Commits**: `3b9dc95`, `9b03143`, `3b3911b`

---

### ✅ P1-06: Sorting arrows painfully small
**Fix**: Inline sort arrows after text, 0.85rem size, proper hover states. Active sort arrow more prominent.

**Commit**: `9b03143`

---

### ✅ P1-07: Expand triangle misaligned during rotation
**Fix**: CSS chevron using border-trick instead of Unicode character. Predictable centering and smooth rotation.

**Commit**: `9b03143`

---

### ✅ P1-02: AI Analysis loading animation
**Fix**: Smooth height transitions (min-height 120px, flex:1 children). Shimmer → loading → result transitions are smooth, not abrupt.

**Commit**: `7f60a9c`

---

### ✅ Additional fixes implemented this session:

- ✅ **Emoji consistency** between signal cards and table badges (⚠️ for SELLING, matching across all views)
- ✅ **AI block smooth height transitions** (min-height 120px, flex:1 children prevent layout jumps)
- ✅ **Stablecoin visual marker** (STABLE tag shown in table for stablecoins)
- ✅ **False divergence fix** (30d netflow guard — don't flag as diverging if 30d netflow is already large + AI prompt guardrails)
- ✅ **Token descriptions from DexScreener** (feed-based, cached via `fetchTokenProfiles()`)
- ✅ **Signal card hover animation** (gradient border effect on hover)
- ✅ **Filter dropdown dark styling** (dark background for options)
- ✅ **Dark scrollbar + selection highlight** (consistent dark theme throughout)
- ✅ **Loading shimmer** (professional skeleton animation)
- ✅ **Footer polish** (clean, minimal)
- ✅ **DexScreener token profile descriptions** in expanded card (with icon)
- ✅ **Contest README** (professional, with screenshots)
- ✅ **Screenshots directory** for contest submission

---

## REMAINING ISSUES

### 🟡 P1-03: AI Analysis markdown rendering incomplete
**Status**: Partially fixed (bold, headers work). Lists and numbered lists may still need improvement.
**Files**: `src/visual/dashboard.ts` — `renderMarkdown()`

---

### 🟡 P1-08: Flow Intelligence section — looks empty with only 1 row
**Status**: Not yet addressed. When only 1 of 6 categories has non-zero data, section looks sparse.
**Files**: `src/visual/dashboard.ts` — `renderFlowIntelligence()`

---

### 🟢 P2-01: Custom-styled tooltips
**Status**: Not implemented. All tooltips still use native `title="..."` attribute.
**Files**: `src/visual/dashboard.ts` — CSS section

---

### 🟢 P2-02: System-styled dropdowns partially fixed
**Status**: Dark option background added, but popup is still OS-native `<select>`. Full custom dropdown would require significant CSS/JS effort.
**Files**: `src/visual/dashboard.ts` — CSS for `.filter-select`

---

## Implementation Progress

### ✅ Phase 1: Critical fixes — ALL DONE
1. ~~P0-01 (narratives) — heuristic classifier + symbol-only matching~~ ✅
2. ~~P0-03 (stablecoins) — expanded noise filter + price-based detection~~ ✅
3. ~~P0-02 (bar chart) — top-10 narratives, smart threshold~~ ✅
4. ~~P1-09 (red narratives) — diverging bar chart with inflows + outflows~~ ✅

### ✅ Phase 2: Layout & interactions — ALL DONE
5. ~~P1-01 (expanded card 2-column layout) — restructured~~ ✅
6. ~~P1-04 (selling card filter) — logic fix + "Selling" label~~ ✅
7. ~~P1-02 (AI loading animation) — smooth transitions~~ ✅
8. ~~P1-07 (expand triangle) — CSS chevron~~ ✅

### ✅ Phase 3: Polish — MOSTLY DONE
9. ~~P1-05 (header redesign) — uniform height, center alignment~~ ✅
10. ~~P1-06 (sort arrows) — inline, 0.85rem~~ ✅
11. ~~AI markdown (partial)~~ ✅
12. ~~Dark scrollbar, selection, shimmer, footer~~ ✅
13. ~~Token descriptions from DexScreener~~ ✅

### Remaining
14. P1-03 (full AI markdown)
15. P1-08 (flow intel compact)
16. P2-01 (custom tooltips)
17. P2-02 (fully custom dropdowns — low priority)
