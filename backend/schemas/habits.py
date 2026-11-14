from pydantic import BaseModel, ConfigDict


class HabitCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    patient_id: int
    smoking: str | None = None
    smoking_frequency: str | None = None
    alcohol: str | None = None
    alcohol_frequency: str | None = None
    exercise: str | None = None
    exercise_frequency: str | None = None
    sleep_hours: float | None = None
    diet_type: str | None = None
    water_intake: str | None = None
    other_habits: str | None = None
    notes: str | None = None


class HabitUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    smoking: str | None = None
    smoking_frequency: str | None = None
    alcohol: str | None = None
    alcohol_frequency: str | None = None
    exercise: str | None = None
    exercise_frequency: str | None = None
    sleep_hours: float | None = None
    diet_type: str | None = None
    water_intake: str | None = None
    other_habits: str | None = None
    notes: str | None = None