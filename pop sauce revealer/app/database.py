import sqlite3
import os
from pathlib import Path
from app.config import Config
from datetime import datetime


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

    def log_query(self, query: str):
        now = datetime.now()
        log_dir = Path("../logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / f"{now.strftime('%Y-%m-%d')}.txt"
        with log_path.open("a") as f:
            f.write(f"{now.strftime('%Y-%m-%d %H:%M:%S')} : {query}\n")

    def insert_data(self, table, key, value, short, time, owner):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            if time == 15 : time = "NULL"
            if time == None : time = "NULL"
            if short == None : short = "'+NULL+'"
            if owner == None : owner = "'+NULL+'"
            query = f"INSERT OR REPLACE INTO {table} (key, value, short, time, owner) VALUES ('{key}','{value}','{short}',{time},'{owner}')"
            now = datetime.now()
            path = "../"+ str(now.year) + "-" + str(now.month) + "-" + str(now.day) + ".txt"
            f = open(path, "a")
            f.write(str(now.hour) + ":" + str(now.minute)+ ":" + str(now.second) + "  NEW DATA : " +query + '\n')
            f.close()
            cursor.execute(f"INSERT OR REPLACE INTO {table} (key, value, short, time, owner) VALUES ('{key}','{value}','{short}',{time},'{owner}')",())


    def key_exists(self, table, key) -> bool:
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            cursor.execute(f"SELECT key FROM {table} WHERE key='{key}'", ())
            return cursor.fetchone() is not None

    def get_value_by_key(self, table, key):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            cursor.execute(f"SELECT value, short, time, owner FROM {table} WHERE key='{key}'", ())
            return cursor.fetchone()

    def update_short(self, table, key, short):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            query = f"UPDATE {table} SET short='{short}' WHERE key='{key}'"
            now = datetime.now()
            path = "../"+ str(now.year) + "-" + str(now.month) + "-" + str(now.day) + ".txt"
            f = open(path, "a")
            f.write(str(now.hour) + ":" + str(now.minute)+ ":" + str(now.second) + "  UPDATE SHORT : " +query + '\n')
            f.close()
            cursor.execute(f"UPDATE {table} SET short='{short}' WHERE key='{key}'", ())

    def update_time(self, table, key, time, owner):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            query = f"UPDATE {table} SET time={time}, owner='{owner}' WHERE key='{key}'"
            now = datetime.now()
            path = "../"+ str(now.year) + "-" + str(now.month) + "-" + str(now.day) + ".txt"
            f = open(path, "a")
            f.write(str(now.hour) + ":" + str(now.minute)+ ":" + str(now.second) + "  UPDATE TIME : " +query + '\n')
            f.close()
            cursor.execute(f"UPDATE {table} SET time={time}, owner='{owner}' WHERE key='{key}'", ())

    def update_time_short(self, table, key, short, time, owner):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            query = f"UPDATE {table} SET short='{short}', time={time} , owner='{owner}' WHERE key='{key}'"
            now = datetime.now()
            path = "../"+ str(now.year) + "-" + str(now.month) + "-" + str(now.day) + ".txt"
            f = open(path, "a")
            f.write(str(now.hour) + ":" + str(now.minute)+ ":" + str(now.second) + "  UDPATE TIME AND SHORT : " +query + '\n')
            f.close()
            cursor.execute(f"UPDATE {table} SET short='{short}', time={time} , owner='{owner}' WHERE key='{key}'", ())

    def get_previous_best(self, table, key):
        with DatabaseConnection(self.config.DATABASE_PATH / self.config.DATABASE_NAME) as cursor:
            cursor.execute(f"SELECT value, short, time, owner FROM {table} WHERE key='{key}'", ())
            return cursor.fetchone()
