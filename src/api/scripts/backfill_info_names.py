"""Backfill script: populate first_name/last_name in info_patients from users table when NULL.

Run from the `backend` folder in the venv:
    python scripts/backfill_info_names.py

It will set info_patients.first_name/last_name = users.first_name/last_name when missing.
"""
import sqlite3
import os
import json

DB = os.path.join(os.path.dirname(__file__), '..', 'medidiagnose.db')


def main():
    db = os.path.abspath(DB)
    if not os.path.exists(db):
        print("Database file not found:", db)
        return

    con = sqlite3.connect(db)
    cur = con.cursor()

    # find info_patient rows where first_name or last_name is null or empty
    cur.execute("SELECT id, user_id, first_name, last_name FROM info_patients")
    rows = cur.fetchall()
    updated = 0
    for r in rows:
        info_id, user_id, fn, ln = r
        if (fn and fn.strip()) and (ln and ln.strip()):
            continue
        # lookup user
        cur.execute("SELECT first_name, last_name FROM users WHERE id = ?", (user_id,))
        user = cur.fetchone()
        if not user:
            continue
        ufn, uln = user
        new_fn = fn if (fn and fn.strip()) else (ufn or '')
        new_ln = ln if (ln and ln.strip()) else (uln or '')
        try:
            cur.execute(
                "UPDATE info_patients SET first_name = ?, last_name = ? WHERE id = ?",
                (new_fn, new_ln, info_id),
            )
            updated += 1
        except Exception as e:
            print("Failed to update", info_id, e)
            continue

    con.commit()
    con.close()
    print(f"Done. Rows scanned: {len(rows)}, updated: {updated}")


if __name__ == '__main__':
    main()
