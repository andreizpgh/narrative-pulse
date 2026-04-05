# Narrative Pulse — Problem List & Fix Plan

> **Created**: 2026-04-05
> **Last Updated**: 2026-04-05 (after user feedback session)
> **Status**: Active development, final polish before contest submission
> **Deadline**: April 5, 2026
> **Credits Remaining**: ~6880

## Priority Legend
- 🔴 P0 — Blocks core functionality or makes product look broken
- 🟡 P1 — Significant quality issue, hurts presentation for judges
- 🟢 P2 — Polish, nice to have

---

## 🔴 P0-01: Narrative column empty for 29/30 tokens

**Symptom**: Only 1 of 30 screener highlights has a narrative. The rest show "—".

**Root cause**: THREE compounding issues:
1. `TokenScreenerEntry` (src/types.ts) does NOT declare `token_sectors` — even if Nansen returns it, we ignore it
2. Cross-reference in `screener-highlights.ts` matches by `(address)` or `(symbol:chain)` — but NOT `(symbol only)`. Tokens on different chains = no match
3. Holdings cross-reference in `scanner.ts` only matches by address — no symbol fallback

**Dependencies**: ✅ RESOLVED — Nansen token-screener does NOT return `token_sectors` (confirmed 2026-04-05, see `docs/NANSEN-API-RESEARCH.md`). Only netflow and holdings endpoints have sector data.

**Fix plan** (confirmed strategy):
1. In `src/engine/screener-highlights.ts`: add `netflowBySymbol` map for symbol-only matching (cross-chain catch: token on ETH in netflow, SOL in screener)
2. In `src/engine/scanner.ts`: add symbol-only matching to holdings cross-reference (build `holdingsBySymbol` map)
3. Add match-rate logging at each stage to track coverage
4. Consider: increase netflow pages from 2→3 (+50 credits) for broader coverage
5. Consider: increase holdings pages from 1→2 (+50 credits) for broader coverage
6. **Do NOT** add `token_sectors` to `TokenScreenerEntry` — it doesn't exist in the API response

**Files**: `src/types.ts`, `src/engine/screener-highlights.ts`, `src/engine/scanner.ts`

---

## 🔴 P0-02: Capital Flow Map (bar chart) shows too few narratives

**Symptom**: Only 2 of 7 narratives visible (Memecoins $22.8K, GameFi $612). Others are below $100 threshold.

**Root cause**: Lines 2023-2024 in dashboard.ts filter narratives by `> $100` netflow. Most narratives have tiny flows ($3-$50).

**Fix plan**:
- Do NOT lower threshold to $0 — $3 netflow is noise, looks bad for judges
- Better approach: show top-N narratives by absolute netflow (e.g. top 10), regardless of threshold
- OR: use a dynamic threshold like `max(min_netflow, $50)` to avoid showing $3 flows
- Consider: aggregate smaller narratives into "Other" category
- The bar chart should look professional — if there are only 2 meaningful narratives, show 2 but make the chart compact (not full-width)

**Files**: `src/visual/dashboard.ts` — `renderSankeyChart()` around lines 2023-2024

---

## 🔴 P0-03: Stablecoins appearing in highlights — false divergence signals

**Symptom**: Stablecoins (USDT, USDC, etc.) show as "diverging" because SM netflow is positive but price_change ≈ 0. AI analysis then says "accumulation before pump" for a STABLECOIN — embarrassing for judges.

**Root cause**: `STRUCTURAL_NOISE_PATTERNS` filter in `screener-highlights.ts` exists but may be incomplete, or tokens with stablecoin-like symbols not in the list are passing through. Also, the `classifyToken()` function doesn't check for near-zero price as a stablecoin indicator.

**Fix plan**:
1. Expand `STRUCTURAL_NOISE_PATTERNS` — add more patterns
2. Add a price-based stablecoin filter: if `priceUsd` is between $0.99 and $1.01 → skip (it's a stablecoin regardless of symbol)
3. In `classifyToken()`: if `|priceChange| < 0.1%` AND `priceUsd ≈ $1.00` → classify as `mixed` (not `diverging`)
4. Consider: filter out tokens with `priceUsd < $0.001` as well (dust/shitcoins)

**Files**: `src/engine/screener-highlights.ts` — `STRUCTURAL_NOISE_PATTERNS`, `classifyToken()`, extraction logic

---

## 🟡 P1-01: Expanded card layout — AI analysis section wastes space

**Symptom**: When expanded, the card is a single full-width column. Left side has metrics, right side is empty. Flow Intelligence and AI Analysis are stacked vertically at the bottom — long thin strips.

**Fix plan**: Restructure expanded card into a 2-column layout:
```
┌──────────────────────────┬─────────────────────┐
│ Price | MCap | FDV | Liq │                     │
│ Netflow 24h | 7d | 30d   │   AI Analysis       │
│ Buy/Sell | Ratio | SM     │   (square block)    │
│ Flow Intelligence        │                     │
└──────────────────────────┴─────────────────────┘
```
- Left column: metrics + flow intelligence (full width of left half)
- Right column: AI Analysis (square, not thin strip)
- DexScreener link spans full width at bottom
- When AI analysis hasn't been triggered, show the shimmer block as a square placeholder

**Files**: `src/visual/dashboard.ts` — `renderExpandedDetail()`

---

## 🟡 P1-02: AI Analysis loading animation — needs to be sleek and modern

**Symptom**: Current loading is a basic spinner + "Analyzing with openrouter..." text. The shimmer-to-loading transition is abrupt (just an innerHTML replace). Not modern or sleek.

**Fix plan**: Redesign the AI loading state:
1. **Shimmer → Loading**: Smooth CSS transition (height/opacity), not instant replace
2. **Loading state**: Modern skeleton animation — pulsing gradient bars (like ChatGPT loading)
3. **Loading → Result**: Fade in with subtle slide-up
4. Remove the generic spinner. Use a sophisticated "thinking" animation
5. Consider: streaming text display (if API supports it) — characters appearing one by one

**Files**: `src/visual/dashboard.ts` — `runAiAnalysis()`, AI-related CSS classes

---

## 🟡 P1-03: AI Analysis markdown rendering incomplete

**Symptom**: Bold works. But bullet lists, numbered lists, headers may not render correctly with real LLM output.

**Fix plan**: Extend `renderMarkdown()` function:
- `- item` → proper `<li>` wrapped in `<ul>`
- `1. item` → proper `<li>` wrapped in `<ol>`
- `### Header` → `<h3>` (for structure)
- Preserve line breaks properly
- Test with a realistic AI response

**Files**: `src/visual/dashboard.ts` — `renderMarkdown()`

---

## 🟡 P1-04: Selling card doesn't filter the table

**Symptom**: Clicking the "SELLING" signal card at the top sets the filter dropdown to `__selling` which should show `mixed` + `distributing` tokens. But the dropdown's `__selling` option may not be populated (it's only added when `distributing` exists in data — and distributing tokens are rare). Also, there's no "SELLING" tag/badge in the table — tokens show as "MIXED" but the card says "SELLING".

**Root cause**: Two issues:
1. The dropdown option `__selling` is only added when `activeSignals['distributing']` exists (line 1891). Since `distributing` tokens are rare (often 0), this option doesn't appear → clicking the SELLING card sets a value that doesn't exist in the dropdown → filter breaks.
2. No visual "Selling" badge in the table — `mixed` and `distributing` show different labels but neither says "Selling"

**Fix plan**:
1. Always add the `__selling` option to the dropdown (not conditional on distributing existing)
2. OR: make the SELLING card filter to just `mixed` (since distributing is always 0 in practice)
3. Add a "Selling" display to the badge when `mixed` or `distributing` with negative netflow
4. Consider renaming the SELLING card to "LOW SIGNAL" if we can't reliably identify selling

**Files**: `src/visual/dashboard.ts` — signal card onclick, signal dropdown population, badge rendering

---

## 🟡 P1-05: Header looks ugly

**Symptom**: Header is functional but doesn't look professional. "NARRATIVE PULSE · Smart Money Intelligence" is plain text. The "powered by Nansen" is barely visible. The layout feels thin and utilitarian.

**Fix plan**: Complete header redesign:
1. Top accent line (2px gradient bar, green→purple→green, already added)
2. Larger title with proper typography (letter-spacing, weight)
3. Status badges as colored pills (not bare gray text)
4. "powered by Nansen" as a subtle but visible element (not 0.5 opacity)
5. Rescan button more prominent (maybe with an icon)
6. Better spacing and visual hierarchy
7. Consider: a subtle background gradient or noise texture

**Files**: `src/visual/dashboard.ts` — header HTML and CSS

---

## 🟡 P1-06: Sorting arrows painfully small

**Symptom**: Column header sort arrows (↕ ↗ ↘) are 0.65rem — nearly invisible. Users can't tell columns are sortable.

**Fix plan**:
1. Increase arrow size to at least 0.8rem
2. Make the entire header cell show cursor:pointer (already done) but also add a subtle hover state
3. Active sort arrow should be more prominent (brighter color, maybe slightly larger)
4. Consider: sort indicator as a small up/down triangle pair (▼▲) instead of Unicode arrows

**Files**: `src/visual/dashboard.ts` — `.token-table thead th.sortable` CSS

---

## 🟡 P1-07: Expand triangle misaligned during rotation

**Symptom**: When a row is expanded, the ▶ triangle rotates to ▼. During the rotation, it shifts slightly upward on the Y axis — not perfectly centered. The `transform-origin: center center` doesn't seem to be doing its job perfectly.

**Root cause**: The `▶` character (U+25B6) is not visually centered in its bounding box. When rotated 90°, the visual center shifts.

**Fix plan**:
1. Use a CSS-drawn triangle instead of Unicode character (more predictable)
2. OR: adjust `transform-origin` to compensate (e.g., `transform-origin: 50% 60%`)
3. OR: use an SVG chevron icon (cleanest solution)
4. Test with the actual animation to ensure smooth rotation without Y-shift

**Files**: `src/visual/dashboard.ts` — `.expand-arrow` CSS and the `▶` character in renderTokenRow

---

## 🟡 P1-08: Flow Intelligence section — looks empty with only 1 row

**Symptom**: When only 1 of 6 categories has non-zero data (e.g. "Exchanges: -$564K"), the section shows a single line in a full-width container. Looks broken.

**Current behavior**: Zero-value rows are hidden. This is correct (don't show 5 rows of "$0"). But 1 row still looks sparse.

**Fix plan**: Do NOT show all 6 rows with "—" (tried before, looks bad). Instead:
1. If only 1 category has data → show it as a compact single-line summary, not a full section:
   `Flow Intel: Exchanges outflow -$564K (3 wallets)`
2. If ≥2 categories have data → show the current grid layout
3. Consider: add a mini bar visualization for the single-row case (small inline sparkline)

**Files**: `src/visual/dashboard.ts` — `renderFlowIntelligence()`, `hasNonZeroFlow()`

---

## 🟡 P1-09: Red narratives (outflows) — can we show them?

**Symptom**: Currently we only show narratives with positive SM inflow (green bars). But if Smart Money is EXITING a narrative (negative netflow), that's equally valuable intel. The question is: can we identify and show these?

**Current data**: `narratives` array in ScanResult includes ALL narratives, some with negative `totalNetflow24h`. But in the dashboard, `outflows` are filtered by `< -$100` which may miss small outflows.

**Fix plan**:
1. In the bar chart, show BOTH inflows (green bars, right) and outflows (red bars, left) side by side
2. Outflow narratives should be clickable and filter the table (same as inflows)
3. Add a color legend: green = SM inflow, red = SM outflow
4. This makes the data more complete — judges see both sides of the market
5. If using Sankey (when both exist), ensure it shows the full flow picture

**Files**: `src/visual/dashboard.ts` — `renderSankeyChart()`, bar chart rendering

---

## 🟢 P2-01: Overall visual polish — make it look like a premium product

**Symptom**: The dashboard works but looks like a student project, not a 1st-place contest entry. Needs that "high-end quality" feel.

**Fix plan** (collection of micro-improvements):
1. **Custom tooltips**: Replace all `title="..."` with styled CSS tooltips (dark, rounded, with arrow)
2. **Signal card hover**: More sophisticated animation (subtle glow + slight scale, already partially done)
3. **Table row transitions**: Smoother expand/collapse, subtle highlight when filter changes
4. **Filter dropdowns**: Custom-styled selects (dark background, rounded, matching theme)
5. **Micro-interactions**: Button press effects, card hover shadows, smooth scroll
6. **Typography**: Consistent font sizing hierarchy, proper line-heights
7. **Spacing**: Consistent padding/margin system (4px grid)
8. **Color system**: Ensure all colors are from the CSS custom properties, no inline magic values

**Files**: `src/visual/dashboard.ts` — CSS section + various HTML elements

---

## 🟢 P2-02: System-styled dropdowns

**Symptom**: Filter `<select>` elements use OS-default styling. On dark theme, the dropdown popup is white (jarring).

**Fix plan**: Custom-styled selects with dark theme. Significant CSS effort.

**Files**: `src/visual/dashboard.ts` — CSS for `.filter-select`

---

## Implementation Order

### Phase 1: Critical fixes (unblocked)
1. **P0-01** (narratives) — symbol-only matching in screener-highlights.ts + scanner.ts
2. **P0-03** (stablecoins) — expand noise filter + price-based stablecoin detection
3. **P0-02** (bar chart) — smart threshold, not $0 (show top-N narratives)
4. **P1-09** (red narratives) — show outflows alongside inflows

### Phase 2: Layout & interactions
5. **P1-01** (expanded card 2-column layout) — restructure
6. **P1-04** (selling card filter) — logic fix
7. **P1-02** (AI loading animation) — modern feel
8. **P1-07** (expand triangle) — visual polish

### Phase 3: Polish
9. **P1-05** (header redesign)
10. **P1-06** (sort arrows)
11. **P1-08** (flow intel compact)
12. **P1-03** (AI markdown)
13. **P2-01** (visual polish pass)
14. **P2-02** (custom dropdowns)
