from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.medicines import MedicineCreate, MedicineUpdate


router = APIRouter(
    prefix="/medicines",
    tags=["Medicines"],
)


@router.get("/")
def get_medicines():
    connection = get_db()

    try:
        rows = connection.execute(
            """
            SELECT
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                manufacturer,
                is_active,
                notes,
                created_at,
                updated_at
            FROM medicines
            ORDER BY medicine_name, medicine_id
            """
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


@router.post("/", status_code=201)
def create_medicine(medicine: MedicineCreate):
    connection = get_db()

    try:
        cursor = connection.execute(
            """
            INSERT INTO medicines
            (
                medicine_name,
                generic_name,
                form,
                strength,
                manufacturer,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                medicine.medicine_name,
                medicine.generic_name,
                medicine.form,
                medicine.strength,
                medicine.manufacturer,
                medicine.notes,
            ),
        )

        connection.commit()

        row = connection.execute(
            """
            SELECT
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                manufacturer,
                is_active,
                notes,
                created_at,
                updated_at
            FROM medicines
            WHERE medicine_id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.get("/{medicine_id}")
def get_medicine(medicine_id: int):
    connection = get_db()

    try:
        row = connection.execute(
            """
            SELECT
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                manufacturer,
                is_active,
                notes,
                created_at,
                updated_at
            FROM medicines
            WHERE medicine_id = ?
            """,
            (medicine_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found",
            )

        return dict(row)

    finally:
        connection.close()


@router.put("/{medicine_id}")
def update_medicine(
    medicine_id: int,
    medicine: MedicineUpdate,
):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT medicine_id
            FROM medicines
            WHERE medicine_id = ?
            """,
            (medicine_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found",
            )

        update_data = medicine.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update",
            )

        allowed_fields = {
            "medicine_name",
            "generic_name",
            "form",
            "strength",
            "manufacturer",
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

        fields.append("updated_at = CURRENT_TIMESTAMP")
        values.append(medicine_id)

        connection.execute(
            f"""
            UPDATE medicines
            SET {", ".join(fields)}
            WHERE medicine_id = ?
            """,
            values,
        )

        connection.commit()

        row = connection.execute(
            """
            SELECT
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                manufacturer,
                is_active,
                notes,
                created_at,
                updated_at
            FROM medicines
            WHERE medicine_id = ?
            """,
            (medicine_id,),
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.delete("/{medicine_id}")
def delete_medicine(medicine_id: int):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT medicine_id
            FROM medicines
            WHERE medicine_id = ?
            """,
            (medicine_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found",
            )

        connection.execute(
            """
            UPDATE medicines
            SET
                is_active = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE medicine_id = ?
            """,
            (medicine_id,),
        )

        connection.commit()

        return {
            "message": "Medicine deactivated successfully",
            "medicine_id": medicine_id,
        }

    finally:
        connection.close()