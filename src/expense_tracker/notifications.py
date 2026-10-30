"""Persistent local notifications backed by SQLite."""
from __future__ import annotations

import json
import sqlite3
from typing import Any

from .database import get_connection


class NotificationRepository:
    """Store notification events and track whether they have been read."""

    @staticmethod
    def create(
        kind: str,
        title: str,
        message: str,
        metadata: dict[str, Any] | None = None,
        dedupe_key: str | None = None,
    ) -> int:
        payload = json.dumps(
            metadata or {},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT OR IGNORE INTO notifications
                    (kind, title, message, metadata_json, dedupe_key)
                VALUES (?, ?, ?, ?, ?)
                """,
                (kind, title, message, payload, dedupe_key),
            )
            if cursor.rowcount:
                return int(cursor.lastrowid)

            if dedupe_key:
                row = conn.execute(
                    "SELECT id FROM notifications WHERE dedupe_key = ?",
                    (dedupe_key,),
                ).fetchone()
                if row:
                    return int(row["id"])

            raise sqlite3.IntegrityError("Notification could not be stored.")

    @staticmethod
    def list(
        limit: int = 30,
        unread_only: bool = False,
    ) -> list[dict[str, Any]]:
        safe_limit = max(1, min(int(limit or 30), 100))
        query = """
            SELECT id, kind, title, message, metadata_json, created_at, read_at
            FROM notifications
        """
        if unread_only:
            query += " WHERE read_at IS NULL"
        query += " ORDER BY created_at DESC, id DESC LIMIT ?"

        with get_connection() as conn:
            rows = conn.execute(query, (safe_limit,)).fetchall()

        results: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            try:
                item["metadata"] = json.loads(item.pop("metadata_json") or "{}")
            except (TypeError, json.JSONDecodeError):
                item.pop("metadata_json", None)
                item["metadata"] = {}
            results.append(item)
        return results

    @staticmethod
    def unread_count() -> int:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS count FROM notifications WHERE read_at IS NULL"
            ).fetchone()
            return int(row["count"])

    @staticmethod
    def mark_read(notification_id: int) -> bool:
        with get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE notifications
                SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
                WHERE id = ?
                """,
                (notification_id,),
            )
            return cursor.rowcount > 0

    @staticmethod
    def mark_all_read() -> int:
        with get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE notifications
                SET read_at = CURRENT_TIMESTAMP
                WHERE read_at IS NULL
                """
            )
            return int(cursor.rowcount)

    @staticmethod
    def delete(notification_id: int) -> bool:
        with get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM notifications WHERE id = ?",
                (notification_id,),
            )
            return cursor.rowcount > 0
