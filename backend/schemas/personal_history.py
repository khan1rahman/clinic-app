from pydantic import BaseModel, ConfigDict


class PersonalHistoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    patient_id: int
    diet_details: str | None = None
    sleep_details: str | None = None
    exercise_details: str | None = None
    lifestyle_details: str | None = None
    other_details: str | None = None
    notes: str | None = None


class PersonalHistoryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    diet_details: str | None = None
    sleep_details: str | None = None
    exercise_details: str | None = None
    lifestyle_details: str | None = None
    other_details: str | None = None
    notes: str | None = None