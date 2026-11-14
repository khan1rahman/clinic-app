from pydantic import BaseModel, ConfigDict


class VisitClinicalHistoryPayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    history_of_present_illness: str | None = None
    skin_type: str | None = None
    skin_characteristics: str | None = None
    hair_concerns: str | None = None
    scalp_condition: str | None = None
    past_medical_history: str | None = None
    surgical_history: str | None = None
    medication_history: str | None = None
    family_history: str | None = None
    previous_cosmetic_treatments: str | None = None
