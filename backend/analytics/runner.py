"""
analytics/runner.py
─────────────────────────────
Orchestrateur de la pipeline analytics post-simulation.
"""
import importlib
import logging
import sys
import threading
import traceback
from datetime import datetime, timezone

log = logging.getLogger("sumo_api")

# ── Pipeline — ordre d'exécution ─────────────────────────────
PIPELINE = [
    ("compute_features", "analytics.compute_features"),
    ("kmeans",           "analytics.kmeans"),
    ("dbscan",           "analytics.dbscan"),
    ("hdbscan",          "analytics.hdbscan"),
    ("spectral",         "analytics.spectral"),
    ("st_dbscan",        "analytics.st_dbscan"),
    ("traclus",          "analytics.traclus"),
]


# ── Helpers Mongo ─────────────────────────────────────────────
def _now():
    return datetime.now(timezone.utc)


def _set_global_status(col_runs, run_id: str, status: str):
    if col_runs is None:
        return
    col_runs.update_one(
        {"_id": run_id},
        {"$set": {"analysis_status": status}},
    )


def _set_step_status(col_runs, run_id: str, step: str, status: str,
                     started_at=None, finished_at=None, error=None, traceback=None):
    if col_runs is None:
        return
    update = {f"analysis_steps.{step}.status": status}
    if started_at is not None:
        update[f"analysis_steps.{step}.started_at"] = started_at
    if finished_at is not None:
        update[f"analysis_steps.{step}.finished_at"] = finished_at
    if error is not None:
        update[f"analysis_steps.{step}.error"] = error
    if traceback is not None:
        update[f"analysis_steps.{step}.traceback"] = traceback
    col_runs.update_one({"_id": run_id}, {"$set": update})

def run_pipeline(run_id: str, col_runs=None):
    log.info(f"[analytics] Pipeline démarrée pour run_id={run_id}")
    _set_global_status(col_runs, run_id, "running")

    had_failure = False

    for step_name, module_path in PIPELINE:
        _set_step_status(col_runs, run_id, step_name, "running", started_at=_now())
        try:
            # Rechargement forcé pour éviter les NameError liés au cache d'importation
            if module_path in sys.modules:
                mod = importlib.reload(sys.modules[module_path])
            else:
                mod = importlib.import_module(module_path)

            if hasattr(mod, "main"):
                try:
                    mod.main(run_id)
                except TypeError:
                    mod.RUN_ID = run_id
                    mod.main()
            else:
                raise AttributeError(f"{module_path} n'expose pas de fonction main()")

            _set_step_status(col_runs, run_id, step_name, "done", finished_at=_now())
            log.info(f"[analytics] ✓ {step_name}")

        except Exception as exc:
            had_failure = True
            tb = traceback.format_exc()
            log.error(f"[analytics] ✗ {step_name} : {exc}\n{tb}")
            _set_step_status(
                col_runs,
                run_id,
                step_name,
                "failed",
                finished_at=_now(),
                error=str(exc),
                traceback=tb,
            )

    _set_global_status(col_runs, run_id, "failed" if had_failure else "done")
    if col_runs is not None:
        col_runs.update_one(
            {"_id": run_id},
            {"$set": {"analysis_finished_at": _now()}}
        )

    log.info(f"[analytics] Pipeline terminée pour run_id={run_id}")


def launch_in_background(run_id: str, col_runs=None):
    t = threading.Thread(
        target=run_pipeline,
        args=(run_id, col_runs),
        daemon=True,
        name=f"analytics-{run_id}",
    )
    t.start()
    log.info(f"[analytics] Thread analytics lancé : analytics-{run_id}")
    return t


if __name__ == "__main__":
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    from db import col_runs, MONGO_AVAILABLE

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

    if len(sys.argv) < 2:
        print("Usage: python -m analytics.runner <run_id>")
        sys.exit(1)

    _run_id = sys.argv[1]
    run_pipeline(_run_id, col_runs if MONGO_AVAILABLE else None)