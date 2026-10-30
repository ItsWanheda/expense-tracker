from expense_tracker.localization import (
    locale_options,
    normalize_locale,
    translate,
)


def test_locale_normalization_and_fallback():
    assert normalize_locale("fa-IR") == "fa"
    assert normalize_locale("FA_ir") == "fa"
    assert normalize_locale("de-DE") == "en"
    assert translate("fa", "dashboard") == "داشبورد"
    assert translate("fa", "unknown_key") == "unknown_key"
    assert {item["code"] for item in locale_options()} == {"en", "fa"}
