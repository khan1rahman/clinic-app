from fastapi import APIRouter, HTTPException

from database import get_db
from schemas.clinical_history import VisitClinicalHistoryPayload

router = APIRouter(prefix="/visits", tags=["Visit Clinical History"])


@router.get("/{visit_id}/clinical-history")
def get_visit_clinical_history(visit_id: int):
    db = get_db()
    try:
        visit = db.execute(
            "SELECT visit_id FROM visits WHERE visit_id = ?", (visit_id,)
        ).fetchone()
        if visit is None:
            raise HTTPException(status_code=404, detail="Visit not found")

        row = db.execute(
            "SELECT * FROM visit_clinical_history WHERE visit_id = ?",
            (visit_id,),
        ).fetchone()
        if row is None:
            return {
                "visit_id": visit_id,
                "history_of_present_illness": None,
                "skin_type": None,
                "skin_characteristics": None,
                "hair_concerns": None,
                "scalp_condition": None,
                "past_medical_history": None,
                "surgical_history": None,
                "medication_history": None,
                "family_history": None,
                "previous_cosmetic_treatments": None,
            }
        return dict(row)
    finally:
        db.close()


@router.put("/{visit_id}/clinical-history")
def save_visit_clinical_history(visit_id: int, payload: VisitClinicalHistoryPayload):
    db = get_db()
    try:
        visit = db.execute(
            "SELECT visit_id FROM visits WHERE visit_id = ?", (visit_id,)
        ).fetchone()
        if visit is None:
            raise HTTPException(status_code=404, detail="Visit not found")

        values = payload.model_dump()
        ordered_values = (
            values["history_of_present_illness"],
            values["skin_type"],
            values["skin_characteristics"],
            values["hair_concerns"],
            values["scalp_condition"],
            values["past_medical_history"],
            values["surgical_history"],
            values["medication_history"],
            values["family_history"],
            values["previous_cosmetic_treatments"],
        )
        db.execute(
            """
            INSERT INTO visit_clinical_history (
                visit_id, history_of_present_illness, skin_type,
                skin_characteristics, hair_concerns, scalp_condition,
                past_medical_history, surgical_history, medication_history,
                family_history, previous_cosmetic_treatments
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(visit_id) DO UPDATE SET
                history_of_present_illness = excluded.history_of_present_illness,
                skin_type = excluded.skin_type,
                skin_characteristics = excluded.skin_characteristics,
                hair_concerns = excluded.hair_concerns,
                scalp_condition = excluded.scalp_condition,
                past_medical_history = excluded.past_medical_history,
                surgical_history = excluded.surgical_history,
                medication_history = excluded.medication_history,
                family_history = excluded.family_history,
                previous_cosmetic_treatments = excluded.previous_cosmetic_treatments,
                updated_at = CURRENT_TIMESTAMP
            """,
            (visit_id, *ordered_values),
        )
        db.commit()
        row = db.execute(
            "SELECT * FROM visit_clinical_history WHERE visit_id = ?",
            (visit_id,),
        ).fetchone()
        return dict(row)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to save clinical history: {exc}"
        )
    finally:
        db.close()
