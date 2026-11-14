from fastapi import APIRouter, HTTPException
from schemas.subcategories import SubcategoryCreate, SubcategoryUpdate
from database import get_db


router = APIRouter(
    prefix="/subcategories",
    tags=["Subcategories"]
)


@router.get("/")
def get_subcategories():
    connection = get_db()

    rows = connection.execute(
        """
        SELECT
            s.subcategory_id,
            s.category_id,
            c.category_name,
            s.subcategory_name,
            s.description,
            s.is_active,
            s.created_at
        FROM subcategories s
        JOIN categories c
            ON s.category_id = c.category_id
        ORDER BY c.category_name, s.subcategory_name
        """
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]


@router.post("/", status_code=201)
def create_subcategory(subcategory: SubcategoryCreate):
    connection = get_db()

    # Verify category exists
    category = connection.execute(
        """
        SELECT category_id
        FROM categories
        WHERE category_id = ?
        """,
        (subcategory.category_id,)
    ).fetchone()

    if category is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    try:
        cursor = connection.execute(
            """
            INSERT INTO subcategories (
                category_id,
                subcategory_name,
                description
            )
            VALUES (?, ?, ?)
            """,
            (
                subcategory.category_id,
                subcategory.subcategory_name,
                subcategory.description,
            )
        )

        connection.commit()

        subcategory_id = cursor.lastrowid

        row = connection.execute(
            """
            SELECT
                s.subcategory_id,
                s.category_id,
                c.category_name,
                s.subcategory_name,
                s.description,
                s.is_active,
                s.created_at
            FROM subcategories s
            JOIN categories c
                ON s.category_id = c.category_id
            WHERE s.subcategory_id = ?
            """,
            (subcategory_id,)
        ).fetchone()

        return dict(row)

    except Exception as e:
        connection.rollback()

        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=409,
                detail="Subcategory name already exists"
            )

        raise HTTPException(
            status_code=500,
            detail="Failed to create subcategory"
        )

    finally:
        connection.close()


@router.get("/{subcategory_id}")
def get_subcategory(subcategory_id: int):
    connection = get_db()

    row = connection.execute(
        """
        SELECT
            s.subcategory_id,
            s.category_id,
            c.category_name,
            s.subcategory_name,
            s.description,
            s.is_active,
            s.created_at
        FROM subcategories s
        JOIN categories c
            ON s.category_id = c.category_id
        WHERE s.subcategory_id = ?
        """,
        (subcategory_id,)
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Subcategory not found"
        )

    return dict(row)


@router.put("/{subcategory_id}")
def update_subcategory(
    subcategory_id: int,
    subcategory: SubcategoryUpdate
):
    connection = get_db()

    existing = connection.execute(
        """
        SELECT subcategory_id
        FROM subcategories
        WHERE subcategory_id = ?
        """,
        (subcategory_id,)
    ).fetchone()

    if existing is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Subcategory not found"
        )

    update_data = subcategory.model_dump(
        exclude_unset=True
    )

    if not update_data:
        connection.close()
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    # If category_id is being changed, verify the new category
    if "category_id" in update_data:
        category = connection.execute(
            """
            SELECT category_id
            FROM categories
            WHERE category_id = ?
            """,
            (update_data["category_id"],)
        ).fetchone()

        if category is None:
            connection.close()
            raise HTTPException(
                status_code=404,
                detail="Category not found"
            )

    fields = []
    values = []

    for field, value in update_data.items():
        fields.append(f"{field} = ?")
        values.append(value)

    values.append(subcategory_id)

    query = f"""
        UPDATE subcategories
        SET {", ".join(fields)}
        WHERE subcategory_id = ?
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
                detail="Subcategory name already exists"
            )

        connection.close()
        raise HTTPException(
            status_code=500,
            detail="Failed to update subcategory"
        )

    row = connection.execute(
        """
        SELECT
            s.subcategory_id,
            s.category_id,
            c.category_name,
            s.subcategory_name,
            s.description,
            s.is_active,
            s.created_at
        FROM subcategories s
        JOIN categories c
            ON s.category_id = c.category_id
        WHERE s.subcategory_id = ?
        """,
        (subcategory_id,)
    ).fetchone()

    connection.close()

    return dict(row)


@router.delete("/{subcategory_id}")
def deactivate_subcategory(subcategory_id: int):
    connection = get_db()

    existing = connection.execute(
        """
        SELECT subcategory_id
        FROM subcategories
        WHERE subcategory_id = ?
        """,
        (subcategory_id,)
    ).fetchone()

    if existing is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Subcategory not found"
        )

    connection.execute(
        """
        UPDATE subcategories
        SET is_active = 0
        WHERE subcategory_id = ?
        """,
        (subcategory_id,)
    )

    connection.commit()
    connection.close()

    return {
        "message": "Subcategory deactivated successfully",
        "subcategory_id": subcategory_id
    }