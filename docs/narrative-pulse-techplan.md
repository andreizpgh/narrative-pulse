# Narrative Pulse — Детальный технический план

> Пошаговый план реализации, синхронизированный с метапланом
> Все концептуальные решения описаны в `narrative-pulse-concept.md`

---

## Структура проекта

```
narrative-pulse/
├── src/
│   ├── index.ts                    # Entry point + CLI commands
│   ├── types.ts                    # Все TypeScript интерфейсы
│   ├── config.ts                   # Конфигурация (chains, thresholds, etc.)
│   ├── api/
│   │   ├── client.ts               # HTTP клиент для Nansen API (auth, rate limits, retry)
│   │   ├── netflows.ts             # smart-money/netflows endpoint
│   │   ├── token-screener.ts       # tgm/token-screener endpoint
│   │   ├── holdings.ts             # smart-money/holdings endpoint
│   │   └── agent.ts                # agent/fast endpoint (SSE streaming)
│   ├── engine/
│   │   ├── discovery.ts            # Discovery query — получение списка секторов
│   │   ├── aggregator.ts           # Агрегация токенов по нарративам
│   │   ├── classifier.ts           # Hot/Watch/Avoid классификация
│   │   ├── sub-narratives.ts       # Agent API суб-нарративы для топ-нарратива
│   │   └── scanner.ts              # Orchestrator — полный pipeline сканирования
│   ├── visual/
│   │   ├── sankey.ts               # ECharts Sankey diagram (SSR)
│   │   ├── sunburst.ts             # ECharts Sunburst (опционально)
│   │   ├── html-report.ts          # Генерация standalone HTML отчёта
│   │   └── terminal-report.ts      # CLI formatted output (chalk + cli-table3)
│   └── scheduler/
│       └── cron.ts                 # node-cron 24/7 mode
├── output/                         # Сгенерированные отчёты (gitignored)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## Интерфейсы (src/types.ts)

```typescript
// ============================================================
// API Response Types (то что возвращает Nansen API)
// ============================================================

export interface NetflowEntry {
  token_address: string;
  token_symbol: string;
  net_flow_1h_usd: number;
  net_flow_24h_usd: number;
  net_flow_7d_usd: number;
  net_flow_30d_usd: number;
  chain: string;
  token_sectors: string[];
  trader_count: number;
  token_age_days: number;
  market_cap_usd: number;
}

export interface TokenScreenerEntry {
  chain: string;
  token_address: string;
  token_symbol: string;
  price_usd: number;
  price_change: number;
  market_cap_usd: number;
  volume: number;
  buy_volume: number;
  sell_volume: number;
  netflow: number;
  nof_traders: number;
  nof_buyers: number;
  nof_sellers: number;
  liquidity: number;
}

export interface HoldingsEntry {
  chain: string;
  token_address: string;
  token_symbol: string;
  token_sectors: string[];
  value_usd: number;
  balance_24h_percent_change: number;
  holders_count: number;
  share_of_holdings_percent: number;
  token_age_days: number;
  market_cap_usd: number;
}

// ============================================================
// Domain Types (внутренние структуры)
// ============================================================

export type NarrativeKey = string; // "AI" | "DeFi" | "AI+Infrastructure" | etc.

export interface NarrativeSummary {
  key: NarrativeKey;                 // "AI" или "AI+Infrastructure"
  displayName: string;               // "AI" или "AI Infrastructure"
  totalNetflow24h: number;           // Суммарный SM netflow за 24h
  totalNetflow7d: number;            // Суммарный SM netflow за 7d
  tokenCount: number;                // Количество токенов
  traderCount: number;               // Уникальных SM трейдеров
  topTokens: ClassifiedToken[];      // Топ токены с классификацией
  isHot: boolean;                    // Нарратив в целом горячий?
}

export type TokenCategory = "hot" | "watch" | "avoid";

export interface ClassifiedToken {
  token_symbol: string;
  token_address: string;
  chain: string;
  category: TokenCategory;
  netflow24hUsd: number;
  priceChange: number;
  buyVolume: number;
  sellVolume: number;
  traderCount: number;
  marketCapUsd: number;
}

export interface SubNarrative {
  name: string;                      // "AI Agents"
  conviction: "high" | "medium" | "low";
  totalNetflowUsd: number;
  tokens: string[];                  // token symbols
}

export interface ScanResult {
  timestamp: string;                 // ISO timestamp
  sectors: string[];                 // Все обнаруженные сектора
  narratives: NarrativeSummary[];    // Все нарративы
  rotations: NarrativeRotation[];    // Потоки между нарративами
  subNarratives?: SubNarrative[];    // Суб-нарративы топ-нарратива (если есть)
  topNarrativeKey?: NarrativeKey;    // Ключ топ-нарратива
  apiCallsUsed: number;
  creditsUsed: number;
}

export interface NarrativeRotation {
  from: NarrativeKey;
  to: NarrativeKey;
  valueUsd: number;                  // Объём потока
  direction: "inflow" | "outflow";
}

// ============================================================
// Config Types
// ============================================================

export interface Config {
  chains: string[];
  minMarketCapUsd: number;
  minTraderCount: number;
  netflowThresholds: {
    hot: { minNetflowUsd: number; minPriceChange: number };
    watch: { minNetflowUsd: number };
    avoid: { maxNetflowUsd: number };
  };
  apiPageSize: number;
  cronSchedule: string;
}
```

---

## Конфигурация (src/config.ts)

```typescript
import { Config } from "./types.js";

export const config: Config = {
  chains: ["ethereum", "solana", "base", "bnb", "arbitrum"],
  minMarketCapUsd: 100_000,
  minTraderCount: 3,
  netflowThresholds: {
    hot: { minNetflowUsd: 10_000, minPriceChange: 0.5 },
    watch: { minNetflowUsd: 10_000 },
    avoid: { maxNetflowUsd: -10_000 },
  },
  apiPageSize: 50,
  cronSchedule: "0 */4 * * *", // Каждые 4 часа
};
```

---

## День 1 (Wed) — CORE

### Коммит 1: `chore: project scaffold`

**Создать:**
- `package.json` — name, version, type: "module", bin, scripts
- `tsconfig.json` — strict, ESM, target ES2022
- `.gitignore` — node_modules, output/, .env
- `src/index.ts` — stub
- `README.md` — stub с названием и описанием

**Зависимости:** Нет (пока)

### Коммит 2: `feat: Nansen API client with auth and rate limiting`

**Файл:** `src/api/client.ts`

**Ответственность:**
- HTTP клиент с заголовком `apiKey`
- Rate limit handling: 20 req/sec, 300 req/min (очередь с задержками)
- Retry с exponential backoff для 429 и 5xx
- Логирование каждого запроса (endpoint, credits used, remaining)
- Парсинг `X-Nansen-Credits-Used`, `X-RateLimit-Remaining-Second`

**Ключевой интерфейс:**
```typescript
export async function nansenPost<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<{ data: T; creditsUsed: number; creditsRemaining: number }>;
```

**Зависимости:** Нет внешних (используем native fetch)

### Коммит 3: `feat: smart-money netflows pipeline (multi-chain)`

**Файл:** `src/api/netflows.ts`

**Ответственность:**
- Обёртка над `smart-money/netflows`
- Мультичейн-запрос: один вызов с `chains: [...]` или по одному на chain
- Фильтры: `market_cap_usd`, `trader_count`
- Пагинация: собирает все страницы
- Возвращает `NetflowEntry[]`

**Ключевой интерфейс:**
```typescript
export async function fetchNetflows(
  chains: string[],
  minMarketCap?: number,
  minTraderCount?: number
): Promise<NetflowEntry[]>;
```

### Коммит 4: `feat: sector discovery and narrative aggregation`

**Файлы:** `src/engine/discovery.ts`, `src/engine/aggregator.ts`

**discovery.ts:**
- Делает один запрос `smart-money/netflows` без фильтра по секторам
- Собирает все уникальные `token_sectors` из ответа
- Возвращает `string[]` — список обнаруженных секторов

**aggregator.ts:**
- Принимает `NetflowEntry[]`
- Группирует по narrative key (комбинация секторов)
  - Правило: сортируем `token_sectors` алфавитно, join через "+"
  - `["AI", "Infrastructure"]` → `"AI+Infrastructure"`
  - `["DeFi"]` → `"DeFi"`
- Для каждого нарратива считает: totalNetflow24h, totalNetflow7d, tokenCount, traderCount
- Возвращает `NarrativeSummary[]` (пока без classified tokens)

**Ключевой интерфейс:**
```typescript
export function discoverSectors(entries: NetflowEntry[]): string[];
export function aggregateByNarrative(entries: NetflowEntry[]): NarrativeSummary[];
```

---

## День 2 (Thu) — LOGIC

### Коммит 5: `feat: token-screener integration for price/volume data`

**Файл:** `src/api/token-screener.ts`

**Ответственность:**
- Обёртка над `tgm/token-screener`
- Фильтры: timeframe (24h), market_cap, sectors
- Возвращает `TokenScreenerEntry[]`

**Ключевой интерфейс:**
```typescript
export async function fetchTokenScreener(
  chains: string[],
  timeframe?: string,
  minMarketCap?: number
): Promise<TokenScreenerEntry[]>;
```

### Коммит 6: `feat: Hot/Watch/Avoid token classifier`

**Файл:** `src/engine/classifier.ts`

**Ответственность:**
- Принимает `NetflowEntry[]` + `TokenScreenerEntry[]` (по token_address)
- Для каждого токена вычисляет категорию:
  - 🔥 Hot: `net_flow_24h_usd > threshold` AND `price_change > 0` AND `buy_volume > sell_volume`
  - 👀 Watch: `net_flow_24h_usd > threshold` AND `price_change <= 0`
  - ⛔ Avoid: `net_flow_24h_usd < -threshold`
  - ⚪ Neutral: всё остальное (не показываем)
- Возвращает `ClassifiedToken[]`

**Ключевой интерфейс:**
```typescript
export function classifyTokens(
  netflows: NetflowEntry[],
  screenerData: Map<string, TokenScreenerEntry>,
  thresholds: Config["netflowThresholds"]
): ClassifiedToken[];
```

**Обновление aggregator.ts:** После классификации — добавить `topTokens` в каждый `NarrativeSummary`. Сортировка: hot → watch → avoid, внутри категории — по netflow DESC.

### Коммит 7: `feat: Nansen Agent API integration for sub-narratives`

**Файлы:** `src/api/agent.ts`, `src/engine/sub-narratives.ts`

**agent.ts:**
- Обёртка над `agent/fast`
- SSE stream parsing (event types: delta, tool_call, finish, error)
- Non-streaming mode: `stream: false`
- Возвращает полный текстовый ответ

**sub-narratives.ts:**
- Принимает топ-нарратив + его токены (NetflowEntry[])
- Формирует prompt для Agent API
- Парсит ответ в `SubNarrative[]`
- Fallback: если парсинг не удался — возвращает undefined (не ломает pipeline)

**Prompt для Agent API (рабочий черновик):**
```
Analyze these ${tokens.length} crypto tokens from the "${narrative}" narrative. 
They are ranked by Smart Money netflow (24h).

Group them into 3-5 sub-narratives based on their function (e.g., for AI: 
AI Agents, AI Compute, AI Data, AI Memecoins, AI Infrastructure).

For each sub-narrative, rate Smart Money conviction: high, medium, or low.

Return ONLY valid JSON, no markdown:
[{"sub_narrative": "AI Agents", "tokens": ["FET", "VIRTUAL"], 
  "conviction": "high", "total_netflow_usd": 2300000}]
```

---

## День 3 (Fri) — VISUAL

### Коммит 8: `feat: ECharts Sankey diagram (narrative rotation map)`

**Файл:** `src/visual/sankey.ts`

**Ответственность:**
- Принимает `ScanResult.narratives` + `ScanResult.rotations`
- ECharts SSR init (zero-dependency)
- Sankey series config:
  - nodes = нарративы, размер = abs(total netflow)
  - links = между нарративами, толщина = объём
  - Цвет: nodeColor по направлению netflow (зелёный = приток, красный = отток)
- `chart.renderToSVGString()` → sharp → PNG buffer
- Сохранение: `output/narrative-rotation-{timestamp}.png`

**Зависимости:** `echarts`, `sharp` (уже известен разработчику)

### Коммит 9: `feat: terminal report with Hot/Watch/Avoid tables`

**Файл:** `src/visual/terminal-report.ts`

**Ответственность:**
- Форматированный вывод в терминал
- Использует `chalk` для цветов (красный/жёлтый/зелёный)
- Использует `cli-table3` для таблиц
- Секции:
  1. Summary: дата, API calls, credits, количество нарративов
  2. Rotation Map (текстовый): Top inflows, Top outflows
  3. Для каждого нарратива: таблица Hot/Watch/Avoid токенов
  4. Sub-narratives (если есть)

**Зависимости:** `chalk`, `cli-table3`

### Коммит 10: `feat: HTML report generation`

**Файл:** `src/visual/html-report.ts`

**Ответственность:**
- Генерация standalone HTML файла
- Встроенные ECharts через CDN (для интерактивности)
- Встроенные данные (JSON в script tag)
- Секции:
  1. Header с датой и summary stats
  2. Sankey diagram (интерактивный)
  3. Hot/Watch/Avoid таблицы (HTML tables)
  4. Sub-narratives (если есть)
- Сохранение: `output/narrative-pulse-report-{timestamp}.html`

### Коммит 11: `feat: scanner orchestrator + CLI commands`

**Файлы:** `src/engine/scanner.ts`, `src/index.ts`

**scanner.ts — полный pipeline:**
```
1. Discovery: fetch netflows → discover sectors
2. Enrichment: fetch token-screener data
3. Aggregation: group by narrative
4. Classification: Hot/Watch/Avoid
5. Sub-narratives: Agent API for top narrative
6. Output: terminal report + HTML report + Sankey PNG
```

**index.ts — CLI commands:**
```typescript
// npx narrative-pulse scan    — разовый скан
// npx narrative-pulse watch   — 24/7 режим (cron)
// npx narrative-pulse sectors — показать обнаруженные сектора
```

**Зависимости:** `commander`

---

## День 4 (Sat) — PRODUCTION

### Коммит 12: `feat: cron scheduler for 24/7 autonomous mode`

**Файл:** `src/scheduler/cron.ts`

**Ответственность:**
- node-cron с конфигурируемым расписанием
- Логирование каждого прогона
- Error recovery: если один прогон упал — следующий запускается нормально
- Graceful shutdown

**Зависимости:** `node-cron`

### Коммит 13: `feat: narrative rotation tracking (trend detection)`

**Обновление:** `src/engine/aggregator.ts` или новый `src/engine/rotations.ts`

**Ответственность:**
- Вычисление NarrativeRotation[] — потоки МЕЖДУ нарративами
- Логика: для каждого нарратива считаем delta netflow. Если DeFi netflow падает и AI netflow растёт — создаём rotation link DeFi → AI
- Нужен предыдущий snapshot (сохраняем в `output/last-scan.json`)
- При первом прогоне — rotations пустые (нет предыдущих данных)

### Коммит 14: `docs: comprehensive README with demo assets`

**README.md — полная версия (см. метаплан для структуры)**

**Assets для подготовки:**
- `docs/demo-sankey.png` — скриншот Sankey diagram
- `docs/demo-terminal.png` — скриншот CLI output
- `docs/demo-html.png` — скриншот HTML report
- `docs/demo.gif` — GIF анимация (Sankey + CLI)

---

## День 5 (Sun) — PRESENTATION

### Коммит 15: `fix: polish, edge cases, error handling`

- Проверка на пустые данные (API вернул 0 токенов)
- Timeout handling
- Credits exhausted graceful exit
- Красивые error messages

### Коммит 16: `docs: final README polish + usage examples`

- Финальная вычитка
- Добавление GIF если ещё нет
- Проверка что `npm install && nansen login && npx narrative-pulse scan` работает

### Публикация X thread

(См. метаплан, раздел 3)

---

## Зависимости (package.json)

```json
{
  "name": "narrative-pulse",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "narrative-pulse": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "scan": "tsx src/index.ts scan",
    "watch": "tsx src/index.ts watch"
  },
  "dependencies": {
    "echarts": "^5.5.0",
    "sharp": "^0.33.0",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.5",
    "commander": "^12.0.0",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.0.0",
    "@types/node-cron": "^3.0.11"
  }
}
```

---

## Порядок приоритетов при нехватке времени

Если время поджимает — реализуем строго в этом порядке:

1. ✅ API client (без него ничего не работает)
2. ✅ Netflows pipeline (основные данные)
3. ✅ Sector discovery + aggregation (ядро логики)
4. ✅ Hot/Watch/Avoid classifier (уникальная ценность)
5. ✅ Terminal report (минимальный output)
6. ✅ Sankey diagram (визуальный wow-эффект)
7. ⬜ Agent API sub-narratives (отличная фича, но можно вырезать)
8. ⬜ HTML report (улучшение, не критично)
9. ⬜ Cron scheduler (показывает production-readiness)
10. ⬜ Sunburst chart (опциональная визуализация)

Пункты 1-6 — обязательный минимум для competitive submission.
Пункты 7-10 — усиливают, но проект работает без них.
