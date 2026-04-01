# Narrative Pulse — Technical Reference for AI Agents

> **Для полного контекста проекта читай `docs/narrative-pulse-concept.md`**
>
> **Специфичные инструкции для агентов**: `.opencode/agents/`

---

## 1. Project Overview

**Narrative Pulse** — CLI-инструмент для отслеживания ротаций Smart Money между крипто-нарративами. Использует Nansen CLI/API для получения on-chain данных, агрегирует на уровне секторов, классифицирует токены (Hot/Watch/Avoid) и генерирует визуальные отчёты.

**Контекст:** Проект создан для Nansen CLI Build Challenge (Week 3). Дедлайн: 5 апреля 2026. Цель — 1-е место.

---

## 2. Technical Architecture

### Module Structure

```
src/
├── index.ts          # Entry point + CLI commands (commander)
├── types.ts          # Все TypeScript интерфейсы
├── config.ts         # Конфигурация (chains, thresholds)
├── api/
│   ├── client.ts     # HTTP клиент для Nansen API
│   ├── netflows.ts   # smart-money/netflows
│   ├── token-screener.ts  # tgm/token-screener
│   ├── holdings.ts   # smart-money/holdings
│   └── agent.ts      # agent/fast (SSE streaming)
├── engine/
│   ├── discovery.ts  # Discovery query — список секторов
│   ├── aggregator.ts # Агрегация по нарративам
│   ├── classifier.ts # Hot/Watch/Avoid
│   ├── sub-narratives.ts  # Agent API суб-нарративы
│   └── scanner.ts    # Orchestrator — полный pipeline
├── visual/
│   ├── sankey.ts     # ECharts Sankey (SSR)
│   ├── sunburst.ts   # ECharts Sunburst (опционально)
│   ├── html-report.ts     # Standalone HTML отчёт
│   └── terminal_report.ts # CLI formatted output
└── scheduler/
    └── cron.ts       # node-cron 24/7 mode
```

### Key Files

| Файл | Назначение |
|------|-----------|
| `src/index.ts` | Entry point + CLI commands |
| `src/types.ts` | TypeScript interfaces |
| `src/config.ts` | Chains, thresholds, pagination |
| `src/api/client.ts` | Nansen HTTP client (auth, rate limits) |

---

## 3. Code Conventions

### TypeScript

- **STRICT TYPING**: `any` запрещён. Все типы в `src/types.ts`
- **Self-documenting code**: ясные имена, логичная структура
- **Single responsibility**: одна функция = одно действие

### Error Handling

- **Все API-вызовы**: `try/catch` с логированием
- **Rate limit handling**: очередь с задержками (20 req/sec, 300 req/min)
- **Graceful degradation**: если один endpoint падает — pipeline продолжает

### Именование

- Файлы: `verbNoun.ts` (`fetchNetflows.ts`, `classifyTokens.ts`)
- Функции: `fetchNetflows()`, `classifyTokens()`, `renderSankey()`
- Логика файла соответствует названию

---

## 4. Documentation Map

| Документ | Назначение |
|----------|-----------|
| `docs/narrative-pulse-concept.md` | Полный контекст проекта + ресёрч |
| `docs/narrative-pulse-techplan.md` | Детальный техплан по дням |
| `docs/narrative-pulse-metaplan.md` | Git-стратегия + презентация |

---

## 5. MCP Integration

- **MiniMax** — Web-поиск и AI Vision.
  - `MiniMax_web_search` — `@researcher`
  - `MiniMax_understand_image` — `@vision`
- **Context7** — Актуальная документация фреймворков.
  - Размещён: `@researcher`
- **Jina Reader** — Чтение веб-страниц (markdown).
  - Размещён: `@researcher`

---

**Правило**: При изменении архитектуры агентов обновляйте `opencode.json` и этот файл (AGENTS.md).
