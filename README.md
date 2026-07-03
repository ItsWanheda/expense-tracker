<div align="center">

# 💰 Expense Tracker

**Track your personal expenses from the terminal or the browser — a clean Python project with a CLI, a Flask web UI, local SQLite storage, monthly summaries, charts, CSV export, and per-category budgets.**

[![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-6%20passing-brightgreen.svg)](#-running-tests)
[![Built with Click](https://img.shields.io/badge/CLI-Click-9cf.svg)](https://click.palletsprojects.com/)
[![Built with Flask](https://img.shields.io/badge/web-Flask-000.svg)](https://flask.palletsprojects.com/)

[Features](#-features) • [Installation](#-installation) • [CLI Usage](#-cli-usage) • [Web Interface](#-web-interface) • [Architecture](#-architecture) • [Roadmap](#-roadmap)

</div>

---

## 📸 Preview

<p align="center">
  <img src="../expense-tracker/src/images/Preview.png" />
</p>

### CLI — Monthly summary

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

### Web — Dashboard, reports & per-category budgets

```
┌──────────────────┬────────────────────────┬─────────────────┐
│ Total — 2026-06  │ Budget remaining       │ Top category    │
│     2,687.49     │         312.51         │ Housing         │
│  5 expenses      │ ▓▓▓▓▓▓▓▓▓▓░░░░ 89%    │    2,500.00     │
└──────────────────┴────────────────────────┴─────────────────┘

Per-category budgets
┌────────────┬─────────┬─────────┬──────────┬────────────────────┐
│ Category   │ Budget  │ Spent   │ Remaining│ Usage              │
├────────────┼─────────┼─────────┼──────────┼────────────────────┤
│ 🍔 Food    │  300.00 │  132.50 │  167.50  │ ▓▓▓▓▓░░░░░  44%   │
│ 🚗 Transp. │  150.00 │   45.00 │  105.00  │ ▓▓▓░░░░░░░  30%   │
│ 🎬 Entert. │   50.00 │    9.99 │   40.01  │ ▓▓░░░░░░░░  20%   │
└────────────┴─────────┴─────────┴──────────┴────────────────────┘
```

---

## ✨ Features

### Core
- ➕ **Add / Edit / Delete** expenses with description, amount, date, and category
- 🏷️ **Manage categories** — create custom ones with your own colors
- 🔍 **Filter & search** by date range and category
- 💵 **Set monthly budgets** — overall *or* per-category
- 📊 **Monthly summary** with totals, counts, percentages, and budget tracking
- 📤 **Export to CSV** for spreadsheet analysis or backup
- 🗄️ **Local SQLite** — no servers, no cloud, your data stays on your machine

### CLI
- 🎨 **Beautiful terminal UI** powered by Rich
- 📈 **Visualize** spending as a horizontal bar chart (PNG via matplotlib)
- 🧪 **Fully tested** with pytest (6 tests, all passing)

### 🌐 Web Interface (`0.2.0+`)
- 🖥️ **Single-page application** — Dashboard, Expenses, Categories, Reports, Budget
- 📊 **Interactive charts** powered by Chart.js (bar + doughnut)
- 🎯 **Per-category budget management** with progress bars
- 🪟 **Modal forms** with validation and toast notifications
- 📱 **Responsive layout** — works on phone, tablet, desktop
- 🔄 **Same SQLite database** — CLI and web share data seamlessly

---

## 🛠️ Tech Stack

| Layer            | Tool                                                  |
|------------------|-------------------------------------------------------|
| Language         | Python 3.10+ (tested on 3.14)                         |
| CLI framework    | [Click](https://click.palletsprojects.com/) 8.x       |
| Terminal UI      | [Rich](https://rich.readthedocs.io/) 13.x             |
| Web framework    | [Flask](https://flask.palletsprojects.com/) 3.x 🆕    |
| Frontend         | Vanilla JS + [Chart.js](https://www.chartjs.org/) 4.x 🆕 |
| Database         | SQLite (Python stdlib)                                |
| Charts (CLI)     | [Matplotlib](https://matplotlib.org/) 3.x             |
| Testing          | [pytest](https://docs.pytest.org/) 7.x                |
| Packaging        | `pyproject.toml` (PEP 621, modern standard)           |

> 💡 **Zero runtime dependencies** outside the standard library except for Click, Rich, Matplotlib, and Flask — all installable with one command.

---

## 📁 Project Structure

```
expense-tracker/
│
├── pyproject.toml            # Project metadata & dependencies (PEP 621)
├── requirements.txt          # Pip-installable dependencies
├── README.md                 # You are here
├── CHANGELOG.md              # Release history
├── .gitignore                # Ignore __pycache__, *.db, etc.
│
├── src/
│   └── expense_tracker/
│       ├── __init__.py       # Package marker & version
│       ├── __main__.py       # Enables: python -m expense_tracker
│       ├── cli.py            # All Click commands
│       ├── database.py       # SQLite setup, schema, connection
│       ├── models.py         # Dataclasses + repository classes
│       ├── reports.py        # Monthly aggregation logic
│       ├── visualization.py  # Matplotlib charts
│       ├── web.py            # 🆕 Flask app + JSON REST API
│       │
│       ├── templates/        # 🆕
│       │   └── index.html    #    Single-page app shell
│       │
│       └── static/           # 🆕
│           ├── css/style.css #    Design system
│           └── js/app.js     #    SPA logic (routing, CRUD, charts)
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
.\.venvScripts\Activate.ps1
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
0.2.0
```

---

## 📖 CLI Usage

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

### All CLI commands

| Command | Description |
|---|---|
| `add` | Add a new expense |
| `list` | List expenses (with filters) |
| `edit ID` | Edit an existing expense |
| `delete ID` | Delete an expense by ID |
| `summary [-m MONTH]` | Show monthly summary + budget status |
| `budget AMOUNT [-m MONTH] [-c CATEGORY]` | Set a monthly budget (overall or per-category) 🆕 |
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

### Budgets 🆕

```bash
# Overall monthly budget
py -m expense_tracker budget 3000
py -m expense_tracker budget 3000 -m 2024-05

# Per-category budget 🆕
py -m expense_tracker budget 300 -c Food
py -m expense_tracker budget 50  -c Entertainment -m 2024-05
```

You can mix both — an overall budget caps total spending, while per-category budgets cap individual categories. They're evaluated independently.

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

## 🌐 Web Interface

**New in `0.2.0`.** A complete single-page application that talks to the same SQLite database as the CLI — every entry you add in the browser shows up in the terminal and vice-versa.

### Start the server

```bash
py -m expense_tracker.web
```

Then open **http://127.0.0.1:5000** in your browser.

You can also use the Flask CLI:

```bash
export FLASK_APP=expense_tracker.web     # macOS / Linux
$env:FLASK_APP = "expense_tracker.web"   # Windows PowerShell
flask run --debug
```

### Pages

| Page | What it does |
|---|---|
| 📊 **Dashboard** | Total spent this month, budget remaining with a progress bar, top category, and recent expenses |
| 📋 **Expenses** | Full CRUD with date/category filters, modal forms for add/edit, inline delete confirmation |
| 🏷️ **Categories** | Grid of colored category cards with add/delete and a color picker |
| 📈 **Reports** | Interactive bar + doughnut charts (Chart.js) plus a category breakdown table with Budget & Remaining columns when applicable |
| 🎯 **Budget** | Manage overall **and** per-category budgets in one place, with per-category progress bars and an active-budgets table with Edit/Delete |

### API

The web UI talks to a small JSON REST API. You can use it directly too:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/categories` | List categories |
| `POST` | `/api/categories` | Create category |
| `DELETE` | `/api/categories/<id>` | Delete category |
| `GET` | `/api/expenses` | List expenses (filters: `from`, `to`, `category_id`, `limit`) |
| `POST` | `/api/expenses` | Create expense |
| `PUT` | `/api/expenses/<id>` | Update expense (partial) |
| `DELETE` | `/api/expenses/<id>` | Delete expense |
| `GET` | `/api/reports/summary?month=YYYY-MM` | Monthly report (incl. `category_budgets`) |
| `GET` | `/api/budget?month=…&category_id=…` | Get a single budget |
| `GET` | `/api/budgets?month=YYYY-MM` | List all budgets for a month 🆕 |
| `PUT` | `/api/budget` | Set/update a budget (`category_id` optional) 🆕 |
| `DELETE` | `/api/budget?month=…&category_id=…` | Delete a budget 🆕 |
| `GET` | `/api/export.csv` | Download CSV export |

Example with curl:

```bash
# Add an expense via the API
curl -X POST http://127.0.0.1:5000/api/expenses \
     -H "Content-Type: application/json" \
     -d '{"amount": 12.50, "description": "Lunch", "category_id": 1, "date": "2026-06-30"}'

# Get this month's summary as JSON
curl http://127.0.0.1:5000/api/reports/summary

# Set a per-category budget
curl -X PUT http://127.0.0.1:5000/api/budget \
     -H "Content-Type: application/json" \
     -d '{"month": "2026-06", "amount": 300, "category_id": 1}'
```

> 🛡️ For **development only**. Don't expose `app.run()` to the internet — use `gunicorn 'expense_tracker.web:create_app()'` behind a reverse proxy in production.

---

## 🏛️ Architecture

This project follows a **layered architecture** that separates concerns cleanly:

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer                                         │
│  ┌──────────────────────┐    ┌──────────────────────────┐   │
│  │ cli.py (Click+Rich)  │    │ web.py (Flask + JS SPA)  │   │
│  └──────────┬───────────┘    └──────────────┬───────────┘   │
└─────────────┼───────────────────────────────┼───────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │ calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Repository Layer (models.py)                               │
│  - Static methods per entity (CRUD + queries)               │
│  - Returns dataclasses, not raw rows                        │
│  - Shared by both the CLI and the web app                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ uses
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Layer (database.py)                                   │
│  - SQLite connection management (context manager)           │
│  - Schema definition & migrations                           │
└─────────────────────────────────────────────────────────────┘

Cross-cutting:
  reports.py      → aggregation (used by CLI summary + web reports)
  visualization.py → matplotlib charts (CLI only)
```

### Why this structure?

| Layer | Responsibility | Why it matters |
|---|---|---|
| **Data** | Manage the connection & schema | One place to change the database |
| **Repository** | Translate Python ↔ SQL | Easy to swap SQLite for Postgres later |
| **Presentation** | Talk to the user (terminal or browser) | Multiple UIs share the same logic |

The **web layer** is just a thin Flask wrapper around the same repositories the CLI uses — zero duplicated SQL, zero duplicated business logic.

### Key design decisions

- **Idempotent `initialize_database()`** — called on every startup (CLI + web); safe to run repeatedly
- **Idempotent `CategoryRepository.create()`** — returns existing ID if name is taken (no surprises)
- **Python-level upserts** for `BudgetRepository` — avoids SQLite's NULL + UNIQUE pitfall
- **Timezone-aware datetimes** — `datetime.now(timezone.utc)`, not deprecated `utcnow()`
- **Context-managed DB connections** — auto-commit on success, auto-rollback on error
- **Single DB, two UIs** — CLI and web read/write the same `~/.expense_tracker/expenses.db`

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

Both the CLI and the web app auto-initialize the database on startup. If you still see this, your `~/.expense_tracker/` directory may be locked or unreadable. Try:

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

<details>
<summary><b>❌ Web UI won't load (404 on /static/…)</b></summary>

Make sure you launched via the package, not a stray script:

```bash
# ✅ Correct
py -m expense_tracker.web

# ❌ Wrong (Flask can't find templates/static)
cd src && py expense_tracker/web.py
```
</details>

---

## 🛠️ Development

### Adding a new command

1. Open `src/expense_tracker/cli.py`
2. Add a new function decorated with `@cli.command()` (or `@<group>.command()`)
3. Implement it using existing repositories — **don't add SQL here**
4. (Optional) Add a matching API endpoint in `web.py`
5. (Optional) Add a UI section in `static/js/app.js`
6. Add a test in `tests/`

### Adding a new field

1. Add the column to `SCHEMA` in `database.py`
2. Add a migration note to handle existing databases
3. Update the relevant dataclass in `models.py`
4. Update repository methods that touch that field
5. Update `reports.py` / `web.py` / `app.js` if the field is exposed to users
6. Add tests for the new behavior

### Code style

- **PEP 8** for naming and layout
- **Type hints** on all public functions
- **Docstrings** for all public classes and functions
- **Dataclasses** for value objects, not plain dicts
- **No raw SQL in CLI or web code** — always go through a repository

---

## 🗺️ Roadmap

- [x] Core CRUD for expenses and categories
- [x] Monthly summary & overall budget tracking
- [x] CSV export
- [x] Matplotlib charts (CLI)
- [x] Pytest test suite
- [x] **Per-category budgets** with progress bars ✅ (`0.2.0`)
- [x] **Web interface** using the same repositories ✅ (`0.2.0`)
- [x] **Interactive charts** (Chart.js in the web UI) ✅ (`0.2.0`)
- [ ] **Recurring expenses** (rent, subscriptions)
- [ ] **Multi-currency** support with conversion rates
- [ ] **Interactive REPL mode** (`expense shell`)
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
A: You don't have to — there's already one in `0.2.0`! `py -m expense_tracker.web` starts the Flask server. If you want to add your own, the repository pattern makes it trivial: import the repos and return JSON.

**Q: Can the CLI and web app be used at the same time?**
A: Yes. SQLite supports concurrent reads from the same connection pool. Both UIs read/write the same `expenses.db`, so changes in one appear instantly in the other.

**Q: Why no ORMs (SQLAlchemy, Tortoise)?**
A: For a small project, raw SQL with the repository pattern is **simpler**, **faster**, and gives you **full control**. ORMs add abstraction layers that aren't justified at this scale.

**Q: Why Flask and not FastAPI?**
A: Flask's templating + static-file serving made the bundled SPA dead-simple to ship without a separate build step. The REST API uses plain JSON over HTTP, so a future migration to FastAPI is mostly mechanical if performance or async becomes important.

---

## ⭐ Show Your Support

If this project helped you learn something or saved you time, give it a star on GitHub! It helps others discover it.

<div align="center">

**Made with ❤️ and lots of ☕**

[⬆ Back to top](#-expense-tracker)

</div>