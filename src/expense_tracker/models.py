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
    date: str                       # ISO format YYYY-MM-DD
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "Expense":
        return cls(**dict(row))

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
    def delete(category_id: int) -> None:
        with get_connection() as conn:
            conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))


class ExpenseRepository:
    _SELECT = """SELECT e.id, e.amount, e.description, e.category_id,
                        e.date, e.created_at, e.updated_at,
                        c.name AS category_name
                 FROM expenses e
                 LEFT JOIN categories c ON e.category_id = c.id"""

    @staticmethod
    def create(expense: Expense) -> int:
        with get_connection() as conn:
            cur = conn.execute(
                """INSERT INTO expenses (amount, description, category_id, date)
                   VALUES (?, ?, ?, ?)""",
                (expense.amount, expense.description, expense.category_id, expense.date),
            )
            return cur.lastrowid

    @staticmethod
    def get(expense_id: int) -> Optional[Expense]:
        with get_connection() as conn:
            row = conn.execute(
                f"{ExpenseRepository._SELECT} WHERE e.id = ?", (expense_id,)
            ).fetchone()
            return Expense.from_row(row) if row else None

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

    @staticmethod
    def delete(expense_id: int) -> bool:
        with get_connection() as conn:
            cur = conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
            return cur.rowcount > 0

    @staticmethod
    def list(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        category_id: Optional[int] = None,
        limit: int = 100,
    ) -> list[Expense]:
        query = ExpenseRepository._SELECT + " WHERE 1=1"
        params: list = []
        if start_date:
            query += " AND e.date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND e.date <= ?"
            params.append(end_date)
        if category_id is not None:
            query += " AND e.category_id = ?"
            params.append(category_id)
        query += " ORDER BY e.date DESC, e.id DESC LIMIT ?"
        params.append(limit)

        with get_connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [Expense.from_row(r) for r in rows]


class BudgetRepository:
    @staticmethod
    def set_budget(month: str, amount: float, category_id: Optional[int] = None) -> None:
        """Create or update a budget for a given month (and optional category)."""
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
                    "INSERT INTO budgets (category_id, month, amount) VALUES (?, ?, ?)",
                    (category_id, month, amount),
                )

    @staticmethod
    def get_budget(month: str, category_id: Optional[int] = None) -> Optional[float]:
        with get_connection() as conn:
            if category_id is None:
                row = conn.execute(
                    "SELECT amount FROM budgets WHERE category_id IS NULL AND month = ?",
                    (month,),
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT amount FROM budgets WHERE category_id = ? AND month = ?",
                    (category_id, month),
                ).fetchone()
            return row["amount"] if row else None