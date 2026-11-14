from fastapi import APIRouter, HTTPException
from schemas.categories import CategoryCreate, CategoryUpdate
from database import get_db


router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)


@router.get("/")
def get_categories():
    connection = get_db()

    rows = connection.execute(
        """
        SELECT
            category_id,
            category_name,
            description,
            is_active,
            created_at
        FROM categories
        ORDER BY category_name
        """
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]


@router.post("/", status_code=201)
def create_category(category: CategoryCreate):
    connection = get_db()

    try:
        cursor = connection.execute(
            """
            INSERT INTO categories (
                category_name,
                description
            )
            VALUES (?, ?)
            """,
            (
                category.category_name,
                category.description,
            )
        )

        connection.commit()

        category_id = cursor.lastrowid

        row = connection.execute(
            """
            SELECT
                category_id,
                category_name,
                description,
                is_active,
                created_at
            FROM categories
            WHERE category_id = ?
            """,
            (category_id,)
        ).fetchone()

        return dict(row)

    except Exception as e:
        connection.rollback()

        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=409,
                detail="Category name already exists"
            )

        raise HTTPException(
            status_code=500,
            detail="Failed to create category"
        )

    finally:
        connection.close()


@router.get("/{category_id}")
def get_category(category_id: int):
    connection = get_db()

    row = connection.execute(
        """
        SELECT
            category_id,
            category_name,
            description,
            is_active,
            created_at
        FROM categories
        WHERE category_id = ?
        """,
        (category_id,)
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    return dict(row)


@router.put("/{category_id}")
def update_category(
    category_id: int,
    category: CategoryUpdate
):
    connection = get_db()

    existing = connection.execute(
        """
        SELECT category_id
        FROM categories
        WHERE category_id = ?
        """,
        (category_id,)
    ).fetchone()

    if existing is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    update_data = category.model_dump(
        exclude_unset=True
    )

    if not update_data:
        connection.close()
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    fields = []
    values = []

    for field, value in update_data.items():
        fields.append(f"{field} = ?")
        values.append(value)

    values.append(category_id)

    query = f"""
        UPDATE categories
        SET {", ".join(fields)}
        WHERE category_id = ?
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
                detail="Category name already exists"
            )

        connection.close()
        raise HTTPException(
            status_code=500,
            detail="Failed to update category"
        )

    row = connection.execute(
        """
        SELECT
            category_id,
            category_name,
            description,
            is_active,
            created_at
        FROM categories
        WHERE category_id = ?
        """,
        (category_id,)
    ).fetchone()

    connection.close()

    return dict(row)


@router.delete("/{category_id}")
def deactivate_category(category_id: int):
    connection = get_db()

    existing = connection.execute(
        """
        SELECT category_id
        FROM categories
        WHERE category_id = ?
        """,
        (category_id,)
    ).fetchone()

    if existing is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    connection.execute(
        """
        UPDATE categories
        SET is_active = 0
        WHERE category_id = ?
        """,
        (category_id,)
    )

    connection.commit()
    connection.close()

    return {
        "message": "Category deactivated successfully",
        "category_id": category_id
    }