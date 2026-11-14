from pydantic import BaseModel, ConfigDict


class PrescriptionItemCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    prescription_id: int
    medicine_id: int

    dosage_quantity: str
    dosage_unit: str
    frequency: str
    meal_timing: str
    duration_days: int

    sequence_no: int = 1


class PrescriptionItemUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    medicine_id: int | None = None

    dosage_quantity: str | None = None
    dosage_unit: str | None = None
    frequency: str | None = None
    meal_timing: str | None = None
    duration_days: int | None = None

    sequence_no: int | None = None