"""Many-to-many tag persistence for expenses."""
from __future__ import annotations

import re
import sqlite3
from collections.abc import Iterable

from .database import get_connection


class TagRepository:
    """Create, update, delete, and attach reusable tags to expenses."""

    @staticmethod
    def _clean_name(name: str) -> str:
        cleaned = str(name or "").strip()
        if not cleaned:
            raise ValueError("Tag name is required.")
        if len(cleaned) > 40:
            raise ValueError("Tag names must be 40 characters or fewer.")
        return cleaned

    @staticmethod
    def _clean_color(color: str) -> str:
        cleaned = str(color or "#64748b").strip()
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", cleaned):
            raise ValueError("Tag colors must be six-digit hex values.")
        return cleaned

    @staticmethod
    def create(name: str, color: str = "#64748b") -> int:
        cleaned = TagRepository._clean_name(name)
        clean_color = TagRepository._clean_color(color)
        with get_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO tags (name, color) VALUES (?, ?)",
                (cleaned, clean_color),
            )
            return int(cursor.lastrowid)

    @staticmethod
    def list_all() -> list[dict[str, int | str]]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT id, name, color FROM tags ORDER BY name COLLATE NOCASE"
            ).fetchall()
            return [
                {
                    "id": int(row["id"]),
                    "name": str(row["name"]),
                    "color": str(row["color"]),
                }
                for row in rows
            ]

    @staticmethod
    def update(
        tag_id: int,
        name: str | None = None,
        color: str | None = None,
    ) -> bool:
        if name is None and color is None:
            return False

        fields: dict[str, str] = {}
        if name is not None:
            fields["name"] = TagRepository._clean_name(name)
        if color is not None:
            fields["color"] = TagRepository._clean_color(color)

        assignments = ", ".join(f"{key} = ?" for key in fields)
        with get_connection() as conn:
            cursor = conn.execute(
                f"UPDATE tags SET {assignments} WHERE id = ?",
                [*fields.values(), tag_id],
            )
            return cursor.rowcount > 0

    @staticmethod
    def delete(tag_id: int) -> bool:
        with get_connection() as conn:
            cursor = conn.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
            return cursor.rowcount > 0

    @staticmethod
    def replace_for_expense(
        conn: sqlite3.Connection,
        expense_id: int,
        tag_ids: Iterable[int | str],
    ) -> None:
        normalized: list[int] = []
        for raw_id in tag_ids:
            if isinstance(raw_id, bool) or not isinstance(raw_id, (int, str)):
                raise ValueError("Every tag id must be an integer.")
            try:
                tag_id = int(raw_id)
            except ValueError as exc:
                raise ValueError("Every tag id must be an integer.") from exc
            if tag_id <= 0:
                raise ValueError("Tag ids must be positive integers.")
            if tag_id not in normalized:
                normalized.append(tag_id)

        if normalized:
            placeholders = ",".join("?" for _ in normalized)
            rows = conn.execute(
                f"SELECT id FROM tags WHERE id IN ({placeholders})",
                normalized,
            ).fetchall()
            found = {int(row["id"]) for row in rows}
            missing = set(normalized) - found
            if missing:
                joined = ", ".join(str(item) for item in sorted(missing))
                raise ValueError(f"Unknown tag id(s): {joined}")

        conn.execute("DELETE FROM expense_tags WHERE expense_id = ?", (expense_id,))
        if normalized:
            conn.executemany(
                "INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)",
                [(expense_id, tag_id) for tag_id in normalized],
            )

    @staticmethod
    def for_expenses(
        conn: sqlite3.Connection,
        expense_ids: list[int],
    ) -> dict[int, list[dict[str, int | str]]]:
        if not expense_ids:
            return {}

        placeholders = ",".join("?" for _ in expense_ids)
        rows = conn.execute(
            f"""
            SELECT et.expense_id, t.id, t.name, t.color
            FROM expense_tags AS et
            JOIN tags AS t ON t.id = et.tag_id
            WHERE et.expense_id IN ({placeholders})
            ORDER BY t.name COLLATE NOCASE
            """,
            expense_ids,
        ).fetchall()

        result: dict[int, list[dict[str, int | str]]] = {
            expense_id: [] for expense_id in expense_ids
        }
        for row in rows:
            result[int(row["expense_id"])].append(
                {
                    "id": int(row["id"]),
                    "name": str(row["name"]),
                    "color": str(row["color"]),
                }
            )
        return result
