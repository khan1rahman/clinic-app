-- ClinicApp: visit-specific clinical/cosmetic history
-- Safe, additive migration. Existing tables and records are not modified.
CREATE TABLE IF NOT EXISTS visit_clinical_history (
    clinical_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL UNIQUE,
    history_of_present_illness TEXT,
    skin_type TEXT,
    skin_characteristics TEXT,
    hair_concerns TEXT,
    scalp_condition TEXT,
    past_medical_history TEXT,
    surgical_history TEXT,
    medication_history TEXT,
    family_history TEXT,
    previous_cosmetic_treatments TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(visit_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_visit_clinical_history_visit
    ON visit_clinical_history(visit_id);
