from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.habits import HabitCreate, HabitUpdate


router = APIRouter(
    prefix="/habits",
    tags=["Patient Habits"]
)


@router.get("/")
def get_habits():
    db = get_db()
    try:
        rows = db.execute("""
            SELECT
                h.habit_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.smoking,
                h.smoking_frequency,
                h.alcohol,
                h.alcohol_frequency,
                h.exercise,
                h.exercise_frequency,
                h.sleep_hours,
                h.diet_type,
                h.water_intake,
                h.other_habits,
                h.notes,
                h.created_at,
                h.updated_at
            FROM patient_habits h
            JOIN patients p
                ON p.patient_id = h.patient_id
            ORDER BY h.habit_id DESC
        """).fetchall()

        return [dict(row) for row in rows]

    finally:
        db.close()


@router.get("/{habit_id}")
def get_habit(habit_id: int):
    db = get_db()
    try:
        row = db.execute("""
            SELECT
                h.habit_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.smoking,
                h.smoking_frequency,
                h.alcohol,
                h.alcohol_frequency,
                h.exercise,
                h.exercise_frequency,
                h.sleep_hours,
                h.diet_type,
                h.water_intake,
                h.other_habits,
                h.notes,
                h.created_at,
                h.updated_at
            FROM patient_habits h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.habit_id = ?
        """, (habit_id,)).fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Habit record not found")

        return dict(row)

    finally:
        db.close()


@router.post("/", status_code=201)
def create_habit(habit: HabitCreate):
    db = get_db()

    try:
        patient = db.execute("""
            SELECT patient_id
            FROM patients
            WHERE patient_id = ?
        """, (habit.patient_id,)).fetchone()

        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        existing = db.execute("""
            SELECT habit_id
            FROM patient_habits
            WHERE patient_id = ?
        """, (habit.patient_id,)).fetchone()

        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail="Habit profile already exists for this patient"
            )

        cursor = db.execute("""
            INSERT INTO patient_habits (
                patient_id,
                smoking,
                smoking_frequency,
                alcohol,
                alcohol_frequency,
                exercise,
                exercise_frequency,
                sleep_hours,
                diet_type,
                water_intake,
                other_habits,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            habit.patient_id,
            habit.smoking,
            habit.smoking_frequency,
            habit.alcohol,
            habit.alcohol_frequency,
            habit.exercise,
            habit.exercise_frequency,
            habit.sleep_hours,
            habit.diet_type,
            habit.water_intake,
            habit.other_habits,
            habit.notes,
        ))

        habit_id = cursor.lastrowid
        db.commit()

        row = db.execute("""
            SELECT
                h.habit_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.smoking,
                h.smoking_frequency,
                h.alcohol,
                h.alcohol_frequency,
                h.exercise,
                h.exercise_frequency,
                h.sleep_hours,
                h.diet_type,
                h.water_intake,
                h.other_habits,
                h.notes,
                h.created_at,
                h.updated_at
            FROM patient_habits h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.habit_id = ?
        """, (habit_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create habit profile: {exc}"
        )

    finally:
        db.close()


@router.put("/{habit_id}")
def update_habit(habit_id: int, habit: HabitUpdate):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT habit_id
            FROM patient_habits
            WHERE habit_id = ?
        """, (habit_id,)).fetchone()

        if existing is None:
            raise HTTPException(status_code=404, detail="Habit record not found")

        update_data = habit.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields provided for update"
            )

        allowed_fields = {
            "smoking",
            "smoking_frequency",
            "alcohol",
            "alcohol_frequency",
            "exercise",
            "exercise_frequency",
            "sleep_hours",
            "diet_type",
            "water_intake",
            "other_habits",
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

        fields.append("updated_at = CURRENT_TIMESTAMP")
        values.append(habit_id)

        sql = f"""
            UPDATE patient_habits
            SET {", ".join(fields)}
            WHERE habit_id = ?
        """

        db.execute(sql, values)
        db.commit()

        row = db.execute("""
            SELECT
                h.habit_id,
                h.patient_id,
                p.patient_code,
                p.name AS patient_name,
                h.smoking,
                h.smoking_frequency,
                h.alcohol,
                h.alcohol_frequency,
                h.exercise,
                h.exercise_frequency,
                h.sleep_hours,
                h.diet_type,
                h.water_intake,
                h.other_habits,
                h.notes,
                h.created_at,
                h.updated_at
            FROM patient_habits h
            JOIN patients p
                ON p.patient_id = h.patient_id
            WHERE h.habit_id = ?
        """, (habit_id,)).fetchone()

        return dict(row)

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update habit profile: {exc}"
        )

    finally:
        db.close()


@router.delete("/{habit_id}")
def delete_habit(habit_id: int):
    db = get_db()

    try:
        existing = db.execute("""
            SELECT habit_id
            FROM patient_habits
            WHERE habit_id = ?
        """, (habit_id,)).fetchone()

        if existing is None:
            raise HTTPException(status_code=404, detail="Habit record not found")

        db.execute("""
            DELETE FROM patient_habits
            WHERE habit_id = ?
        """, (habit_id,))

        db.commit()

        return {
            "message": "Habit profile deleted successfully",
            "habit_id": habit_id
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete habit profile: {exc}"
        )

    finally:
        db.close()