from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.measurements import MeasurementCreate, MeasurementUpdate


router = APIRouter(
    prefix="/measurements",
    tags=["Patient Measurements"]
)


# ---------------------------------------------------------
# GET ALL MEASUREMENTS
# ---------------------------------------------------------
@router.get("/")
def get_measurements():
    db = get_db()

    try:
        rows = db.execute("""
            SELECT
                m.measurement_id,
                m.patient_id,
                p.patient_code,
                p.name AS patient_name,
                m.visit_id,
                m.measurement_date,
                m.height_cm,
                m.weight_kg,
                m.bmi,
                m.waist_cm,
                m.hip_cm,
                m.body_fat_percent,
                m.notes,
                m.created_at
            FROM patient_measurements m
            JOIN patients p
                ON p.patient_id = m.patient_id
            ORDER BY m.measurement_id DESC
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        db.close()


# ---------------------------------------------------------
# GET SINGLE MEASUREMENT
# ---------------------------------------------------------
@router.get("/{measurement_id}")
def get_measurement(measurement_id: int):
    db = get_db()

    try:
        row = db.execute("""
            SELECT
                m.measurement_id,
                m.patient_id,
                p.patient_code,
                p.name AS patient_name,
                m.visit_id,
                m.measurement_date,
                m.height_cm,
                m.weight_kg,
                m.bmi,
                m.waist_cm,
                m.hip_cm,
                m.body_fat_percent,
                m.notes,
                m.created_at
            FROM patient_measurements m
            JOIN patients p
                ON p.patient_id = m.patient_id
            WHERE m.measurement_id = ?
        """, (measurement_id,)).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Measurement not found"
            )

        return dict(row)

    finally:
        db.close()


# ---------------------------------------------------------
# CREATE MEASUREMENT
# ---------------------------------------------------------
@router.post("/", status_code=201)
def create_measurement(measurement: MeasurementCreate):
    db = get_db()

    try:
        visit = db.execute("""
            SELECT
                visit_id,
                patient_id
            FROM visits
            WHERE visit_id = ?
        """, (measurement.visit_id,)).fetchone()

        if visit is None:
            raise HTTPException(
                status_code=404,
                detail="Visit not found"
            )

        cursor = db.execute("""
            INSERT INTO patient_measurements (
                patient_id,
                visit_id,
                height_cm,
                weight_kg,
                bmi,
                waist_cm,
                hip_cm,
                body_fat_percent,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            visit["patient_id"],
            measurement.visit_id,
            measurement.height_cm,
            measurement.weight_kg,
            measurement.bmi,
            measurement.waist_cm,
            measurement.hip_cm,
            measurement.body_fat_percent,
            measurement.notes,
        ))

        measurement_id = cursor.lastrowid

        db.commit()

        row = db.execute("""
            SELECT
                m.measurement_id,
                m.patient_id,
                p.patient_code,
                p.name AS patient_name,
                m.visit_id,
                m.measurement_date,
                m.height_cm,
                m.weight_kg,
                m.bmi,
                m.waist_cm,
                m.hip_cm,
                m.body_fat_percent,
                m.notes,
                m.created_at
            FROM patient_measurements m
            JOIN patients p
                ON p.patient_id = m.patient_id
            WHERE m.measurement_id = ?
        """, (measurement_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create measurement: {exc}"
        )

    finally:
        db.close()


# ---------------------------------------------------------
# UPDATE MEASUREMENT
# ---------------------------------------------------------
@router.put("/{measurement_id}")
def update_measurement(
    measurement_id: int,
    measurement: MeasurementUpdate
):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT measurement_id
            FROM patient_measurements
            WHERE measurement_id = ?
        """, (measurement_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Measurement not found"
            )

        update_data = measurement.model_dump(
            exclude_unset=True
        )

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update"
            )

        allowed_fields = {
            "height_cm",
            "weight_kg",
            "bmi",
            "waist_cm",
            "hip_cm",
            "body_fat_percent",
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

        values.append(measurement_id)

        sql = f"""
            UPDATE patient_measurements
            SET {", ".join(fields)}
            WHERE measurement_id = ?
        """

        db.execute(sql, values)
        db.commit()

        row = db.execute("""
            SELECT
                m.measurement_id,
                m.patient_id,
                p.patient_code,
                p.name AS patient_name,
                m.visit_id,
                m.measurement_date,
                m.height_cm,
                m.weight_kg,
                m.bmi,
                m.waist_cm,
                m.hip_cm,
                m.body_fat_percent,
                m.notes,
                m.created_at
            FROM patient_measurements m
            JOIN patients p
                ON p.patient_id = m.patient_id
            WHERE m.measurement_id = ?
        """, (measurement_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update measurement: {exc}"
        )

    finally:
        db.close()


# ---------------------------------------------------------
# DELETE MEASUREMENT
# ---------------------------------------------------------
@router.delete("/{measurement_id}")
def delete_measurement(measurement_id: int):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT measurement_id
            FROM patient_measurements
            WHERE measurement_id = ?
        """, (measurement_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Measurement not found"
            )

        db.execute("""
            DELETE FROM patient_measurements
            WHERE measurement_id = ?
        """, (measurement_id,))

        db.commit()

        return {
            "message": "Measurement deleted successfully",
            "measurement_id": measurement_id
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete measurement: {exc}"
        )

    finally:
        db.close()