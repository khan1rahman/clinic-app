from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.appointments import AppointmentCreate, AppointmentUpdate


router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"]
)


def validate_appointment_relationships(
    connection,
    patient_id: int,
    category_id: int,
    subcategory_id: int | None = None,
    treatment_id: int | None = None,
    doctor_id: int | None = None,
):
    # Validate patient
    patient = connection.execute(
        """
        SELECT patient_id
        FROM patients
        WHERE patient_id = ?
        """,
        (patient_id,)
    ).fetchone()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    # Validate category
    category = connection.execute(
        """
        SELECT category_id
        FROM categories
        WHERE category_id = ?
          AND is_active = 1
        """,
        (category_id,)
    ).fetchone()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Active category not found"
        )

    # Validate subcategory belongs to category
    if subcategory_id is not None:
        subcategory = connection.execute(
            """
            SELECT subcategory_id
            FROM subcategories
            WHERE subcategory_id = ?
              AND category_id = ?
              AND is_active = 1
            """,
            (subcategory_id, category_id)
        ).fetchone()

        if not subcategory:
            raise HTTPException(
                status_code=400,
                detail="Subcategory does not belong to the selected category"
            )

    # Validate treatment belongs to subcategory
    if treatment_id is not None:
        if subcategory_id is None:
            raise HTTPException(
                status_code=400,
                detail="Subcategory is required when treatment is selected"
            )

        treatment = connection.execute(
            """
            SELECT treatment_id
            FROM treatments
            WHERE treatment_id = ?
              AND subcategory_id = ?
              AND is_active = 1
            """,
            (treatment_id, subcategory_id)
        ).fetchone()

        if not treatment:
            raise HTTPException(
                status_code=400,
                detail="Treatment does not belong to the selected subcategory"
            )

    # Validate doctor
    if doctor_id is not None:
        doctor = connection.execute(
            """
            SELECT doctor_id
            FROM doctors
            WHERE doctor_id = ?
              AND is_active = 1
            """,
            (doctor_id,)
        ).fetchone()

        if not doctor:
            raise HTTPException(
                status_code=404,
                detail="Active doctor not found"
            )


@router.get("/")
def get_appointments():
    connection = get_db()

    try:
        rows = connection.execute(
            """
            SELECT
                a.appointment_id,
                a.appointment_timestamp,
                a.patient_id,
                p.patient_code,
                p.name AS patient_name,

                a.visit_type,
                a.queue_number,
                a.status,
                a.cancellation_reason,
                a.treated,

                a.category_id,
                c.category_name,

                a.subcategory_id,
                sc.subcategory_name,

                a.treatment_id,
                t.treatment_name,

                a.doctor_id,
                d.doctor_name,

                a.notes,
                a.created_at,
                a.updated_at

            FROM appointments a

            INNER JOIN patients p
                ON a.patient_id = p.patient_id

            INNER JOIN categories c
                ON a.category_id = c.category_id

            LEFT JOIN subcategories sc
                ON a.subcategory_id = sc.subcategory_id

            LEFT JOIN treatments t
                ON a.treatment_id = t.treatment_id

            LEFT JOIN doctors d
                ON a.doctor_id = d.doctor_id

            ORDER BY a.appointment_timestamp ASC,
                     a.queue_number ASC,
                     a.appointment_id ASC
            """
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


@router.post("/", status_code=201)
def create_appointment(appointment: AppointmentCreate):
    connection = get_db()

    try:
        validate_appointment_relationships(
            connection,
            appointment.patient_id,
            appointment.category_id,
            appointment.subcategory_id,
            appointment.treatment_id,
            appointment.doctor_id,
        )

        cursor = connection.execute(
            """
            INSERT INTO appointments (
                appointment_timestamp,
                patient_id,
                visit_type,
                queue_number,
                status,
                cancellation_reason,
                treated,
                category_id,
                subcategory_id,
                treatment_id,
                doctor_id,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                appointment.appointment_timestamp,
                appointment.patient_id,
                appointment.visit_type,
                appointment.queue_number,
                appointment.status,
                appointment.cancellation_reason,
                appointment.treated,
                appointment.category_id,
                appointment.subcategory_id,
                appointment.treatment_id,
                appointment.doctor_id,
                appointment.notes,
            )
        )

        connection.commit()

        appointment_id = cursor.lastrowid

        row = connection.execute(
            """
            SELECT *
            FROM appointments
            WHERE appointment_id = ?
            """,
            (appointment_id,)
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.get("/{appointment_id}")
def get_appointment(appointment_id: int):
    connection = get_db()

    try:
        row = connection.execute(
            """
            SELECT
                a.appointment_id,
                a.appointment_timestamp,
                a.patient_id,
                p.patient_code,
                p.name AS patient_name,

                a.visit_type,
                a.queue_number,
                a.status,
                a.cancellation_reason,
                a.treated,

                a.category_id,
                c.category_name,

                a.subcategory_id,
                sc.subcategory_name,

                a.treatment_id,
                t.treatment_name,

                a.doctor_id,
                d.doctor_name,

                a.notes,
                a.created_at,
                a.updated_at

            FROM appointments a

            INNER JOIN patients p
                ON a.patient_id = p.patient_id

            INNER JOIN categories c
                ON a.category_id = c.category_id

            LEFT JOIN subcategories sc
                ON a.subcategory_id = sc.subcategory_id

            LEFT JOIN treatments t
                ON a.treatment_id = t.treatment_id

            LEFT JOIN doctors d
                ON a.doctor_id = d.doctor_id

            WHERE a.appointment_id = ?
            """,
            (appointment_id,)
        ).fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found"
            )

        return dict(row)

    finally:
        connection.close()


@router.put("/{appointment_id}")
def update_appointment(
    appointment_id: int,
    appointment: AppointmentUpdate
):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT *
            FROM appointments
            WHERE appointment_id = ?
            """,
            (appointment_id,)
        ).fetchone()

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found"
            )

        current = dict(existing)

        patient_id = (
            appointment.patient_id
            if appointment.patient_id is not None
            else current["patient_id"]
        )

        category_id = (
            appointment.category_id
            if appointment.category_id is not None
            else current["category_id"]
        )

        subcategory_id = (
            appointment.subcategory_id
            if appointment.subcategory_id is not None
            else current["subcategory_id"]
        )

        treatment_id = (
            appointment.treatment_id
            if appointment.treatment_id is not None
            else current["treatment_id"]
        )

        doctor_id = (
            appointment.doctor_id
            if appointment.doctor_id is not None
            else current["doctor_id"]
        )

        validate_appointment_relationships(
            connection,
            patient_id,
            category_id,
            subcategory_id,
            treatment_id,
            doctor_id,
        )

        updated_values = {
            "appointment_timestamp": (
                appointment.appointment_timestamp
                if appointment.appointment_timestamp is not None
                else current["appointment_timestamp"]
            ),
            "patient_id": patient_id,
            "visit_type": (
                appointment.visit_type
                if appointment.visit_type is not None
                else current["visit_type"]
            ),
            "queue_number": (
                appointment.queue_number
                if appointment.queue_number is not None
                else current["queue_number"]
            ),
            "status": (
                appointment.status
                if appointment.status is not None
                else current["status"]
            ),
            "cancellation_reason": (
                appointment.cancellation_reason
                if appointment.cancellation_reason is not None
                else current["cancellation_reason"]
            ),
            "treated": (
                appointment.treated
                if appointment.treated is not None
                else current["treated"]
            ),
            "category_id": category_id,
            "subcategory_id": subcategory_id,
            "treatment_id": treatment_id,
            "doctor_id": doctor_id,
            "notes": (
                appointment.notes
                if appointment.notes is not None
                else current["notes"]
            ),
        }

        connection.execute(
            """
            UPDATE appointments
            SET
                appointment_timestamp = ?,
                patient_id = ?,
                visit_type = ?,
                queue_number = ?,
                status = ?,
                cancellation_reason = ?,
                treated = ?,
                category_id = ?,
                subcategory_id = ?,
                treatment_id = ?,
                doctor_id = ?,
                notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE appointment_id = ?
            """,
            (
                updated_values["appointment_timestamp"],
                updated_values["patient_id"],
                updated_values["visit_type"],
                updated_values["queue_number"],
                updated_values["status"],
                updated_values["cancellation_reason"],
                updated_values["treated"],
                updated_values["category_id"],
                updated_values["subcategory_id"],
                updated_values["treatment_id"],
                updated_values["doctor_id"],
                updated_values["notes"],
                appointment_id,
            )
        )

        connection.commit()

        row = connection.execute(
            """
            SELECT *
            FROM appointments
            WHERE appointment_id = ?
            """,
            (appointment_id,)
        ).fetchone()

        return dict(row)

    finally:
        connection.close()


@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: int):
    connection = get_db()

    try:
        existing = connection.execute(
            """
            SELECT appointment_id
            FROM appointments
            WHERE appointment_id = ?
            """,
            (appointment_id,)
        ).fetchone()

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found"
            )

        connection.execute(
            """
            UPDATE appointments
            SET
                status = 'Cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE appointment_id = ?
            """,
            (appointment_id,)
        )

        connection.commit()

        return {
            "message": "Appointment cancelled successfully",
            "appointment_id": appointment_id
        }

    finally:
        connection.close()