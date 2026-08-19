"""Domain dataclasses and repository classes (data access layer)."""

from __future__ import annotations

import calendar
import sqlite3

from dataclasses import asdict, dataclass
from datetime import date as date_cls
from datetime import datetime, timedelta, timezone
from typing import Optional
import json
import urllib.error
import urllib.parse
import urllib.request

from .database import get_connection

# ============================================================================
# EXPENSE MODEL
# ============================================================================


@dataclass
class Expense:
    amount: float
    description: str
    date: str  # ISO YYYY-MM-DD
    category_id: Optional[int] = None
    wallet_id: int = 1
    wallet_name: Optional[str] = None
    currency: str = "USD"
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "Expense":
        # The dataclass only knows its declared fields,
        # so filter anything extra.
        valid = {f for f in cls.__dataclass_fields__}

        return cls(**{k: row[k] for k in row.keys() if k in valid})

    def to_dict(self) -> dict:
        return asdict(self)


# ============================================================================
# CATEGORY REPOSITORY
# ============================================================================


class CategoryRepository:

    @staticmethod
    def create(
        name: str,
        color: str = "#3498db",
    ) -> int:
        """Create a category, or return the existing ID if the name is taken."""

        with get_connection() as conn:

            existing = conn.execute(
                """
                SELECT id
                FROM categories
                WHERE name = ?
                """,
                (name,),
            ).fetchone()

            if existing:
                return existing["id"]

            cur = conn.execute(
                """
                INSERT INTO categories (name, color)
                VALUES (?, ?)
                """,
                (name, color),
            )

            return cur.lastrowid

    @staticmethod
    def list_all() -> list[sqlite3.Row]:

        with get_connection() as conn:

            return conn.execute("""
                SELECT id, name, color
                FROM categories
                ORDER BY name
                """).fetchall()

    @staticmethod
    def find_by_name(
        name: str,
    ) -> Optional[sqlite3.Row]:

        with get_connection() as conn:

            return conn.execute(
                """
                SELECT id, name, color
                FROM categories
                WHERE name = ?
                """,
                (name,),
            ).fetchone()

    @staticmethod
    def update(
        category_id: int,
        name: Optional[str] = None,
        color: Optional[str] = None,
    ) -> bool:
        """Update a category. Returns False if not found."""

        with get_connection() as conn:

            row = conn.execute(
                """
                SELECT id
                FROM categories
                WHERE id = ?
                """,
                (category_id,),
            ).fetchone()

            if not row:
                return False

            if name is not None:

                dup = conn.execute(
                    """
                    SELECT id
                    FROM categories
                    WHERE name = ?
                      AND id != ?
                    """,
                    (name, category_id),
                ).fetchone()

                if dup:
                    raise ValueError("A category with that name already exists.")

            sets = []
            params = []

            if name is not None:
                sets.append("name = ?")
                params.append(name)

            if color is not None:
                sets.append("color = ?")
                params.append(color)

            if not sets:
                return True

            params.append(category_id)

            conn.execute(
                f"""
                UPDATE categories
                SET {', '.join(sets)}
                WHERE id = ?
                """,
                params,
            )

            return True

    @staticmethod
    def delete(category_id: int) -> None:

        with get_connection() as conn:

            conn.execute(
                """
                DELETE FROM categories
                WHERE id = ?
                """,
                (category_id,),
            )


# ============================================================================
# EXPENSE REPOSITORY
# ============================================================================


class ExpenseRepository:

    # ONE canonical SELECT, used everywhere.
    SELECT = """
        SELECT
            e.id,
            e.amount,
            e.description,
            e.category_id,
            e.wallet_id,
            w.name AS wallet_name,
            e.currency,
            e.date,
            e.created_at,
            e.updated_at,
            c.name AS category_name,
            c.color AS category_color
        FROM expenses e
        LEFT JOIN categories c
            ON e.category_id = c.id
        LEFT JOIN wallets w
            ON e.wallet_id = w.id
    """

    # ------------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------------

    @staticmethod
    def create(expense: Expense) -> int:

        with get_connection() as conn:

            cur = conn.execute(
                """
                INSERT INTO expenses
                    (amount, description, category_id, wallet_id, currency, date)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    expense.amount,
                    expense.description,
                    expense.category_id,
                    expense.wallet_id,
                    expense.currency.upper(),
                    expense.date,
                ),
            )

            return cur.lastrowid

    # ------------------------------------------------------------------------
    # GET
    # ------------------------------------------------------------------------

    @staticmethod
    def get(
        expense_id: int,
    ) -> Optional[Expense]:

        with get_connection() as conn:

            row = conn.execute(
                f"""
                {ExpenseRepository.SELECT}
                WHERE e.id = ?
                """,
                (expense_id,),
            ).fetchone()

            return Expense.from_row(row) if row else None

    # ------------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------------

    @staticmethod
    def update(
        expense_id: int,
        **fields,
    ) -> bool:

        allowed = {
            "amount",
            "description",
            "category_id",
            "wallet_id",
            "currency",
            "date",
        }

        fields = {k: v for k, v in fields.items() if k in allowed}

        if not fields:
            return False

        fields["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")

        set_clause = ", ".join(f"{k} = ?" for k in fields)

        values = list(fields.values())
        values.append(expense_id)

        with get_connection() as conn:

            cur = conn.execute(
                f"""
                UPDATE expenses
                SET {set_clause}
                WHERE id = ?
                """,
                values,
            )

            return cur.rowcount > 0

    # ------------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------------

    @staticmethod
    def delete(
        expense_id: int,
    ) -> bool:

        with get_connection() as conn:

            cur = conn.execute(
                """
                DELETE FROM expenses
                WHERE id = ?
                """,
                (expense_id,),
            )

            return cur.rowcount > 0

    # ------------------------------------------------------------------------
    # LIST
    # ------------------------------------------------------------------------

    @staticmethod
    def list(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        category_id: Optional[int] = None,
        q: Optional[str] = None,
        limit: int = 100,
        wallet_id: Optional[int] = None,
        currency: Optional[str] = None,
    ) -> list[Expense]:
        """List expenses with optional filters."""

        query = ExpenseRepository.SELECT + " WHERE 1=1"

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

        if wallet_id is not None:
            query += " AND e.wallet_id = ?"
            params.append(wallet_id)

        if currency:
            query += " AND e.currency = ?"
            params.append(currency.upper())

        if q:

            query += """
                AND (
                    e.description LIKE ?
                    OR c.name LIKE ?
                )
            """

            like = f"%{q}%"

            params.extend(
                [
                    like,
                    like,
                ]
            )

        query += """
            ORDER BY e.date DESC, e.id DESC
            LIMIT ?
        """

        params.append(limit)

        with get_connection() as conn:

            rows = conn.execute(
                query,
                params,
            ).fetchall()

            return [Expense.from_row(row) for row in rows]


# ============================================================================
# BUDGET REPOSITORY
# ============================================================================


class BudgetRepository:

    @staticmethod
    def set_budget(
        month: str,
        amount: float,
        category_id: Optional[int] = None,
    ) -> None:

        with get_connection() as conn:

            if category_id is None:

                existing = conn.execute(
                    """
                    SELECT id
                    FROM budgets
                    WHERE category_id IS NULL
                      AND month = ?
                    """,
                    (month,),
                ).fetchone()

            else:

                existing = conn.execute(
                    """
                    SELECT id
                    FROM budgets
                    WHERE category_id = ?
                      AND month = ?
                    """,
                    (
                        category_id,
                        month,
                    ),
                ).fetchone()

            if existing:

                conn.execute(
                    """
                    UPDATE budgets
                    SET amount = ?
                    WHERE id = ?
                    """,
                    (
                        amount,
                        existing["id"],
                    ),
                )

            else:

                conn.execute(
                    """
                    INSERT INTO budgets
                        (category_id, month, amount)
                    VALUES (?, ?, ?)
                    """,
                    (
                        category_id,
                        month,
                        amount,
                    ),
                )

    @staticmethod
    def get_budget(
        month: str,
        category_id: Optional[int] = None,
    ) -> Optional[float]:

        with get_connection() as conn:

            if category_id is None:

                row = conn.execute(
                    """
                    SELECT amount
                    FROM budgets
                    WHERE category_id IS NULL
                      AND month = ?
                    """,
                    (month,),
                ).fetchone()

            else:

                row = conn.execute(
                    """
                    SELECT amount
                    FROM budgets
                    WHERE category_id = ?
                      AND month = ?
                    """,
                    (
                        category_id,
                        month,
                    ),
                ).fetchone()

            return row["amount"] if row else None


# ============================================================================
# RECURRING EXPENSE REPOSITORY
# ============================================================================


class RecurringExpenseRepository:

    # ------------------------------------------------------------------------
    # INTERNAL DATE CALCULATOR
    # ------------------------------------------------------------------------

    @staticmethod
    def _next_date(
        current_date: str,
        frequency: str,
        anchor_day: Optional[int] = None,
    ) -> date_cls:

        current = date_cls.fromisoformat(current_date)

        # Weekly
        if frequency == "weekly":

            return current + timedelta(days=7)

        # Yearly
        if frequency == "yearly":

            year = current.year + 1

            month = current.month

            day = min(
                anchor_day or current.day,
                calendar.monthrange(
                    year,
                    month,
                )[1],
            )

            return date_cls(
                year,
                month,
                day,
            )

        # Monthly
        if frequency == "monthly":

            year = current.year

            month = current.month + 1

            if month > 12:

                month = 1

                year += 1

            day = min(
                anchor_day or current.day,
                calendar.monthrange(
                    year,
                    month,
                )[1],
            )

            return date_cls(
                year,
                month,
                day,
            )

        raise ValueError("frequency must be weekly, monthly, or yearly")

    # ------------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------------

    @classmethod
    def create(
        cls,
        amount: float,
        description: str,
        category_id: Optional[int] = None,
        frequency: str = "monthly",
        next_run: Optional[str] = None,
        wallet_id: int = 1,
        currency: str = "USD",
    ) -> int:

        amount = float(amount)

        if amount <= 0:
            raise ValueError("amount must be positive")

        description = (description or "").strip()

        if not description:
            raise ValueError("description is required")

        if frequency not in {
            "weekly",
            "monthly",
            "yearly",
        }:
            raise ValueError("frequency must be weekly, monthly, or yearly")

        next_run = next_run or date_cls.today().isoformat()

        parsed_date = date_cls.fromisoformat(next_run)

        with get_connection() as conn:

            cur = conn.execute(
                """
                INSERT INTO recurring_expenses
                    (
                        amount,
                        description,
                        category_id,
                        wallet_id,
                        currency,
                        frequency,
                        next_run,
                        anchor_day,
                        active
                    )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                """,
                (
                    amount,
                    description,
                    category_id,
                    wallet_id,
                    currency.upper(),
                    frequency,
                    parsed_date.isoformat(),
                    parsed_date.day,
                ),
            )

            return cur.lastrowid

    # ------------------------------------------------------------------------
    # GET
    # ------------------------------------------------------------------------

    @classmethod
    def get(
        cls,
        recurring_id: int,
    ) -> Optional[dict]:

        with get_connection() as conn:

            row = conn.execute(
                """
                SELECT
                    r.id,
                    r.amount,
                    r.description,
                    r.category_id,
                    r.wallet_id,
                    r.currency,
                    r.frequency,
                    r.next_run,
                    r.anchor_day,
                    r.active,
                    r.created_at,
                    r.updated_at,
                    c.name AS category_name,
                    c.color AS category_color
                FROM recurring_expenses r
                LEFT JOIN categories c
                    ON r.category_id = c.id
                WHERE r.id = ?
                """,
                (recurring_id,),
            ).fetchone()

            return dict(row) if row else None

    # ------------------------------------------------------------------------
    # LIST
    # ------------------------------------------------------------------------

    @classmethod
    def list_all(
        cls,
        active_only: bool = False,
    ) -> list[dict]:

        query = """
            SELECT
                r.id,
                r.amount,
                r.description,
                r.category_id,
                r.wallet_id,
                r.currency,
                r.frequency,
                r.next_run,
                r.anchor_day,
                r.active,
                r.created_at,
                r.updated_at,
                c.name AS category_name,
                c.color AS category_color
            FROM recurring_expenses r
            LEFT JOIN categories c
                ON r.category_id = c.id
        """

        if active_only:

            query += """
                WHERE r.active = 1
            """

        query += """
            ORDER BY
                r.active DESC,
                r.next_run ASC,
                r.id DESC
        """

        with get_connection() as conn:

            rows = conn.execute(query).fetchall()

            return [dict(row) for row in rows]

    # ------------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------------

    @classmethod
    def update(
        cls,
        recurring_id: int,
        **fields,
    ) -> bool:

        allowed = {
            "amount",
            "description",
            "category_id",
            "wallet_id",
            "currency",
            "frequency",
            "next_run",
            "active",
        }

        fields = {k: v for k, v in fields.items() if k in allowed}

        if not fields:
            return False

        # Validate amount
        if "amount" in fields:

            fields["amount"] = float(fields["amount"])

            if fields["amount"] <= 0:
                raise ValueError("amount must be positive")

        # Validate description
        if "description" in fields:

            fields["description"] = (fields["description"] or "").strip()

            if not fields["description"]:
                raise ValueError("description is required")

        # Validate frequency
        if "frequency" in fields:

            if fields["frequency"] not in {
                "weekly",
                "monthly",
                "yearly",
            }:
                raise ValueError("frequency must be weekly, monthly, or yearly")

        # Validate date
        if "next_run" in fields:

            date_cls.fromisoformat(fields["next_run"])

        # Normalize active
        if "active" in fields:

            fields["active"] = 1 if fields["active"] else 0

        # Update timestamp
        fields["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")

        set_clause = ", ".join(f"{key} = ?" for key in fields)

        values = list(fields.values())

        values.append(recurring_id)

        with get_connection() as conn:

            cur = conn.execute(
                f"""
                UPDATE recurring_expenses
                SET {set_clause}
                WHERE id = ?
                """,
                values,
            )

            return cur.rowcount > 0

    # ------------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------------

    @classmethod
    def delete(
        cls,
        recurring_id: int,
    ) -> bool:

        with get_connection() as conn:

            cur = conn.execute(
                """
                DELETE FROM recurring_expenses
                WHERE id = ?
                """,
                (recurring_id,),
            )

            return cur.rowcount > 0

    # ------------------------------------------------------------------------
    # GENERATE DUE EXPENSES
    # ------------------------------------------------------------------------

    @classmethod
    def generate_due(cls) -> int:
        """
        Generate all recurring expenses whose next_run
        is today or earlier.

        Example:

            Rent:
                next_run = 2026-06-01

        If the app is opened on:

            2026-08-17

        it creates:

            2026-06-01
            2026-07-01
            2026-08-01

        and moves next_run to:

            2026-09-01
        """

        today = date_cls.today()

        generated = 0

        with get_connection() as conn:

            rows = conn.execute(
                """
                SELECT *
                FROM recurring_expenses
                WHERE active = 1
                  AND next_run <= ?
                ORDER BY next_run ASC
                """,
                (today.isoformat(),),
            ).fetchall()

            for row in rows:

                next_run = date_cls.fromisoformat(row["next_run"])

                # Catch up every missed occurrence.
                while next_run <= today:

                    conn.execute(
                        """
                        INSERT INTO expenses
                            (
                                amount,
                                description,
                                category_id,
                                wallet_id,
                                currency,
                                date
                            )
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            row["amount"],
                            row["description"],
                            row["category_id"],
                            row["wallet_id"],
                            row["currency"],
                            next_run.isoformat(),
                        ),
                    )

                    generated += 1

                    next_run = cls._next_date(
                        next_run.isoformat(),
                        row["frequency"],
                        row["anchor_day"],
                    )

                # Store the next future occurrence.
                conn.execute(
                    """
                    UPDATE recurring_expenses
                    SET
                        next_run = ?,
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        next_run.isoformat(),
                        datetime.now(timezone.utc).isoformat(timespec="seconds"),
                        row["id"],
                    ),
                )

        return generated


# ============================================================================
# WALLETS & CURRENCY
# ============================================================================


class WalletRepository:
    @staticmethod
    def create(name: str, currency: str = "USD") -> int:
        name = (name or "").strip()
        currency = (currency or "USD").upper()
        if not name:
            raise ValueError("wallet name is required")
        if len(currency) != 3:
            raise ValueError("currency must be a 3-letter ISO code")
        with get_connection() as conn:
            cur = conn.execute(
                "INSERT INTO wallets (name, currency) VALUES (?, ?)", (name, currency)
            )
            return cur.lastrowid

    @staticmethod
    def list_all() -> list[dict]:
        with get_connection() as conn:
            return [
                dict(r)
                for r in conn.execute(
                    "SELECT id, name, currency, created_at FROM wallets ORDER BY id"
                ).fetchall()
            ]

    @staticmethod
    def get(wallet_id: int) -> Optional[dict]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT id, name, currency, created_at FROM wallets WHERE id = ?",
                (wallet_id,),
            ).fetchone()
            return dict(row) if row else None

    @staticmethod
    def update(
        wallet_id: int, name: Optional[str] = None, currency: Optional[str] = None
    ) -> bool:
        fields, values = [], []
        if name is not None:
            fields.append("name = ?")
            values.append(name.strip())
        if currency is not None:
            fields.append("currency = ?")
            values.append(currency.upper())
        if not fields:
            return False
        values.append(wallet_id)
        with get_connection() as conn:
            cur = conn.execute(
                f"UPDATE wallets SET {', '.join(fields)} WHERE id = ?", values
            )
            return cur.rowcount > 0

    @staticmethod
    def delete(wallet_id: int) -> bool:
        if wallet_id == 1:
            raise ValueError("the Main Wallet cannot be deleted")
        with get_connection() as conn:
            cur = conn.execute("DELETE FROM wallets WHERE id = ?", (wallet_id,))
            return cur.rowcount > 0


class CurrencyRepository:
    COMMON = (
        "USD",
        "EUR",
        "GBP",
        "AZN",
        "JPY",
        "CAD",
        "AUD",
        "CHF",
        "CNY",
        "TRY",
        "INR",
    )

    @staticmethod
    def set_rate(base: str, quote: str, rate: float) -> None:
        base, quote, rate = base.upper(), quote.upper(), float(rate)
        if rate <= 0 or len(base) != 3 or len(quote) != 3:
            raise ValueError("invalid currency or rate")
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO currency_rates(base_currency, quote_currency, rate, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(base_currency, quote_currency) DO UPDATE SET rate=excluded.rate, updated_at=CURRENT_TIMESTAMP""",
                (base, quote, rate),
            )


    @classmethod
    def get_rate(cls, base: str, quote: str) -> float:
        """
        Resolve a currency conversion rate.

        Resolution order:
        1. Same currency -> 1.0
        2. Cached direct rate
        3. Cached inverse rate
        4. Live Frankfurter API
        5. Cache the live rate

        No third-party Python dependency is required.
        """

        base = (base or "").strip().upper()
        quote = (quote or "").strip().upper()

        if len(base) != 3 or len(quote) != 3:
            raise ValueError(
                "Currency codes must be 3-letter ISO codes."
            )

        if base == quote:
            return 1.0

    # ==============================================================
    # 1. Check cached direct rate
    # ==============================================================
        with get_connection() as conn:
            row = conn.execute(
                """
                SELECT rate
                FROM currency_rates
                WHERE base_currency = ?
                  AND quote_currency = ?
                LIMIT 1
                """,
                (base, quote),
            ).fetchone()

            if row is not None:
                rate = float(row["rate"])

                if rate > 0:
                    return rate

        # ==========================================================
        # 2. Check cached inverse rate
        # ==========================================================
            row = conn.execute(
                """
                SELECT rate
                FROM currency_rates
             WHERE base_currency = ?
                AND quote_currency = ?
                LIMIT 1
                """,
                (quote, base),
            ).fetchone()

            if row is not None:
                inverse_rate = float(row["rate"])

                if inverse_rate > 0:
                    return 1.0 / inverse_rate

    # ==============================================================
    # 3. Resolve live rate
    #
    # Frankfurter API v2:
    #
    # https://api.frankfurter.dev/v2/rate/USD/EUR
    # ==============================================================
        encoded_base = urllib.parse.quote(base)
        encoded_quote = urllib.parse.quote(quote)

        url = (
            "https://api.frankfurter.dev/v2/rate/"
            f"{encoded_base}/{encoded_quote}"
        )

        request = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "ExpenseTracker/1.0",
            },
            method="GET",
        )

        try:
            with urllib.request.urlopen(
                request,
                timeout=10,
            ) as response:

                if response.status != 200:
                    raise ValueError(
                        f"Currency API returned HTTP "
                        f"{response.status}."
                    )

                raw_data = response.read().decode("utf-8")

            data = json.loads(raw_data)

        except urllib.error.HTTPError as exc:

            if exc.code == 404:
                raise ValueError(
                    f"No currency rate found for "
                    f"{base} -> {quote}."
                ) from exc

            raise ValueError(
                f"Currency API returned HTTP "
                f"{exc.code} for {base} -> {quote}."
            ) from exc

        except urllib.error.URLError as exc:

            raise ValueError(
                f"Could not reach the currency API "
                f"for {base} -> {quote}: {exc.reason}"
            ) from exc

        except TimeoutError as exc:

            raise ValueError(
                f"Currency API request timed out "
                f"for {base} -> {quote}."
            ) from exc

        except json.JSONDecodeError as exc:

            raise ValueError(
                f"Currency API returned invalid JSON "
                f"for {base} -> {quote}."
            ) from exc

    # ==============================================================
    # 4. Read the v2 response
    # ==============================================================
        rate = data.get("rate")

        if rate is None:
            raise ValueError(
                f"Currency API did not return a rate "
                f"for {base} -> {quote}."
            )

        try:
            rate = float(rate)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Invalid currency rate returned for "
                f"{base} -> {quote}: {rate!r}"
            ) from exc

        if rate <= 0:
            raise ValueError(
                f"Invalid currency rate returned for "
                f"{base} -> {quote}: {rate}"
            )

    # ==============================================================
    # 5. Cache the successful rate
    # ==============================================================
        cls.set_rate(
            base,
            quote,
            rate,
        )

        return rate

    @staticmethod
    def convert(amount: float, base: str, quote: str) -> float:
        return float(amount) * CurrencyRepository.get_rate(base, quote)

    @staticmethod
    def list_rates() -> list[dict]:
        with get_connection() as conn:
            return [
                dict(r)
                for r in conn.execute(
                    "SELECT base_currency, quote_currency, rate, updated_at FROM currency_rates ORDER BY base_currency, quote_currency"
                ).fetchall()
            ]
