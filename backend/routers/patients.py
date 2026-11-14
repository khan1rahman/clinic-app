from datetime import date

from fastapi import APIRouter, HTTPException
from database import get_db
from schemas.patients import PatientCreate, PatientUpdate

router = APIRouter(prefix="/patients", tags=["Patients"])


# ---------------------------------------------------------
# GET ALL PATIENTS
# ---------------------------------------------------------
@router.get("/")
def get_patients():
    db = get_db()

    try:
        rows = db.execute("""
            SELECT
                patient_id,
                patient_code,
                name,
                sex,
                date_of_birth,
                mobile_no,
                email,
                occupation,
                address,
                city,
                first_appointment_date,
                status,
                created_at,
                updated_at
            FROM patients
            ORDER BY patient_id DESC
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        db.close()


# ---------------------------------------------------------
# GET SINGLE PATIENT
# ---------------------------------------------------------
@router.get("/{patient_id}")
def get_patient(patient_id: int):
    db = get_db()

    try:
        row = db.execute(
            """
            SELECT
                patient_id,
                patient_code,
                name,
                sex,
                date_of_birth,
                mobile_no,
                email,
                occupation,
                address,
                city,
                first_appointment_date,
                status,
                created_at,
                updated_at
            FROM patients
            WHERE patient_id = ?
        """,
            (patient_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        return dict(row)

    finally:
        db.close()


# ---------------------------------------------------------
# CREATE PATIENT
# ---------------------------------------------------------
@router.post("/", status_code=201)
def create_patient(patient: PatientCreate):
    db = get_db()

    try:
        cursor = db.execute(
            """
            INSERT INTO patients (
                patient_code,
                name,
                sex,
                date_of_birth,
                mobile_no,
                email,
                occupation,
                address,
                city,
                first_appointment_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                f"TEMP-{id(patient)}",
                patient.name,
                patient.sex,
                patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                patient.mobile_no,
                patient.email,
                patient.occupation,
                patient.address,
                patient.city,
                (
                    patient.first_appointment_date.isoformat()
                    if patient.first_appointment_date
                    else None
                ),
            ),
        )

        patient_id = cursor.lastrowid
        patient_code = f"P{patient_id:06d}"

        db.execute(
            """
            UPDATE patients
            SET patient_code = ?
            WHERE patient_id = ?
        """,
            (patient_code, patient_id),
        )

        db.commit()

        row = db.execute(
            """
            SELECT
                patient_id,
                patient_code,
                name,
                sex,
                date_of_birth,
                mobile_no,
                email,
                occupation,
                address,
                city,
                first_appointment_date,
                status,
                created_at,
                updated_at
            FROM patients
            WHERE patient_id = ?
        """,
            (patient_id,),
        ).fetchone()

        return dict(row)

    except Exception as exc:
        db.rollback()

        raise HTTPException(status_code=500, detail=f"Failed to create patient: {exc}")

    finally:
        db.close()


# ---------------------------------------------------------
# UPDATE PATIENT
# ---------------------------------------------------------
@router.put("/{patient_id}")
def update_patient(patient_id: int, patient: PatientUpdate):
    db = get_db()

    try:
        existing = db.execute(
            """
            SELECT patient_id
            FROM patients
            WHERE patient_id = ?
        """,
            (patient_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        update_data = patient.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        allowed_fields = {
            "name",
            "sex",
            "date_of_birth",
            "mobile_no",
            "email",
            "occupation",
            "address",
            "city",
            "first_appointment_date",
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

        fields.append("updated_at = CURRENT_TIMESTAMP")

        values.append(patient_id)

        sql = f"""
            UPDATE patients
            SET {", ".join(fields)}
            WHERE patient_id = ?
        """

        db.execute(sql, values)
        db.commit()

        row = db.execute(
            """
            SELECT
                patient_id,
                patient_code,
                name,
                sex,
                date_of_birth,
                mobile_no,
                email,
                occupation,
                address,
                city,
                first_appointment_date,
                status,
                created_at,
                updated_at
            FROM patients
            WHERE patient_id = ?
        """,
            (patient_id,),
        ).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(status_code=500, detail=f"Failed to update patient: {exc}")

    finally:
        db.close()


# ---------------------------------------------------------
# DELETE PATIENT
# ---------------------------------------------------------
@router.delete("/{patient_id}")
def delete_patient(patient_id: int):
    db = get_db()

    try:
        existing = db.execute(
            """
            SELECT patient_id, patient_code, name
            FROM patients
            WHERE patient_id = ?
        """,
            (patient_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        db.execute(
            """
            DELETE FROM patients
            WHERE patient_id = ?
        """,
            (patient_id,),
        )

        db.commit()

        return {
            "message": "Patient permanently deleted successfully",
            "patient_id": patient_id,
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        error_message = str(exc).lower()

        if (
            "foreign key constraint failed" in error_message
            or "integrityerror" in error_message
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This patient cannot be deleted because "
                    "appointments or clinical records are linked "
                    "to this patient."
                ),
            )

        raise HTTPException(status_code=500, detail=f"Failed to delete patient: {exc}")

    finally:
        db.close()
