# 📝 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🔮 Planned
- Per-category budgets with progress bars in the summary
- Recurring expenses (auto-add monthly rent, subscriptions, etc.)
- Multi-currency support with conversion rates
- Interactive REPL mode (`expense shell`)
- FastAPI web interface (uses the same repositories)
- JSON import/export
- GitHub Actions CI pipeline
- Publish to PyPI (`pip install expense-tracker`)

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

[Unreleased]: https://github.com/ItsWanheda/expense-tracker/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ItsWanheda/expense-tracker/releases/tag/v0.1.0