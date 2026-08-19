"""Flask web server exposing a JSON API for the expense tracker."""

from __future__ import annotations

import csv
import io
from datetime import date as date_cls

from flask import Flask, Response, jsonify, render_template, request

from .database import initialize_database
from .models import (
    BudgetRepository,
    CategoryRepository,
    CurrencyRepository,
    Expense,
    ExpenseRepository,
    RecurringExpenseRepository,
    WalletRepository,
)
from .reports import current_month, generate_monthly_report


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )

    initialize_database()

    # ========================================================================
    # FRONTEND
    # ========================================================================

    @app.route("/")
    def index():
        return render_template("index.html")

    # ========================================================================
    # HEALTH
    # ========================================================================

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    # ========================================================================
    # WALLETS
    # ========================================================================

    @app.get("/api/wallets")
    def list_wallets():
        try:
            wallets = WalletRepository.list_all()

            return jsonify([
                dict(wallet)
                for wallet in wallets
            ])

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    @app.get("/api/wallets/<int:wallet_id>")
    def get_wallet(wallet_id: int):
        try:
            wallet = WalletRepository.get(wallet_id)

            if wallet is None:
                return jsonify({
                    "error": "Wallet not found"
                }), 404

            return jsonify(dict(wallet))

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    @app.post("/api/wallets")
    def create_wallet():
        data = request.get_json(silent=True) or {}

        try:
            name = str(
                data.get("name") or ""
            ).strip()

            currency = str(
                data.get("currency") or "USD"
            ).strip().upper()

            if not name:
                raise ValueError(
                    "Wallet name is required."
                )

            if len(currency) != 3:
                raise ValueError(
                    "Currency must be a 3-letter ISO code."
                )

            wallet_id = WalletRepository.create(
                name=name,
                currency=currency,
            )

            wallet = WalletRepository.get(wallet_id)

            return jsonify(dict(wallet)), 201

        except (ValueError, TypeError) as exc:
            return jsonify({
                "error": str(exc)
            }), 400

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    @app.put("/api/wallets/<int:wallet_id>")
    def update_wallet(wallet_id: int):
        data = request.get_json(silent=True) or {}

        try:
            name = data.get("name")
            currency = data.get("currency")

            if name is not None:
                name = str(name).strip()

                if not name:
                    raise ValueError(
                        "Wallet name cannot be empty."
                    )

            if currency is not None:
                currency = str(currency).strip().upper()

                if len(currency) != 3:
                    raise ValueError(
                        "Currency must be a 3-letter ISO code."
                    )

            updated = WalletRepository.update(
                wallet_id,
                name=name,
                currency=currency,
            )

            if not updated:
                return jsonify({
                    "error": "Wallet not found or nothing to update."
                }), 404

            wallet = WalletRepository.get(wallet_id)

            return jsonify(dict(wallet))

        except (ValueError, TypeError) as exc:
            return jsonify({
                "error": str(exc)
            }), 400

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    @app.delete("/api/wallets/<int:wallet_id>")
    def delete_wallet(wallet_id: int):
        try:
            deleted = WalletRepository.delete(wallet_id)

            if not deleted:
                return jsonify({
                    "error": "Wallet not found."
                }), 404

            return jsonify({
                "ok": True
            })

        except (ValueError, TypeError) as exc:
            return jsonify({
                "error": str(exc)
            }), 400

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    # ========================================================================
    # CURRENCIES
    # ========================================================================

    @app.get("/api/currencies")
    def list_currencies():
        return jsonify({
            "currencies": list(
                CurrencyRepository.COMMON
            )
        })

    @app.get("/api/currencies/rates")
    def list_currency_rates():
        """
        Return currency rates.

        Optional:
            ?base=USD
            ?quote=EUR

        When no pair is specified, commonly-used USD rates
        are resolved and returned.
        """

        base = (
            request.args.get("base")
            or ""
        ).strip().upper()

        quote = (
            request.args.get("quote")
            or ""
        ).strip().upper()

        try:
            # --------------------------------------------------------------
            # Specific pair
            # --------------------------------------------------------------

            if base and quote:
                rate = CurrencyRepository.get_rate(
                    base,
                    quote,
                )

                return jsonify({
                    "base": base,
                    "quote": quote,
                    "rate": rate,
                    "rates": [{
                        "base": base,
                        "quote": quote,
                        "rate": rate,
                    }],
                })

            # --------------------------------------------------------------
            # Default USD rates
            # --------------------------------------------------------------

            default_base = "USD"

            rates = []

            for currency in CurrencyRepository.COMMON:
                currency = str(currency).upper()

                if currency == default_base:
                    continue

                try:
                    rate = CurrencyRepository.get_rate(
                        default_base,
                        currency,
                    )

                    rates.append({
                        "base": default_base,
                        "quote": currency,
                        "rate": rate,
                    })

                except Exception:
                    # One unavailable pair should not
                    # break the entire endpoint.
                    continue

            return jsonify({
                "base": default_base,
                "rates": rates,
            })

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    @app.get("/api/currencies/rate")
    def get_currency_rate():
        base = (
            request.args.get("base")
            or ""
        ).strip().upper()

        quote = (
            request.args.get("quote")
            or ""
        ).strip().upper()

        if not base or not quote:
            return jsonify({
                "error": "base and quote are required"
            }), 400

        try:
            rate = CurrencyRepository.get_rate(
                base,
                quote,
            )

            return jsonify({
                "base": base,
                "quote": quote,
                "rate": rate,
            })

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 400

    @app.post("/api/currencies/rates")
    def set_currency_rate():
        data = request.get_json(silent=True) or {}

        try:
            base = str(
                data.get("base")
                or data.get("base_currency")
                or ""
            ).strip().upper()

            quote = str(
                data.get("quote")
                or data.get("quote_currency")
                or ""
            ).strip().upper()

            if len(base) != 3:
                raise ValueError(
                    "Base currency must be a 3-letter ISO code."
                )

            if len(quote) != 3:
                raise ValueError(
                    "Quote currency must be a 3-letter ISO code."
                )

            rate = float(data["rate"])

            if rate <= 0:
                raise ValueError(
                    "Rate must be greater than zero."
                )

            CurrencyRepository.set_rate(
                base,
                quote,
                rate,
            )

            return jsonify({
                "ok": True,
                "base": base,
                "quote": quote,
                "rate": rate,
            }), 201

        except (KeyError, ValueError, TypeError) as exc:
            return jsonify({
                "error": str(exc)
            }), 400

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    @app.get("/api/currencies/convert")
    def convert_currency():
        base = (
            request.args.get("base")
            or ""
        ).strip().upper()

        quote = (
            request.args.get("quote")
            or ""
        ).strip().upper()

        try:
            amount = float(
                request.args.get(
                    "amount",
                    "0",
                )
            )

            if not base or not quote:
                raise ValueError(
                    "base and quote are required."
                )

            if amount < 0:
                raise ValueError(
                    "amount cannot be negative."
                )

            rate = CurrencyRepository.get_rate(
                base,
                quote,
            )

            return jsonify({
                "amount": amount,
                "base": base,
                "quote": quote,
                "rate": rate,
                "converted": amount * rate,
            })

        except (ValueError, TypeError) as exc:
            return jsonify({
                "error": str(exc)
            }), 400

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    # ========================================================================
    # CATEGORIES
    # ========================================================================

    @app.get("/api/categories")
    def list_categories():
        rows = CategoryRepository.list_all()

        return jsonify([
            dict(row)
            for row in rows
        ])

    @app.post("/api/categories")
    def create_category():
        data = request.get_json(silent=True) or {}

        name = (
            data.get("name") or ""
        ).strip()

        color = (
            data.get("color")
            or "#3498db"
        )

        if not name:
            return jsonify({
                "error": "Name is required"
            }), 400

        try:
            cid = CategoryRepository.create(
                name,
                color,
            )

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 400

        return jsonify({
            "id": cid,
            "name": name,
            "color": color,
        }), 201

    @app.delete("/api/categories/<int:cid>")
    def delete_category(cid: int):
        CategoryRepository.delete(cid)

        return jsonify({
            "ok": True
        })

    @app.put("/api/categories/<int:cid>")
    def update_category(cid: int):
        data = request.get_json(silent=True) or {}

        name = (
            data.get("name") or ""
        ).strip()

        color = data.get("color")

        if not name:
            return jsonify({
                "error": "Name is required"
            }), 400

        try:
            updated = CategoryRepository.update(
                cid,
                name=name,
                color=color,
            )

            if not updated:
                return jsonify({
                    "error": "Category not found"
                }), 404

            return jsonify({
                "ok": True,
                "id": cid,
                "name": name,
                "color": color,
            })

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 400

    # ========================================================================
    # EXPENSES
    # ========================================================================

    @app.get("/api/expenses")
    def list_expenses():
        expenses = ExpenseRepository.list(
            start_date=request.args.get("from"),
            end_date=request.args.get("to"),
            category_id=request.args.get(
                "category_id",
                type=int,
            ),
            q=request.args.get("q"),
            limit=request.args.get(
                "limit",
                default=500,
                type=int,
            ),
        )

        return jsonify([
            e.to_dict()
            for e in expenses
        ])

    @app.post("/api/expenses")
    def create_expense():
        data = request.get_json(silent=True) or {}

        try:
            amount = float(
                data["amount"]
            )

            description = (
                data.get("description") or ""
            ).strip()

            if amount <= 0:
                raise ValueError(
                    "amount must be positive"
                )

            if not description:
                raise ValueError(
                    "description is required"
                )

            exp_date = (
                data.get("date")
                or date_cls.today().isoformat()
            )

            category_id = (
                data.get("category_id")
                or None
            )

            wallet_id = (
                data.get("wallet_id")
                or None
            )

            currency = (
                data.get("currency")
                or "USD"
            ).strip().upper()

            expense = Expense(
                amount=amount,
                description=description,
                date=exp_date,
                category_id=category_id,
                wallet_id=wallet_id,
                currency=currency,
            )

            eid = ExpenseRepository.create(
                expense
            )

            return jsonify({
                "id": eid
            }), 201

        except (KeyError, ValueError, TypeError) as exc:
            return jsonify({
                "error": str(exc)
            }), 400

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    @app.put("/api/expenses/<int:eid>")
    def update_expense(eid: int):
        data = request.get_json(silent=True) or {}

        updates: dict = {}

        if "amount" in data:
            try:
                amount = float(
                    data["amount"]
                )

                if amount <= 0:
                    raise ValueError(
                        "amount must be positive"
                    )

                updates["amount"] = amount

            except ValueError as exc:
                return jsonify({
                    "error": str(exc)
                }), 400

        if "description" in data:
            updates["description"] = (
                data["description"]
            )

        if "date" in data:
            updates["date"] = data["date"]

        if "category_id" in data:
            updates["category_id"] = (
                data["category_id"]
            )

        if "wallet_id" in data:
            updates["wallet_id"] = (
                data["wallet_id"]
            )

        if "currency" in data:
            updates["currency"] = str(
                data["currency"]
            ).strip().upper()

        if not updates:
            return jsonify({
                "error": "Nothing to update"
            }), 400

        try:
            updated = ExpenseRepository.update(
                eid,
                **updates,
            )

            if not updated:
                return jsonify({
                    "error": "Expense not found"
                }), 404

            return jsonify({
                "ok": True
            })

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 400

    @app.delete("/api/expenses/<int:eid>")
    def delete_expense(eid: int):
        if not ExpenseRepository.delete(eid):
            return jsonify({
                "error": "Expense not found"
            }), 404

        return jsonify({
            "ok": True
        })

    # ========================================================================
    # REPORTS
    # ========================================================================

    @app.get("/api/reports/summary")
    def report_summary():
        month = (
            request.args.get("month")
            or current_month()
        )

        report = generate_monthly_report(
            month
        )

        return jsonify({
            "month": report.month,
            "total": report.total,
            "count": report.count,
            "budget": report.budget,
            "budget_remaining": (
                report.budget_remaining
            ),
            "by_category": [
                {
                    "category": c.category,
                    "total": c.total,
                    "count": c.count,
                }
                for c in report.by_category
            ],
        })

    # ========================================================================
    # HEATMAP
    # ========================================================================

    @app.get("/api/reports/heatmap")
    def report_heatmap():
        year = int(
            request.args.get(
                "year",
                date_cls.today().year,
            )
        )

        expenses = ExpenseRepository.list(
            start_date=f"{year}-01-01",
            end_date=f"{year}-12-31",
            limit=10_000,
        )

        return jsonify({
            "year": year,
            "expenses": [
                e.to_dict()
                for e in expenses
            ],
        })

    # ========================================================================
    # BUDGET
    # ========================================================================

    @app.get("/api/budget")
    def get_budget():
        month = (
            request.args.get("month")
            or current_month()
        )

        return jsonify({
            "month": month,
            "amount": BudgetRepository.get_budget(
                month
            ),
        })

    @app.put("/api/budget")
    def set_budget():
        data = request.get_json(silent=True) or {}

        try:
            amount = float(
                data["amount"]
            )

            if amount < 0:
                raise ValueError(
                    "amount must be >= 0"
                )

            month = (
                data.get("month")
                or current_month()
            )

            BudgetRepository.set_budget(
                month,
                amount,
            )

            return jsonify({
                "ok": True,
                "month": month,
                "amount": amount,
            })

        except (KeyError, ValueError, TypeError) as exc:
            return jsonify({
                "error": str(exc)
            }), 400

    # ========================================================================
    # CSV EXPORT
    # ========================================================================

    @app.get("/api/export.csv")
    def export_csv():
        expenses = ExpenseRepository.list(
            start_date=request.args.get("from"),
            end_date=request.args.get("to"),
            limit=10_000,
        )

        buf = io.StringIO()

        writer = csv.writer(buf)

        writer.writerow([
            "id",
            "date",
            "category",
            "amount",
            "currency",
            "wallet_id",
            "description",
        ])

        for expense in expenses:
            writer.writerow([
                expense.id,
                expense.date,
                expense.category_name or "",
                expense.amount,
                getattr(
                    expense,
                    "currency",
                    "USD",
                ),
                getattr(
                    expense,
                    "wallet_id",
                    "",
                ) or "",
                expense.description,
            ])

        return Response(
            buf.getvalue(),
            mimetype="text/csv",
            headers={
                "Content-Disposition":
                    "attachment; "
                    "filename=expenses.csv"
            },
        )

    # ========================================================================
    # RECURRING EXPENSES
    # ========================================================================

    @app.get("/api/recurring")
    def list_recurring():
        generated = (
            RecurringExpenseRepository.generate_due()
        )

        recurring = (
            RecurringExpenseRepository.list_all()
        )

        return jsonify({
            "generated": generated,
            "items": recurring,
        })

    @app.post("/api/recurring")
    def create_recurring():
        data = request.get_json(silent=True) or {}

        try:
            amount = float(
                data["amount"]
            )

            if amount <= 0:
                raise ValueError(
                    "amount must be positive"
                )

            description = (
                data.get("description") or ""
            ).strip()

            if not description:
                raise ValueError(
                    "description is required"
                )

            frequency = (
                data.get("frequency")
                or "monthly"
            )

            next_run = (
                data.get("next_run")
                or date_cls.today().isoformat()
            )

            category_id = (
                data.get("category_id")
                or None
            )

            wallet_id = (
                data.get("wallet_id")
                or None
            )

            currency = (
                data.get("currency")
                or "USD"
            ).strip().upper()

            rid = RecurringExpenseRepository.create(
                amount=amount,
                description=description,
                category_id=category_id,
                frequency=frequency,
                next_run=next_run,
                wallet_id=wallet_id,
                currency=currency,
            )

            return jsonify({
                "id": rid,
                "ok": True,
            }), 201

        except (KeyError, ValueError, TypeError) as exc:
            return jsonify({
                "error": str(exc)
            }), 400

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    @app.put("/api/recurring/<int:rid>")
    def update_recurring(rid: int):
        data = request.get_json(silent=True) or {}

        try:
            if "amount" in data:
                data["amount"] = float(
                    data["amount"]
                )

            if "category_id" in data:
                data["category_id"] = (
                    data["category_id"]
                    or None
                )

            if "wallet_id" in data:
                data["wallet_id"] = (
                    data["wallet_id"]
                    or None
                )

            if "currency" in data:
                data["currency"] = str(
                    data["currency"]
                ).strip().upper()

            if "active" in data:
                data["active"] = bool(
                    data["active"]
                )

            updated = (
                RecurringExpenseRepository.update(
                    rid,
                    **data,
                )
            )

            if not updated:
                return jsonify({
                    "error":
                        "Recurring expense not found"
                }), 404

            return jsonify({
                "ok": True
            })

        except (ValueError, TypeError) as exc:
            return jsonify({
                "error": str(exc)
            }), 400

        except Exception as exc:
            return jsonify({
                "error": str(exc)
            }), 500

    @app.delete("/api/recurring/<int:rid>")
    def delete_recurring(rid: int):
        if not RecurringExpenseRepository.delete(
            rid
        ):
            return jsonify({
                "error":
                    "Recurring expense not found"
            }), 404

        return jsonify({
            "ok": True
        })

    @app.post("/api/recurring/generate")
    def generate_recurring():
        generated = (
            RecurringExpenseRepository.generate_due()
        )

        return jsonify({
            "ok": True,
            "generated": generated,
        })

    return app


def main() -> None:
    """Run the development server."""

    app = create_app()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )


if __name__ == "__main__":
    main()