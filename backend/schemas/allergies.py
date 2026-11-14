from pydantic import BaseModel, ConfigDict


class AllergyCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    patient_id: int
    allergen: str
    reaction: str | None = None
    severity: str | None = None
    notes: str | None = None


class AllergyUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    allergen: str | None = None
    reaction: str | None = None
    severity: str | None = None
    notes: str | None = None