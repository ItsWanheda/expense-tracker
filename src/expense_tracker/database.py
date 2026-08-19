"""SQLite connection management, schema creation, and safe migrations."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

DEFAULT_DB_PATH = Path.home() / ".expense_tracker" / "expenses.db"


def get_db_path() -> Path:
    DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return DEFAULT_DB_PATH


@contextmanager
def get_connection(db_path: Path | None = None) -> Iterator[sqlite3.Connection]:
    path = db_path or get_db_path()
    Path(path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


BASE_SCHEMA = """
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3498db',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS currency_rates (
    base_currency TEXT NOT NULL,
    quote_currency TEXT NOT NULL,
    rate REAL NOT NULL CHECK (rate > 0),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (base_currency, quote_currency)
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category_id INTEGER,
    wallet_id INTEGER,
    currency TEXT NOT NULL DEFAULT 'USD',
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    month TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount >= 0),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE (category_id, month)
);

CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL CHECK (amount > 0),
    wallet_id INTEGER,
    currency TEXT NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    category_id INTEGER,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
    next_run TEXT NOT NULL,
    anchor_day INTEGER,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
"""

DEFAULT_CATEGORIES = [
    ("Food", "#e74c3c"),
    ("Transport", "#3498db"),
    ("Housing", "#9b59b6"),
    ("Entertainment", "#f39c12"),
    ("Health", "#2ecc71"),
    ("Shopping", "#e91e63"),
    ("Other", "#95a5a6"),
]


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone() is not None


def _columns(conn: sqlite3.Connection, table: str) -> set[str]:
    if not _table_exists(conn, table):
        return set()
    return {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}


def _ensure_column(
    conn: sqlite3.Connection,
    table: str,
    column: str,
    definition: str,
) -> None:
    if column not in _columns(conn, table):
        conn.execute(
            f"ALTER TABLE {table} ADD COLUMN {column} {definition}"
        )


def migrate_schema(conn: sqlite3.Connection) -> None:
    """
    Upgrade databases created by older releases.

    Important: indexes are intentionally created AFTER migrations.
    This prevents SQLite from trying to index wallet_id/currency before
    those columns exist in an older database.
    """
    conn.executescript(BASE_SCHEMA)

    # Old databases may have expenses/recurring tables without these fields.
    _ensure_column(conn, "expenses", "wallet_id", "INTEGER")
    _ensure_column(conn, "expenses", "currency", "TEXT NOT NULL DEFAULT 'USD'")
    _ensure_column(conn, "recurring_expenses", "wallet_id", "INTEGER")
    _ensure_column(
        conn, "recurring_expenses",
        "currency",
        "TEXT NOT NULL DEFAULT 'USD'",
    )

    # Ensure there is always a usable default wallet.
    conn.execute(
        """
        INSERT OR IGNORE INTO wallets (id, name, currency)
        VALUES (1, 'Main Wallet', 'USD')
        """
    )

    # Existing rows get assigned to Main Wallet.
    conn.execute(
        "UPDATE expenses SET wallet_id = 1 WHERE wallet_id IS NULL"
    )
    conn.execute(
        "UPDATE recurring_expenses SET wallet_id = 1 WHERE wallet_id IS NULL"
    )

    # Normalize missing/invalid legacy currency values.
    conn.execute(
        """
        UPDATE expenses
        SET currency = 'USD'
        WHERE currency IS NULL OR TRIM(currency) = ''
        """
    )
    conn.execute(
        """
        UPDATE recurring_expenses
        SET currency = 'USD'
        WHERE currency IS NULL OR TRIM(currency) = ''
        """
    )

    conn.execute(
        """
        INSERT OR IGNORE INTO currency_rates
            (base_currency, quote_currency, rate)
        VALUES ('USD', 'USD', 1.0)
        """
    )

    # Indexes are safe now.
    indexes = (
        ("idx_expenses_date", "expenses(date)"),
        ("idx_expenses_wallet", "expenses(wallet_id)"),
        ("idx_expenses_currency", "expenses(currency)"),
        ("idx_expenses_category", "expenses(category_id)"),
        ("idx_budgets_month", "budgets(month)"),
        ("idx_recurring_next_run", "recurring_expenses(next_run)"),
        ("idx_recurring_active", "recurring_expenses(active)"),
        ("idx_recurring_category", "recurring_expenses(category_id)"),
        ("idx_recurring_wallet", "recurring_expenses(wallet_id)"),
        ("idx_recurring_currency", "recurring_expenses(currency)"),
    )

    for name, expression in indexes:
        conn.execute(
            f"CREATE INDEX IF NOT EXISTS {name} ON {expression}"
        )


def initialize_database(db_path: Path | None = None) -> None:
    with get_connection(db_path) as conn:
        migrate_schema(conn)

        count = conn.execute(
            "SELECT COUNT(*) AS c FROM categories"
        ).fetchone()["c"]

        if count == 0:
            conn.executemany(
                "INSERT INTO categories (name, color) VALUES (?, ?)",
                DEFAULT_CATEGORIES,
            )
