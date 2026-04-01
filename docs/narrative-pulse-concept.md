# Narrative Pulse — Концепция проекта

> **Единый источник истины** — полная информация для реализации проекта с нуля
> Конкурс: Nansen CLI Build Challenge, Week 3
> Дедлайн: 5 апреля 2026 (Sunday), 11:59 PM SGT (~18:59 MSK)
> Цель: **1-е место** (приз: Mac Mini M4)

---

## 1. О проекте

### Одно предложение

**Narrative Pulse** — инструмент, который отслеживает, **между какими крипто-нарративами** (AI, DePIN, RWA, Memecoins, DeFi...) ротирует капитал Smart Money в реальном времени, и классифицирует токены внутри каждого нарратива как 🔥 Hot / 👀 Watch / ⛔ Avoid.

### Проблема

Все существующие инструменты (включая submissions конкурса) анализируют Smart Money на уровне **отдельных токенов**. Но 1000 токенов с позитивным netflow — это шум. То что действительно имеет значение — это _куда в целом_ перетекает капитал: из DeFi в AI? Из Memecoins в RWA? Это уровень нарративов, и его никто не покрывает.

### Решение

Narrative Pulse агрегирует данные Smart Money на уровне **нарративов** (секторов), а не отдельных токенов. Результат:

1. **Narrative Rotation Map** (Sankey diagram) — визуальная карта потоков капитала между нарративами
2. **Hot / Watch / Avoid** — токены внутри каждого нарратива, классифицированные по SM-сигналам
3. **Sub-narratives** — углублённая разбивка топ-нарратива через Nansen Agent API
4. **24/7 autonomous mode** — cron-задача, работает без ручного вмешательства

---

## 2. Контекст конкурса

### Что такое Nansen CLI Build Challenge

Трёхнедельный конкурс от Nansen (крупнейшая on-chain аналитика). Участники строят проекты на базе Nansen CLI и API. Неделя 3 — финальная.

### Критерии оценки (официальные, от Nansen)

> "Judging is simple. We'll put into consideration: **creativity, real-world usefulness, technical depth, and how clearly you present what you built.**"

Приоритеты (выведены из анализа победителей):
1. Creativity — уникальность идеи
2. Real-world usefulness — практическая ценность
3. Technical depth — инженерная сложность
4. Presentation clarity — качество подачи (X thread + GitHub README)

### Минимальные требования

- Установить Nansen CLI
- Сделать минимум 10 API calls
- Построить что-то креативное (project, script, analysis, integration)
- Поделиться в X с тегами @nansen_ai и #NansenCLI

### Советы от Nansen (официальные)

> "Include visuals (screenshots, demo vids, GIFs). Show your work — screenshots of CLI output, logs, API call counts."

---

## 3. Анализ победителей (Недели 1 и 2)

### Неделя 1

| Место | Автор | Проект | Суть |
|-------|-------|--------|------|
| 🥇 1st | @HeavyOT | Autonomous Polymarket Copy-Trading Bot | Бот, который охотится на китов через SM данные на Polymarket |
| 🥈 2nd | @0xTakeProfits | Non-USD Stablecoin Smart Money Dashboard | Дашборд SM-потоков в non-USD стейблкоинах (EURC, XSGD, etc.) |
| 🎖 HM | @SuperiorTrade_ | Nansen CLI + Hyperliquid Integration | Интеграция через OpenClaw agent, управление через WhatsApp |

### Неделя 2

| Место | Автор | Проект | Суть |
|-------|-------|--------|------|
| 🥇 1st | @rien_nft | Alpha Radar | 24/7 Smart Money сканер, 6-stage validation pipeline, SOL/Base/BNB |
| 🥈 2nd | @edycutjong | NansenTerm + nansen-make-alpha | Bloomberg-style TUI терминал (18 chains, 246 тестов) + Makefile-оркестратор |

### Ключевые паттерны победителей

1. **1st place всегда = автономная система** (24/7 bot, 24/7 scanner), а не one-shot инструмент
2. **Smart Money фокус** — core Nansen product, judges это ценят
3. **Multi-chain** — все победители работают с несколькими сетями
4. **Production-ready** — работающая инфраструктура, не proof-of-concept
5. **Презентация через X thread** — все победители презентовали через Twitter

### Что НЕ выигрывало

- One-shot инструменты без always-on компоненты
- Простые скрипты с 1-2 API calls
- Дашборды без автоматизации/мониторинга
- Проекты с плохой документацией

---

## 4. Дифференциация Narrative Pulse

### Почему мы уникальны

| Все остальные проекты | Narrative Pulse |
|----------------------|-----------------|
| Смотрят на отдельные токены | Смотрит на **нарративы** |
| Показывают данные | Создаёт **новый уровень инсайта** |
| Token-level = noise | Narrative-level = **signal** |
| Таблицы и списки | **Визуальная карта ротаций** |
| Один уровень анализа | **Двухуровневая модель** (макро + суб-нарративы) |

### «Holy shit» момент

Когда judge видит Sankey diagram с потоками капитала между нарративами — это визуально впечатляюще и концептуально ново. Это то, чего никто другой не делал.

---

## 5. Техническая архитектура

### Nansen API — что используем

API организован через Nansen CLI (`npm install -g nansen-cli`) или прямые HTTP-вызовы к `https://api.nansen.ai/api/v1/...`.

#### Endpoint 1: `smart-money/netflows` (5 credits)

**Главный endpoint проекта.** Возвращает net flow токенов купленных/проданных Smart Money.

**Ключевое поле:** `token_sectors: string[]` — API **уже возвращает** сектор токена в ответе.

**Response schema:**
```json
{
  "token_address": "0x...",
  "token_symbol": "UNI",
  "net_flow_1h_usd": 12345.67,
  "net_flow_24h_usd": 12345.67,
  "net_flow_7d_usd": 12345.67,
  "net_flow_30d_usd": 12345.67,
  "chain": "ethereum",
  "token_sectors": ["DeFi"],
  "trader_count": 123,
  "token_age_days": 456,
  "market_cap_usd": 1234567890.0
}
```

**Request:**
```json
{
  "chains": ["ethereum", "solana", "base", "bnb", "arbitrum"],
  "filters": {
    "token_sector": ["AI"],
    "market_cap_usd": { "min": 1000000 }
  },
  "pagination": { "page": 1, "per_page": 50 },
  "order_by": [{ "field": "net_flow_24h_usd", "direction": "DESC" }]
}
```

#### Endpoint 2: `smart-money/holdings` (5 credits)

SM holdings с `token_sectors` в ответе. Дополнительно: `balance_24h_percent_change`, `holders_count`.

**Response schema:**
```json
{
  "chain": "ethereum",
  "token_address": "0x...",
  "token_symbol": "UNI",
  "token_sectors": ["DeFi"],
  "value_usd": 1234567.89,
  "balance_24h_percent_change": 5.5,
  "holders_count": 123,
  "share_of_holdings_percent": 1.5,
  "token_age_days": 456,
  "market_cap_usd": 1234567890.0
}
```

#### Endpoint 3: `tgm/token-screener` (1 credit)

Для получения price_change, volume, buy_volume, sell_volume — нужно для Hot/Watch/Avoid классификации.

**Важно:** Token Screener **НЕ возвращает** `token_sectors` в ответе — только фильтрует по ним.

**Response schema (ключевые поля):**
```json
{
  "chain": "ethereum",
  "token_address": "0x...",
  "token_symbol": "UNI",
  "price_usd": 12.5,
  "price_change": 3.2,
  "market_cap_usd": 1234567890.0,
  "volume": 50000000.0,
  "buy_volume": 28000000.0,
  "sell_volume": 22000000.0,
  "netflow": 6000000.0,
  "nof_traders": 15000,
  "nof_buyers": 8000,
  "nof_sellers": 7000,
  "liquidity": 100000000.0
}
```

#### Endpoint 4: `agent/fast` (200 credits)

AI-агент Nansen для углублённого анализа. Используем для суб-нарративной разбивки топ-нарратива.

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Here are 30 tokens in the AI narrative with their smart money netflow data. Group them into sub-narratives (AI Agents, AI Compute, AI Data, AI Memecoins, etc.) and identify which sub-narrative Smart Money is accumulating most aggressively. Return as JSON array: [{sub_narrative, tokens: [string], conviction: \"high\"|\"medium\"|\"low\", total_netflow_usd}]"
    }
  ],
  "stream": false
}
```

**Response:** SSE stream с событиями `delta`, `tool_call`, `finish`.

### Авторизация

```bash
# Вариант 1: CLI
nansen login --api-key <KEY>

# Вариант 2: env variable
export NANSEN_API_KEY=...

# Вариант 3: HTTP header
-H "apiKey: YOUR_API_KEY"
```

### Rate Limits

- 20 requests/second
- 300 requests/minute
- Headers: `X-RateLimit-Remaining-Second`, `X-RateLimit-Remaining-Minute`

### Поддерживаемые сети

Ethereum, Solana, Base, BNB, Arbitrum, Polygon, Optimism, Avalanche, Linea, Scroll, Mantle, Ronin, Sei, Plasma, Sonic, Monad, HyperEVM, IOTA EVM

**Наш выбор:** Ethereum, Solana, Base, BNB, Arbitrum (топ-5 по объёму SM)

### Известные сектора (из документации Nansen)

DeFi, Meme, Gaming, NFT, Infrastructure, Layer 1, Layer 2, Stablecoin, AI, RWA

**Полный список неизвестен** — требуется discovery query (первый вызов без фильтра, собрать все уникальные `token_sectors` из ответа).

---

## 6. Двухуровневая модель нарративов

### Уровень 1: Макро-нарративы (бесплатный)

Агрегация по `token_sectors` из `smart-money/netflows` ответа.

**Секторные комбинации как суб-нарративы:** Токен может иметь `token_sectors: ["AI", "Infrastructure"]` — это де-факто суб-нарратив «AI Infrastructure». Агрегируем не по одному сектору, а по ключу (отсортированная конкатенация секторов).

| token_sectors | Интерпретация |
|---|---|
| `["AI", "Infrastructure"]` | AI Infrastructure |
| `["AI", "Meme"]` | AI Memes |
| `["DeFi", "Layer 2"]` | L2 DeFi |
| `["Gaming", "NFT"]` | GameFi |
| `["RWA", "Infrastructure"]` | RWA Infrastructure |

**Стоимость:** 0 дополнительных вызовов, 0 external зависимостей.

### Уровень 2: Суб-нарративы через Agent API (200 credits)

Для **топ-нарратива дня** (по SM netflow) — один вызов `agent/fast`. Nansen Agent анализирует токены и группирует в суб-нарративы с оценкой conviction.

**Используется ТОЛЬКО для самого горячего нарратива** — не для всех. Это элегантно и не выглядит как «напихать всего подряд».

---

## 7. Hot / Watch / Avoid — логика классификации

### Источник данных

Комбинация `smart-money/netflows` (SM netflow) + `tgm/token-screener` (price/volume).

### Формула классификации

| Категория | Условие | Интерпретация |
|-----------|---------|---------------|
| 🔥 **Hot** | `net_flow_24h_usd > 0` AND `price_change > 0` AND `buy_volume > sell_volume` | SM покупает И цена растёт — тренд подтверждён |
| 👀 **Watch** | `net_flow_24h_usd > 0` AND `price_change <= 0` | SM покупает, но цена ещё не двинулась — ранний сигнал |
| ⛔ **Avoid** | `net_flow_24h_usd < 0` AND `sell_volume > buy_volume` | SM продаёт —distribution phase |

### Пороги (требуют тюнинга)

- Минимальный `trader_count` для фильтрации шума (предположительно ≥ 3)
- Минимальный `market_cap_usd` для фильтрации микрокапа (предположительно ≥ 100,000)
- Пороги `net_flow` — нужно будет калибровать по реальным данным

### Output

Для каждого нарратива — список токенов с меткой Hot/Watch/Avoid + метрики:
```
🔥 AI — Hot Tokens
  RENDER   | netflow: +$2.3M | price: +8.2% | SM buyers: 47
  FET      | netflow: +$1.1M | price: +5.1% | SM buyers: 31

👀 AI — Watch Tokens
  AKT      | netflow: +$340K | price: -0.3% | SM buyers: 12

⛔ AI — Avoid Tokens
  [нет токенов в этой категории]
```

---

## 8. Визуализация

### Sankey Diagram — Narrative Rotation Map

**Тип:** Sankey diagram (диаграмма потоков)
**Библиотека:** Apache ECharts v5.3+ (SSR mode, zero-dependency)
**Размер:** 1200x800px
**Формат:** SVG → PNG через sharp

**Что показывает:**
- Nodes = нарративы (AI, DeFi, Meme, RWA, DePIN, Gaming...)
- Links = потоки капитала между нарративами (толщина = объём)
- Цвет = направление (зелёный = приток, красный = отток)

**Техническая реализация ECharts SSR:**
```typescript
import * as echarts from "echarts";

const chart = echarts.init(null, null, {
  renderer: "svg",
  ssr: true,
  width: 1200,
  height: 800,
});

chart.setOption({
  series: [{
    type: "sankey",
    data: [{ name: "AI" }, { name: "DeFi" }, ...],
    links: [{ source: "DeFi", target: "AI", value: 47000000 }, ...],
  }],
});

const svgStr = chart.renderToSVGString();
// SVG → PNG через sharp
```

### Sub-narratives Chart (опционально)

**Тип:** Sunburst или Treemap
**Что показывает:** Внутреннюю структуру нарратива (AI Agents, AI Compute, AI Memes внутри AI)

### HTML Report

Standalone HTML файл с встроенными ECharts (CDN), открывается в браузере. Интерактивный.

---

## 9. Стек технологий

| Компонент | Технология | Почему |
|-----------|-----------|--------|
| Язык | TypeScript (ESM) | Основной стек разработчика |
| Runtime | Node.js 20+ | Nansen CLI работает на Node |
| Nansen | CLI + HTTP API | Основной источник данных |
| Визуализация | Apache ECharts (SSR) | Zero-dependency, Sankey из коробки |
| Image processing | sharp | SVG → PNG конвертация |
| Scheduling | node-cron | 24/7 autonomous mode |
| CLI interface | Commander.js или аналогичный | CLI commands |
| HTTP client | fetch (native) или got | API запросы |

**НЕ используем:**
- Никаких внешних data sources (CoinGecko, DeFiLlama и т.д.)
- Никаких LLM вне Nansen Agent API (OpenRouter, OpenAI — нет)
- Никаких баз данных (данные реальные, из API)

---

## 10. Что НЕ входит в проект

| Исключено | Почему |
|-----------|--------|
| Polymarket integration | Утяжелит проект, размывает фокус |
| Внешние data sources | Judges не оценят, нарушает дух конкурса |
| Кастомная LLM-кластеризация | Используем Nansen Agent API вместо этого |
| Мобильное приложение | Не успеть + не core |
| Backtesting | Не фокус проекта |

---

## 11. Итоговый результат (что должно быть на выходе)

### Для judges

1. **GitHub репозиторий** с чистой историей коммитов (5+ дней разработки)
2. **README** с GIF Sankey diagram, скриншотами, схемой, quick start
3. **X thread** (8 твитов) с визуалами и описанием
4. **Working tool** — `npm install && nansen login && npx narrative-pulse scan`

### Функциональность

- `npx narrative-pulse scan` — разовый скан, выводит в CLI + генерирует HTML report
- `npx narrative-pulse watch` — 24/7 режим (cron)
- Sankey diagram с ротациями между нарративами
- Hot/Watch/Avoid таблицы для каждого нарратива
- Sub-narratives для топ-нарратива дня
- ~45 API вызовов за прогон

### Количество API вызовов за прогон (примерно)

| Endpoint | Вызовов | Credits |
|----------|:-------:|:-------:|
| smart-money/netflows | 5 (по 1 на chain) | 25 |
| tgm/token-screener | 5 (по 1 на chain) | 5 |
| smart-money/holdings | 1-2 (топ нарративы) | 5-10 |
| agent/fast | 1 (суб-нарративы) | 200 |
| **Итого** | **~12-13** | **~235-240** |

---

## 12. Риски и митигации

| Риск | Вероятность | Митигация |
|------|:-----------:|-----------|
| token_sectors содержит только 1 категорию у большинства токенов | Средняя | Комбинации не дадут гранулярности → используем Agent API для Level 2 |
| Agent API возвращает неструктурируемый ответ | Низкая | Простой prompt engineering + fallback на Level 1 |
| ECharts SSR не работает как ожидается | Низкая | Fallback: генерация HTML с CDN ECharts (не SSR) |
| Не успеваю к дедлайну | Средняя | Приоритет: pipeline > Hot/Watch/Avoid > Sankey > Agent API > Sunburst > Telegram |
| Credits закончились | Низкая | Экономный режим: 1 chain для разработки, все 5 для production |
