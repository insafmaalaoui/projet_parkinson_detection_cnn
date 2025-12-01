"""Backfill script: populate cnn_prediction_num and cnn_confidence from legacy cnn_prediction strings.

Run from the `backend` folder in the venv:
    python scripts/backfill_cnn_predictions.py

It will parse strings like 'Malade:0.9559' and set cnn_prediction_num and cnn_confidence
for rows where those numeric fields are NULL.
"""
import sqlite3
import re
import os

DB = os.path.join(os.path.dirname(__file__), '..', 'medidiagnose.db')


def parse_prediction_field(s: str):
    """Return float value found in string s (after colon or any float inside), or None."""
    if s is None:
        return None
    s = str(s).strip()
    # look for pattern like ':0.9559'
    if ':' in s:
        try:
            part = s.split(':')[-1]
            return float(part)
        except Exception:
            pass
    # fallback: find first float in string
    m = re.search(r"([0-9]*\.[0-9]+|[0-9]+)", s)
    if m:
        try:
            return float(m.group(1))
        except Exception:
            return None
    return None


def main():
    db = os.path.abspath(DB)
    if not os.path.exists(db):
        print("Database file not found:", db)
        return

    con = sqlite3.connect(db)
    cur = con.cursor()

    # Select rows missing cnn_prediction_num or cnn_confidence
    cur.execute("SELECT id, cnn_prediction, cnn_prediction_num, cnn_confidence FROM medical_cases")
    rows = cur.fetchall()
    updated = 0
    for r in rows:
        case_id, pred_str, pred_num, conf = r
        if (pred_num is None or conf is None) and pred_str:
            val = parse_prediction_field(pred_str)
            if val is not None:
                # if cnn_prediction_num is null, set it
                try:
                    cur.execute(
                        "UPDATE medical_cases SET cnn_prediction_num = ?, cnn_confidence = ? WHERE id = ?",
                        (val, val if conf is None else conf, case_id),
                    )
                    updated += 1
                except Exception as e:
                    print("Failed to update case", case_id, e)
                    continue

    con.commit()
    con.close()
    print(f"Done. Rows scanned: {len(rows)}, updated: {updated}")


if __name__ == '__main__':
    main()
