from datetime import date

from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.past_history import PastHistoryCreate, PastHistoryUpdate


router = APIRouter(
    prefix="/past-history",
    tags=["Patient Past History"]
)


@router.get("/")
def get_past_histories():
    db = get_db()
    try:
        rows = db.execute("""
            SELECT
                h.past_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.history_type,
                h.condition_name,
                h.diagnosis_date,
                h.status,
                h.treatment_details,
                h.notes,
                h.created_at
            FROM patient_past_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            ORDER BY h.past_history_id DESC
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        db.close()


@router.get("/{past_history_id}")
def get_past_history(past_history_id: int):
    db = get_db()
    try:
        row = db.execute("""
            SELECT
                h.past_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.history_type,
                h.condition_name,
                h.diagnosis_date,
                h.status,
                h.treatment_details,
                h.notes,
                h.created_at
            FROM patient_past_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.past_history_id = ?
        """, (past_history_id,)).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Past history record not found"
            )

        return dict(row)

    finally:
        db.close()


@router.post("/", status_code=201)
def create_past_history(history: PastHistoryCreate):
    db = get_db()

    try:
        patient = db.execute("""
            SELECT patient_id
            FROM patients
            WHERE patient_id = ?
        """, (history.patient_id,)).fetchone()

        if patient is None:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        cursor = db.execute("""
            INSERT INTO patient_past_history (
                patient_id,
                history_type,
                condition_name,
                diagnosis_date,
                status,
                treatment_details,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            history.patient_id,
            history.history_type,
            history.condition_name,
            history.diagnosis_date.isoformat()
            if history.diagnosis_date else None,
            history.status,
            history.treatment_details,
            history.notes,
        ))

        past_history_id = cursor.lastrowid
        db.commit()

        row = db.execute("""
            SELECT
                h.past_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.history_type,
                h.condition_name,
                h.diagnosis_date,
                h.status,
                h.treatment_details,
                h.notes,
                h.created_at
            FROM patient_past_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.past_history_id = ?
        """, (past_history_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create past history: {exc}"
        )

    finally:
        db.close()


@router.put("/{past_history_id}")
def update_past_history(
    past_history_id: int,
    history: PastHistoryUpdate
):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT past_history_id
            FROM patient_past_history
            WHERE past_history_id = ?
        """, (past_history_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Past history record not found"
            )

        update_data = history.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update"
            )

        allowed_fields = {
            "history_type",
            "condition_name",
            "diagnosis_date",
            "status",
            "treatment_details",
            "notes",
        }

        fields = []
        values = []

        for field, value in update_data.items():
            if field not in allowed_fields:
                continue

            if isinstance(value, date):
                value = value.isoformat()

            fields.append(f"{field} = ?")
            values.append(value)

        if not fields:
            raise HTTPException(
                status_code=400,
                detail="No valid fields provided for update"
            )

        values.append(past_history_id)

        sql = f"""
            UPDATE patient_past_history
            SET {", ".join(fields)}
            WHERE past_history_id = ?
        """

        db.execute(sql, values)
        db.commit()

        row = db.execute("""
            SELECT
                h.past_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.history_type,
                h.condition_name,
                h.diagnosis_date,
                h.status,
                h.treatment_details,
                h.notes,
                h.created_at
            FROM patient_past_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.past_history_id = ?
        """, (past_history_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update past history: {exc}"
        )

    finally:
        db.close()


@router.delete("/{past_history_id}")
def delete_past_history(past_history_id: int):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT past_history_id
            FROM patient_past_history
            WHERE past_history_id = ?
        """, (past_history_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Past history record not found"
            )

        db.execute("""
            DELETE FROM patient_past_history
            WHERE past_history_id = ?
        """, (past_history_id,))

        db.commit()

        return {
            "message": "Past history deleted successfully",
            "past_history_id": past_history_id
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete past history: {exc}"
        )

    finally:
        db.close()