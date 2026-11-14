from pydantic import BaseModel, ConfigDict


class MeasurementCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    visit_id: int
    height_cm: float | None = None
    weight_kg: float | None = None
    bmi: float | None = None
    waist_cm: float | None = None
    hip_cm: float | None = None
    body_fat_percent: float | None = None
    notes: str | None = None


class MeasurementUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    height_cm: float | None = None
    weight_kg: float | None = None
    bmi: float | None = None
    waist_cm: float | None = None
    hip_cm: float | None = None
    body_fat_percent: float | None = None
    notes: str | None = None