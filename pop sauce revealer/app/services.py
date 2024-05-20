from app.database import DatabaseOperations

class DataService:
    def __init__(self, db_ops: DatabaseOperations):
        self.db_ops = db_ops

    def add_data(self, table, key: str, value: str, short :str, time, owner) -> bool:
        if not self.db_ops.key_exists(table, key):
            self.db_ops.insert_data(table, key, value, short, time, owner)
            return True
        return False

    def retrieve_data(self, table, key: str):
        return self.db_ops.get_value_by_key(table, key)
    
    def udpate_short(self, table,  key: str, short :str):
        self.db_ops.update_short(table, key, short)

    def udpate_time(self, table, key , time, owner):
        self.db_ops.update_time(table, key, time, owner)