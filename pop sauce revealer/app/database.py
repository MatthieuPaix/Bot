import sqlite3
from pathlib import Path
from app.config import Config

class DatabaseConnection:
    def __init__(self, db_path: Path):
        self.db_path = db_path

    def __enter__(self):
        self.connection = sqlite3.connect(self.db_path)
        return self.connection.cursor()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.connection.commit()
        self.connection.close()

class DatabaseOperations:
    def __init__(self, config: Config):
        self.config = config
            
    def insert_data(self, table, key, value, short, time, owner):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            cursor.execute("INSERT OR REPLACE INTO ? (key, value, short, time,  owner) VALUES (?, ?, ?, ?, ?)", (table, key, value, short, time, owner))

    def key_exists(self, table , key ) -> bool:
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            cursor.execute("SELECT key FROM ? WHERE key=?", (table, key,))
            return cursor.fetchone() is not None

    def get_value_by_key(self, table, key):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            return cursor.execute("SELECT value, short FROM ? WHERE key=?", (table, key,)).fetchone()

    def update_short(self, table , key , short ):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            return cursor.execute("UPDATE ? SET short = ? WHERE key = ?", (table, short, key ))            

    def update_time(self, table , key , time , owner ):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            return cursor.execute("UPDATE ? SET time = ?,owner = ?  WHERE key = ?", (table, time, owner, key ))  