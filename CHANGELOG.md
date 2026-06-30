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

[Unreleased]: https://github.com/ItsWanheda/expense-tracker/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/ItsWanheda/expense-tracker/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ItsWanheda/expense-tracker/releases/tag/v0.1.0