from pydantic import BaseModel, ConfigDict


class FamilyHistoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    patient_id: int
    relation: str
    condition: str
    age_at_diagnosis: int | None = None
    notes: str | None = None


class FamilyHistoryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    relation: str | None = None
    condition: str | None = None
    age_at_diagnosis: int | None = None
    notes: str | None = None