from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PrescriptionCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    patient_id: int
    visit_id: int
    doctor_id: int
    prescription_date: datetime | None = None
    general_instructions: str | None = None
    laboratory_tests: str | None = None
    follow_up_date: date | None = None


class PrescriptionUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    doctor_id: int | None = None
    prescription_date: datetime | None = None
    general_instructions: str | None = None
    laboratory_tests: str | None = None
    follow_up_date: date | None = None
    pdf_path: str | None = None