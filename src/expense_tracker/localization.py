"""Dependency-free translation catalog for supported interface languages."""
from __future__ import annotations

from typing import Final

SUPPORTED_LOCALES: Final[dict[str, str]] = {
    "en": "English",
    "fa": "فارسی",
}

_TRANSLATIONS: Final[dict[str, dict[str, str]]] = {
    "en": {
        "dashboard": "Dashboard",
        "expenses": "Expenses",
        "categories": "Categories",
        "reports": "Reports",
        "budget": "Budget",
        "recurring": "Recurring",
        "advanced_charts": "Advanced Charts",
        "wallets_currency": "Wallets & Currency",
        "tags": "Tags",
        "analytics": "Analytics",
        "notifications": "Notifications",
        "language": "Language",
        "month": "Month",
        "refresh": "Refresh",
        "amount": "Amount",
        "description": "Description",
        "date": "Date",
        "wallet": "Wallet",
        "currency": "Currency",
        "category": "Category",
        "new_expense": "New Expense",
        "edit_expense": "Edit Expense",
        "save": "Save",
        "cancel": "Cancel",
        "edit": "Edit",
        "delete": "Delete",
        "no_expenses": "No expenses yet",
        "no_expenses_help": "Add your first expense to get started.",
        "mark_all_read": "Mark all read",
        "no_notifications": "You're all caught up.",
        "add_tag": "Add tag",
        "tag_name": "Tag name",
        "color": "Color",
        "average_transaction": "Average transaction",
        "median_transaction": "Median transaction",
        "largest_expense": "Largest expense",
        "projected_month_total": "Projected month total",
        "budget_utilization": "Budget utilization",
        "spending_by_weekday": "Spending by weekday",
        "spending_by_category": "Spending by category",
        "spending_by_tag": "Spending by tag",
        "spending_by_wallet": "Spending by wallet",
    },
    "fa": {
        "dashboard": "داشبورد",
        "expenses": "هزینه‌ها",
        "categories": "دسته‌بندی‌ها",
        "reports": "گزارش‌ها",
        "budget": "بودجه",
        "recurring": "هزینه‌های تکرارشونده",
        "advanced_charts": "نمودارهای پیشرفته",
        "wallets_currency": "کیف پول و ارز",
        "tags": "برچسب‌ها",
        "analytics": "تحلیل پیشرفته",
        "notifications": "اعلان‌ها",
        "language": "زبان",
        "month": "ماه",
        "refresh": "بروزرسانی",
        "amount": "مبلغ",
        "description": "توضیحات",
        "date": "تاریخ",
        "wallet": "کیف پول",
        "currency": "ارز",
        "category": "دسته‌بندی",
        "new_expense": "هزینه جدید",
        "edit_expense": "ویرایش هزینه",
        "save": "ذخیره",
        "cancel": "لغو",
        "edit": "ویرایش",
        "delete": "حذف",
        "no_expenses": "هنوز هزینه‌ای ثبت نشده است",
        "no_expenses_help": "برای شروع، اولین هزینه خود را ثبت کنید.",
        "mark_all_read": "همه را خوانده‌شده علامت بزن",
        "no_notifications": "اعلان خوانده‌نشده‌ای ندارید.",
        "add_tag": "افزودن برچسب",
        "tag_name": "نام برچسب",
        "color": "رنگ",
        "average_transaction": "میانگین هر تراکنش",
        "median_transaction": "میانه تراکنش‌ها",
        "largest_expense": "بزرگ‌ترین هزینه",
        "projected_month_total": "هزینه پیش‌بینی‌شده ماه",
        "budget_utilization": "درصد مصرف بودجه",
        "spending_by_weekday": "هزینه بر اساس روز هفته",
        "spending_by_category": "هزینه بر اساس دسته‌بندی",
        "spending_by_tag": "هزینه بر اساس برچسب",
        "spending_by_wallet": "هزینه بر اساس کیف پول",
    },
}


def normalize_locale(locale: str | None) -> str:
    """Return a supported base locale, falling back safely to English."""
    if not locale:
        return "en"
    normalized = locale.strip().lower().replace("_", "-").split("-", 1)[0]
    return normalized if normalized in SUPPORTED_LOCALES else "en"


def translate(locale: str | None, key: str) -> str:
    """Translate a key, falling back to English and then the key itself."""
    language = normalize_locale(locale)
    return _TRANSLATIONS[language].get(
        key,
        _TRANSLATIONS["en"].get(key, key),
    )


def locale_options() -> list[dict[str, str]]:
    """Return locale choices for the client settings menu."""
    return [
        {"code": code, "name": name}
        for code, name in SUPPORTED_LOCALES.items()
    ]
