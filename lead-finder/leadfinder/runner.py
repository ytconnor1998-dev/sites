"""Runs searches in a background thread, so a run keeps going when the browser
tab is closed. One run at a time per app process."""

from __future__ import annotations

import asyncio
import logging
import threading
import time
from dataclasses import dataclass, field

from .config import Config
from .db import Database
from .pipeline import FatalRunError, Pipeline, Progress, RunOptions, RunSummary

log = logging.getLogger(__name__)


@dataclass
class ActiveRun:
    options: RunOptions
    started: float = field(default_factory=time.time)
    progress: Progress = field(default_factory=Progress)
    summary: RunSummary | None = None
    error: str | None = None
    stop_event: threading.Event = field(default_factory=threading.Event)
    thread: threading.Thread | None = None

    @property
    def running(self) -> bool:
        return self.thread is not None and self.thread.is_alive()

    def stop(self) -> None:
        self.stop_event.set()


class RunManager:
    def __init__(self):
        self._lock = threading.Lock()
        self.current: ActiveRun | None = None

    def start(self, cfg: Config, options: RunOptions) -> ActiveRun:
        with self._lock:
            if self.current and self.current.running:
                raise RuntimeError("A search is already running. Wait for it to finish or stop it first.")
            run = ActiveRun(options=options)
            run.progress.target = options.target
            run.thread = threading.Thread(target=self._work, args=(cfg, run), name="leadfinder-run", daemon=True)
            self.current = run
            run.thread.start()
            return run

    @staticmethod
    def _work(cfg: Config, run: ActiveRun) -> None:
        db = Database(cfg.db_url)  # own connection: this thread outlives the page that started it
        try:
            def on_progress(p: Progress) -> None:
                run.progress = p

            pipeline = Pipeline(cfg, db, on_progress=on_progress, should_stop=run.stop_event.is_set)
            run.summary = asyncio.run(pipeline.run_async(run.options))
            run.error = run.summary.error
        except FatalRunError as e:
            run.error = str(e)
        except Exception as e:  # never let the thread die silently
            log.exception("Background run crashed")
            run.error = f"{type(e).__name__}: {e}"
        finally:
            run.progress.done = True
            db.close()


manager = RunManager()
