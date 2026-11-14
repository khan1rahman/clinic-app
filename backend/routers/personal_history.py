from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.personal_history import PersonalHistoryCreate, PersonalHistoryUpdate


router = APIRouter(
    prefix="/personal-history",
    tags=["Patient Personal History"]
)


@router.get("/")
def get_personal_histories():
    db = get_db()
    try:
        rows = db.execute("""
            SELECT
                h.personal_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.diet_details,
                h.sleep_details,
                h.exercise_details,
                h.lifestyle_details,
                h.other_details,
                h.notes,
                h.created_at,
                h.updated_at
            FROM patient_personal_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            ORDER BY h.personal_history_id DESC
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        db.close()


@router.get("/{personal_history_id}")
def get_personal_history(personal_history_id: int):
    db = get_db()
    try:
        row = db.execute("""
            SELECT
                h.personal_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.diet_details,
                h.sleep_details,
                h.exercise_details,
                h.lifestyle_details,
                h.other_details,
                h.notes,
                h.created_at,
                h.updated_at
            FROM patient_personal_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.personal_history_id = ?
        """, (personal_history_id,)).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Personal history record not found"
            )

        return dict(row)

    finally:
        db.close()


@router.post("/", status_code=201)
def create_personal_history(history: PersonalHistoryCreate):
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

        existing = db.execute("""
            SELECT personal_history_id
            FROM patient_personal_history
            WHERE patient_id = ?
        """, (history.patient_id,)).fetchone()

        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail="Personal history already exists for this patient"
            )

        cursor = db.execute("""
            INSERT INTO patient_personal_history (
                patient_id,
                diet_details,
                sleep_details,
                exercise_details,
                lifestyle_details,
                other_details,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            history.patient_id,
            history.diet_details,
            history.sleep_details,
            history.exercise_details,
            history.lifestyle_details,
            history.other_details,
            history.notes,
        ))

        history_id = cursor.lastrowid
        db.commit()

        row = db.execute("""
            SELECT
                h.personal_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.diet_details,
                h.sleep_details,
                h.exercise_details,
                h.lifestyle_details,
                h.other_details,
                h.notes,
                h.created_at,
                h.updated_at
            FROM patient_personal_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.personal_history_id = ?
        """, (history_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create personal history: {exc}"
        )

    finally:
        db.close()


@router.put("/{personal_history_id}")
def update_personal_history(
    personal_history_id: int,
    history: PersonalHistoryUpdate
):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT personal_history_id
            FROM patient_personal_history
            WHERE personal_history_id = ?
        """, (personal_history_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Personal history record not found"
            )

        update_data = history.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update"
            )

        allowed_fields = {
            "diet_details",
            "sleep_details",
            "exercise_details",
            "lifestyle_details",
            "other_details",
            "notes",
        }

        fields = []
        values = []

        for field, value in update_data.items():
            if field not in allowed_fields:
                continue

            fields.append(f"{field} = ?")
            values.append(value)

        if not fields:
            raise HTTPException(
                status_code=400,
                detail="No valid fields provided for update"
            )

        fields.append("updated_at = CURRENT_TIMESTAMP")
        values.append(personal_history_id)

        sql = f"""
            UPDATE patient_personal_history
            SET {", ".join(fields)}
            WHERE personal_history_id = ?
        """

        db.execute(sql, values)
        db.commit()

        row = db.execute("""
            SELECT
                h.personal_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.diet_details,
                h.sleep_details,
                h.exercise_details,
                h.lifestyle_details,
                h.other_details,
                h.notes,
                h.created_at,
                h.updated_at
            FROM patient_personal_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.personal_history_id = ?
        """, (personal_history_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update personal history: {exc}"
        )

    finally:
        db.close()


@router.delete("/{personal_history_id}")
def delete_personal_history(personal_history_id: int):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT personal_history_id
            FROM patient_personal_history
            WHERE personal_history_id = ?
        """, (personal_history_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Personal history record not found"
            )

        db.execute("""
            DELETE FROM patient_personal_history
            WHERE personal_history_id = ?
        """, (personal_history_id,))

        db.commit()

        return {
            "message": "Personal history deleted successfully",
            "personal_history_id": personal_history_id
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete personal history: {exc}"
        )

    finally:
        db.close()