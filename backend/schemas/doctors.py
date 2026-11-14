from pydantic import BaseModel, ConfigDict


class DoctorCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    doctor_name: str
    specialization: str | None = None
    mobile_no: str | None = None
    email: str | None = None


class DoctorUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    doctor_name: str | None = None
    specialization: str | None = None
    mobile_no: str | None = None
    email: str | None = None