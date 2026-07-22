"""Domain dataclasses and repository classes (data access layer)."""
from __future__ import annotations

import sqlite3
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Optional

from .database import get_connection


@dataclass
class Expense:
    amount: float
    description: str
    date: str                                  # ISO YYYY-MM-DD
    category_id:     Optional[int]   = None
    category_name:   Optional[str]   = None
    category_color:  Optional[str]   = None    # ← NEW
    id:              Optional[int]   = None
    created_at:      Optional[str]   = None
    updated_at:      Optional[str]   = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "Expense":
        # The dataclass only knows its declared fields, so filter anything extra
        valid = {f for f in cls.__dataclass_fields__}
        return cls(**{k: row[k] for k in row.keys() if k in valid})

    def to_dict(self) -> dict:
        return asdict(self)


class CategoryRepository:
    @staticmethod
    def create(name: str, color: str = "#3498db") -> int:
        """Create a category, or return the existing ID if the name is taken."""
        with get_connection() as conn:
            existing = conn.execute(
                "SELECT id FROM categories WHERE name = ?", (name,)
            ).fetchone()
            if existing:
                return existing["id"]
            cur = conn.execute(
                "INSERT INTO categories (name, color) VALUES (?, ?)",
                (name, color),
            )
            return cur.lastrowid

    @staticmethod
    def list_all() -> list[sqlite3.Row]:
        with get_connection() as conn:
            return conn.execute(
                "SELECT id, name, color FROM categories ORDER BY name"
            ).fetchall()

    @staticmethod
    def find_by_name(name: str) -> Optional[sqlite3.Row]:
        with get_connection() as conn:
            return conn.execute(
                "SELECT id, name, color FROM categories WHERE name = ?", (name,)
            ).fetchone()

    @staticmethod
    def update(category_id: int,
               name: Optional[str] = None,
               color: Optional[str] = None) -> bool:
        """Update a category. Returns False if not found."""
        with get_connection() as conn:
            row = conn.execute(
                "SELECT id FROM categories WHERE id = ?", (category_id,)
            ).fetchone()
            if not row:
                return False
            if name is not None:
                dup = conn.execute(
                    "SELECT id FROM categories WHERE name = ? AND id != ?",
                    (name, category_id),
                ).fetchone()
                if dup:
                    raise ValueError("A category with that name already exists.")
            sets, params = [], []
            if name  is not None: sets.append("name = ?");  params.append(name)
            if color is not None: sets.append("color = ?"); params.append(color)
            if not sets:
                return True
            params.append(category_id)
            conn.execute(
                f"UPDATE categories SET {', '.join(sets)} WHERE id = ?",
                params,
            )
            return True

    @staticmethod
    def delete(category_id: int) -> None:
        with get_connection() as conn:
            conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))


class ExpenseRepository:
    # ✅ ONE canonical SELECT, used everywhere — public name, no underscore
    SELECT = """SELECT e.id, e.amount, e.description, e.category_id,
                       e.date, e.created_at, e.updated_at,
                       c.name  AS category_name,
                       c.color AS category_color
                FROM expenses e
                LEFT JOIN categories c ON e.category_id = c.id"""

    # ------------------------------------------------------------------ create
    @staticmethod
    def create(expense: Expense) -> int:
        with get_connection() as conn:
            cur = conn.execute(
                """INSERT INTO expenses (amount, description, category_id, date)
                   VALUES (?, ?, ?, ?)""",
                (expense.amount, expense.description,
                 expense.category_id, expense.date),
            )
            return cur.lastrowid

    # --------------------------------------------------------------------- get
    @staticmethod
    def get(expense_id: int) -> Optional[Expense]:
        with get_connection() as conn:
            row = conn.execute(
                f"{ExpenseRepository.SELECT} WHERE e.id = ?", (expense_id,)
            ).fetchone()
            return Expense.from_row(row) if row else None

    # ------------------------------------------------------------------- update
    @staticmethod
    def update(expense_id: int, **fields) -> bool:
        allowed = {"amount", "description", "category_id", "date"}
        fields = {k: v for k, v in fields.items() if k in allowed}
        if not fields:
            return False
        fields["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [expense_id]
        with get_connection() as conn:
            cur = conn.execute(
                f"UPDATE expenses SET {set_clause} WHERE id = ?", values
            )
            return cur.rowcount > 0

    # ------------------------------------------------------------------- delete
    @staticmethod
    def delete(expense_id: int) -> bool:
        with get_connection() as conn:
            cur = conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
            return cur.rowcount > 0

    # --------------------------------------------------------------------- list
    @staticmethod
    def list(
        start_date:  Optional[str] = None,
        end_date:    Optional[str] = None,
        category_id: Optional[int] = None,
        q:           Optional[str] = None,
        limit:       int = 100,
    ) -> list[Expense]:
        """List expenses with optional filters."""
        query  = ExpenseRepository.SELECT + " WHERE 1=1"
        params: list = []
        if start_date:
            query += " AND e.date >= ?";  params.append(start_date)
        if end_date:
            query += " AND e.date <= ?";  params.append(end_date)
        if category_id is not None:
            query += " AND e.category_id = ?"; params.append(category_id)
        if q:
            query += " AND (e.description LIKE ? OR c.name LIKE ?)"
            like = f"%{q}%"
            params.extend([like, like])
        query += " ORDER BY e.date DESC, e.id DESC LIMIT ?"
        params.append(limit)
        with get_connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [Expense.from_row(r) for r in rows]


class BudgetRepository:
    @staticmethod
    def set_budget(month: str, amount: float,
                   category_id: Optional[int] = None) -> None:
        with get_connection() as conn:
            if category_id is None:
                existing = conn.execute(
                    "SELECT id FROM budgets WHERE category_id IS NULL AND month = ?",
                    (month,),
                ).fetchone()
            else:
                existing = conn.execute(
                    "SELECT id FROM budgets WHERE category_id = ? AND month = ?",
                    (category_id, month),
                ).fetchone()
            if existing:
                conn.execute(
                    "UPDATE budgets SET amount = ? WHERE id = ?",
                    (amount, existing["id"]),
                )
            else:
                conn.execute(
                    "INSERT INTO budgets (category_id, month, amount) "
                    "VALUES (?, ?, ?)",
                    (category_id, month, amount),
                )

    @staticmethod
    def get_budget(month: str,
                   category_id: Optional[int] = None) -> Optional[float]:
        with get_connection() as conn:
            if category_id is None:
                row = conn.execute(
                    "SELECT amount FROM budgets "
                    "WHERE category_id IS NULL AND month = ?",
                    (month,),
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT amount FROM budgets "
                    "WHERE category_id = ? AND month = ?",
                    (category_id, month),
                ).fetchone()
            return row["amount"] if row else None