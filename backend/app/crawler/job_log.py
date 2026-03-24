"""Simple job run logging — records start/end/status for each background job."""

from datetime import datetime
from app.database import SessionLocal
from app import models


class JobLogger:
    def __init__(self, job: str):
        self.job = job
        self._run_id = None

    def start(self):
        db = SessionLocal()
        try:
            run = models.JobRun(job=self.job, started_at=datetime.utcnow(), status="running")
            db.add(run)
            db.commit()
            db.refresh(run)
            self._run_id = run.id
            print(f"[{self.job}] Job run #{run.id} started.")
        finally:
            db.close()

    def finish(self, records: int = None, notes: str = None):
        if not self._run_id:
            return
        db = SessionLocal()
        try:
            run = db.query(models.JobRun).filter(models.JobRun.id == self._run_id).first()
            if run:
                run.ended_at = datetime.utcnow()
                run.status = "completed"
                run.records_processed = records
                run.notes = notes
                db.commit()
        finally:
            db.close()

    def cancel(self):
        self._set_status("cancelled")

    def error(self, msg: str):
        self._set_status("error", notes=msg)

    def _set_status(self, status: str, notes: str = None):
        if not self._run_id:
            return
        db = SessionLocal()
        try:
            run = db.query(models.JobRun).filter(models.JobRun.id == self._run_id).first()
            if run:
                run.ended_at = datetime.utcnow()
                run.status = status
                run.notes = notes
                db.commit()
        finally:
            db.close()
