"""Shared pytest fixtures.

Note: 'src' is added to sys.path automatically via
[tool.pytest.ini_options] pythonpath in pyproject.toml,
so no manual sys.path manipulation is needed here.
"""
from pathlib import Path

import pytest

from expense_tracker import database


@pytest.fixture
def tmp_db(monkeypatch, tmp_path: Path):
    """Provide an isolated, initialized SQLite database for each test."""
    db_file = tmp_path / "test.db"
    monkeypatch.setattr(database, "get_db_path", lambda: db_file)
    database.initialize_database(db_file)
    yield db_file