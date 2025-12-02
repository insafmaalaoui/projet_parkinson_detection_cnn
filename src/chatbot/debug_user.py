import sqlite3
from pathlib import Path
DB = Path(__file__).parent / "medidiagnose.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
uid='ab0ff869-5c75-4f03-a74e-ce7aed01f6bb'
print('Looking for user id', uid)
row = cur.execute('SELECT * FROM users WHERE id=?',(uid,)).fetchone()
print(row and dict(row) or 'Not found')
conn.close()
