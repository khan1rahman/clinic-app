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