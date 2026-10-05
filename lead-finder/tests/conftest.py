import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
FIXTURES = Path(__file__).parent / "fixtures"


def fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


@pytest.fixture
def cfg(tmp_path):
    from leadfinder.config import load_config

    c = load_config(env_file=tmp_path / "missing.env")
    c.google_api_key = "test-key"
    c.pagespeed_api_key = "test-key"
    c.settings["database"] = str(tmp_path / "leads.db")
    c.settings["export_dir"] = str(tmp_path / "exports")
    c.settings["http"]["per_host_delay_s"] = 0
    c.settings["http"]["backoff_s"] = 0
    c.settings["google"]["requests_per_second"] = 1000
    return c
