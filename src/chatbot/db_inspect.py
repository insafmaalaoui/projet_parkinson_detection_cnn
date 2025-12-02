import sqlite3
from pathlib import Path
DB = Path(__file__).parent / "medidiagnose.db"
print("DB Path:", DB)
if not DB.exists():
    print("Database file not found")
    exit(1)

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# List tables
print('\nTables:')
for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table'"):
    print('-', row[0])

# Function to print schema and sample rows
def inspect_table(name):
    print(f"\n--- Schema for {name} ---")
    try:
        for r in cur.execute(f"PRAGMA table_info({name})"):
            print(r)
    except Exception as e:
        print('Error reading schema:', e)
    print(f"\n--- Sample rows for {name} (up to 5) ---")
    try:
        for r in cur.execute(f"SELECT * FROM {name} LIMIT 5"):
            print(dict(r))
    except Exception as e:
        print('Error reading rows:', e)

# Inspect users and info_patients if present
inspect_table('users')
inspect_table('info_patients')

# Counts
print('\nCounts:')
for t in ['users','info_patients']:
    try:
        c = cur.execute(f"SELECT COUNT(*) as cnt FROM {t}").fetchone()['cnt']
        print(f"{t}: {c}")
    except Exception as e:
        print(f"Error counting {t}: {e}")

# Test join
print('\n--- Join sample (info_patients LEFT JOIN users) ---')
try:
    rows = cur.execute('''SELECT ip.id as ip_id, ip.user_id as ip_user_id, u.id as u_id, u.first_name as first_name, u.last_name as last_name, u.date_of_birth as date_of_birth
                           FROM info_patients ip LEFT JOIN users u ON ip.user_id = u.id LIMIT 10''').fetchall()
    for r in rows:
        print(dict(r))
except Exception as e:
    print('Join error:', e)

conn.close()
print('\nDone')
