from pydantic import BaseModel, ConfigDict


class TreatmentCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    subcategory_id: int
    treatment_name: str
    description: str | None = None


class TreatmentUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    subcategory_id: int | None = None
    treatment_name: str | None = None
    description: str | None = None