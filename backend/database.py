import sqlite3

DATABASE_PATH = r"D:\ClinicApp\ClinicApp\database\clinic.db"


def get_db():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection