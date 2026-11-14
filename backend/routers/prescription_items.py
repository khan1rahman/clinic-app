from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.prescription_items import (
    PrescriptionItemCreate,
    PrescriptionItemUpdate,
)


router = APIRouter(
    prefix="/prescription-items",
    tags=["Prescription Items"],
)


@router.get("/")
def get_prescription_items():
    connection = get_db()

    try:
        rows = connection.execute(
            """
            SELECT
                prescription_item_id,
                patient_id,
                prescription_id,
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                dosage,
                frequency,
                duration,
                route,
                instructions,
                sequence_no,
                created_at,
                dosage_quantity,
                dosage_unit,
                meal_timing,
                duration_days
            FROM prescription_items
            ORDER BY prescription_id, sequence_no, prescription_item_id
            """
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


@router.post("/", status_code=201)
def create_prescription_item(item: PrescriptionItemCreate):
    connection = get_db()

    try:
        # ---------------------------------------------------------
        # 1. Verify prescription exists
        # ---------------------------------------------------------
        prescription = connection.execute(
            """
            SELECT
                prescription_id,
                patient_id
            FROM prescriptions
            WHERE prescription_id = ?
            """,
            (item.prescription_id,),
        ).fetchone()

        if prescription is None:
            raise HTTPException(
                status_code=404,
                detail="Prescription not found",
            )

        # ---------------------------------------------------------
        # 2. Get medicine contents from medicines table
        # ---------------------------------------------------------
        medicine = connection.execute(
            """
            SELECT
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                is_active
            FROM medicines
            WHERE medicine_id = ?
            """,
            (item.medicine_id,),
        ).fetchone()

        if medicine is None:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found",
            )

        # ---------------------------------------------------------
        # 3. Do not allow inactive medicines for new prescriptions
        # ---------------------------------------------------------
        if medicine["is_active"] != 1:
            raise HTTPException(
                status_code=400,
                detail="Selected medicine is inactive",
            )

        # ---------------------------------------------------------
        # 4. Insert prescription item
        #
        # Medicine information comes ONLY from medicines table.
        # Doctor cannot modify these fields.
        #
        # Old columns are retained for compatibility:
        # dosage = quantity + unit
        # frequency = selected frequency
        # duration = duration_days + " days"
        # ---------------------------------------------------------
        dosage = f"{item.dosage_quantity} {item.dosage_unit}"

        duration = f"{item.duration_days} days"

        cursor = connection.execute(
            """
            INSERT INTO prescription_items
            (
                patient_id,
                prescription_id,
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                dosage,
                frequency,
                duration,
                sequence_no,
                dosage_quantity,
                dosage_unit,
                meal_timing,
                duration_days
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                prescription["patient_id"],
                item.prescription_id,
                medicine["medicine_id"],
                medicine["medicine_name"],
                medicine["generic_name"],
                medicine["form"],
                medicine["strength"],
                dosage,
                item.frequency,
                duration,
                item.sequence_no,
                item.dosage_quantity,
                item.dosage_unit,
                item.meal_timing,
                item.duration_days,
            ),
        )

        connection.commit()

        # ---------------------------------------------------------
        # 5. Return created item
        # ---------------------------------------------------------
        row = connection.execute(
            """
            SELECT
                prescription_item_id,
                patient_id,
                prescription_id,
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                dosage,
                frequency,
                duration,
                route,
                instructions,
                sequence_no,
                created_at,
                dosage_quantity,
                dosage_unit,
                meal_timing,
                duration_days
            FROM prescription_items
            WHERE prescription_item_id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.get("/{prescription_item_id}")
def get_prescription_item(prescription_item_id: int):
    connection = get_db()

    try:
        row = connection.execute(
            """
            SELECT
                prescription_item_id,
                patient_id,
                prescription_id,
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                dosage,
                frequency,
                duration,
                route,
                instructions,
                sequence_no,
                created_at,
                dosage_quantity,
                dosage_unit,
                meal_timing,
                duration_days
            FROM prescription_items
            WHERE prescription_item_id = ?
            """,
            (prescription_item_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Prescription item not found",
            )

        return dict(row)

    finally:
        connection.close()


@router.put("/{prescription_item_id}")
def update_prescription_item(
    prescription_item_id: int,
    item: PrescriptionItemUpdate,
):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT prescription_item_id
            FROM prescription_items
            WHERE prescription_item_id = ?
            """,
            (prescription_item_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Prescription item not found",
            )

        update_data = item.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update",
            )

        # ---------------------------------------------------------
        # Medicine selection can be changed.
        # If changed, automatically load its contents.
        # ---------------------------------------------------------
        medicine_id = update_data.get("medicine_id")

        if medicine_id is not None:

            medicine = connection.execute(
                """
                SELECT
                    medicine_id,
                    medicine_name,
                    generic_name,
                    form,
                    strength,
                    is_active
                FROM medicines
                WHERE medicine_id = ?
                """,
                (medicine_id,),
            ).fetchone()

            if medicine is None:
                raise HTTPException(
                    status_code=404,
                    detail="Medicine not found",
                )

            if medicine["is_active"] != 1:
                raise HTTPException(
                    status_code=400,
                    detail="Selected medicine is inactive",
                )

            # Automatically replace medicine contents.
            update_data["medicine_name"] = medicine["medicine_name"]
            update_data["generic_name"] = medicine["generic_name"]
            update_data["form"] = medicine["form"]
            update_data["strength"] = medicine["strength"]

        # ---------------------------------------------------------
        # Rebuild legacy dosage/duration fields if new fields change
        # ---------------------------------------------------------
        if (
            "dosage_quantity" in update_data
            or "dosage_unit" in update_data
        ):
            current = connection.execute(
                """
                SELECT
                    dosage_quantity,
                    dosage_unit
                FROM prescription_items
                WHERE prescription_item_id = ?
                """,
                (prescription_item_id,),
            ).fetchone()

            dosage_quantity = update_data.get(
                "dosage_quantity",
                current["dosage_quantity"],
            )

            dosage_unit = update_data.get(
                "dosage_unit",
                current["dosage_unit"],
            )

            if dosage_quantity and dosage_unit:
                update_data["dosage"] = (
                    f"{dosage_quantity} {dosage_unit}"
                )

        if "duration_days" in update_data:
            update_data["duration"] = (
                f"{update_data['duration_days']} days"
            )

        # ---------------------------------------------------------
        # Only these fields are allowed to change.
        #
        # Medicine contents are NOT independently editable.
        # ---------------------------------------------------------
        allowed_fields = {
            "medicine_id",
            "medicine_name",
            "generic_name",
            "form",
            "strength",
            "dosage",
            "frequency",
            "duration",
            "sequence_no",
            "dosage_quantity",
            "dosage_unit",
            "meal_timing",
            "duration_days",
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

        values.append(prescription_item_id)

        connection.execute(
            f"""
            UPDATE prescription_items
            SET {", ".join(fields)}
            WHERE prescription_item_id = ?
            """,
            values,
        )

        connection.commit()

        row = connection.execute(
            """
            SELECT
                prescription_item_id,
                patient_id,
                prescription_id,
                medicine_id,
                medicine_name,
                generic_name,
                form,
                strength,
                dosage,
                frequency,
                duration,
                route,
                instructions,
                sequence_no,
                created_at,
                dosage_quantity,
                dosage_unit,
                meal_timing,
                duration_days
            FROM prescription_items
            WHERE prescription_item_id = ?
            """,
            (prescription_item_id,),
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.delete("/{prescription_item_id}")
def delete_prescription_item(prescription_item_id: int):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT prescription_item_id
            FROM prescription_items
            WHERE prescription_item_id = ?
            """,
            (prescription_item_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Prescription item not found",
            )

        connection.execute(
            """
            DELETE FROM prescription_items
            WHERE prescription_item_id = ?
            """,
            (prescription_item_id,),
        )

        connection.commit()

        return {
            "message": "Prescription item deleted successfully",
            "prescription_item_id": prescription_item_id,
        }

    finally:
        connection.close()