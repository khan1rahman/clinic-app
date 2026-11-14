from fastapi import APIRouter, HTTPException
from schemas.treatments import TreatmentCreate, TreatmentUpdate
from database import get_db


router = APIRouter(
    prefix="/treatments",
    tags=["Treatments"]
)


@router.get("/")
def get_treatments():
    connection = get_db()

    rows = connection.execute(
        """
        SELECT
            t.treatment_id,
            t.subcategory_id,
            s.subcategory_name,
            s.category_id,
            c.category_name,
            t.treatment_name,
            t.description,
            t.is_active,
            t.created_at
        FROM treatments t
        JOIN subcategories s
            ON t.subcategory_id = s.subcategory_id
        JOIN categories c
            ON s.category_id = c.category_id
        ORDER BY c.category_name,
                 s.subcategory_name,
                 t.treatment_name
        """
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]


@router.post("/", status_code=201)
def create_treatment(treatment: TreatmentCreate):
    connection = get_db()

    # Verify subcategory exists
    subcategory = connection.execute(
        """
        SELECT subcategory_id
        FROM subcategories
        WHERE subcategory_id = ?
        """,
        (treatment.subcategory_id,)
    ).fetchone()

    if subcategory is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Subcategory not found"
        )

    try:
        cursor = connection.execute(
            """
            INSERT INTO treatments (
                subcategory_id,
                treatment_name,
                description
            )
            VALUES (?, ?, ?)
            """,
            (
                treatment.subcategory_id,
                treatment.treatment_name,
                treatment.description,
            )
        )

        connection.commit()

        treatment_id = cursor.lastrowid

        row = connection.execute(
            """
            SELECT
                t.treatment_id,
                t.subcategory_id,
                s.subcategory_name,
                s.category_id,
                c.category_name,
                t.treatment_name,
                t.description,
                t.is_active,
                t.created_at
            FROM treatments t
            JOIN subcategories s
                ON t.subcategory_id = s.subcategory_id
            JOIN categories c
                ON s.category_id = c.category_id
            WHERE t.treatment_id = ?
            """,
            (treatment_id,)
        ).fetchone()

        return dict(row)

    except Exception as e:
        connection.rollback()

        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=409,
                detail="Treatment name already exists"
            )

        raise HTTPException(
            status_code=500,
            detail="Failed to create treatment"
        )

    finally:
        connection.close()


@router.get("/{treatment_id}")
def get_treatment(treatment_id: int):
    connection = get_db()

    row = connection.execute(
        """
        SELECT
            t.treatment_id,
            t.subcategory_id,
            s.subcategory_name,
            s.category_id,
            c.category_name,
            t.treatment_name,
            t.description,
            t.is_active,
            t.created_at
        FROM treatments t
        JOIN subcategories s
            ON t.subcategory_id = s.subcategory_id
        JOIN categories c
            ON s.category_id = c.category_id
        WHERE t.treatment_id = ?
        """,
        (treatment_id,)
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Treatment not found"
        )

    return dict(row)


@router.put("/{treatment_id}")
def update_treatment(
    treatment_id: int,
    treatment: TreatmentUpdate
):
    connection = get_db()

    existing = connection.execute(
        """
        SELECT treatment_id
        FROM treatments
        WHERE treatment_id = ?
        """,
        (treatment_id,)
    ).fetchone()

    if existing is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Treatment not found"
        )

    update_data = treatment.model_dump(
        exclude_unset=True
    )

    if not update_data:
        connection.close()
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    # If subcategory_id is being changed,
    # verify the new subcategory exists.
    if "subcategory_id" in update_data:
        subcategory = connection.execute(
            """
            SELECT subcategory_id
            FROM subcategories
            WHERE subcategory_id = ?
            """,
            (update_data["subcategory_id"],)
        ).fetchone()

        if subcategory is None:
            connection.close()
            raise HTTPException(
                status_code=404,
                detail="Subcategory not found"
            )

    fields = []
    values = []

    for field, value in update_data.items():
        fields.append(f"{field} = ?")
        values.append(value)

    values.append(treatment_id)

    query = f"""
        UPDATE treatments
        SET {", ".join(fields)}
        WHERE treatment_id = ?
    """

    try:
        connection.execute(query, values)
        connection.commit()

    except Exception as e:
        connection.rollback()

        if "UNIQUE constraint failed" in str(e):
            connection.close()
            raise HTTPException(
                status_code=409,
                detail="Treatment name already exists"
            )

        connection.close()
        raise HTTPException(
            status_code=500,
            detail="Failed to update treatment"
        )

    row = connection.execute(
        """
        SELECT
            t.treatment_id,
            t.subcategory_id,
            s.subcategory_name,
            s.category_id,
            c.category_name,
            t.treatment_name,
            t.description,
            t.is_active,
            t.created_at
        FROM treatments t
        JOIN subcategories s
            ON t.subcategory_id = s.subcategory_id
        JOIN categories c
            ON s.category_id = c.category_id
        WHERE t.treatment_id = ?
        """,
        (treatment_id,)
    ).fetchone()

    connection.close()

    return dict(row)


@router.delete("/{treatment_id}")
def deactivate_treatment(treatment_id: int):
    connection = get_db()

    existing = connection.execute(
        """
        SELECT treatment_id
        FROM treatments
        WHERE treatment_id = ?
        """,
        (treatment_id,)
    ).fetchone()

    if existing is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Treatment not found"
        )

    connection.execute(
        """
        UPDATE treatments
        SET is_active = 0
        WHERE treatment_id = ?
        """,
        (treatment_id,)
    )

    connection.commit()
    connection.close()

    return {
        "message": "Treatment deactivated successfully",
        "treatment_id": treatment_id
    }