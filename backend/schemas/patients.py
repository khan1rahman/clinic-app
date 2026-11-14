from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict


class PatientCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str
    sex: Literal["Male", "Female"]
    date_of_birth: date
    mobile_no: str | None = None
    email: str | None = None
    occupation: str | None = None
    address: str | None = None
    city: str | None = None
    first_appointment_date: date | None = None


class PatientUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = None
    sex: Literal["Male", "Female"] | None = None
    date_of_birth: date | None = None
    mobile_no: str | None = None
    email: str | None = None
    occupation: str | None = None
    address: str | None = None
    city: str | None = None
    first_appointment_date: date | None = None