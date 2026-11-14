from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.allergies import AllergyCreate, AllergyUpdate


router = APIRouter(
    prefix="/allergies",
    tags=["Allergies"],
)


@router.get("/")
def get_allergies():
    connection = get_db()

    try:
        rows = connection.execute(
            """
            SELECT
                allergy_id,
                patient_id,
                allergen,
                reaction,
                severity,
                notes,
                created_at
            FROM patient_allergies
            ORDER BY allergy_id
            """
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


@router.post("/", status_code=201)
def create_allergy(allergy: AllergyCreate):
    connection = get_db()

    try:
        patient = connection.execute(
            "SELECT patient_id FROM patients WHERE patient_id = ?",
            (allergy.patient_id,),
        ).fetchone()

        if patient is None:
            raise HTTPException(
                status_code=404,
                detail="Patient not found",
            )

        cursor = connection.execute(
            """
            INSERT INTO patient_allergies
            (
                patient_id,
                allergen,
                reaction,
                severity,
                notes
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                allergy.patient_id,
                allergy.allergen,
                allergy.reaction,
                allergy.severity,
                allergy.notes,
            ),
        )

        connection.commit()

        row = connection.execute(
            """
            SELECT
                allergy_id,
                patient_id,
                allergen,
                reaction,
                severity,
                notes,
                created_at
            FROM patient_allergies
            WHERE allergy_id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.get("/{allergy_id}")
def get_allergy(allergy_id: int):
    connection = get_db()

    try:
        row = connection.execute(
            """
            SELECT
                allergy_id,
                patient_id,
                allergen,
                reaction,
                severity,
                notes,
                created_at
            FROM patient_allergies
            WHERE allergy_id = ?
            """,
            (allergy_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Allergy record not found",
            )

        return dict(row)

    finally:
        connection.close()


@router.put("/{allergy_id}")
def update_allergy(
    allergy_id: int,
    allergy: AllergyUpdate,
):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT allergy_id
            FROM patient_allergies
            WHERE allergy_id = ?
            """,
            (allergy_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Allergy record not found",
            )

        update_data = allergy.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update",
            )

        allowed_fields = {
            "allergen",
            "reaction",
            "severity",
            "notes",
        }

        fields = []
        values = []

        for field, value in update_data.items():
            if field in allowed_fields:
                fields.append(f"{field} = ?")
                values.append(value)

        if not fields:
            raise HTTPException(
                status_code=400,
                detail="No valid fields provided for update",
            )

        values.append(allergy_id)

        connection.execute(
            f"""
            UPDATE patient_allergies
            SET {", ".join(fields)}
            WHERE allergy_id = ?
            """,
            values,
        )

        connection.commit()

        row = connection.execute(
            """
            SELECT
                allergy_id,
                patient_id,
                allergen,
                reaction,
                severity,
                notes,
                created_at
            FROM patient_allergies
            WHERE allergy_id = ?
            """,
            (allergy_id,),
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.delete("/{allergy_id}")
def delete_allergy(allergy_id: int):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT allergy_id
            FROM patient_allergies
            WHERE allergy_id = ?
            """,
            (allergy_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Allergy record not found",
            )

        connection.execute(
            """
            DELETE FROM patient_allergies
            WHERE allergy_id = ?
            """,
            (allergy_id,),
        )

        connection.commit()

        return {
            "message": "Allergy record deleted successfully",
            "allergy_id": allergy_id,
        }

    finally:
        connection.close()