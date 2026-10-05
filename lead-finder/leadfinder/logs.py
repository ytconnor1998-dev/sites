"""Logging to logs/leadfinder.log (everything) and the console (warnings and errors)."""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from .config import ROOT


def setup_logging(verbose: bool = False, console: bool = True) -> Path:
    log_dir = ROOT / "logs"
    log_dir.mkdir(exist_ok=True)
    path = log_dir / "leadfinder.log"
    root = logging.getLogger()
    if getattr(root, "_leadfinder_configured", False):
        return path
    root.setLevel(logging.DEBUG if verbose else logging.INFO)
    fh = RotatingFileHandler(path, maxBytes=5_000_000, backupCount=3, encoding="utf-8")
    fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)-7s %(name)s: %(message)s"))
    root.addHandler(fh)
    if console:
        from rich.logging import RichHandler

        ch = RichHandler(show_path=False, rich_tracebacks=False, markup=False)
        ch.setLevel(logging.INFO if verbose else logging.WARNING)
        root.addHandler(ch)
    for noisy in ("httpx", "httpcore", "charset_normalizer", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    root._leadfinder_configured = True  # type: ignore[attr-defined]
    return path
