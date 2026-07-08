# 📝 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🔮 Planned
- Recurring expenses (auto-add monthly rent, subscriptions, etc.)
- Multi-currency support with conversion rates
- Interactive REPL mode (`expense shell`)
- JSON import/export
- Telegram / Discord bot integration
- GitHub Actions CI pipeline
- Publish to PyPI (`pip install expense-tracker`)
- Pre-commit hooks (black, ruff, mypy)
- Tag system (many-to-many)

---

## [0.3.0] - 2026-07-08 ✨

**Responsive design, live-themed charts, command palette, undo toasts & mobile drawer.** A pure-UX/frontend pass on the web SPA — no API or schema changes, but every screen now adapts cleanly from a 320px phone to a 4K monitor, light/dark mode recolors the charts live, and the keyboard-first workflow is finally solid.

### ✨ Added

#### 🎨 Theme system overhaul
- **CSS custom properties as single source of truth** — added `--chart-text`, `--chart-grid`, `--chart-tooltip-bg`, `--chart-tooltip-text`, `--chart-legend`, `--primary-soft`, and proper dark-mode overrides for every surface (`--bg`, `--card-bg`, `--border`, `--text`, `--muted`, `--shadow`)
- **`color-scheme: light / dark`** hint to the browser so native UI (scrollbars, form controls) matches
- **GitHub-style dark heatmap palette** (`--heat-0…4` swap to a familiar green ramp)
- **Smooth 250ms transitions** on every themed property (background, color, border, shadow)
- **Focus-visible outlines** using `var(--primary)` for better keyboard navigation
- **Custom thin scrollbars** that adapt to the theme

#### 📊 Live-themed Chart.js
- **`chartTheme()` helper** — reads `--chart-*` variables via `getComputedStyle(document.body)`
- **`createChart(canvas, config)`** — wraps `new Chart()` with deep-merged theme defaults (legends, tooltips, axes, grid lines)
- **`applyChartDefaults()` / `updateChartsTheme()`** — called on boot and on every theme toggle so existing charts recolor instantly with `chart.update('none')` (no animation flicker)
- **`chartInstances` registry** — fixes *"Canvas is already in use"* errors when revisiting Reports
- **Charts wrapped in `.chart-host`** with `maintainAspectRatio: false` and proper min-heights (320px on desktop, 240px on mobile)

#### 📱 Responsive layout
- **Three breakpoints**: `1024px` (tablet), `768px` (phone), `420px` (tiny phones)
- **Slide-in sidebar drawer** with `.menu-toggle` button and `.sidebar-overlay` (click-outside-to-close)
- **Hamburger menu** visible only on mobile; ESC closes the drawer; every navigation auto-closes it
- **Horizontally scrollable tables** via `.table-wrap` — no more clipped action buttons on narrow screens
- **`.table` min-width: 560px** + sticky `<thead>` so column headers stay visible while scrolling
- **Forms collapse to 1 column** at 768px; toolbar inputs wrap and stretch fluidly
- **Stat grid** goes 4 → 2 → 1 columns as the screen shrinks
- **FAB shrinks** to 54px and its hover tooltip is disabled on touch devices
- **Toast container** spans the full width on phones so messages never get clipped
- **Modals go full-width** with stacked, full-width action buttons on mobile
- **Heatmap** drops its left margin and scrolls horizontally inside `.heatmap-wrap` on small screens
- **`prefers-reduced-motion`** support kills ambient gradient drift, shimmer, and scroll-reveal animations for users who request it

#### ⌨️ Keyboard & command palette
- **Command palette modal** (`Ctrl/⌘+K`) with fuzzy search and arrow-key navigation
- **`G` then `D/E/C/R/B`** navigation (Vim-style prefix shortcuts)
- **`N`** — new expense from anywhere
- **`/`** — focus the search box on Expenses
- **`?`** — full shortcut cheatsheet modal
- **`Esc`** — closes any open modal/drawer
- **`openModal()` auto-focuses** the first form field after open

#### 🧯 Quality-of-life
- **Toast with Undo action** — deletes in the Expenses view offer a 5-second window to restore the row from a snapshot
- **`mergeDeep()` helper** — used by chart theming; safe to use anywhere
- **Auto-focus first field** in every modal
- **`window.__closeSidebar()`** so `navigate()` can close the drawer without coupling to DOM internals

### 🐛 Fixed

- **`buildHeatmap` infinite loop** — original code did `if (week > dec31)` which compared an `Array` to a `Date` (always `false`), so the loop ran the full 60-week cap even on short years. Now compares the last day of the week: `if (week > dec31) break;`
- **Dashboard "Top category" was always `—`** — `const top = summary.by_category && summary.by_category` assigned the *whole array* to `top`, then `top.category` was always `undefined`. Now uses `summary.by_category` correctly
- **Chart "Canvas is already in use"** on revisiting Reports — fixed via `chartInstances` registry + auto-destroy in `createChart()`
- **Theme toggle didn't recolor charts** — fixed by adding `applyChartDefaults()` + `updateChartsTheme()` to the toggle handler
- **Inputs / textareas stayed white in dark mode** — now use `var(--card-bg)` so they follow the theme
- **`.btn` had a hard-coded `white` background** in dark mode — replaced with `var(--card-bg)`
- **`.table th` had a hard-coded `#f9fafb`** in dark mode — replaced with `#0f172a` (also made sticky)
- **Sidebar blocked viewport on mobile** — old breakpoint shrank it to 64px, hiding labels; new breakpoint hides it off-screen and reveals it as a drawer
- **`openModal()` no autofocus** — first field is now focused 50ms after open (after the CSS transition starts)

### 🔧 Changed

- **`renderExpenseTable()`** now wraps its output in `.table-wrap` for responsive horizontal scroll
- **`reports()` renderer** wraps both canvases in `.chart-host` divs and uses `createChart()` instead of raw `new Chart()`
- **Sidebar markup** gained a hidden-on-desktop `.menu-toggle` button (in `.topbar`) and a `.sidebar-overlay` div
- **Modal markup** unchanged — but styling is now fully responsive (padded, scrollable, full-width on mobile)
- **CSS removed redundancies** — single source for shadows, single transition list, single breakpoint grouping

### 📚 Documentation

- New **"📱 Responsive behaviour"** subsection in the Web Interface docs with a breakpoint table
- New **"⌨️ Keyboard shortcuts"** subsection listing every shortcut
- Updated **"🛠️ Tech Stack"** table to mention the custom design system
- Updated **"🗺️ Roadmap"** to check off Responsive design, Light/dark theme with live chart recoloring, Command palette, and Toast with Undo
- New **"Adding a new theme color"** dev-guide section
- New **troubleshooting entries** for *"Charts invisible in dark mode"* (cache) and *"Sidebar doesn't close on mobile"* (version drift)
- New **FAQ entry** explaining how dark-mode chart theming works under the hood

### ⚙️ Dependencies

_None — pure frontend work._

---

## [0.2.0] - 2026-06-30 🌐

**Web interface & per-category budgets.** A full Flask + vanilla-JS SPA on top of the existing repositories, plus first-class per-category budgets throughout the CLI, API, and web UI.

### ✨ Added

#### 🌐 Web Interface (`py -m expense_tracker.web`)
- **Flask REST API** in `web.py` — wraps existing repositories, no duplicated SQL
- **Single-page application** with vanilla JS, Chart.js, and a hand-crafted CSS design system
- **Dashboard** — total spent, budget remaining with progress bar, top category, recent expenses
- **Expenses view** — full CRUD with date/category filters, modal forms for add/edit
- **Categories view** — colored category cards, add/delete with HTML5 color picker
- **Reports view** — interactive bar + doughnut charts (Chart.js) plus a category breakdown table
- **Budget view** — manage overall *and* per-category budgets with per-category progress bars
- **CSV download** button in the sidebar (`GET /api/export.csv`)
- **Responsive layout** — sidebar collapses on narrow screens
- **Toast notifications** for success/error feedback
- **Modal forms** with client-side + server-side validation
- **Hash-based routing** — `#dashboard`, `#expenses`, `#categories`, `#reports`, `#budget`

#### 🎯 Per-Category Budgets
- **`BudgetRepository.list_budgets_for_month()`** — returns overall + per-category budgets for a month
- **`BudgetRepository.delete_budget()`** — remove an overall or per-category budget
- **`MonthlyReport.category_budgets`** — new dict of per-category budget info
- **`CategoryTotal.category_id`** — exposed so the UI can match spending to its budget
- **API endpoints**
  - `GET /api/budgets?month=YYYY-MM` — list every budget for a month
  - `DELETE /api/budget?month=…&category_id=…` — remove a specific budget
  - `GET /api/budget` now accepts `?category_id=N` for a single category
  - `PUT /api/budget` accepts `category_id` in the body (`null` = overall)
- **Web UI** — Budget view adds a **Type** dropdown to switch between *Overall* and *Per-category*, preloads the current amount when switching, and renders a separate progress bar per category
- **Reports table** — automatically grows **Budget** + **Remaining** columns when per-category budgets exist
- **Dashboard** — shows "*+ N category budgets*" hint in the budget card
- **CLI** — `budget AMOUNT -c NAME` sets a per-category budget

### 🔧 Changed

- `MonthlyReport` gained a new field `category_budgets` (defaults to `{}` — backwards compatible)
- `CategoryTotal` gained a new optional field `category_id`
- `GET /api/budget` response now includes `category_id`
- `GET /api/reports/summary` now returns `category_budgets`, and each entry in `by_category` includes `category_id`, `budget`, and `budget_remaining`
- CLI `summary` output unchanged (no breaking changes)

### 📚 Documentation

- New "🌐 Web Interface" section in the README with install, screenshots, and feature tour
- Updated project structure diagram to include `web.py`, `templates/`, `static/`
- Updated roadmap — checked off **Per-category budgets** and **Web interface**

### ⚙️ Dependencies

| Package | Version | Purpose |
|---|---|---|
| `flask` | `>=3.0` | Web server & REST API (new) |

All other dependencies unchanged.

---

## [0.1.0] - 2026-06-29 🎉

**Initial release.** The first usable version of the Expense Tracker CLI.

### ✨ Added

#### Core
- **Expense CRUD** — add, list, edit, and delete expenses
  - Fields: amount (validated `> 0`), description, date (ISO `YYYY-MM-DD`), category
  - `add` command prompts to create a new category if it doesn't exist
  - `list` command supports filtering by `--from` / `--to` date range and `-c` category
  - `edit` command updates only the fields you pass (others are preserved)
  - `delete` command removes by ID

#### Categories
- **Category CRUD** — `categories` subcommand group
  - 7 default categories auto-seeded on first run: Food, Transport, Housing, Entertainment, Health, Shopping, Other
  - Each category has a name (unique) and a color (hex, for future chart styling)
  - `CategoryRepository.create()` is idempotent — returns existing ID if name is taken

#### Budgets
- **Monthly budget tracking** — `budget AMOUNT` command
  - One budget per month (overall, not per-category yet)
  - `summary` shows budget, spent, and remaining (color-coded red if over)
- **Python-level upsert** for budgets (works around SQLite's NULL + UNIQUE quirk)

#### Reporting
- **Monthly summary** — `summary [-m YYYY-MM]`
  - Total spent, expense count, budget status
  - Breakdown by category with count, total, and percentage
  - Beautiful Rich table with magenta headers
- **Bar chart** — `chart [-o FILE]` generates a horizontal PNG bar chart via matplotlib

#### Export
- **CSV export** — `export [-o FILE]` writes `id, date, category, amount, description`
  - Supports `--from` / `--to` filters for monthly exports

#### Architecture
- **`src/` layout** — modern Python packaging standard
- **`pyproject.toml`** with PEP 621 metadata, dependencies, and `[project.scripts]` entry point
- **Layered architecture**:
  - `database.py` — connection management & schema
  - `models.py` — dataclasses + repository pattern (data access layer)
  - `reports.py` — aggregation logic
  - `visualization.py` — chart rendering
  - `cli.py` — Click commands (UI layer)
- **Type hints** throughout (uses `from __future__ import annotations`)
- **Context-managed DB connections** — auto-commit on success, auto-rollback on error
- **Timezone-aware datetimes** — `datetime.now(timezone.utc)` instead of deprecated `utcnow()`

#### Quality
- **6 unit tests** with pytest (all passing)
  - `test_models.py` — 5 tests covering all repositories
  - `test_reports.py` — 1 test for the monthly summary
- **Isolated test database** via `tmp_db` fixture — tests never touch your real DB
- **Idempotent database initialization** — `initialize_database()` is safe to call repeatedly

### 🐛 Fixed

_None — first release._

### 🔒 Security

- Database stored in user home directory (`~/.expense_tracker/`) — not world-readable by default
- All SQL uses parameterized queries — **zero SQL injection risk**
- No network access required or performed — fully offline

### 📚 Documentation

- Comprehensive `README.md` with:
  - Project banner with shields.io badges
  - Preview of CLI output (ASCII art)
  - Feature list, tech stack, project structure diagram
  - Step-by-step installation for Windows / macOS / Linux
  - Quick-start guide + reference of all commands
  - 3-layer architecture diagram with rationale
  - Full SQL schema
  - Test instructions with expected output
  - Collapsible troubleshooting section
  - Development guide, contributing guide, FAQ
  - Roadmap with checkmarks for completed features

### ⚙️ Dependencies

| Package | Version | Purpose |
|---|---|---|
| `click` | `>=8.1` | CLI framework |
| `rich` | `>=13.0` | Terminal tables & colors |
| `matplotlib` | `>=3.7` | Chart generation |
| `pytest` | `>=7.0` | Testing (dev only) |

**Python:** `>=3.10` (developed and tested on 3.14.6)

---

## Version History Summary

| Version | Date | Highlights |
|---|---|---|
| `0.3.0` | 2026-07-08 | ✨ Responsive design (drawer + breakpoints), live-themed Chart.js, command palette, undo toasts, bug fixes |
| `0.2.0` | 2026-06-30 | 🌐 Web interface (Flask + Chart.js) and per-category budgets throughout the stack |
| `0.1.0` | 2026-06-29 | 🎉 Initial release — full CLI with CRUD, budgets, charts, CSV export, tests |

---

## Release Notes Format

Each release section follows this structure:

- **`✨ Added`** — new features
- **`🔧 Changed`** — changes in existing functionality
- **`🗑️ Deprecated`** — soon-to-be removed features
- **`❌ Removed`** — now-removed features
- **`🐛 Fixed`** — bug fixes
- **`🔒 Security`** — vulnerability fixes

### Versioning Policy

We use **Semantic Versioning**:
- **MAJOR** (`1.0.0`) — incompatible API changes
- **MINOR** (`0.1.0`) — new functionality, backwards-compatible
- **PATCH** (`0.0.1`) — bug fixes, backwards-compatible

Until we hit `1.0.0`, anything may change at any time.

---

## Links

- 📖 [README](./README.md)
- 🗺️ [Roadmap](./README.md#-roadmap)
- 🐛 [Issue Tracker](https://github.com/ItsWanheda/expense-tracker/issues)
- 📦 [PyPI Package](https://pypi.org/project/expense-tracker/) _(coming soon)_

[Unreleased]: https://github.com/ItsWanheda/expense-tracker/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ItsWanheda/expense-tracker/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ItsWanheda/expense-tracker/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ItsWanheda/expense-tracker/releases/tag/v0.1.0