from pydantic import BaseModel, ConfigDict


class MedicineCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    medicine_name: str
    generic_name: str | None = None
    form: str | None = None
    strength: str | None = None
    manufacturer: str | None = None
    notes: str | None = None


class MedicineUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    medicine_name: str | None = None
    generic_name: str | None = None
    form: str | None = None
    strength: str | None = None
    manufacturer: str | None = None
    notes: str | None = None