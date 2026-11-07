import sqlite3

conn = sqlite3.connect("studysprint.db")

conn.execute("""
    ALTER TABLE tasks
    ADD COLUMN due_date DATE
""")

conn.commit()
conn.close()

print("Database updated successfully!")