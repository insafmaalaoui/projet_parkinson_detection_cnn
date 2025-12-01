"""Migration helper: add new columns for predictions and extended InfoPatient fields.

Run: python migrate_add_columns.py

This script will check existing tables and add missing columns using SQLite ALTER TABLE.
It is safe to run multiple times.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "medidiagnose.db")

def column_exists(conn, table, column):
    cur = conn.execute(f"PRAGMA table_info({table})")
    cols = [r[1] for r in cur.fetchall()]
    return column in cols

def add_column(conn, table, column_def):
    print(f"Adding column: {column_def} to {table}")
    conn.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
    conn.commit()

def main():
    if not os.path.exists(DB_PATH):
        print("Database not found at", DB_PATH)
        return
    conn = sqlite3.connect(DB_PATH)

    # medical_cases additions
    tbl = 'medical_cases'
    if not column_exists(conn, tbl, 'cnn_prediction_num'):
        add_column(conn, tbl, 'cnn_prediction_num REAL')
    else:
        print('cnn_prediction_num already exists')

    if not column_exists(conn, tbl, 'cnn_confidence'):
        add_column(conn, tbl, 'cnn_confidence REAL')
    else:
        print('cnn_confidence already exists')

    if not column_exists(conn, tbl, 'report_pdf'):
        add_column(conn, tbl, 'report_pdf TEXT')
    else:
        print('report_pdf already exists')

    # info_patients additions (many fields)
    tbl2 = 'info_patients'
    info_cols = {
        'first_name': 'TEXT', 'last_name': 'TEXT', 'date_of_birth': 'TEXT', 'age': 'INTEGER', 'gender': 'TEXT',
        'autres_maladies': 'INTEGER', 'details_autres_maladies': 'TEXT',
        'tremblements': 'INTEGER', 'rigidite': 'INTEGER', 'bradykinesie': 'INTEGER', 'difficulte_marche': 'INTEGER',
        'instabilite': 'INTEGER', 'expression_faciale_reduite': 'INTEGER', 'micrographie': 'INTEGER',
        'fatigue': 'INTEGER', 'troubles_sommeil': 'INTEGER', 'troubles_cognitifs': 'INTEGER', 'depression_anxiete': 'INTEGER',
        'perte_odorat': 'INTEGER', 'constipation': 'INTEGER', 'problemes_urinaires': 'INTEGER', 'douleurs': 'INTEGER',
        'observations': 'TEXT'
    }

    for col, typ in info_cols.items():
        if not column_exists(conn, tbl2, col):
            add_column(conn, tbl2, f"{col} {typ}")
        else:
            print(f"{col} already exists")

    conn.close()
    print("Migration completed.")

if __name__ == '__main__':
    main()
