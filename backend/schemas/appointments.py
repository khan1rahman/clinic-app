from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class AppointmentCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    appointment_timestamp: datetime
    patient_id: int

    visit_type: str = Field(
        ...,
        pattern="^(First Visit|Repeat Visit)$"
    )

    queue_number: int | None = None

    status: str = Field(
        default="Scheduled",
        pattern="^(Scheduled|Waiting|In Consultation|Completed|Cancelled|No Show)$"
    )

    cancellation_reason: str | None = None

    treated: int = Field(
        default=0,
        ge=0,
        le=1
    )

    category_id: int
    subcategory_id: int | None = None
    treatment_id: int | None = None
    doctor_id: int | None = None

    notes: str | None = None


class AppointmentUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    appointment_timestamp: datetime | None = None

    patient_id: int | None = None

    visit_type: str | None = Field(
        default=None,
        pattern="^(First Visit|Repeat Visit)$"
    )

    queue_number: int | None = None

    status: str | None = Field(
        default=None,
        pattern="^(Scheduled|Waiting|In Consultation|Completed|Cancelled|No Show)$"
    )

    cancellation_reason: str | None = None

    treated: int | None = Field(
        default=None,
        ge=0,
        le=1
    )

    category_id: int | None = None
    subcategory_id: int | None = None
    treatment_id: int | None = None
    doctor_id: int | None = None

    notes: str | None = None