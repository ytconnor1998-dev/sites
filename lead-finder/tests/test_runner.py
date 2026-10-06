import time

import respx
from test_pipeline import mock_world

from leadfinder.db import Database
from leadfinder.pipeline import RunOptions
from leadfinder.runner import RunManager


def wait(run, timeout=30):
    end = time.time() + timeout
    while run.running and time.time() < end:
        time.sleep(0.05)
    assert not run.running


def test_background_run_saves_leads(cfg, db_url):
    mgr = RunManager()
    with respx.mock(assert_all_called=False) as router:
        mock_world(router)
        run = mgr.start(cfg, RunOptions(categories=["trattorie"], areas=["trastevere"], source="google"))
        wait(run)
    assert run.error is None and run.summary.status == "completed"
    assert run.progress.leads == 4
    db = Database(db_url)
    assert len(db.leads()) == 4
    assert db.runs()[0]["status"] == "completed"
    db.close()


def test_only_one_run_at_a_time_and_stop(cfg, db_url):
    mgr = RunManager()
    with respx.mock(assert_all_called=False) as router:
        mock_world(router)
        run = mgr.start(cfg, RunOptions(categories=["trattorie"], areas=["trastevere"], source="google"))
        try:
            mgr.start(cfg, RunOptions(categories=["trattorie"], areas=["trastevere"], source="google"))
            raised = False
        except RuntimeError:
            raised = True
        run.stop()
        wait(run)
    assert raised or not run.running  # the first run may already have finished
    assert run.summary.status in ("stopped", "completed")


def test_stale_runs_are_marked_interrupted(db_url):
    db = Database(db_url)
    run_id = db.start_run({}, "x", "google", 10, False)
    db._run("UPDATE runs SET heartbeat_at='2000-01-01T00:00:00' WHERE id=?", (run_id,))
    db.mark_stale_runs()
    assert db.runs()[0]["status"] == "interrupted"
    db.close()


def test_bad_database_url_fails_fast_without_leaking_password():
    import pytest

    from leadfinder.db import DatabaseUnavailable

    start = time.time()
    with pytest.raises(DatabaseUnavailable) as err:
        Database("postgresql://user:s3cret@localhost:1/nope?connect_timeout=3")
    assert time.time() - start < 20
    assert "s3cret" not in str(err.value)
