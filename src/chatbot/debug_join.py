import sqlite3
from pathlib import Path
DB = Path(__file__).parent / "medidiagnose.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# get latest patient
row = cur.execute("SELECT * FROM info_patients ORDER BY created_at DESC LIMIT 1").fetchone()
print('Latest patient row:')
print(dict(row) if row else 'None')
if not row:
    conn.close()
    exit(0)

patient_id = row['id']
print('\npatient_id=', patient_id)

# run join
query = "SELECT ip.*, u.first_name AS first_name, u.last_name AS last_name, ip.date_of_birth AS date_of_birth, u.id AS user_id FROM info_patients ip LEFT JOIN users u ON ip.user_id = u.id WHERE ip.id = ? LIMIT 1"
print('\nRunning join query:')
print(query)
res = cur.execute(query, (patient_id,)).fetchone()
print('\nResult:')
print(dict(res) if res else 'No result')
conn.close()
