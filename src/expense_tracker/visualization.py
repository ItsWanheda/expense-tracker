"""Generate charts for monthly reports."""
from __future__ import annotations

from pathlib import Path

from .reports import MonthlyReport


def render_bar_chart(
    report: MonthlyReport, output: Path | str = "expenses.png"
) -> Path:
    """Render a horizontal bar chart and return the file path."""
    try:
        import matplotlib.pyplot as plt
    except ImportError as e:
        raise RuntimeError(
            "matplotlib is required. Install with: pip install matplotlib"
        ) from e

    if not report.by_category:
        raise ValueError("No expenses to plot.")

    labels = [c.category for c in report.by_category]
    values = [c.total for c in report.by_category]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.barh(labels, values, color="#3498db")
    ax.set_xlabel("Amount")
    ax.set_title(f"Expenses by Category — {report.month}")
    ax.invert_yaxis()

    for bar, v in zip(bars, values):
        ax.text(v, bar.get_y() + bar.get_height() / 2, f" {v:.2f}", va="center")

    plt.tight_layout()
    out = Path(output)
    plt.savefig(out, dpi=120)
    plt.close(fig)
    return out