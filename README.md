<div align="center">

# 💰 Expense Tracker CLI

**A clean, well-architected command-line tool to track your personal expenses, manage categories, set budgets, and visualize spending — all backed by a local SQLite database.**

[![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-6%20passing-brightgreen.svg)](#-running-tests)
[![Code style](https://img.shields.io/badge/code%20style-clean-black.svg)](#-project-structure)
[![Built with Click](https://img.shields.io/badge/CLI-Click-9cf.svg)](https://click.palletsprojects.com/)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [Roadmap](#-roadmap)

</div>

---

## 📸 Preview

```
─────────────────────── Summary — 2026-06 ───────────────────────
 Total: 2687.49 across 5 expenses
 Budget: 3000.00  Remaining: 312.51

                           By Category
 ┌────────────────┬───────┬─────────┬──────┐
 │ Category       │ Count │  Total  │   %  │
 ├────────────────┼───────┼─────────┼──────┤
 │ Housing        │     1 │ 2500.00 │ 93.0 │
 │ Food           │     2 │  132.50 │  4.9 │
 │ Transport      │     1 │   45.00 │  1.7 │
 │ Entertainment  │     1 │    9.99 │  0.4 │
 └────────────────┴───────┴─────────┴──────┘
```

---

## ✨ Features

- ➕ **Add / Edit / Delete** expenses with description, amount, date, and category
- 🏷️ **Manage categories** — create custom ones with your own colors
- 🔍 **Filter & search** by date range and category
- 📊 **Monthly summary** with totals, counts, percentages, and budget tracking
- 💵 **Set monthly budgets** with auto-calculated remaining amount
- 📈 **Visualize** spending as a horizontal bar chart (PNG)
- 📤 **Export to CSV** for spreadsheet analysis or backup
- 🗄️ **Local SQLite** — no servers, no cloud, your data stays on your machine
- 🧪 **Fully tested** with pytest (6 tests, all passing)
- 🎨 **Beautiful terminal UI** powered by Rich

---

## 🛠️ Tech Stack

| Layer            | Tool                                                  |
|------------------|-------------------------------------------------------|
| Language         | Python 3.10+ (tested on 3.14)                         |
| CLI framework    | [Click](https://click.palletsprojects.com/) 8.x       |
| Terminal UI      | [Rich](https://rich.readthedocs.io/) 13.x             |
| Database         | SQLite (Python stdlib)                                |
| Charts           | [Matplotlib](https://matplotlib.org/) 3.x             |
| Testing          | [pytest](https://docs.pytest.org/) 7.x                |
| Packaging        | `pyproject.toml` (PEP 621, modern standard)           |

> 💡 **Zero runtime dependencies** outside the standard library except for Click, Rich, and Matplotlib — all installable with one command.

---

## 📁 Project Structure

```
expense-tracker/
│
├── pyproject.toml            # Project metadata & dependencies (PEP 621)
├── requirements.txt          # Pip-installable dependencies
├── README.md                 # You are here
├── .gitignore                # Ignore __pycache__, *.db, etc.
│
├── src/
│   └── expense_tracker/
│       ├── __init__.py       # Package marker & version
│       ├── __main__.py       # Enables: python -m expense_tracker
│       ├── cli.py            # All Click commands (~250 lines)
│       ├── database.py       # SQLite setup, schema, connection
│       ├── models.py         # Dataclasses + repository classes
│       ├── reports.py        # Monthly aggregation logic
│       └── visualization.py  # Matplotlib charts
│
└── tests/
    ├── conftest.py           # Shared pytest fixtures (in-memory DB)
    ├── test_models.py        # Repository unit tests
    └── test_reports.py       # Report generation tests
```

The `src/` layout is the modern Python best practice — it prevents accidental imports from the working directory and forces proper packaging.

---

## 🚀 Installation

### Prerequisites

- **Python 3.10 or higher** — check with `py --version` or `python3 --version`
- **pip** — usually bundled with Python

### Step 1 — Clone the repository

```bash
git clone https://github.com/ItsWanheda/expense-tracker.git
cd expense-tracker
```

### Step 2 — Create a virtual environment

**Windows (PowerShell):**
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

> 💡 **Windows tip:** If PowerShell blocks script activation, run this **once**:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### Step 3 — Install dependencies

**Recommended** (editable + dev tools):
```bash
pip install -e ".[dev]"
```

**Or just runtime dependencies:**
```bash
pip install -r requirements.txt
```

### Step 4 — Verify it works

```bash
py -m expense_tracker --version
```

Expected output:
```
0.1.0
```

---

## 📖 Usage

### Quick start — your first 5 minutes

```bash
# 1. See what categories exist (7 are auto-seeded)
py -m expense_tracker categories list

# 2. Add a few expenses
py -m expense_tracker add -a 12.50 -d "Lunch at cafe" -c Food
py -m expense_tracker add -a 45.00 -d "Uber to airport" -c Transport
py -m expense_tracker add -a 120.00 -d "Weekly groceries" -c Food
py -m expense_tracker add -a 9.99 -d "Netflix" -c Entertainment
py -m expense_tracker add -a 2500.00 -d "Rent" -c Housing

# 3. View your expenses
py -m expense_tracker list

# 4. Set a budget and see your summary
py -m expense_tracker budget 3000
py -m expense_tracker summary

# 5. Generate a chart
py -m expense_tracker chart -o my-spending.png

# 6. Export for spreadsheet
py -m expense_tracker export -o expenses.csv
```

### All commands

| Command | Description |
|---|---|
| `add` | Add a new expense |
| `list` | List expenses (with filters) |
| `edit ID` | Edit an existing expense |
| `delete ID` | Delete an expense by ID |
| `summary [-m MONTH]` | Show monthly summary + budget status |
| `budget AMOUNT [-m MONTH]` | Set a monthly budget |
| `chart [-o FILE]` | Generate a PNG bar chart |
| `export [-o FILE]` | Export to CSV |
| `categories list` | List all categories |
| `categories add NAME` | Create a new category |
| `categories delete ID` | Delete a category |

### Adding expenses

```bash
# Minimal — defaults to today's date, no category
py -m expense_tracker add -a 25.00 -d "Book"

# Full
py -m expense_tracker add -a 45.00 -d "Uber" -c Transport --date 2024-05-15

# Create a brand-new category on the fly (it will ask)
py -m expense_tracker add -a 9.99 -d "Netflix" -c Subscriptions
# ? Category 'Subscriptions' doesn't exist. Create it? [y/N]: y
```

### Listing with filters

```bash
# Most recent 20
py -m expense_tracker list

# Filter by date range
py -m expense_tracker list --from 2024-05-01 --to 2024-05-31

# Filter by category
py -m expense_tracker list -c Food

# Combine filters and show more
py -m expense_tracker list -c Food --from 2024-05-01 --to 2024-05-31 -n 50
```

### Editing & deleting

```bash
# Only the fields you pass get updated (others stay the same)
py -m expense_tracker edit 3 -a 130.00 -d "Weekly groceries (updated)"
py -m expense_tracker edit 3 -c Transport        # change category only
py -m expense_tracker edit 3 --date 2024-05-20    # change date only

# Delete by ID
py -m expense_tracker delete 5
```

### Monthly summary

```bash
# Current month
py -m expense_tracker summary

# Specific month
py -m expense_tracker summary -m 2024-05
```

Output:
```
──────────────────── Summary — 2024-05 ────────────────────
Total: 2687.49 across 4 expenses
Budget: 3000.00  Remaining: 312.51

                By Category
┌──────────────┬───────┬─────────┬─────┐
│ Category     │ Count │  Total  │  %  │
├──────────────┼───────┼─────────┼─────┤
│ Housing      │     1 │ 2500.00 │ 93% │
│ Food         │     2 │  132.50 │  5% │
│ Transport    │     1 │   45.00 │  2% │
│ Entertainment│     1 │    9.99 │  0% │
└──────────────┴───────┴─────────┴─────┘
```

If you've exceeded your budget, `Remaining` will turn red automatically.

### Charts

```bash
py -m expense_tracker chart -o may.png            # saves may.png
py -m expense_tracker chart -o may.png -m 2024-05  # specific month
```

### CSV export

```bash
py -m expense_tracker export -o expenses.csv
py -m expense_tracker export -o may.csv --from 2024-05-01 --to 2024-05-31
```

The CSV has columns: `id, date, category, amount, description`.

---

## 🏛️ Architecture

This project follows a **3-layer architecture** that separates concerns cleanly:

```
┌─────────────────────────────────────────────────────┐
│  CLI Layer (cli.py)                                 │
│  - Click commands, Rich tables, user prompts        │
└────────────────────┬────────────────────────────────┘
                     │ calls
                     ▼
┌─────────────────────────────────────────────────────┐
│  Repository Layer (models.py)                       │
│  - Static methods per entity (CRUD + queries)       │
│  - Returns dataclasses, not raw rows                │
└────────────────────┬────────────────────────────────┘
                     │ uses
                     ▼
┌─────────────────────────────────────────────────────┐
│  Data Layer (database.py)                           │
│  - SQLite connection management (context manager)   │
│  - Schema definition & migrations                   │
└─────────────────────────────────────────────────────┘
```

### Why this structure?

| Layer | Responsibility | Why it matters |
|---|---|---|
| **Data** | Manage the connection & schema | One place to change the database |
| **Repository** | Translate Python ↔ SQL | Easy to swap SQLite for Postgres later |
| **CLI** | Talk to the user | One place to change UX |

Adding a **FastAPI web layer** later is trivial — it would just import the same repositories and return JSON instead of Rich tables.

### Key design decisions

- **Idempotent `initialize_database()`** — called on every CLI startup; safe to run repeatedly
- **Idempotent `CategoryRepository.create()`** — returns existing ID if name is taken (no surprises)
- **Python-level upserts** for `BudgetRepository` — avoids SQLite's NULL + UNIQUE pitfall
- **Timezone-aware datetimes** — `datetime.now(timezone.utc)`, not deprecated `utcnow()`
- **Context-managed DB connections** — auto-commit on success, auto-rollback on error

---

## 💾 Database Schema

```sql
CREATE TABLE categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    color      TEXT DEFAULT '#3498db',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      REAL NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category_id INTEGER,
    date        TEXT NOT NULL,                  -- ISO: YYYY-MM-DD
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE budgets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,                        -- NULL = overall budget
    month       TEXT NOT NULL,                  -- YYYY-MM
    amount      REAL NOT NULL CHECK (amount >= 0),
    UNIQUE (category_id, month),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

### Default categories (auto-seeded on first run)

Food 🍔 · Transport 🚗 · Housing 🏠 · Entertainment 🎬 · Health 💊 · Shopping 🛍️ · Other 📦

### Database location

| OS | Path |
|---|---|
| Windows | `C:\Users\<you>\.expense_tracker\expenses.db` |
| macOS / Linux | `~/.expense_tracker/expenses.db` |

---

## 🧪 Running Tests

```bash
# Run all tests, verbose
py -m pytest -v

# Run with coverage report
py -m pytest --cov=expense_tracker --cov-report=term-missing

# Run a single file
py -m pytest tests/test_models.py -v

# Run a single test
py -m pytest tests/test_models.py::test_update_expense -v
```

### Expected output

```
tests/test_models.py::test_add_and_get_expense PASSED
tests/test_models.py::test_update_expense PASSED
tests/test_models.py::test_delete_expense PASSED
tests/test_models.py::test_list_with_filters PASSED
tests/test_models.py::test_budget_set_and_get PASSED
tests/test_reports.py::test_monthly_report PASSED

========================== 6 passed in 0.4s ==========================
```

### How tests are isolated

The `tmp_db` fixture in `conftest.py`:
1. Creates a **temporary SQLite file** for each test (via `tmp_path`)
2. **Patches** `database.get_db_path` to point at it
3. **Initializes** the schema
4. Cleans up automatically when the test ends

This means tests never touch your real database — completely safe.

---

## 🩹 Troubleshooting

<details>
<summary><b>❌ <code>python</code> is not recognized (Windows)</b></summary>

Reinstall Python from [python.org](https://www.python.org/downloads/) and **check** the box:

> ☑ Add python.exe to PATH

Alternatively, use `py` (the Python Launcher) which is installed automatically on Windows:

```powershell
py --version
```
</details>

<details>
<summary><b>❌ PowerShell blocks script activation</b></summary>

Run **once** as your user:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try activating again:

```powershell
.\.venv\Scripts\Activate.ps1
```
</details>

<details>
<summary><b>❌ <code>IndentationError</code> after pasting code</b></summary>

Code copied from chat sometimes loses spaces. Verify the syntax with:

```powershell
py -m compileall src\expense_tracker -q
```

If there's an error, open the offending file in your editor and fix the indentation manually.
</details>

<details>
<summary><b>❌ <code>OperationalError: no such table</code></b></summary>

The CLI auto-initializes the database on startup. If you still see this, your `~/.expense_tracker/` directory may be locked or unreadable. Try:

```powershell
# Delete and recreate
Remove-Item -Recurse -Force ~\.expense_tracker
py -m expense_tracker categories list   # this re-creates everything
```
</details>

<details>
<summary><b>❌ <code>UNIQUE constraint failed: categories.name</b></summary>

You tried to create a category that already exists. The CLI handles this automatically by asking, but if you see it in code, use `CategoryRepository.create()` which is idempotent:

```python
# Returns existing ID if "Food" exists, otherwise creates it
cat_id = CategoryRepository.create("Food")
```
</details>

---

## 🛠️ Development

### Adding a new command

1. Open `src/expense_tracker/cli.py`
2. Add a new function decorated with `@cli.command()` (or `@<group>.command()`)
3. Implement it using existing repositories — **don't add SQL here**
4. Add a test in `tests/`

### Adding a new field

1. Add the column to `SCHEMA` in `database.py`
2. Add a migration note to handle existing databases
3. Update the `Expense` dataclass in `models.py`
4. Update repository methods that touch that field
5. Add tests for the new behavior

### Code style

- **PEP 8** for naming and layout
- **Type hints** on all public functions
- **Docstrings** for all public classes and functions
- **Dataclasses** for value objects, not plain dicts
- **No raw SQL in CLI code** — always go through a repository

---

## 🗺️ Roadmap

- [x] Core CRUD for expenses and categories
- [x] Monthly summary & budget tracking
- [x] CSV export
- [x] Matplotlib charts
- [x] Pytest test suite
- [ ] **Per-category budgets** (schema already supports it)
- [ ] **Recurring expenses** (rent, subscriptions)
- [ ] **Multi-currency** support with conversion rates
- [ ] **Interactive REPL mode** (`expense shell`)
- [ ] **FastAPI web interface** using the same repositories
- [ ] **JSON import / export**
- [ ] **Telegram / Discord bot** integration
- [ ] **GitHub Actions CI** (run tests on every push)
- [ ] **Publish to PyPI** (`pip install expense-tracker`)
- [ ] **Tag system** (many-to-many)
- [ ] **Pre-commit hooks** (black, ruff, mypy)

---

## 🤝 Contributing

Contributions of all sizes are welcome! Here's the workflow:

1. **Fork** the repository
2. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/per-category-budgets
   ```
3. **Make your changes** and add tests
4. **Run the test suite** to make sure nothing broke:
   ```bash
   py -m pytest -v
   ```
5. **Commit** with a clear message:
   ```bash
   git commit -m "Add per-category budgets with progress bars"
   ```
6. **Push** and open a Pull Request

Please open an issue first if you want to discuss a big change before implementing it.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details. You're free to use, modify, and distribute it, commercially or otherwise.

---

## 🙋 FAQ

**Q: Is my financial data safe?**
A: 100%. Everything is stored in a single SQLite file on your machine. There is no cloud sync, no telemetry, no analytics — nothing leaves your computer.

**Q: Can I sync between machines?**
A: Yes — just copy `~/.expense_tracker/expenses.db` between devices. You could put it in Dropbox/Syncthing/etc. for automatic syncing.

**Q: Can I import data from my bank?**
A: Not yet, but a CSV import command is on the roadmap. In the meantime, you can bulk-insert via a small Python script using the existing repositories.

**Q: Why Click instead of argparse?**
A: Click gives us nested subcommands (`categories add`), automatic `--help` for every level, and better ergonomics with about 60% less code than argparse.

**Q: Can I extend this with a web UI?**
A: Absolutely — that's the beauty of the repository pattern. A FastAPI layer would just import the same repositories and return JSON instead of Rich tables.

**Q: Why no ORMs (SQLAlchemy, Tortoise)?**
A: For a small project, raw SQL with the repository pattern is **simpler**, **faster**, and gives you **full control**. ORMs add abstraction layers that aren't justified at this scale.

---

## ⭐ Show Your Support

If this project helped you learn something or saved you time, give it a star on GitHub! It helps others discover it.

<div align="center">

**Made with ❤️ and lots of ☕**

[⬆ Back to top](#-expense-tracker-cli)

</div>