from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.family_history import FamilyHistoryCreate, FamilyHistoryUpdate


router = APIRouter(
    prefix="/family-history",
    tags=["Patient Family History"]
)


@router.get("/")
def get_family_histories():
    db = get_db()
    try:
        rows = db.execute("""
            SELECT
                h.family_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.relation,
                h.condition,
                h.age_at_diagnosis,
                h.notes,
                h.created_at
            FROM patient_family_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            ORDER BY h.family_history_id DESC
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        db.close()


@router.get("/{family_history_id}")
def get_family_history(family_history_id: int):
    db = get_db()
    try:
        row = db.execute("""
            SELECT
                h.family_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.relation,
                h.condition,
                h.age_at_diagnosis,
                h.notes,
                h.created_at
            FROM patient_family_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.family_history_id = ?
        """, (family_history_id,)).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Family history record not found"
            )

        return dict(row)

    finally:
        db.close()


@router.post("/", status_code=201)
def create_family_history(history: FamilyHistoryCreate):
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
            INSERT INTO patient_family_history (
                patient_id,
                relation,
                condition,
                age_at_diagnosis,
                notes
            )
            VALUES (?, ?, ?, ?, ?)
        """, (
            history.patient_id,
            history.relation,
            history.condition,
            history.age_at_diagnosis,
            history.notes,
        ))

        family_history_id = cursor.lastrowid
        db.commit()

        row = db.execute("""
            SELECT
                h.family_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.relation,
                h.condition,
                h.age_at_diagnosis,
                h.notes,
                h.created_at
            FROM patient_family_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.family_history_id = ?
        """, (family_history_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create family history: {exc}"
        )

    finally:
        db.close()


@router.put("/{family_history_id}")
def update_family_history(
    family_history_id: int,
    history: FamilyHistoryUpdate
):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT family_history_id
            FROM patient_family_history
            WHERE family_history_id = ?
        """, (family_history_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Family history record not found"
            )

        update_data = history.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update"
            )

        allowed_fields = {
            "relation",
            "condition",
            "age_at_diagnosis",
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

        values.append(family_history_id)

        sql = f"""
            UPDATE patient_family_history
            SET {", ".join(fields)}
            WHERE family_history_id = ?
        """

        db.execute(sql, values)
        db.commit()

        row = db.execute("""
            SELECT
                h.family_history_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.relation,
                h.condition,
                h.age_at_diagnosis,
                h.notes,
                h.created_at
            FROM patient_family_history h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.family_history_id = ?
        """, (family_history_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update family history: {exc}"
        )

    finally:
        db.close()


@router.delete("/{family_history_id}")
def delete_family_history(family_history_id: int):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT family_history_id
            FROM patient_family_history
            WHERE family_history_id = ?
        """, (family_history_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Family history record not found"
            )

        db.execute("""
            DELETE FROM patient_family_history
            WHERE family_history_id = ?
        """, (family_history_id,))

        db.commit()

        return {
            "message": "Family history deleted successfully",
            "family_history_id": family_history_id
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete family history: {exc}"
        )

    finally:
        db.close()