# Narrative Pulse — Full Project Context

> **Последнее обновление**: 2026-04-05 (post user feedback session)
> **Статус**: Активная разработка, финальная полировка перед submissions
> **Дедлайн**: 5 апреля 2026
> **Credits Remaining**: ~6880

## 1. Конкурс

**Nansen CLI Build Challenge, Week 3**. Организатор — Nansen.ai (CEO Alex Svanevik).

### Правила
- Использовать Nansen Research API (минимум 10 API calls)
- Креативный проект (не тривиальный wrapper)
- Пост на X с `@nansen_ai` и `#NansenCLI`
- GitHub + proof of API calls

### Призы
- 🥇 1st: Mac Mini M4
- 🥈 2nd: 50-100K API credits
- Honorable: 10K credits

### Что ценят судьи (по результатам Week 1-2)
1. **Video Demo / Visuals** — HIGH (официальный совет: "images tend to get priority")
2. **Real-world usefulness** — HIGH (все победители — практические trading tools)
3. **Technical depth** — HIGH (Shadow-Signal agentic loop, NansenScope 9000 LOC)
4. **AI Agent Integration** — HIGH (Alex Svanevik "ALL IN on AI")
5. **Creativity** — MEDIUM
6. **Clear Presentation** — MEDIUM

### Конкуренты Week 3
- **NansenScope** (@luigi08001) — 18 команд, 9000 LOC Python, 80 коммитов, CI/CD, Docker 🔴
- **Shadow-Signal** (@HarishKotra) — Agentic copy-trading: Monitor→Analyze→Execute 🔴
- **Wyckoff Phase Classifier** (@Ggudman1) — 150 токенов, 8 цепей 🟡
- **Token Accumulation Quality Filter** (@dr_rice1) 🟡

---

## 2. Что такое Narrative Pulse

**Smart Money Narrative Intelligence Platform** — отслеживает потоки капитала между крипто-нарративами с помощью Nansen API + DexScreener enrichment.

### Core idea
Все отслеживают SM на уровне отдельных токенов (1000+ токенов = шум). Narrative Pulse агрегирует данные на уровне **нарративов/секторов** — куда Smart Money перетекает капитал.

### Architecture (27 TS files, ~8500 LOC)
```
src/
├── index.ts              # CLI: scan, watch, sectors, serve, mcp
├── types.ts              # All interfaces (strict, no any)
├── config.ts             # Thresholds, chain config
├── api/
│   ├── client.ts         # Nansen HTTP client (auth, retry, rate limit)
│   ├── netflows.ts       # smart-money/netflow (5 chains, paginated)
│   ├── token-screener.ts # token-screener enrichment
│   ├── flow-intelligence.ts # tgm/flow-intelligence (SM/Whale/Exchange breakdown)
│   ├── agent.ts          # agent/fast (SSE, sub-narratives — 2000 credits)
│   ├── dexscreener.ts    # DexScreener (free, 5-min cache, batch 30)
│   └── holdings.ts       # smart-money/holdings (sector enrichment source)
├── engine/
│   ├── scanner.ts        # 11-step pipeline orchestrator
│   ├── discovery.ts      # Sector discovery from netflow data
│   ├── aggregator.ts     # Narrative aggregation by sector
│   ├── classifier.ts     # Token classification (6 categories)
│   ├── enricher.ts       # Merge Nansen + DexScreener enrichment
│   ├── screener-highlights.ts # Top-30 SM active tokens (composite scoring)
│   ├── sub-narratives.ts # Agent API sub-narrative analysis
│   └── rotations.ts      # Narrative rotation tracking (delta between scans)
├── visual/
│   ├── dashboard.ts      # Dynamic HTML dashboard (~2200 LOC, main output)
│   ├── html-report.ts    # Static HTML report
│   ├── terminal-report.ts # CLI output
│   ├── research-card.ts  # Shareable PNG card (1200×675)
│   └── sankey.ts         # ECharts SSR (unused in current flow)
├── server/
│   └── index.ts          # Express: GET/, GET/POST /api/scan, POST /api/ai-analyze
├── mcp/
│   └── server.ts         # MCP server (stdio, 3 tools)
├── scheduler/
│   └── cron.ts           # 24/7 cron mode
└── utils/
    └── normalize.ts      # EVM lowercase, Solana as-is
scripts/
└── test-screener-fields.ts  # Test: does Nansen screener return token_sectors? (~10 credits)
```

### 11-Step Pipeline
1. Fetch netflows (5 chains, 2 pages × 50 = 100 tokens)
2. Fetch screener (10 pages × 50 = 500 tokens)
3. Fetch holdings (1 page × 50 = 50 tokens) — sector enrichment
4. Enrich with DexScreener (free API, batched)
5. Discover sectors (unique sector combinations)
6. Aggregate tokens into narratives
7. Classify tokens (6 categories)
8. Extract screener highlights (top-30 by composite score)
8.5 Cross-reference with enriched data (tokenSectors, fdv, liquidity)
8.6 Cross-reference with holdings data (tokenSectors fallback)
9. Fetch flow intelligence for top-5 tokens
10. Detect early signals (SM accumulating before price move)
11. Track rotations (delta vs previous scan)
12. Sub-narratives (optional, 2000 credits, --deep flag)

### Credits Per Scan
| Endpoint | Cost |
|----------|------|
| netflow (2 pages) | 100 |
| screener (10 pages) | 100 |
| holdings (1 page) | 50 |
| flow-intelligence (5 tokens) | 50 |
| **Total** | **~300** |

### API Credits Remaining
~6880 credits (started with 9600, ~9 scans left)

---

## 3. История развития

### V1 (commits 1-15): Базовый CLI
- Multi-chain netflow, token screener, sector discovery, narrative aggregation
- ECharts Sankey, HTML report, terminal report, cron scheduler
- Проблемы: 75% token mismatch, один доминирующий нарратив, $0 цены

### V2 (commits 16-55): Enrichment + Dashboard
- DexScreener enrichment (free price/volume data)
- Holdings API integration
- Dynamic web dashboard (Express + auto-refresh)
- MCP server (3 tools for AI agents)
- Research cards (PNG)
- Screener highlights (top-30 from 500 tokens)
- Interactive HTML (expandable rows, sortable tables, Sankey)

### V3 (commits 56-73): Полировка и killer features
- Flow Intelligence integration (SM/Whale/Exchange/Fresh Wallet breakdown)
- PUMPING category (>30% price surge)
- Divergence detection (7d SM accumulation + flat price)
- Dashboard restructure (Sankey above table, remove Narrative Flows)
- Nansen-inspired visual design (chain dots → text labels, no $ prefix, hide empty fields)
- AI Analysis per-token (BYOK, OpenAI/Anthropic/OpenRouter/Custom)
- Signal cards clickable (filter table)
- Holdings cross-reference for narrative column
- Custom provider support (OpenAI-compatible with custom base URL)

### V3.5 (commits 74-75): Dashboard UI fixes (current)
- Holdings deduplication normalization fix (holdings.ts Map key)
- Dashboard UI polish: flow intel zero-row hiding, chain text labels, AI fade transition, AI markdown, Sankey bar chart fallback, ECharts dispose, signal card hover, header accent line

---

## 4. Dashboard Layout (текущая)

```
┌─────────────────────────────────────────────────────┐
│ ▬▬▬ accent gradient line (2px, green→purple) ▬▬▬▬▬ │
│ NARRATIVE PULSE · Smart Money Intelligence           │
│ [Updated 5m ago]  [Rescan]  [Auto: 15m ▼]  [300cr]  │
├─────────────────────────────────────────────────────┤
│ [HOT: 12]  [ACCUMULATING: 5]  [PUMPING: 6]  [SELLING: 7] │
├─────────────────────────────────────────────────────┤
│ SANKEY / BAR CHART (compact, 280px, clickable→filter)│
├─────────────────────────────────────────────────────┤
│ MAIN TABLE (hero, gradient accent top)              │
│ [All Chains ▼] [All Signals ▼]  30 tokens          │
│                                                     │
│ Token  Narrative  Netflow  B/S  Ratio  Price  MCap  │
│ AIFI   AI+DeSci   +$731K  ████  10x   +11.7% $27M  │
│                                                     │
│ ── Expanded ────────────────────────────────────    │
│ Price $1.318 │ MCap $27M │ FDV $35M │ Liq $340K     │
│ Netflow 24h/7d/30d │ Buy/Sell │ Ratio │ SM Traders  │
│ FLOW INTELLIGENCE (only non-zero rows)              │
│ AI ANALYSIS (shimmer → setup → loading → result)    │
│ [DexScreener ↗]                                     │
├─────────────────────────────────────────────────────┤
│ Powered by Nansen API (5 endpoints) + DexScreener    │
└─────────────────────────────────────────────────────┘
```

---

## 5. Ключевые решения и развилки

### DASHBOARD STRUCTURE
**Проблема**: 4 изолированных секции (Table → Sankey → Narrative Flows → Early Signals) = "шизофренический workflow"
**Решение**: Sankey ↑ compact, Narrative Flows удалена, одна таблица как hero, AI в expanded rows
**Почему**: Nansen использует одну таблицу с фильтрами. Всё остальное — контекст вокруг неё.

### NARRATIVE COLUMN
**Проблема**: 30 screener highlights отобраны из 500 по composite score. Большинство не совпадают с 100 netflow entries. tokenSectors = пустой.
**Решение**: Три уровня cross-reference: (1) screener own token_sectors, (2) netflow enriched data, (3) holdings data. Plus symbol-only matching fallback.
**Остаточный риск**: Зависит от того, возвращает ли Nansen token_sectors в screener. Тест создан (`scripts/test-screener-fields.ts`), ждём результатов.

### SIGNAL CATEGORIES
**Внутренние** (6): heavy_accumulation, accumulating, diverging, pumping, mixed, distributing
**Display** (4 карточки): HOT, ACCUMULATING (+diverge sub-badge), PUMPING, SELLING
**Почему**: Watch и Diverge были "буквально одно и то же". Diverge теперь sub-badge внутри Accumulating. 4 карточки вместо 6 = чище.

### STABLECOIN FILTERING
**Проблема**: Stablecoins проходят через фильтр и показывают "diverging" (SM netflow positive, price ≈ $1.00). AI analysis говорит "accumulation before pump" для стейблкоина.
**Решение** (план): (1) расширить STRUCTURAL_NOISE_PATTERNS, (2) добавить ценовой фильтр ($0.99-$1.01 = stablecoin), (3) не классифицировать как diverging если price_change ≈ 0%.

### AI ANALYSIS
**Per-token, не dashboard-level**. Reasons:
- Не конфликтует с auto-refresh
- Дешевый (один токен = короткий промпт)
- Естественный workflow: увидел токен → раскрыл → AI → рекомендация
**Архитектура**: Frontend → наш backend proxy (`POST /api/ai-analyze`) → LLM API. API key хранится в localStorage, никогда на сервере.
**Провайдеры**: OpenAI, Anthropic, OpenRouter, Custom (OpenAI-compatible с любым base URL)

### RED NARRATIVES (outflows)
**Вопрос**: Можем ли мы показывать нарративы с ОТТОКОМ SM капитала? Это такая же ценная информация.
**Текущее состояние**: Санkey/bar chart показывает только inflows. Outflows фильтруются по `> $100`.
**План**: Показывать оба направления — зелёные (inflow) и красные (outflow) бары. Это делает картину рынка полной.

### TOKEN DISPLAY
**Без $ prefix** (как Nansen). **Текстовые badge** для цепей (ETH, SOL, BASE, BNB, ARB).
**Пустые поля скрыты** (Nansen approach) вместо показа "—".

---

## 6. Nansen API — реальные факты

### Реальные кредиты (НЕ как в документации!)
| Endpoint | Реально | Документация говорит |
|----------|---------|---------------------|
| token-screener | **10 credits/page** | 1 credit |
| smart-money/netflow | 50 credits/page | 50 credits/page ✅ |
| smart-money/holdings | **50 credits/page** | 5 credits |
| tgm/flow-intelligence | **10 credits/call** | 1 credit |
| who-bought-sold | **10 credits/call** | 1 credit |
| agent/fast | 2000 credits | 2000 credits ✅ |

### Поля которых НЕ существует
- `nof_buyers` / `nof_sellers` в token-screener — полностью отсутствуют, всегда undefined
- `perp-screener` / `perps/perpetuals` — 404
- `smart-money/perp-trades` — 422

### ✅ ПОДТВЕРЖДЕНО: token_sectors НЕТ в token-screener
- **Test run**: 2026-04-05, `scripts/test-screener-fields.ts`, 10 credits
- **Result**: 0/10 entries have `token_sectors`. See `docs/NANSEN-API-RESEARCH.md`
- **Implication**: Only netflow (100 entries) and holdings (50 entries) have `token_sectors`
- **Fix for P0-01**: Symbol-only matching fallback + consider increasing pages for better coverage
- Netflow endpoint: `token_sectors` есть и RICH: "AI Agents + Artificial Intelligence + DeSci"
- Holdings endpoint: `token_sectors` есть

### Полезные поля которые мы используем
- `token_sectors` — RICH: "AI Agents + Artificial Intelligence + DeSci" (брали только [0])
- `flow-intelligence` — 6 сегментов: Smart Traders, Public Figures, Whales, Top PnL, Exchanges, Fresh Wallets
- `inflow_fdv_ratio` / `outflow_fdv_ratio` — есть в token-screener но неиспользованы
- `price_change` в token-screener — decimal fraction (0.01 = 1%), не percentage!

---

## 7. Известные проблемы (полный список)

См. `docs/TODO.md` — 15 проблем, приоритизированы P0→P1→P2.

### Краткий обзор:
- 🔴 P0-01: Narrative column empty (29/30 tokens show "—") — ✅ test done, fix strategy confirmed (symbol-only matching)
- 🔴 P0-02: Bar chart shows only 2 of 7 narratives (threshold too high/need smart approach)
- 🔴 P0-03: Stablecoins in highlights (false divergence signals, embarrassing for judges)
- 🟡 P1-01: Expanded card 1-column layout wastes space (need 2-column with AI on right)
- 🟡 P1-02: AI loading animation not sleek/modern
- 🟡 P1-03: AI markdown rendering incomplete
- 🟡 P1-04: Selling card doesn't filter table + no "SELLING" badge
- 🟡 P1-05: Header looks ugly
- 🟡 P1-06: Sort arrows too small
- 🟡 P1-07: Expand triangle misaligned during rotation
- 🟡 P1-08: Flow Intelligence looks empty with 1 row
- 🟡 P1-09: Red narratives (outflows) not shown — data incomplete
- 🟢 P2-01: Overall visual polish (custom tooltips, micro-interactions, typography)
- 🟢 P2-02: System-styled dropdowns

---

## 8. Killer Features (для презентации)

### 1. Divergence Detection
SM накопил позицию (7d netflow > $5K), но цена ещё не среагировала (priceChange < 10%). Это "найди токены до пампа". Уникально среди конкурентов.

### 2. Flow Intelligence Breakdown
Для top-5 токенов: разбивка по 6 сегментам (Smart Traders, Whales, Exchanges, Fresh Wallets и т.д.). Показывает КТО двигает деньгами.

### 3. AI Analysis (BYOK)
Per-token анализ с bring-your-own-key. 4 провайдера + custom. Shimmer animation как wow-эффект.

### 4. MCP Integration
3 tools для AI агентов (Claude, Cursor). Claude + MCP = "AI trading agent с доступом к enterprise SM data".

### 5. Multi-Source Enrichment
5 Nansen endpoints + DexScreener = больше данных чем у большинства конкурентов.

---

## 9. Что НУЖНО сделать до submissions

### Обязательно (P0)
- [x] **Run test** — `npx tsx scripts/test-screener-fields.ts` → ❌ screener does NOT have token_sectors (see `docs/NANSEN-API-RESEARCH.md`)
- [ ] **Fix P0-01** — Narrative column (symbol-only matching in screener-highlights.ts + scanner.ts)
- [ ] **Fix P0-03** — Stablecoin filtering
- [ ] **Fix P0-02** — Bar chart threshold (smart approach, not $0)
- [ ] **Fix P1-09** — Red narratives (outflows)
- [ ] **Живой тест** — `npx narrative-pulse serve`, проверить все фиксы
- [ ] **Скриншоты** — dashboard, expanded rows, AI analysis, Sankey
- [ ] **Video demo** (90 сек) — CLI scan → dashboard → AI analysis → MCP
- [ ] **X post** — скриншоты + GitHub link + #NansenCLI
- [ ] **README update** — актуальная информация, скриншоты

### Желательно (P1)
- [ ] **P1-01** — Expanded card 2-column layout
- [ ] **P1-04** — Selling card filter fix
- [ ] **P1-02** — AI loading animation modernization
- [ ] **P1-05** — Header redesign
- [ ] **P1-06** — Sort arrows bigger
- [ ] **P1-07** — Expand triangle alignment

### Если останется время (P2)
- [ ] **P2-01** — Visual polish pass
- [ ] **P2-02** — Custom dropdowns
- [ ] **html-report.ts sync** — адаптировать под новую структуру
- [ ] **MCP server update** — добавить flow-intelligence, analyze_token

---

## 10. Code Conventions

- **TypeScript strict**: no `any`, no `as any`. All types in `src/types.ts`
- **Error handling**: try/catch on all API calls, retry with backoff
- **File naming**: `verbNoun.ts` or `noun-phrase.ts`
- **Commits**: one logical unit per commit, format: `type: description`
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code restructuring
  - `style:` visual changes (CSS, HTML templates)
  - `docs:` documentation only
  - Detailed multi-line commit messages explaining what and why
  - Example: `fix: add symbol-only matching for narrative cross-reference\n\nScreener highlights were missing narratives because tokens on different\nchains (e.g. ETH in netflow vs SOL in screener) had different addresses.\nAdded symbol-only fallback matching to catch cross-chain matches.\n\nFiles: screener-highlights.ts, scanner.ts`
- **Graceful degradation**: enrichment failure never breaks pipeline
- **CSS**: custom properties (--var), dark theme, Nansen-inspired minimalism
- **JS in HTML templates** (`dashboard.ts`): `var` not `let/const`, escaped quotes `\\'` in onclick (double-escaped for template literals)
- **Unicode escapes in dashboard.ts**: `\\uD83D\\uDD25` (double-escaped)
- **normalizeAddress()**: EVM→lowercase, Solana→as-is
- **price_change** in token-screener: decimal fraction (0.01 = 1%), not percentage
