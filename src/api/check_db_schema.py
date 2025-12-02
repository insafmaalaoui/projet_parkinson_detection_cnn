import sqlite3
import json
from pathlib import Path

DB = Path(__file__).resolve().parent / "medidiagnose.db"

def table_info(conn, table):
    cur = conn.execute(f"PRAGMA table_info('{table}')")
    rows = cur.fetchall()
    return [dict(cid=r[0], name=r[1], type=r[2], notnull=bool(r[3]), dflt_value=r[4], pk=bool(r[5])) for r in rows]

def main():
    if not DB.exists():
        print(f"ERROR: DB not found at {DB}")
        return
    conn = sqlite3.connect(str(DB))
    try:
        mc = table_info(conn, 'medical_cases')
    except Exception as e:
        print(f"ERROR reading medical_cases: {e}")
        mc = []
    try:
        ip = table_info(conn, 'info_patients')
    except Exception as e:
        print(f"ERROR reading info_patients: {e}")
        ip = []
    print('medical_cases schema:')
    print(json.dumps(mc, indent=2, ensure_ascii=False))
    print('\ninfo_patients schema:')
    print(json.dumps(ip, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
