# Narrative Pulse — Метаплан организации работы и презентации

> Конкурс: Nansen CLI Build Challenge, Week 3
> Дедлайн: 5 апреля 2026 (Sun), 11:59 PM SGT (~18:59 MSK)
> Цель: 1-е место

---

## 1. Git-стратегия

### Репозиторий

Новый публичный GitHub репозиторий `narrative-pulse` — **отдельный** от Alfa Radar. Судьи должны видеть фокусный проект, не примесь другого кода.

### Философия коммитов

Каждый коммит — логичная завершённая единица работы. Judges будут смотреть Git history — это часть «show your work». Хронология должна рассказывать историю: от исследования → к прототипу → к production.

### Порядок коммитов (скелет)

```
Day 1 (Wed)
─────────────────────────────────────────────────
✦ Initial commit: project scaffold
  → package.json, tsconfig, .gitignore, README stub
  
✦ feat: Nansen CLI auth + discovery query
  → Первый реальный вызов API, получение списка секторов
  → В коммите: скриншот output в commit message или в /docs

✦ feat: smart-money netflows pipeline
  → Multi-chain fetching, rate-limit handling, response typing

✦ feat: narrative aggregation engine
  → Группировка по token_sectors + комбинации
  → Результат: { narrative, netflow, tokenCount, topTokens }

Day 2 (Thu)
─────────────────────────────────────────────────
✦ feat: Hot/Watch/Avoid classifier
  → Формула классификации токенов внутри нарратива
  → Unit tests

✦ feat: top tokens per narrative (leaders board)
  → Топ-5 токенов для каждого нарратива с метриками

✦ feat: Nansen Agent API integration for sub-narratives
  → Agent/fast вызов для топ-нарратива дня
  → Парсинг ответа в структурированные суб-нарративы

Day 3 (Fri)
─────────────────────────────────────────────────
✦ feat: ECharts Sankey diagram — narrative rotation map
  → SSR рендеринг SVG, визуализация потоков между нарративами

✦ feat: ECharts Sunburst chart — narrative breakdown
  → Визуализация суб-нарративов внутри макро-нарративов

✦ feat: CLI report generator
  → Форматированный вывод в терминал (таблицы + цвета)
  → + HTML report generation (standalone файл)

Day 4 (Sat)
─────────────────────────────────────────────────
✦ feat: cron scheduler + 24/7 mode
  → node-cron, auto-run every N hours
  → Persistence: сохранение предыдущих прогонов для трендов

✦ feat: Telegram bot integration (bonus)
  → Авто-пост ротационной карты в TG канал
  → Алерты при резких ротациях

✦ docs: comprehensive README + demo assets
  → Скриншоты, GIF, explanation
  → Installation guide, usage examples

Day 5 (Sun until 11:59 PM SGT)
─────────────────────────────────────────────────
✦ fix: polish, edge cases, final testing
✦ docs: final README polish
✦ X/Twitter thread publication
```

### Правила коммит-сообщений

```
feat: [что добавлено]          — новая функциональность
fix: [что исправлено]          — багфикс
refactor: [что рефакторнуто]   — переструктуризация без смены поведения
docs: [что документировано]    — README, комментарии
chore: [инфраструктура]        — настройки, зависимости
```

### Чего НЕ делать в Git

- Не делать `git commit -m "wip"` или `git commit -m "stuff"`
- Не сквошить всё в один коммит в конце — judges хотят видеть прогресс
- Не пушить сломанный код — каждый коммит должен компилироваться

---

## 2. README как оружие

README — это первое (и часто единственное), что judges прочитают. Он должен быть сканируемым за 60 секунд и впечатляющим.

### Структура README

```markdown
# 🔥 Narrative Pulse

> Track WHERE Smart Money is rotating between crypto narratives — in real time.

[1-2 sentence hook что это и зачем]

## 📸 What it looks like

[GIF/Screenshot Sankey diagram — ПЕРВАЯ ВЕЩЬ после заголовка]
[Скриншот CLI output с Hot/Watch/Avoid таблицей]

## 🧠 The Problem

[2-3 предложения: Smart Money data exists but nobody looks at 
the NARRATIVE level. Token-level analysis is noise. 
Narrative-level analysis is signal.]

## 🏗 How it works

[Простая ASCII-схема пайплайна]

  Nansen API ──► Sector Discovery
       │
       ├──► Smart Money Netflows (multi-chain)
       │         │
       │         ▼
       │    Narrative Aggregation
       │         │
       │    ┌────┴────┐
       │    ▼         ▼
       │  Hot/Watch/Avoid   Sub-narratives (Agent API)
       │    │
       │    ▼
       │  Visual Report (Sankey + Tables)
       │
       └──► Cron Scheduler (24/7)

## 🚀 Quick Start

```bash
npm install
nansen login
npx narrative-pulse scan
```

[3-4 примера использования с output]

## 📊 API Calls Breakdown

| Call | Endpoint | Purpose | Credits |
|------|----------|---------|---------|
| 1 | smart-money/netflows | ... | 5 |
| ... | ... | ... | ... |
| **Total** | | | **~45** |

[Judges хотят видеть сколько вызовов — показываем]

## 🗂 Project Structure

[Краткая структура файлов]

## 🎯 Key Features

- Multi-chain narrative tracking (5 chains)
- Hot / Watch / Avoid token classification
- Sub-narrative deep-dive via Nansen Agent API
- Visual Sankey rotation map + HTML reports
- 24/7 autonomous mode with cron scheduling

## ⚡ Tech Stack

- TypeScript, Node.js
- Nansen CLI + Research API + Agent API
- ECharts (SSR) for visualization
- node-cron for scheduling
```

### Ключевой принцип

Judges сканируют README за 30-60 секунд. GIF/Screenshot ПЕРВЫМ. Проблема → Решение → Демо → Технические детали — именно в таком порядке.

---

## 3. Презентация в X (Holy Shit эффект)

Это самый важный артефакт. Победители W1 и W2 все презентовали через X threads.

### Архитектура X-треда

**Tweet 1 (Hook)**
Narrative Pulse 🔥

Built with @nansen_ai CLI

A tool that tracks WHERE Smart Money 
is rotating between crypto NARRATIVES 
— not tokens, NARRATIVES.

Thread 🧵👇

[GIF: Sankey diagram в действии — поток капитала между нарративами]

---

**Tweet 2 (The Problem)**
Everyone tracks Smart Money tokens.

Nobody tracks Smart Money NARRATIVES.

Token-level = noise (1000 tokens moving)
Narrative-level = signal (capital rotating 
  from DeFi → AI)

That's the gap Narrative Pulse fills.

---

**Tweet 3 (How it works)**
Here's what it does:

1️⃣ Fetches SM netflows across 5 chains
2️⃣ Aggregates by sector → NARRATIVES
3️⃣ Classifies tokens: 🔥 Hot / 👀 Watch / ⛔ Avoid
4️⃣ Deep-dives top narratives via Agent API
5️⃣ Generates visual rotation map

Runs 24/7. Zero manual work.

---

**Tweet 4 (The Map — VISUAL SHOWCASE)**
The Narrative Rotation Map 👇

[Картинка: Sankey diagram]

You can SEE capital flowing:
→ $47M into AI narratives
→ $23M exiting Memecoins
→ DePIN quietly accumulating

This is what Smart Money sees that you don't.

---

**Tweet 5 (Hot / Watch / Avoid)**
Each narrative gets classified tokens:

🔥 HOT — SM accumulating + price moving
👀 WATCH — SM accumulating, price quiet
⛔ AVOID — SM distributing

[Скриншот CLI output с таблицей]

Actionable, not just informative.

---

**Tweet 6 (Sub-narratives — the edge)**
"AI" is too broad.

Narrative Pulse uses @nansen_ai Agent API 
to break it down:

→ AI Agents 🤖 (SM heavy accumulation)
→ AI Compute 🖥 (stable)
→ AI Memes 🎭 (exiting)

[Скриншот/картинка суб-нарративов]

This is the level traders need.

---

**Tweet 7 (Technical depth)**
Under the hood:

• ~45 Nansen API calls per scan
• Multi-chain: ETH, SOL, Base, BNB, Arbitrum
• ECharts SSR for visual generation
• 24/7 autonomous with cron scheduling
• Sub-narrative AI via Nansen Agent API

Open source: [GitHub link]
#NansenCLI

---

**Tweet 8 (CTA)**
Narrative Pulse is open source.

Clone → npm install → nansen login → scan.

GitHub: [link]

Built for @nansen_ai #NansenCLI Challenge 
Week 3.

If this is useful, RT the first tweet 🙏

### Принципы Holy Shit эффекта

1. **GIF первым** — Sankey diagram с потоками между нарративами. Судья видит и думает «о, это красиво и ново»
2. **«Narrative-level vs Token-level»** — это framing, который моментально объясняет ценность и дифференцирует от всех других проектов
3. **«This is what Smart Money sees that you don't»** — сильная линия, которая резонирует
4. **Visually dense** — каждый твит содержит картинку или скриншот, не только текст
5. **Sub-narratives как killer feature** — «AI слишком broad» — это момент, когда judge думает «wow, он прав»

---

## 4. Production Assets (что подготовить до поста)

| Asset | Формат | Когда | Назначение |
|-------|--------|-------|-----------|
| Sankey rotation map | PNG 1200x800 | Day 3-4 | Главный визуал, Tweet 4 |
| Sankey rotation map | GIF (animated) | Day 4 | Tweet 1 hook |
| Hot/Watch/Avoid table | Screenshot (terminal) | Day 3 | Tweet 5 |
| Sub-narratives chart | PNG | Day 3 | Tweet 6 |
| CLI demo | GIF/asciinema | Day 4 | README + Tweet 7 |
| GitHub repo | — | Day 1, push daily | Основной артефакт |

---

## 5. Timeline (реалистичный)

```
Day 1 (Wed)  — CORE: Auth, API pipeline, aggregation     ~6-7h
Day 2 (Thu)  — LOGIC: Hot/Watch/Avoid, Agent API          ~6-7h
Day 3 (Fri)  — VISUAL: ECharts, reports, HTML generation  ~6-7h
Day 4 (Sat)  — PROD: Cron, polish, README, assets         ~5-6h
Day 5 (Sun)  — PRESENTATION: X thread, final touches      ~3-4h
```

**Буфер:** Sun до 11:59 PM SGT — это ~18:59 MSK. Всё программное должно быть готово к Sat вечеру. Sun — только презентация и полировка.

---

## 6. Чеклист перед публикацией

- [ ] GitHub repo публичный, README полный
- [ ] `npm install && nansen login && npx narrative-pulse scan` — работает с нуля
- [ ] Минимум 10 API вызовов за прогон (показываем в README)
- [ ] GIF Sankey diagram записан
- [ ] X thread написан и проверен
- [ ] Тег @nansen_ai и хештег #NansenCLI в финальном твите
- [ ] Ссылка на GitHub в треде
- [ ] Коммит-история выглядит как осмысленная работа за несколько дней

---

## 7. Концепция проекта (напоминание)

### Narrative Pulse — Детектор нарративных ротаций Smart Money

**Суть:** Кластеризует токены в нарративы (AI, DePIN, RWA, Memecoins, DeFi...) и отслеживает, куда перетекает Smart Money между нарративами.

### Двухуровневая модель нарративов

**Уровень 1 (бесплатный):** Агрегация по `token_sectors` из API → макро-нарративы. Комбинации секторов дают суб-нарративы (AI+Infrastructure = AI Infra).

**Уровень 2 (Agent API):** Для топ-нарратива дня — один вызов `agent/fast` для deep-dive суб-категоризации.

### Hot / Watch / Avoid

| Категория | Логика | API данные |
|-----------|--------|-----------|
| 🔥 Hot | SM netflow позитивен + растёт, volume растёт, price_change > 0 | `netflows` + `token-screener` |
| 👀 Watch | SM netflow позитивен, но price ещё не двинулся | `netflows` > 0 при `price_change` ≈ 0 |
| ⛔ Avoid | SM netflow негативен, SM продаёт | `netflows` < 0 при высоком `sell_volume` |

### Ключевые API endpoints

| Endpoint | Credits | Назначение |
|----------|---------|-----------|
| `smart-money/netflows` | 5 | Основной — SM потоки по токенам с `token_sectors` |
| `smart-money/holdings` | 5 | SM holdings для дополнительного enrichment |
| `tgm/token-screener` | 1 | Price/volume данные для Hot/Watch/Avoid |
| `agent/fast` | 200 | Суб-нарративы для топ-нарратива дня |

### Визуализация

- **Sankey diagram** (ECharts SSR) — карта потоков между нарративами
- **Sunburst chart** — разбивка нарратива на суб-нарративы
- **CLI tables** — Hot/Watch/Avoid с топ-токенами
- **HTML report** — standalone файл со всеми визуалами
