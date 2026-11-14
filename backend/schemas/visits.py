from datetime import date

from pydantic import BaseModel, ConfigDict


class VisitCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    patient_id: int
    doctor_id: int
    visit_date: date
    visit_type: str | None = None
    chief_complaint: str | None = None
    clinical_notes: str | None = None
    assessment: str | None = None
    doctor_notes: str | None = None
    follow_up_date: date | None = None


class VisitUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    doctor_id: int | None = None
    visit_date: date | None = None
    visit_type: str | None = None
    chief_complaint: str | None = None
    clinical_notes: str | None = None
    assessment: str | None = None
    doctor_notes: str | None = None
    follow_up_date: date | None = None
    status: str | None = None