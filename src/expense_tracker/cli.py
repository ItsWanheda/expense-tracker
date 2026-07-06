"""Command-line interface built with Click + Rich."""
from __future__ import annotations

from .database import initialize_database
import csv
from datetime import date as date_cls
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from .models import BudgetRepository, CategoryRepository, Expense, ExpenseRepository
from .reports import current_month, generate_monthly_report
from .visualization import render_bar_chart

console = Console()


@click.group()
@click.version_option(version="0.2.0")
def cli():
    """Expense Tracker — manage your daily expenses from the CLI."""


# ---------- Expense commands ----------

@cli.command()
@click.option("-a", "--amount", type=float, required=True)
@click.option("-d", "--description", required=True)
@click.option("-c", "--category", default=None)
@click.option("--date", default=None, help="YYYY-MM-DD (default: today)")
def add(amount: float, description: str, category: str | None, date: str | None):
    """Add a new expense."""
    if amount <= 0:
        console.print("[red]Amount must be positive.[/red]")
        raise click.Abort()

    expense_date = date or date_cls.today().isoformat()
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
        )
    )
    console.print(
        f"[green]✓[/green] Expense #{eid} added: {amount:.2f} for {description}"
    )


@cli.command(name="list")
@click.option("--from", "start_date", default=None, help="Start date (YYYY-MM-DD)")
@click.option("--to", "end_date", default=None, help="End date (YYYY-MM-DD)")
@click.option("-c", "--category", default=None)
@click.option("-n", "--limit", default=20, show_default=True)
def list_cmd(start_date, end_date, category, limit):
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
    )
    if not expenses:
        console.print("[yellow]No expenses found.[/yellow]")
        return

    table = Table(title="Expenses", header_style="bold magenta")
    table.add_column("ID", justify="right")
    table.add_column("Date")
    table.add_column("Category")
    table.add_column("Amount", justify="right")
    table.add_column("Description")

    for e in expenses:
        table.add_row(
            str(e.id),
            e.date,
            e.category_name or "[dim]—[/dim]",
            f"{e.amount:.2f}",
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
def summary(month: str | None):
    """Show a summary for the given month."""
    report = generate_monthly_report(month)

    console.rule(f"[bold]Summary — {report.month}[/bold]")
    console.print(
        f"Total: [bold]{report.total:.2f}[/bold] across {report.count} expenses"
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
        writer.writerow(["id", "date", "category", "amount", "description"])
        for e in expenses:
            writer.writerow(
                [e.id, e.date, e.category_name or "", e.amount, e.description]
            )
    console.print(f"[green]✓[/green] Exported {len(expenses)} rows to {output}")


def main():
    """CLI entry point — initializes the DB, then runs Click."""
    initialize_database()
    cli()


if __name__ == "__main__":
    main()