from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.doctors import DoctorCreate, DoctorUpdate


router = APIRouter(
    prefix="/doctors",
    tags=["Doctors"]
)


# ---------------------------------------------------------
# GET ALL DOCTORS
# ---------------------------------------------------------
@router.get("/")
def get_doctors():
    db = get_db()

    try:
        rows = db.execute("""
            SELECT
                doctor_id,
                doctor_name,
                specialization,
                mobile_no,
                email,
                is_active,
                created_at,
                updated_at
            FROM doctors
            ORDER BY doctor_id DESC
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        db.close()


# ---------------------------------------------------------
# GET SINGLE DOCTOR
# ---------------------------------------------------------
@router.get("/{doctor_id}")
def get_doctor(doctor_id: int):
    db = get_db()

    try:
        row = db.execute("""
            SELECT
                doctor_id,
                doctor_name,
                specialization,
                mobile_no,
                email,
                is_active,
                created_at,
                updated_at
            FROM doctors
            WHERE doctor_id = ?
        """, (doctor_id,)).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found"
            )

        return dict(row)

    finally:
        db.close()


# ---------------------------------------------------------
# CREATE DOCTOR
# ---------------------------------------------------------
@router.post("/", status_code=201)
def create_doctor(doctor: DoctorCreate):
    db = get_db()

    try:
        cursor = db.execute("""
            INSERT INTO doctors (
                doctor_name,
                specialization,
                mobile_no,
                email
            )
            VALUES (?, ?, ?, ?)
        """, (
            doctor.doctor_name,
            doctor.specialization,
            doctor.mobile_no,
            doctor.email,
        ))

        doctor_id = cursor.lastrowid

        db.commit()

        row = db.execute("""
            SELECT
                doctor_id,
                doctor_name,
                specialization,
                mobile_no,
                email,
                is_active,
                created_at,
                updated_at
            FROM doctors
            WHERE doctor_id = ?
        """, (doctor_id,)).fetchone()

        return dict(row)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create doctor: {exc}"
        )

    finally:
        db.close()


# ---------------------------------------------------------
# UPDATE DOCTOR
# ---------------------------------------------------------
@router.put("/{doctor_id}")
def update_doctor(
    doctor_id: int,
    doctor: DoctorUpdate
):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT doctor_id
            FROM doctors
            WHERE doctor_id = ?
        """, (doctor_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found"
            )

        update_data = doctor.model_dump(
            exclude_unset=True
        )

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update"
            )

        allowed_fields = {
            "doctor_name",
            "specialization",
            "mobile_no",
            "email",
        }

        fields = []
        values = []

        for field, value in update_data.items():

            if field not in allowed_fields:
                continue

            fields.append(f"{field} = ?")
            values.append(value)

        fields.append("updated_at = CURRENT_TIMESTAMP")

        values.append(doctor_id)

        sql = f"""
            UPDATE doctors
            SET {", ".join(fields)}
            WHERE doctor_id = ?
        """

        db.execute(sql, values)
        db.commit()

        row = db.execute("""
            SELECT
                doctor_id,
                doctor_name,
                specialization,
                mobile_no,
                email,
                is_active,
                created_at,
                updated_at
            FROM doctors
            WHERE doctor_id = ?
        """, (doctor_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update doctor: {exc}"
        )

    finally:
        db.close()


# ---------------------------------------------------------
# DEACTIVATE DOCTOR
# ---------------------------------------------------------
@router.delete("/{doctor_id}")
def deactivate_doctor(doctor_id: int):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT doctor_id, is_active
            FROM doctors
            WHERE doctor_id = ?
        """, (doctor_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found"
            )

        db.execute("""
            UPDATE doctors
            SET
                is_active = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE doctor_id = ?
        """, (doctor_id,))

        db.commit()

        row = db.execute("""
            SELECT
                doctor_id,
                doctor_name,
                specialization,
                is_active,
                updated_at
            FROM doctors
            WHERE doctor_id = ?
        """, (doctor_id,)).fetchone()

        return {
            "message": "Doctor deactivated successfully",
            "doctor": dict(row)
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to deactivate doctor: {exc}"
        )

    finally:
        db.close()