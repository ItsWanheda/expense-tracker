# 📝 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.0] - 2026-09-25 🧠

**Financial Intelligence.** The first v0.5.0 analytics layer adds deeper spending insight without replacing the established v0.4.0 reporting system.

### ✨ Added

- **12-month spending trends** for the selected month.
- **Month-over-month comparison** with absolute and percentage change.
- **Daily spending averages** and active spending-day counts.
- **Top 5 spending categories** with totals and transaction counts.
- **Top 5 individual expenses** for quick high-impact transaction review.
- **Currency-aware analytics** using the existing conversion layer.
- **Optional wallet filtering** for focused analysis.
- **Financial intelligence API** at `/api/reports/intelligence`.
- **Dashboard intelligence metrics** for daily average, transaction count, and monthly change.
- **Regression coverage** for the new reporting layer.

### 🔒 Compatibility

- Existing monthly summary behavior remains unchanged.
- Existing budgets, recurring expenses, wallets, currencies, exports, CLI commands, and web views remain available.
- The new dashboard metrics degrade gracefully when the intelligence endpoint is unavailable.

### 📚 Documentation

- Updated the roadmap for the v0.5.0 Financial Intelligence milestone.
- Documented the new analytics API and dashboard metrics.

---

## [0.4.0] - Unreleased 🚧

**Recurring expenses, advanced charts, deeper analytics, and improved financial
automation.** Version 0.4.0 expands the Expense Tracker from a primarily
manual expense-recording application into a more automated personal finance
tool. Recurring transactions can now be defined once and automatically
materialized into normal expenses, while Advanced Charts provide additional
ways to understand spending patterns over time.

This release introduces changes across the database, repository layer, API,
web interface, navigation, and analytics while keeping the existing expense,
category, budget, reporting, and chart infrastructure intact.

### ✨ Added

#### 🔄 Recurring Expenses

- **Recurring expense support** — users can define expenses that should occur
  automatically on a repeating schedule instead of manually entering the same
  expense every time.

- **Recurring expense database table** — added a dedicated
  `recurring_expenses` table containing:
  - `id`
  - `amount`
  - `description`
  - `category_id`
  - `frequency`
  - `next_run`
  - `anchor_day`
  - `active`
  - `created_at`
  - `updated_at`

- **Recurring expense repository** — added
  `RecurringExpenseRepository` to keep recurring-expense data access inside
  the existing repository/data-access layer.

- **Weekly recurrence** — recurring expenses can repeat every seven days.

- **Monthly recurrence** — recurring expenses can repeat every month while
  preserving their intended day of the month where possible.

- **Yearly recurrence** — recurring expenses can repeat annually while
  preserving the intended month and day.

- **Next-run scheduling** — every recurring expense stores a `next_run` date
  representing the next occurrence that needs to be generated.

- **Active / paused state** — recurring expenses can be paused without being
  deleted.

- **Resume support** — paused recurring expenses can be activated again.

- **Recurring expense CRUD** — complete create, read, update, and delete
  functionality is available through the repository layer.

- **Recurring expense editing** — existing schedules can be modified without
  creating duplicate recurring entries.

- **Recurring expense deletion** — schedules can be permanently removed when
  they are no longer needed.

- **Category integration** — recurring expenses reuse the existing category
  system rather than introducing a separate category implementation.

- **Automatic generation of normal expenses** — when a recurring expense
  becomes due, it is converted into a normal record in the existing
  `expenses` table.

- **Historical compatibility** — generated recurring expenses behave like
  normal expenses, meaning they automatically participate in existing
  reports, summaries, category totals, budgets, CSV exports, and charts.

- **Missed occurrence catch-up** — if the application has not been opened for
  a period of time, all due recurring occurrences are generated rather than
  silently skipped.

  For example, if a monthly recurring expense was scheduled for:

  - June 1
  - July 1
  - August 1

  and the application was not opened until August 17, the missed June and July
  occurrences are still generated before the schedule advances to the next
  future occurrence.

- **Future next-run calculation** — after due occurrences are generated,
  `next_run` is advanced until it represents the next occurrence in the
  future.

- **Monthly date handling** — monthly schedules correctly handle months with
  different numbers of days.

  For example, schedules falling near the end of a month will not produce
  invalid dates when the following month contains fewer days.

- **Yearly date handling** — yearly schedules correctly calculate the next
  valid occurrence when calendar boundaries or leap-year differences are
  involved.

- **Automatic timestamp updates** — recurring-expense updates maintain the
  `updated_at` timestamp.

#### 🗄️ Database

- **`recurring_expenses` schema** — expanded the centralized SQLite schema
  with support for recurring transactions.

- **Foreign-key relationship** — `recurring_expenses.category_id` references
  the existing `categories` table.

- **Category deletion behavior** — recurring expenses use
  `ON DELETE SET NULL`, preventing category deletion from destroying the
  recurring expense itself.

- **Recurring schedule indexes** — added indexes for:
  - `next_run`
  - `active`
  - `category_id`

- **Efficient due-expense lookup** — indexing `next_run` makes it possible to
  efficiently locate active recurring expenses that need to be generated.

- **Idempotent schema initialization** — recurring-expense tables and indexes
  use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, preserving
  the existing database initialization philosophy.

- **Existing data preservation** — adding the recurring-expense schema does
  not require deleting the existing SQLite database or existing expenses,
  categories, or budgets.

#### 📊 Advanced Charts

- **Advanced Charts dashboard** — added a dedicated analytics view beyond the
  existing Reports page.

- **12-month spending trend** — visualizes spending across recent months to
  make long-term spending changes easier to identify.

- **Category spending analysis** — provides a visual breakdown of spending by
  category.

- **Weekday spending analysis** — shows how spending is distributed across
  days of the week.

- **Largest expenses visualization** — highlights individual high-value
  transactions.

- **Interactive Chart.js charts** — Advanced Charts use the existing Chart.js
  infrastructure and remain interactive.

- **Responsive charts** — charts resize with the application layout and remain
  usable across desktop and smaller screens.

- **Theme-aware charts** — Advanced Charts reuse the existing chart theme
  infrastructure introduced in 0.3.0.

- **Dark-mode chart compatibility** — chart text, grid lines, legends,
  tooltips, and other chart surfaces continue to follow the active theme.

- **Existing expense data reuse** — Advanced Charts calculate their analytics
  from existing expense records rather than introducing redundant analytics
  tables.

- **Automatic refresh** — charts can be regenerated from the current expense
  data after changes.

#### 🌐 Web Interface

- **Recurring Expenses view** — added a dedicated web interface for managing
  recurring schedules.

- **Recurring expense listing** — displays:
  - Description
  - Amount
  - Category
  - Frequency
  - Next run date
  - Active / paused state

- **Recurring expense creation form** — allows users to create new recurring
  schedules directly from the web interface.

- **Recurring expense edit form** — allows existing schedules to be modified.

- **Pause / resume controls** — users can change the active state without
  deleting the schedule.

- **Delete controls** — recurring schedules can be removed from the web UI.

- **Generate-due action** — provides a mechanism for generating currently due
  recurring expenses.

- **Advanced Charts view** — added a dedicated navigation destination for the
  new analytics dashboard.

#### 🔌 API

- **Recurring expenses API** — added API support for recurring schedules.

- `GET /api/recurring`
  - Returns recurring expenses.

- `POST /api/recurring`
  - Creates a recurring expense.

- `PUT /api/recurring/<id>`
  - Updates an existing recurring expense.

- `DELETE /api/recurring/<id>`
  - Deletes a recurring expense.

- `POST /api/recurring/generate`
  - Generates all currently due recurring expenses.

- **Repository-backed API design** — recurring API operations use the
  repository layer rather than duplicating SQL inside the web routes.

#### 🧭 Navigation

- **Recurring navigation item** — added a dedicated Recurring section to the
  application navigation.

- **Advanced Charts navigation item** — added a dedicated Advanced Charts
  section.

- **Keyboard navigation** — extended the keyboard-first navigation system for
  the new views.

- **Command palette integration** — new views are available through the
  command palette.

- **Hash-based routing support** — new views follow the existing SPA routing
  architecture.

#### ⌨️ Keyboard & Workflow

- Added keyboard navigation support for the new Recurring view.

- Added keyboard navigation support for the Advanced Charts view.

- Existing `G` prefix navigation remains available for rapid movement between
  application sections.

- Existing `Ctrl/⌘+K` command palette remains the central keyboard-first
  navigation mechanism.

### 🔧 Changed

#### 🗄️ Database Architecture

- **Centralized recurring schema** — recurring-expense table creation belongs
  to `database.py`, keeping database structure separate from repository
  implementation.

- **Existing database initialization remains idempotent** — starting the
  application against an existing database does not require rebuilding or
  deleting existing tables.

- **Recurring expenses are schedules, not duplicate expense records** — the
  recurring table stores the schedule while generated transactions are stored
  in the existing `expenses` table.

- **Existing reporting remains compatible** — because generated transactions
  are normal expenses, existing reports do not need a second reporting system.

#### 🧩 Models / Repository Layer

- Added `RecurringExpenseRepository` alongside the existing:
  - `CategoryRepository`
  - `ExpenseRepository`
  - `BudgetRepository`

- Added recurring schedule validation for:
  - Positive amounts
  - Non-empty descriptions
  - Valid frequencies
  - Valid ISO dates

- Added internal next-occurrence calculation for:
  - Weekly schedules
  - Monthly schedules
  - Yearly schedules

- Added automatic catch-up logic for missed recurring occurrences.

- Existing `ExpenseRepository` behavior remains unchanged.

- Existing `CategoryRepository` behavior remains unchanged.

- Existing `BudgetRepository` behavior remains unchanged.

- Existing expense/category/budget relationships continue to use the existing
  database schema.

#### 📊 Analytics

- Advanced Charts build on the existing Chart.js infrastructure instead of
  replacing the Reports charts.

- Existing Reports remain available.

- Existing chart theme handling from 0.3.0 is reused for the new analytics
  visualizations.

- Existing responsive chart containers continue to provide sizing behavior
  for the new charts.

#### 🌐 Web Application

- Added new SPA views without replacing the existing Dashboard, Expenses,
  Categories, Reports, or Budget views.

- Added recurring expense controls using the existing modal, toast, form, and
  API patterns.

- Added Advanced Charts using the existing frontend chart helpers.

- Existing responsive behavior remains active for the new views.

- Existing light/dark theme behavior remains active for the new views.

- Existing command palette behavior remains compatible with the expanded
  navigation.

### 🐛 Fixed

#### 🔄 Recurring Expense Scheduling

- **Missed recurring expenses are no longer silently lost** — due occurrences
  are generated when the application catches up.

- **Recurring schedules no longer stop after a single generated occurrence**
  when multiple periods have passed.

- **Monthly schedules no longer create invalid calendar dates** when moving
  between months with different numbers of days.

- **Yearly schedules correctly calculate future dates** across year
  boundaries.

- **Paused recurring expenses are excluded from automatic generation**.

- **Generated expenses receive their scheduled occurrence date**, rather than
  simply receiving the date on which the application happens to be opened.

#### 📊 Charts

- Advanced chart rendering follows the existing chart-instance lifecycle,
  preventing duplicate Chart.js instances from accumulating when views are
  revisited.

- Advanced charts inherit the existing live theme behavior instead of
  becoming detached from the light/dark theme system.

- Responsive chart containers prevent charts from overflowing their parent
  layout.

### 🗑️ Deprecated

_None._

No existing functionality is deprecated in 0.4.0.

### ❌ Removed

_None._

No existing functionality has been removed in 0.4.0.

The existing Dashboard, Expenses, Categories, Reports, Budget, CSV export,
CLI functionality, and existing chart views remain available.

### 🔒 Security

- Recurring expenses continue to use the existing parameterized SQLite query
  approach.

- No raw user-provided values are interpolated directly into recurring-expense
  SQL values.

- Recurring schedules do not require external network services.

- The recurring-expense functionality remains compatible with the project's
  existing offline-first architecture.

- Category relationships continue to use SQLite foreign-key constraints.

### 📚 Documentation

- Updated the changelog for the `0.4.0` development cycle.

- Recurring expenses moved from the planned roadmap into the active
  `0.4.0` release.

- Documented supported recurring frequencies:
  - Weekly
  - Monthly
  - Yearly

- Documented automatic generation of due recurring expenses.

- Documented missed-occurrence catch-up behavior.

- Documented pause/resume behavior.

- Documented Advanced Charts.

- Documented the new Recurring and Advanced Charts navigation areas.

- Documented the new recurring-expense API endpoints.

- Updated project architecture documentation to account for recurring expense
  persistence.

- Updated project roadmap to reflect the features completed during 0.4.0.

### ⚙️ Dependencies

_No new dependencies required._

The release continues to use the existing Chart.js infrastructure for
Advanced Charts.

No additional database package is required because recurring expenses use the
existing SQLite implementation.

---

## [Unreleased]

Future v0.5.x work will build on the Financial Intelligence foundation with deeper planning, automation, and analytics.

### 🔮 Planned

The following features remain planned for future releases:

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
- **`chartInstances` registry** — fixes "Canvas is already in use" errors when revisiting Reports
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
- **Dashboard "Top category" was always `—`** — `const top = summary.by_category && summary.by_category` assigned the whole array to `top`, then `top.category` was always `undefined`. Now uses `summary.by_category` correctly
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
- New **troubleshooting entries** for **"Charts invisible in dark mode"** (cache) and **"Sidebar doesn't close on mobile"** (version drift)
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
- **Budget view** — manage overall and per-category budgets with per-category progress bars
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
- **Web UI** — Budget view adds a **Type** dropdown to switch between **Overall** and **Per-category**, preloads the current amount when switching, and renders a separate progress bar per category
- **Reports table** — automatically grows **Budget** + **Remaining** columns when per-category budgets exist
- **Dashboard** — shows "+ N category budgets" hint in the budget card
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
| `0.4.0` | Unreleased | 🔄 Recurring expenses, automatic recurring transaction generation, schedule management, 📊 Advanced Charts, deeper spending analytics, database/API/UI integration |
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
[0.4.0]: https://github.com/ItsWanheda/expense-tracker/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ItsWanheda/expense-tracker/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ItsWanheda/expense-tracker/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ItsWanheda/expense-tracker/releases/tag/v0.1.0