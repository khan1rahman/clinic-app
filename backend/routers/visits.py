from datetime import date

from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.visits import VisitCreate, VisitUpdate


router = APIRouter(
    prefix="/visits",
    tags=["Visits"]
)


# ---------------------------------------------------------
# GET ALL VISITS
# ---------------------------------------------------------
@router.get("/")
def get_visits():
    db = get_db()

    try:
        rows = db.execute("""
            SELECT
                v.visit_id,
                v.patient_id,
                p.patient_code,
                p.name AS patient_name,
                v.doctor_id,
                d.doctor_name,
                v.visit_date,
                v.visit_type,
                v.chief_complaint,
                v.clinical_notes,
                v.assessment,
                v.doctor_notes,
                v.follow_up_date,
                v.status,
                v.created_at,
                v.updated_at
            FROM visits v
            JOIN patients p
                ON p.patient_id = v.patient_id
            JOIN doctors d
                ON d.doctor_id = v.doctor_id
            ORDER BY v.visit_id DESC
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        db.close()


# ---------------------------------------------------------
# GET SINGLE VISIT
# ---------------------------------------------------------
@router.get("/{visit_id}")
def get_visit(visit_id: int):
    db = get_db()

    try:
        row = db.execute("""
            SELECT
                v.visit_id,
                v.patient_id,
                p.patient_code,
                p.name AS patient_name,
                v.doctor_id,
                d.doctor_name,
                v.visit_date,
                v.visit_type,
                v.chief_complaint,
                v.clinical_notes,
                v.assessment,
                v.doctor_notes,
                v.follow_up_date,
                v.status,
                v.created_at,
                v.updated_at
            FROM visits v
            JOIN patients p
                ON p.patient_id = v.patient_id
            JOIN doctors d
                ON d.doctor_id = v.doctor_id
            WHERE v.visit_id = ?
        """, (visit_id,)).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Visit not found"
            )

        return dict(row)

    finally:
        db.close()


# ---------------------------------------------------------
# CREATE VISIT
# ---------------------------------------------------------
@router.post("/", status_code=201)
def create_visit(visit: VisitCreate):
    db = get_db()

    try:
        patient = db.execute("""
            SELECT patient_id
            FROM patients
            WHERE patient_id = ?
        """, (visit.patient_id,)).fetchone()

        if patient is None:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        doctor = db.execute("""
            SELECT doctor_id
            FROM doctors
            WHERE doctor_id = ?
              AND is_active = 1
        """, (visit.doctor_id,)).fetchone()

        if doctor is None:
            raise HTTPException(
                status_code=404,
                detail="Active doctor not found"
            )

        cursor = db.execute("""
            INSERT INTO visits (
                patient_id,
                doctor_id,
                visit_date,
                visit_type,
                chief_complaint,
                clinical_notes,
                assessment,
                doctor_notes,
                follow_up_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            visit.patient_id,
            visit.doctor_id,
            visit.visit_date.isoformat(),
            visit.visit_type,
            visit.chief_complaint,
            visit.clinical_notes,
            visit.assessment,
            visit.doctor_notes,
            visit.follow_up_date.isoformat()
            if visit.follow_up_date
            else None,
        ))

        visit_id = cursor.lastrowid

        db.commit()

        row = db.execute("""
            SELECT
                v.visit_id,
                v.patient_id,
                p.patient_code,
                p.name AS patient_name,
                v.doctor_id,
                d.doctor_name,
                v.visit_date,
                v.visit_type,
                v.chief_complaint,
                v.clinical_notes,
                v.assessment,
                v.doctor_notes,
                v.follow_up_date,
                v.status,
                v.created_at,
                v.updated_at
            FROM visits v
            JOIN patients p
                ON p.patient_id = v.patient_id
            JOIN doctors d
                ON d.doctor_id = v.doctor_id
            WHERE v.visit_id = ?
        """, (visit_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create visit: {exc}"
        )

    finally:
        db.close()


# ---------------------------------------------------------
# UPDATE VISIT
# ---------------------------------------------------------
@router.put("/{visit_id}")
def update_visit(
    visit_id: int,
    visit: VisitUpdate
):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT visit_id
            FROM visits
            WHERE visit_id = ?
        """, (visit_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Visit not found"
            )

        update_data = visit.model_dump(
            exclude_unset=True
        )

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update"
            )

        allowed_fields = {
            "doctor_id",
            "visit_date",
            "visit_type",
            "chief_complaint",
            "clinical_notes",
            "assessment",
            "doctor_notes",
            "follow_up_date",
            "status",
        }

        fields = []
        values = []

        for field, value in update_data.items():

            if field not in allowed_fields:
                continue

            if field == "doctor_id":

                doctor = db.execute("""
                    SELECT doctor_id
                    FROM doctors
                    WHERE doctor_id = ?
                      AND is_active = 1
                """, (value,)).fetchone()

                if doctor is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Active doctor not found"
                    )

            if isinstance(value, date):
                value = value.isoformat()

            fields.append(f"{field} = ?")
            values.append(value)

        fields.append("updated_at = CURRENT_TIMESTAMP")

        values.append(visit_id)

        sql = f"""
            UPDATE visits
            SET {", ".join(fields)}
            WHERE visit_id = ?
        """

        db.execute(sql, values)
        db.commit()

        row = db.execute("""
            SELECT
                v.visit_id,
                v.patient_id,
                p.patient_code,
                p.name AS patient_name,
                v.doctor_id,
                d.doctor_name,
                v.visit_date,
                v.visit_type,
                v.chief_complaint,
                v.clinical_notes,
                v.assessment,
                v.doctor_notes,
                v.follow_up_date,
                v.status,
                v.created_at,
                v.updated_at
            FROM visits v
            JOIN patients p
                ON p.patient_id = v.patient_id
            JOIN doctors d
                ON d.doctor_id = v.doctor_id
            WHERE v.visit_id = ?
        """, (visit_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update visit: {exc}"
        )

    finally:
        db.close()


# ---------------------------------------------------------
# DEACTIVATE / CANCEL VISIT
# ---------------------------------------------------------
@router.delete("/{visit_id}")
def cancel_visit(visit_id: int):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT visit_id, status
            FROM visits
            WHERE visit_id = ?
        """, (visit_id,)).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Visit not found"
            )

        db.execute("""
            UPDATE visits
            SET
                status = 'Cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE visit_id = ?
        """, (visit_id,))

        db.commit()

        row = db.execute("""
            SELECT
                visit_id,
                patient_id,
                doctor_id,
                visit_date,
                status,
                updated_at
            FROM visits
            WHERE visit_id = ?
        """, (visit_id,)).fetchone()

        return {
            "message": "Visit cancelled successfully",
            "visit": dict(row)
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel visit: {exc}"
        )

    finally:
        db.close()