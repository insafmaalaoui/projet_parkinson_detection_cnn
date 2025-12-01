"""Normalize `date_of_birth` values in `info_patients` by parsing string dates
and saving Python `datetime` objects via SQLAlchemy so future commits don't fail.
Run from `backend` folder: `python scripts/fix_info_dates.py`.
"""
from datetime import datetime
from pathlib import Path
import sys

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE))

from database import SessionLocal, init_db
import models


def parse_date(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    # try ISO formats
    try:
        return datetime.fromisoformat(s)
    except Exception:
        pass
    # try YYYY-MM-DD
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except Exception:
        return None


def main():
    init_db()
    db = SessionLocal()
    infos = db.query(models.InfoPatient).all()
    updated = 0
    for info in infos:
        dob = getattr(info, 'date_of_birth', None)
        if dob is None:
            continue
        if isinstance(dob, str):
            parsed = parse_date(dob)
            if parsed:
                print(f"Updating {info.id}: {dob} -> {parsed}")
                info.date_of_birth = parsed
                db.add(info)
                updated += 1
            else:
                print(f"Could not parse date_of_birth for {info.id}: {dob}")

    if updated:
        db.commit()
    db.close()
    print(f"Done. Rows updated: {updated}")


if __name__ == '__main__':
    main()
