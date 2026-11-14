from datetime import date

from pydantic import BaseModel, ConfigDict


class PastHistoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    patient_id: int
    history_type: str
    condition_name: str
    diagnosis_date: date | None = None
    status: str | None = None
    treatment_details: str | None = None
    notes: str | None = None


class PastHistoryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    history_type: str | None = None
    condition_name: str | None = None
    diagnosis_date: date | None = None
    status: str | None = None
    treatment_details: str | None = None
    notes: str | None = None