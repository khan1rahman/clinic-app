from datetime import datetime
from pathlib import Path
import shutil
import sqlite3

DATABASE_PATH = Path(r"D:\ClinicApp\ClinicApp\database\clinic.db")
MIGRATION_PATH = Path(__file__).parent / "001_visit_clinical_history.sql"


def main():
    if not DATABASE_PATH.is_file():
        raise SystemExit(f"Database not found: {DATABASE_PATH}")

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = DATABASE_PATH.with_name(
        f"{DATABASE_PATH.stem}_before_clinical_history_{stamp}{DATABASE_PATH.suffix}"
    )
    shutil.copy2(DATABASE_PATH, backup_path)

    # Verify the backup before applying any schema change.
    with sqlite3.connect(backup_path) as backup_db:
        check = backup_db.execute("PRAGMA integrity_check").fetchone()[0]
        if check != "ok":
            raise SystemExit(f"Backup integrity check failed: {check}")

    sql = MIGRATION_PATH.read_text(encoding="utf-8")
    with sqlite3.connect(DATABASE_PATH) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.executescript(sql)
        check = db.execute("PRAGMA integrity_check").fetchone()[0]
        if check != "ok":
            raise SystemExit(f"Database integrity check failed: {check}")

    print(f"Migration applied successfully. Backup: {backup_path}")


if __name__ == "__main__":
    main()
