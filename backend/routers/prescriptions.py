from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.prescriptions import PrescriptionCreate, PrescriptionUpdate


router = APIRouter(
    prefix="/prescriptions",
    tags=["Prescriptions"],
)


@router.get("/")
def get_prescriptions():
    connection = get_db()

    try:
        rows = connection.execute(
            """
            SELECT
                p.prescription_id,
                p.patient_id,
                p.visit_id,
                p.doctor_id,
                p.prescription_date,
                p.general_instructions,
                p.laboratory_tests,
                p.follow_up_date,
                p.pdf_path,
                p.created_at
            FROM prescriptions p
            ORDER BY p.prescription_id
            """
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


@router.post("/", status_code=201)
def create_prescription(prescription: PrescriptionCreate):
    connection = get_db()

    try:
        visit = connection.execute(
            """
            SELECT
                visit_id,
                patient_id,
                doctor_id
            FROM visits
            WHERE visit_id = ?
            """,
            (prescription.visit_id,),
        ).fetchone()

        if visit is None:
            raise HTTPException(
                status_code=404,
                detail="Visit not found",
            )

        if visit["patient_id"] != prescription.patient_id:
            raise HTTPException(
                status_code=400,
                detail="Patient does not belong to the specified visit",
            )

        if visit["doctor_id"] != prescription.doctor_id:
            raise HTTPException(
                status_code=400,
                detail="Doctor does not belong to the specified visit",
            )

        if prescription.prescription_date is None:
            cursor = connection.execute(
                """
                INSERT INTO prescriptions
                (
                    patient_id,
                    visit_id,
                    doctor_id,
                    general_instructions,
                    laboratory_tests,
                    follow_up_date
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    prescription.patient_id,
                    prescription.visit_id,
                    prescription.doctor_id,
                    prescription.general_instructions,
                    prescription.laboratory_tests,
                    prescription.follow_up_date,
                ),
            )
        else:
            cursor = connection.execute(
                """
                INSERT INTO prescriptions
                (
                    patient_id,
                    visit_id,
                    doctor_id,
                    prescription_date,
                    general_instructions,
                    laboratory_tests,
                    follow_up_date
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    prescription.patient_id,
                    prescription.visit_id,
                    prescription.doctor_id,
                    prescription.prescription_date,
                    prescription.general_instructions,
                    prescription.laboratory_tests,
                    prescription.follow_up_date,
                ),
            )

        connection.commit()

        row = connection.execute(
            """
            SELECT
                prescription_id,
                patient_id,
                visit_id,
                doctor_id,
                prescription_date,
                general_instructions,
                laboratory_tests,
                follow_up_date,
                pdf_path,
                created_at
            FROM prescriptions
            WHERE prescription_id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.get("/{prescription_id}")
def get_prescription(prescription_id: int):
    connection = get_db()

    try:
        row = connection.execute(
            """
            SELECT
                prescription_id,
                patient_id,
                visit_id,
                doctor_id,
                prescription_date,
                general_instructions,
                laboratory_tests,
                follow_up_date,
                pdf_path,
                created_at
            FROM prescriptions
            WHERE prescription_id = ?
            """,
            (prescription_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Prescription not found",
            )

        return dict(row)

    finally:
        connection.close()


@router.put("/{prescription_id}")
def update_prescription(
    prescription_id: int,
    prescription: PrescriptionUpdate,
):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT
                prescription_id,
                visit_id,
                patient_id,
                doctor_id
            FROM prescriptions
            WHERE prescription_id = ?
            """,
            (prescription_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Prescription not found",
            )

        update_data = prescription.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update",
            )

        if "doctor_id" in update_data:
            visit = connection.execute(
                """
                SELECT doctor_id
                FROM visits
                WHERE visit_id = ?
                """,
                (existing["visit_id"],),
            ).fetchone()

            if visit is None:
                raise HTTPException(
                    status_code=404,
                    detail="Visit not found",
                )

            if visit["doctor_id"] != update_data["doctor_id"]:
                raise HTTPException(
                    status_code=400,
                    detail="Doctor does not belong to the prescription visit",
                )

        allowed_fields = {
            "doctor_id",
            "prescription_date",
            "general_instructions",
            "laboratory_tests",
            "follow_up_date",
            "pdf_path",
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

        values.append(prescription_id)

        connection.execute(
            f"""
            UPDATE prescriptions
            SET {", ".join(fields)}
            WHERE prescription_id = ?
            """,
            values,
        )

        connection.commit()

        row = connection.execute(
            """
            SELECT
                prescription_id,
                patient_id,
                visit_id,
                doctor_id,
                prescription_date,
                general_instructions,
                laboratory_tests,
                follow_up_date,
                pdf_path,
                created_at
            FROM prescriptions
            WHERE prescription_id = ?
            """,
            (prescription_id,),
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.delete("/{prescription_id}")
def delete_prescription(prescription_id: int):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT prescription_id
            FROM prescriptions
            WHERE prescription_id = ?
            """,
            (prescription_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Prescription not found",
            )

        connection.execute(
            """
            DELETE FROM prescriptions
            WHERE prescription_id = ?
            """,
            (prescription_id,),
        )

        connection.commit()

        return {
            "message": "Prescription deleted successfully",
            "prescription_id": prescription_id,
        }

    finally:
        connection.close()