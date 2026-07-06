"""Flask web server exposing a JSON API for the expense tracker."""
from __future__ import annotations

import csv
import io
from datetime import date as date_cls

from flask import Flask, Response, jsonify, render_template, request

from .database import initialize_database
from .models import BudgetRepository, CategoryRepository, Expense, ExpenseRepository
from .reports import current_month, generate_monthly_report


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )
    initialize_database()

    # ---------- Frontend ----------
    @app.route("/")
    def index():
        return render_template("index.html")

    # ---------- Categories ----------
    @app.get("/api/categories")
    def list_categories():
        rows = CategoryRepository.list_all()
        return jsonify([dict(r) for r in rows])

    @app.post("/api/categories")
    def create_category():
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        color = data.get("color") or "#3498db"
        if not name:
            return jsonify({"error": "Name is required"}), 400
        try:
            cid = CategoryRepository.create(name, color)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify({"id": cid, "name": name, "color": color}), 201

    @app.delete("/api/categories/<int:cid>")
    def delete_category(cid: int):
        CategoryRepository.delete(cid)
        return jsonify({"ok": True})

    # ---------- Expenses ----------
    @app.get("/api/expenses")
    def list_expenses():
        expenses = ExpenseRepository.list(
            start_date=request.args.get("from"),
            end_date=request.args.get("to"),
            category_id=request.args.get("category_id", type=int),
            q=request.args.get("q"),
            limit=request.args.get("limit", default=500, type=int),
        )
        return jsonify([e.to_dict() for e in expenses])

    @app.post("/api/expenses")
    def create_expense():
        data = request.get_json(silent=True) or {}
        try:
            amount = float(data["amount"])
            description = (data.get("description") or "").strip()
            if amount <= 0:
                raise ValueError("amount must be positive")
            if not description:
                raise ValueError("description is required")
            exp_date = data.get("date") or date_cls.today().isoformat()
            category_id = data.get("category_id") or None
            eid = ExpenseRepository.create(
                Expense(
                    amount=amount,
                    description=description,
                    date=exp_date,
                    category_id=category_id,
                )
            )
            return jsonify({"id": eid}), 201
        except (KeyError, ValueError, TypeError) as exc:
            return jsonify({"error": str(exc)}), 400

    @app.put("/api/expenses/<int:eid>")
    def update_expense(eid: int):
        data = request.get_json(silent=True) or {}
        updates: dict = {}
        if "amount" in data:
            try:
                amt = float(data["amount"])
                if amt <= 0:
                    raise ValueError("amount must be positive")
                updates["amount"] = amt
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
        if "description" in data:
            updates["description"] = data["description"]
        if "date" in data:
            updates["date"] = data["date"]
        if "category_id" in data:
            updates["category_id"] = data["category_id"]
        if not updates:
            return jsonify({"error": "Nothing to update"}), 400
        if not ExpenseRepository.update(eid, **updates):
            return jsonify({"error": "Expense not found"}), 404
        return jsonify({"ok": True})

    @app.delete("/api/expenses/<int:eid>")
    def delete_expense(eid: int):
        if not ExpenseRepository.delete(eid):
            return jsonify({"error": "Expense not found"}), 404
        return jsonify({"ok": True})

    # ---------- Reports ----------
    @app.get("/api/reports/summary")
    def report_summary():
        month = request.args.get("month") or current_month()
        report = generate_monthly_report(month)
        return jsonify(
            {
                "month": report.month,
                "total": report.total,
                "count": report.count,
                "budget": report.budget,
                "budget_remaining": report.budget_remaining,
                "by_category": [
                    {"category": c.category, "total": c.total, "count": c.count}
                    for c in report.by_category
                ],
            }
        )
    # ---------- Heatmap ----------
    @app.get("/api/reports/heatmap")
    def report_heatmap():
        """
        Return all expenses for a given calendar year (for the dashboard heatmap).
        """

        year = int(request.args.get("year", date_cls.today().year))

        expenses = ExpenseRepository.list(
            start_date=f"{year}-01-01",
            end_date=f"{year}-12-31",
            limit=10_000,
        )

        return jsonify(
            {
                "year": year,
                "expenses": [e.to_dict() for e in expenses],
            }
        )
    # ---------- Budget ----------
    @app.get("/api/budget")
    def get_budget():
        month = request.args.get("month") or current_month()
        return jsonify(
            {"month": month, "amount": BudgetRepository.get_budget(month)}
        )

    @app.put("/api/budget")
    def set_budget():
        data = request.get_json(silent=True) or {}
        try:
            amount = float(data["amount"])
            if amount < 0:
                raise ValueError("amount must be >= 0")
            month = data.get("month") or current_month()
            BudgetRepository.set_budget(month, amount)
            return jsonify({"ok": True, "month": month, "amount": amount})
        except (KeyError, ValueError, TypeError) as exc:
            return jsonify({"error": str(exc)}), 400

    # ---------- Export ----------
    @app.get("/api/export.csv")
    def export_csv():
        expenses = ExpenseRepository.list(
            start_date=request.args.get("from"),
            end_date=request.args.get("to"),
            limit=10_000,
        )
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["id", "date", "category", "amount", "description"])
        for e in expenses:
            writer.writerow(
                [e.id, e.date, e.category_name or "", e.amount, e.description]
            )
        return Response(
            buf.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=expenses.csv"},
        )

    # ---------- Health check ----------
    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    return app


def main() -> None:
    """Run the development server."""
    app = create_app()
    app.run(host="127.0.0.1", port=5000, debug=True)


if __name__ == "__main__":
    main()