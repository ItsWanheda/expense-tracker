"""Command-line interface built with Click + Rich."""
from __future__ import annotations

from .database import get_connection, initialize_database
import csv
import json
import shlex
from datetime import date as date_cls
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from .models import BudgetRepository, CategoryRepository, CurrencyRepository, Expense, ExpenseRepository, WalletRepository, RecurringExpenseRepository
from .reports import current_month, generate_monthly_report
from .visualization import render_bar_chart

console = Console()


@click.group()
@click.version_option(version="0.3.0")
def cli():
    """Expense Tracker — manage your daily expenses from the CLI."""


# ---------- Expense commands ----------

@cli.command()
@click.option("-a", "--amount", type=float, required=True)
@click.option("-d", "--description", required=True)
@click.option("-c", "--category", default=None)
@click.option("--date", default=None, help="YYYY-MM-DD (default: today)")
@click.option("--wallet", "wallet_id", type=int, default=1, show_default=True)
@click.option("--currency", default=None, help="ISO currency code (defaults to wallet currency)")
def add(amount: float, description: str, category: str | None, date: str | None, wallet_id: int, currency: str | None):
    """Add a new expense."""
    if amount <= 0:
        console.print("[red]Amount must be positive.[/red]")
        raise click.Abort()

    expense_date = date or date_cls.today().isoformat()
    wallet = WalletRepository.get(wallet_id)
    if not wallet:
        console.print(f"[red]Wallet #{wallet_id} not found.[/red]")
        raise click.Abort()
    currency = (currency or wallet["currency"]).upper()
    category_id = None
    if category:
        row = CategoryRepository.find_by_name(category)
        if not row:
            if click.confirm(
                f"Category '{category}' doesn't exist. Create it?", default=False
            ):
                category_id = CategoryRepository.create(category)
            else:
                console.print("[yellow]Saved without category.[/yellow]")
        else:
            category_id = row["id"]

    eid = ExpenseRepository.create(
        Expense(
            amount=amount,
            description=description,
            date=expense_date,
            category_id=category_id,
            wallet_id=wallet_id,
            currency=currency,
        )
    )
    console.print(
        f"[green]✓[/green] Expense #{eid} added: {amount:.2f} {currency} for {description}"
    )


@cli.command(name="list")
@click.option("--from", "start_date", default=None, help="Start date (YYYY-MM-DD)")
@click.option("--to", "end_date", default=None, help="End date (YYYY-MM-DD)")
@click.option("-c", "--category", default=None)
@click.option("-n", "--limit", default=20, show_default=True)
@click.option("--wallet", "wallet_id", type=int, default=None)
@click.option("--currency", default=None)
def list_cmd(start_date, end_date, category, limit, wallet_id, currency):
    """List recent expenses."""
    category_id = None
    if category:
        row = CategoryRepository.find_by_name(category)
        if not row:
            console.print(f"[red]Category '{category}' not found.[/red]")
            return
        category_id = row["id"]

    expenses = ExpenseRepository.list(
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        limit=limit,
        wallet_id=wallet_id,
        currency=currency,
    )
    if not expenses:
        console.print("[yellow]No expenses found.[/yellow]")
        return

    table = Table(title="Expenses", header_style="bold magenta")
    table.add_column("ID", justify="right")
    table.add_column("Date")
    table.add_column("Category")
    table.add_column("Amount", justify="right")
    table.add_column("Wallet")
    table.add_column("Description")

    for e in expenses:
        table.add_row(
            str(e.id),
            e.date,
            e.category_name or "[dim]—[/dim]",
            f"{e.amount:.2f} {e.currency}",
            e.wallet_name or "—",
            e.description,
        )
    console.print(table)


@cli.command()
@click.argument("expense_id", type=int)
def delete(expense_id: int):
    """Delete an expense by ID."""
    if ExpenseRepository.delete(expense_id):
        console.print(f"[green]✓[/green] Expense #{expense_id} deleted.")
    else:
        console.print(f"[red]Expense #{expense_id} not found.[/red]")


@cli.command()
@click.argument("expense_id", type=int)
@click.option("-a", "--amount", type=float, default=None)
@click.option("-d", "--description", default=None)
@click.option("-c", "--category", default=None)
@click.option("--date", default=None)
def edit(expense_id: int, amount, description, category, date):
    """Edit an existing expense."""
    if not ExpenseRepository.get(expense_id):
        console.print(f"[red]Expense #{expense_id} not found.[/red]")
        return

    updates: dict = {}
    if amount is not None:
        if amount <= 0:
            console.print("[red]Amount must be positive.[/red]")
            return
        updates["amount"] = amount
    if description is not None:
        updates["description"] = description
    if date is not None:
        updates["date"] = date
    if category is not None:
        row = CategoryRepository.find_by_name(category)
        if not row:
            console.print(f"[red]Category '{category}' not found.[/red]")
            return
        updates["category_id"] = row["id"]
    if not updates:
        console.print("[yellow]Nothing to update.[/yellow]")
        return

    ExpenseRepository.update(expense_id, **updates)
    console.print(f"[green]✓[/green] Expense #{expense_id} updated.")


# ---------- Category commands ----------

@cli.group()
def categories():
    """Manage categories."""


@categories.command(name="list")
def categories_list():
    rows = CategoryRepository.list_all()
    table = Table(title="Categories", header_style="bold cyan")
    table.add_column("ID", justify="right")
    table.add_column("Name")
    table.add_column("Color")
    for r in rows:
        table.add_row(str(r["id"]), r["name"], r["color"])
    console.print(table)


@categories.command(name="add")
@click.argument("name")
@click.option("--color", default="#3498db", show_default=True)
def categories_add(name: str, color: str):
    try:
        cid = CategoryRepository.create(name, color)
        console.print(f"[green]✓[/green] Category '{name}' created (#{cid}).")
    except Exception as exc:
        console.print(f"[red]Failed: {exc}[/red]")


@categories.command(name="delete")
@click.argument("category_id", type=int)
def categories_delete(category_id: int):
    CategoryRepository.delete(category_id)
    console.print(f"[green]✓[/green] Category #{category_id} deleted.")


# ---------- Reports ----------

@cli.command()
@click.option("-m", "--month", default=None, help="YYYY-MM (default: current)")
@click.option("--wallet", "wallet_id", type=int, default=None)
@click.option("--currency", default="USD", show_default=True)
def summary(month: str | None, wallet_id: int | None, currency: str):
    """Show a summary for the given month."""
    report = generate_monthly_report(month, wallet_id=wallet_id, currency=currency)

    console.rule(f"[bold]Summary — {report.month}[/bold]")
    console.print(
        f"Total: [bold]{report.total:.2f} {currency.upper()}[/bold] across {report.count} expenses"
    )
    if report.budget is not None:
        remaining = report.budget_remaining or 0
        style = "green" if remaining >= 0 else "red"
        console.print(
            f"Budget: {report.budget:.2f}  Remaining: [{style}]{remaining:.2f}[/{style}]"
        )

    if not report.by_category:
        console.print("[yellow]No expenses this month.[/yellow]")
        return

    table = Table(title="By Category", header_style="bold blue")
    table.add_column("Category")
    table.add_column("Count", justify="right")
    table.add_column("Total", justify="right")
    table.add_column("%", justify="right")
    for c in report.by_category:
        pct = (c.total / report.total * 100) if report.total else 0
        table.add_row(c.category, str(c.count), f"{c.total:.2f}", f"{pct:.1f}%")
    console.print(table)


@cli.command()
@click.option("-m", "--month", default=None)
@click.option("-o", "--output", default="expenses.png", show_default=True)
def chart(month: str | None, output: str):
    """Render a bar chart for the month."""
    report = generate_monthly_report(month)
    try:
        path = render_bar_chart(report, output)
        console.print(f"[green]✓[/green] Chart saved to {path}")
    except Exception as e:
        console.print(f"[red]{e}[/red]")


# ---------- Budget ----------

@cli.command()
@click.argument("amount", type=float)
@click.option("-m", "--month", default=None)
def budget(amount: float, month: str | None):
    """Set the overall monthly budget."""
    if amount < 0:
        console.print("[red]Budget must be >= 0.[/red]")
        return
    m = month or current_month()
    BudgetRepository.set_budget(m, amount)
    console.print(f"[green]✓[/green] Budget for {m}: {amount:.2f}")


# ---------- Export ----------

@cli.command()
@click.option("-o", "--output", default="expenses.csv", show_default=True)
@click.option("--from", "start_date", default=None)
@click.option("--to", "end_date", default=None)
def export(output: str, start_date: str | None, end_date: str | None):
    """Export expenses to CSV."""
    expenses = ExpenseRepository.list(
        start_date=start_date, end_date=end_date, limit=10_000
    )
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "date", "category", "wallet", "currency", "amount", "description"])
        for e in expenses:
            writer.writerow(
                [e.id, e.date, e.category_name or "", e.wallet_name or "", e.currency, e.amount, e.description]
            )
    console.print(f"[green]✓[/green] Exported {len(expenses)} rows to {output}")



# ---------- Wallets ----------
@cli.group()
def wallets():
    """Manage multiple expense wallets."""

@wallets.command(name="list")
def wallets_list():
    rows = WalletRepository.list_all()
    table = Table(title="Wallets", header_style="bold cyan")
    table.add_column("ID", justify="right"); table.add_column("Name"); table.add_column("Currency")
    for w in rows: table.add_row(str(w["id"]), w["name"], w["currency"])
    console.print(table)

@wallets.command(name="add")
@click.argument("name")
@click.option("--currency", default="USD", show_default=True)
def wallets_add(name, currency):
    try:
        wid = WalletRepository.create(name, currency)
        console.print(f"[green]✓[/green] Wallet '{name}' created (#{wid}, {currency.upper()}).")
    except Exception as exc: console.print(f"[red]Failed: {exc}[/red]")

@wallets.command(name="delete")
@click.argument("wallet_id", type=int)
def wallets_delete(wallet_id):
    try:
        WalletRepository.delete(wallet_id); console.print(f"[green]✓[/green] Wallet #{wallet_id} deleted.")
    except Exception as exc: console.print(f"[red]Failed: {exc}[/red]")


# ---------- Currency ----------
@cli.group()
def currency():
    """Manage currency conversion rates."""

@currency.command(name="rate")
@click.argument("base")
@click.argument("quote")
@click.argument("rate", type=float)
def currency_rate(base, quote, rate):
    CurrencyRepository.set_rate(base, quote, rate)
    console.print(f"[green]✓[/green] 1 {base.upper()} = {rate:g} {quote.upper()}")

@currency.command(name="show")
def currency_show():
    rows = CurrencyRepository.list_rates()
    for r in rows: console.print(f"1 {r['base_currency']} = {r['rate']:g} {r['quote_currency']}  [dim]{r['updated_at']}[/dim]")

@currency.command(name="convert")
@click.argument("amount", type=float)
@click.argument("base")
@click.argument("quote")
def currency_convert(amount, base, quote):
    try: console.print(f"{amount:g} {base.upper()} = [bold]{CurrencyRepository.convert(amount, base, quote):.2f} {quote.upper()}[/bold]")
    except ValueError as exc: console.print(f"[red]{exc}[/red]")


# ---------- JSON import/export ----------
@cli.command("export-json")
@click.option("-o", "--output", default="expenses.json", show_default=True)
def export_json(output):
    with get_connection() as conn:
        payload = {
            "format": "expense-tracker-json", "version": 1,
            "wallets": [dict(r) for r in conn.execute("SELECT * FROM wallets")],
            "categories": [dict(r) for r in conn.execute("SELECT * FROM categories")],
            "currency_rates": [dict(r) for r in conn.execute("SELECT * FROM currency_rates")],
            "expenses": [dict(r) for r in conn.execute("SELECT * FROM expenses")],
            "budgets": [dict(r) for r in conn.execute("SELECT * FROM budgets")],
            "recurring_expenses": [dict(r) for r in conn.execute("SELECT * FROM recurring_expenses")],
        }
    Path(output).write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    console.print(f"[green]✓[/green] Exported JSON snapshot to {output}")

@cli.command("import-json")
@click.argument("input_file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--replace", is_flag=True, help="Replace existing data before importing.")
def import_json(input_file, replace):
    payload = json.loads(input_file.read_text(encoding="utf-8"))
    if payload.get("format") != "expense-tracker-json": raise click.ClickException("Unsupported JSON format")
    with get_connection() as conn:
        if replace:
            for table in ("expenses", "budgets", "recurring_expenses", "currency_rates", "categories", "wallets"):
                conn.execute(f"DELETE FROM {table}")
        # IDs are preserved when present, making round-trips lossless.
        for table, rows in (("wallets", payload.get("wallets", [])), ("categories", payload.get("categories", [])), ("currency_rates", payload.get("currency_rates", [])), ("expenses", payload.get("expenses", [])), ("budgets", payload.get("budgets", [])), ("recurring_expenses", payload.get("recurring_expenses", []))):
            for row in rows:
                keys = list(row); vals = [row[k] for k in keys]
                conn.execute(f"INSERT OR REPLACE INTO {table} ({', '.join(keys)}) VALUES ({', '.join('?' for _ in keys)})", vals)
    console.print(f"[green]✓[/green] Imported JSON from {input_file}")


# ---------- Interactive REPL ----------
@cli.command()
def shell():
    """Start an interactive expense shell."""
    console.print("[bold cyan]expense shell[/bold cyan] — type 'help' or 'exit'.")
    while True:
        try: raw = click.prompt("expense", prompt_suffix="> ", default="", show_default=False)
        except (EOFError, KeyboardInterrupt): console.print(); break
        raw = raw.strip()
        if not raw: continue
        if raw.lower() in {"exit", "quit"}: break
        if raw.lower() in {"help", "?"}:
            console.print("Commands: add, list, edit, delete, summary, budget, wallets, currency, export, export-json, import-json, categories, chart, shell, exit")
            continue
        try:
            args = shlex.split(raw)
            cli.main(args=args, prog_name="expense", standalone_mode=False)
        except SystemExit: pass
        except Exception as exc: console.print(f"[red]{exc}[/red]")

def main():
    """CLI entry point — initializes the DB, then runs Click."""
    initialize_database()
    cli()


if __name__ == "__main__":
    main()