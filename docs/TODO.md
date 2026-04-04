# Narrative Pulse — Problem List & Fix Plan

> **Created**: 2026-04-05
> **Status**: Active development, final polish before contest submission
> **Deadline**: Today, April 5, 2026

## Priority Legend
- 🔴 P0 — Blocks submission or breaks core functionality
- 🟡 P1 — Significant quality issue, hurts presentation
- 🟢 P2 — Nice to have, polish

---

## 🔴 P0-01: Narrative column empty for 29/30 tokens

**Symptom**: Only 1 of 30 screener highlights has a narrative. The rest show "—".

**Root cause**: THREE bugs compounding:

1. **Holdings cross-reference normalization mismatch** (CRITICAL): `src/api/holdings.ts` `dedupeByAddress()` stores raw `entry.token_address` as Map key, but `src/engine/scanner.ts` lookup uses `normalizeAddress(h.token_address)` (lowercase). `Map.get()` is case-sensitive → **0 matches always**.

2. **Holdings and screener highlights are different token sets**: Holdings = top 50 tokens by portfolio VALUE (what SM holds). Screener highlights = top 30 by netflow ACTIVITY (what SM trades). Minimal overlap.

3. **Netflow cross-reference also low coverage**: Only 100 netflow entries vs 500 screener entries. Different scoring formulas = different token sets.

**Fix**:
1. In `src/api/holdings.ts` `dedupeByAddress()`: normalize the Map key with `normalizeAddress(entry.token_address)` — import the function from `../utils/normalize.js`
2. Add symbol+chain fallback matching in scanner.ts (like other cross-references)
3. Consider increasing holdings pages from 1 to 2 (+50 credits) for better coverage
4. **Nuclear option if still low match rate**: For highlights without tokenSectors, use the Nansen token-screener response itself — check if it has any sector-related field we're not using

**Files**: `src/api/holdings.ts`, `src/engine/scanner.ts`

---

## 🔴 P0-02: Flow Intelligence block — mostly empty, badly organized, inconsistent

**Symptom**: 
- Block appears on only 5/30 tokens (by design — topN config)
- When it appears, 5 of 6 rows show "+$0" with green checkmarks
- Even `hasNonZeroFlow()` guard (which we added) doesn't help when ONE value is non-zero — the block shows but is 80% zeros
- The block wastes ~200px of vertical space
- Layout is poor: label on left, value in middle, meta on right, with huge empty gaps
- No explanation of what "Smart Traders" vs "Whales" vs "Top PnL" means

**Fix**:
1. **Hide individual zero rows**, not just the entire section. Only show rows where the net_flow value is non-zero
2. Make the block more compact — use a 2-column grid instead of 6 full-width rows
3. Add a small header explaining what the data means
4. If only 1 row has data and it's "Exchanges: -$1.5M" — still show it (that's meaningful)

**Files**: `src/visual/dashboard.ts` — `renderFlowIntelligence()` and `flowIntelRow()`

---

## 🟡 P1-01: AI analysis — loading animation collapses instantly

**Symptom**: Click on the AI shimmer placeholder → it instantly disappears and is replaced by a single-line "Analyzing with openrouter..." with a tiny spinner. No smooth transition.

**Expected**: The shimmer block should smoothly transform — maybe shrink in height, keep the animation, then reveal the loading state. Not an abrupt innerHTML replace.

**Fix**:
1. Instead of `el.innerHTML = ...` (instant replace), use a CSS transition approach:
   - Phase 1: Add a CSS class that transitions the shimmer block (height collapse, opacity fade) over ~300ms
   - Phase 2: After transition ends, replace content with loading state
   - Phase 3: When result arrives, transition back in
2. Alternative simpler approach: Keep the shimmer background but overlay the loading text on top (opacity transition)

**Files**: `src/visual/dashboard.ts` — `showAiSetup()`, `runAiAnalysis()`, CSS for `.ai-analysis-*`

---

## 🟡 P1-02: AI analysis — markdown not rendered

**Symptom**: LLM response contains `**Assessment:**` and `**Actionable:**` but they render as literal asterisks in the UI. No bold, no lists, no formatting.

**Fix**: Add a minimal markdown-to-HTML renderer (~20 lines):
- `**text**` → `<strong>text</strong>`
- `*text*` → `<em>text</em>`
- `- item` → `<li>item</li>`
- `\n` → `<br>` (or wrap in `<p>` tags)
- No external dependencies needed

Apply in `showAiResult()` before setting innerHTML.

**Files**: `src/visual/dashboard.ts` — add `renderMarkdown(text)` function, use in `showAiResult()`

---

## 🟡 P1-03: AI analysis — block position and size in expanded card

**Symptom**: AI block is a long thin strip at the bottom of the expanded card. Wastes horizontal space. In the screenshots, it takes up about 1/3 of the vertical space of the expanded card.

**Fix**: Make AI section more compact:
- Reduce padding
- Result text: smaller font, tighter line-height
- Consider making it a collapsible section (click header to expand/collapse)
- Or: when no analysis yet, show compact placeholder. When result exists, show expanded result.

**Files**: `src/visual/dashboard.ts` — CSS for `.ai-result`, `.ai-setup`, `.ai-analysis-blur`

---

## 🟡 P1-04: Selling card filters by "mixed" instead of "selling"

**Symptom**: Top-right signal card says "SELLING: 5" (counts mixed + distributing). But clicking it sets the filter to `mixed` only — distributing tokens are hidden.

**Fix**: Two options:
- **(A)** Multi-value filter: modify `applyFilters()` to support filtering by multiple classification values when "selling" group is selected
- **(B)** Simpler: show the card label as "LOW SIGNAL" and filter to `mixed` only (since `distributing` count is always 0 in practice — log shows "0 distributing" consistently)

Option B is simpler and reflects reality (distributing tokens don't appear in highlights).

**Files**: `src/visual/dashboard.ts` — `filterBySignalGroup()`, card label

---

## 🟡 P1-05: Chain indicators — dots are indistinguishable, prefer text labels

**Symptom**: 8px colored dots next to token names. Base (#00aaff) and Arbitrum (#28a0f0) are nearly identical. Solana (#9c6ade) and the old purple are also close. Users can't tell chains apart.

**User preference**: Text labels like Nansen uses (ETH, SOL, BASE, BNB, ARB) — small, subtle, but readable. Or chain icons if feasible.

**Fix**: Replace `chainDot()` with a text label approach:
```javascript
function chainLabel(chain) {
  var styles = {
    ethereum: 'background:rgba(98,126,234,0.15);color:#8ba0f0',
    solana: 'background:rgba(156,106,222,0.15);color:#b48de8',
    base: 'background:rgba(0,170,255,0.15);color:#4db8ff',
    bnb: 'background:rgba(243,186,47,0.15);color:#f5c842',
    arbitrum: 'background:rgba(40,160,240,0.15);color:#5eb8f0'
  };
  var labels = { ethereum: 'ETH', solana: 'SOL', base: 'BASE', bnb: 'BNB', arbitrum: 'ARB' };
  var style = styles[chain] || 'background:rgba(139,143,163,0.15);color:#8b8fa3';
  var label = labels[chain] || chain;
  return '<span style="' + style + ';font-size:0.6rem;font-weight:700;padding:1px 4px;border-radius:3px;letter-spacing:0.02em;margin-left:6px;vertical-align:middle">' + label + '</span>';
}
```

Remove chain legend row (no longer needed with labels).

**Files**: `src/visual/dashboard.ts` — `chainDot()` → `chainLabel()`, remove chain legend

---

## 🟡 P1-06: Header design still below par

**Symptom**: Header is functional but doesn't match the visual quality of the rest of the dashboard. Feels "thin" and utilitarian.

**Fix**: Add visual weight:
- Subtle gradient accent line at the very top of the page (2px, green→purple→green)
- Slightly larger title with letter-spacing
- Status badges with background pills (not bare text)
- Consider: small Nansen logo or "Powered by Nansen" subtle text in header

**Files**: `src/visual/dashboard.ts` — header HTML and CSS

---

## 🟡 P1-07: Signal cards hover effect too weak

**Symptom**: Previous `translateY(-2px)` was "amateur". Current `border-color` transition is nearly invisible. Need something between these extremes.

**Fix**: Subtle background glow + very slight shadow:
```css
.signal-card { transition: border-color 0.25s ease, box-shadow 0.25s ease; }
.signal-card:hover {
  border-color: rgba(255,255,255,0.12);
  box-shadow: 0 0 20px rgba(52,211,153,0.06);
}
```

No translateY, no scale. Just a soft ambient glow.

**Files**: `src/visual/dashboard.ts` — `.signal-card:hover` CSS

---

## 🟡 P1-08: Sankey chart looks poor — only inflows, no outflows

**Symptom**: Sankey shows "Smart Money → Memecoins/GameFi/Bags.fm" with green bands. No red outflows. Looks like a basic bar chart, not a flow diagram. The user called it "бедно" (poor).

**Root cause**: When ALL narratives have positive netflow, there are no outflow nodes. Sankey becomes a one-directional diagram.

**Fix options**:
- **(A)** When no outflows exist, show a different visualization (e.g., horizontal bar chart of netflow by narrative) instead of a Sankey
- **(B)** Add "Market Average" as a baseline outflow node
- **(C)** Make the Sankey more visually interesting even with one direction: use gradient colors, thicker bands, labels with amounts
- **(D)** Add a "previous scan" comparison — show which narratives gained vs lost flow vs last scan (rotation data)

Option A or D would add the most value.

**Files**: `src/visual/dashboard.ts` — `renderSankeyChart()`, `renderSankeySection()`

---

## 🟢 P2-01: System-styled dropdowns and tooltips

**Symptom**: Filter `<select>` elements and `title=` tooltips use OS-default styling. On dark theme, the dropdown popup is white (jarring contrast). Tooltips are system gray boxes.

**Fix**: Custom-styled selects and CSS tooltips. This is a significant CSS effort.

**Files**: `src/visual/dashboard.ts` — CSS for `.filter-select`, tooltip system

---

## 🟢 P2-02: Rescan button + interval selector layout

**Symptom**: User called the Rescan button next to interval selector "колхоз" (hokey/rushed).

**Fix**: Group scan controls more intentionally — maybe a "scan controls" section with better spacing and visual grouping.

**Files**: `src/visual/dashboard.ts` — header HTML

---

## Implementation Order

1. **P0-01** (narratives) — most critical, blocks the core concept
2. **P0-02** (flow intelligence) — makes expanded cards look broken
3. **P1-05** (chain labels) — quick visual win
4. **P1-04** (selling card) — logic bug
5. **P1-07** (signal hover) — quick CSS fix
6. **P1-01** (AI loading animation) — polish
7. **P1-02** (AI markdown) — functional issue
8. **P1-03** (AI block layout) — polish
9. **P1-06** (header) — polish
10. **P1-08** (Sankey) — if time permits
11. **P2-01, P2-02** — if time permits
