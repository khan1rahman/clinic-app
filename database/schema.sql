PRAGMA foreign_keys = ON;

-- ============================================================
-- DOCTORS
-- ============================================================

CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_name TEXT NOT NULL,
    specialization TEXT,
    mobile_no TEXT,
    email TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0,1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- PATIENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    sex TEXT NOT NULL
        CHECK (sex IN ('Male','Female')),
    date_of_birth DATE,
    mobile_no TEXT,
    email TEXT,
    occupation TEXT,
    address TEXT,
    city TEXT,
    first_appointment_date DATE,
    status TEXT NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active','Inactive')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- PATIENT HABITS
-- One current habit profile per patient
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_habits (
    habit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    smoking TEXT,
    smoking_frequency TEXT,
    alcohol TEXT,
    alcohol_frequency TEXT,
    exercise TEXT,
    exercise_frequency TEXT,
    sleep_hours REAL,
    diet_type TEXT,
    water_intake TEXT,
    other_habits TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


-- ============================================================
-- PATIENT PERSONAL HISTORY
-- One current personal-history profile per patient
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_personal_history (
    personal_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    diet_details TEXT,
    sleep_details TEXT,
    exercise_details TEXT,
    lifestyle_details TEXT,
    other_details TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


-- ============================================================
-- PATIENT PAST HISTORY
-- Multiple records per patient
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_past_history (
    past_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    history_type TEXT NOT NULL,
    condition_name TEXT NOT NULL,
    diagnosis_date DATE,
    status TEXT,
    treatment_details TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


-- ============================================================
-- PATIENT FAMILY HISTORY
-- Multiple records per patient
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_family_history (
    family_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    relation TEXT NOT NULL,
    condition TEXT NOT NULL,
    age_at_diagnosis INTEGER,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


-- ============================================================
-- PATIENT ALLERGIES
-- Multiple records per patient
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_allergies (
    allergy_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    allergen TEXT NOT NULL,
    reaction TEXT,
    severity TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


-- ============================================================
-- VISITS
-- Every actual patient visit gets a new record
-- ============================================================

CREATE TABLE IF NOT EXISTS visits (
    visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    visit_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    visit_type TEXT NOT NULL DEFAULT 'Initial Consultation',
    chief_complaint TEXT,
    clinical_notes TEXT,
    assessment TEXT,
    doctor_notes TEXT,
    follow_up_date DATE,
    status TEXT NOT NULL DEFAULT 'Completed',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (doctor_id)
        REFERENCES doctors(doctor_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    UNIQUE (patient_id, visit_id)
);


-- ============================================================
-- PATIENT MEASUREMENTS
-- Historical measurements linked to a visit
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_measurements (
    measurement_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    visit_id INTEGER NOT NULL,
    measurement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    height_cm REAL,
    weight_kg REAL,
    bmi REAL,
    waist_cm REAL,
    hip_cm REAL,
    body_fat_percent REAL,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id, visit_id)
        REFERENCES visits(patient_id, visit_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0,1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- SUBCATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS subcategories (
    subcategory_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    subcategory_name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0,1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    UNIQUE (category_id, subcategory_name)
);


-- ============================================================
-- TREATMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS treatments (
    treatment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    subcategory_id INTEGER NOT NULL,
    treatment_name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0,1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (subcategory_id)
        REFERENCES subcategories(subcategory_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    UNIQUE (subcategory_id, treatment_name)
);


-- ============================================================
-- VISIT TREATMENTS
-- Treatments associated with a particular visit
-- ============================================================

CREATE TABLE IF NOT EXISTS visit_treatments (
    visit_treatment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    visit_id INTEGER NOT NULL,
    treatment_id INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'Recommended'
        CHECK (
            status IN (
                'Recommended',
                'Scheduled',
                'Completed',
                'Cancelled'
            )
        ),

    treatment_notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id, visit_id)
        REFERENCES visits(patient_id, visit_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (treatment_id)
        REFERENCES treatments(treatment_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- ============================================================
-- MEDICINES
-- Medicine catalogue
-- ============================================================

CREATE TABLE IF NOT EXISTS medicines (
    medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_name TEXT NOT NULL,
    generic_name TEXT,
    form TEXT,
    strength TEXT,
    manufacturer TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0,1)),
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- PRESCRIPTIONS
-- One prescription belongs to a patient visit
-- ============================================================

CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    visit_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    prescription_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    general_instructions TEXT,
    follow_up_date DATE,
    pdf_path TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id, visit_id)
        REFERENCES visits(patient_id, visit_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (doctor_id)
        REFERENCES doctors(doctor_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    UNIQUE (patient_id, prescription_id)
);


-- ============================================================
-- PRESCRIPTION ITEMS
-- Medicine snapshot is stored here
-- ============================================================

CREATE TABLE IF NOT EXISTS prescription_items (
    prescription_item_id INTEGER PRIMARY KEY AUTOINCREMENT,

    patient_id INTEGER NOT NULL,
    prescription_id INTEGER NOT NULL,

    -- Original catalogue reference, if available
    medicine_id INTEGER,

    -- Historical snapshot
    medicine_name TEXT NOT NULL,
    generic_name TEXT,
    form TEXT,
    strength TEXT,

    -- Prescription-specific instructions
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    route TEXT,
    instructions TEXT,

    sequence_no INTEGER NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id, prescription_id)
        REFERENCES prescriptions(patient_id, prescription_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (medicine_id)
        REFERENCES medicines(medicine_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    UNIQUE (prescription_id, sequence_no)
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_visits_patient_date
    ON visits(patient_id, visit_date);

CREATE INDEX IF NOT EXISTS idx_measurements_patient_date
    ON patient_measurements(patient_id, measurement_date);

CREATE INDEX IF NOT EXISTS idx_past_history_patient
    ON patient_past_history(patient_id);

CREATE INDEX IF NOT EXISTS idx_family_history_patient
    ON patient_family_history(patient_id);

CREATE INDEX IF NOT EXISTS idx_allergies_patient
    ON patient_allergies(patient_id);

CREATE INDEX IF NOT EXISTS idx_visit_treatments_patient
    ON visit_treatments(patient_id);

CREATE INDEX IF NOT EXISTS idx_visit_treatments_visit
    ON visit_treatments(visit_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date
    ON prescriptions(patient_id, prescription_date);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription
    ON prescription_items(prescription_id);

CREATE INDEX IF NOT EXISTS idx_medicines_name
    ON medicines(medicine_name);


-- ============================================================
-- INITIAL CATEGORIES
-- ============================================================

INSERT OR IGNORE INTO categories
(category_id, category_name, description)
VALUES
(1, 'Skin', 'Skin consultation and cosmetic skin procedures'),
(2, 'Hair', 'Hair and scalp consultation and treatments'),
(3, 'Laser', 'Laser-based cosmetic procedures'),
(4, 'Weight Management', 'Weight management, nutrition and related services');


-- ============================================================
-- INITIAL SUBCATEGORIES
-- ============================================================

INSERT OR IGNORE INTO subcategories
(subcategory_id, category_id, subcategory_name, description)
VALUES

(1, 1, 'Skin Problems',
 'Consultation and management of common skin concerns'),

(2, 1, 'Facials',
 'Facial and skin cleansing procedures'),

(3, 1, 'Skin Rejuvenation',
 'Skin rejuvenation and cosmetic procedures'),

(4, 1, 'Chemical Treatments',
 'Chemical peel and related procedures'),

(5, 2, 'Hair Problems',
 'Hair fall, thinning and scalp concerns'),

(6, 2, 'Hair Growth Therapies',
 'Non-surgical hair growth procedures'),

(7, 2, 'Hair Transplant',
 'Hair transplant related services'),

(8, 2, 'Scalp Treatments',
 'Scalp care and related procedures'),

(9, 3, 'Laser Hair Removal',
 'Laser hair reduction/removal by treatment area'),

(10, 3, 'Laser Skin Treatments',
 'Laser procedures for cosmetic skin concerns'),

(11, 3, 'Pigmentation Treatments',
 'Laser-based pigmentation procedures'),

(12, 3, 'Scar Treatments',
 'Laser-based scar and texture procedures'),

(13, 4, 'Consultation',
 'Weight management consultation and assessment'),

(14, 4, 'Diet and Nutrition',
 'Diet and nutrition planning'),

(15, 4, 'Weight Monitoring',
 'Weight and body-composition follow-up'),

(16, 4, 'Weight Management Therapies',
 'Clinic-provided weight management services');


-- ============================================================
-- INITIAL TREATMENTS
-- ============================================================

INSERT OR IGNORE INTO treatments
(subcategory_id, treatment_name, description)
VALUES

-- SKIN / SKIN PROBLEMS
(1, 'Acne Consultation',
 'Assessment of acne concerns'),

(1, 'Acne Scar Assessment',
 'Assessment of acne scarring'),

(1, 'Pigmentation Consultation',
 'Assessment of pigmentation concerns'),

(1, 'Melasma Consultation',
 'Assessment of melasma concerns'),

(1, 'Anti-Aging Consultation',
 'Assessment of cosmetic aging concerns'),


-- SKIN / FACIALS
(2, 'Hydrafacial',
 'Hydrafacial procedure'),

(2, 'Medi-Facial',
 'Medi-facial procedure'),

(2, 'Classic Facial',
 'Classic facial procedure'),

(2, 'Cleanup',
 'Skin cleanup procedure'),

(2, 'Microdermabrasion',
 'Microdermabrasion procedure'),


-- SKIN / REJUVENATION
(3, 'Skin Rejuvenation',
 'Skin rejuvenation procedure'),

(3, 'Microneedling',
 'Microneedling procedure'),

(3, 'Skin Polishing',
 'Skin polishing procedure'),


-- SKIN / CHEMICAL
(4, 'Chemical Peel',
 'Chemical peel procedure'),

(4, 'Carbon Peel',
 'Carbon peel procedure'),


-- HAIR / PROBLEMS
(5, 'Hair Fall Consultation',
 'Assessment of hair fall'),

(5, 'Hair Thinning Assessment',
 'Assessment of hair thinning'),

(5, 'Dandruff / Scalp Assessment',
 'Assessment of scalp concerns'),


-- HAIR / GROWTH
(6, 'PRP',
 'Platelet-rich plasma hair procedure'),

(6, 'GFC',
 'Growth-factor concentrate procedure'),

(6, 'Hair Mesotherapy',
 'Hair mesotherapy procedure'),

(6, 'Hair Microneedling',
 'Hair microneedling procedure'),


-- HAIR / TRANSPLANT
(7, 'Hair Transplant Consultation',
 'Hair transplant consultation'),

(7, 'FUE Hair Transplant',
 'FUE hair transplant service'),

(7, 'FUT Hair Transplant',
 'FUT hair transplant service'),

(7, 'DHI Hair Transplant',
 'DHI hair transplant service'),

(7, 'Hair Transplant Follow-up',
 'Post-transplant follow-up'),


-- HAIR / SCALP
(8, 'Scalp Treatment',
 'Scalp care procedure'),

(8, 'Post-Transplant Scalp Care',
 'Post-transplant scalp care'),


-- LASER / HAIR REMOVAL
(9, 'Laser Hair Removal - Face',
 'Laser hair removal for face'),

(9, 'Laser Hair Removal - Upper Lip',
 'Laser hair removal for upper lip'),

(9, 'Laser Hair Removal - Chin',
 'Laser hair removal for chin'),

(9, 'Laser Hair Removal - Underarms',
 'Laser hair removal for underarms'),

(9, 'Laser Hair Removal - Arms',
 'Laser hair removal for arms'),

(9, 'Laser Hair Removal - Legs',
 'Laser hair removal for legs'),

(9, 'Laser Hair Removal - Back',
 'Laser hair removal for back'),

(9, 'Laser Hair Removal - Chest',
 'Laser hair removal for chest'),

(9, 'Laser Hair Removal - Full Body',
 'Laser hair removal for full body'),


-- LASER / SKIN
(10, 'Laser Skin Rejuvenation',
 'Laser skin rejuvenation service'),

(10, 'Laser Skin Resurfacing',
 'Laser skin resurfacing service'),

(10, 'Acne Scar Laser Treatment',
 'Laser treatment for acne scars'),

(10, 'Vascular / Redness Laser Treatment',
 'Laser treatment for selected vascular/redness concerns'),

(10, 'Tattoo Removal',
 'Laser tattoo removal service'),


-- LASER / PIGMENTATION
(11, 'Laser Pigmentation Treatment',
 'Laser-based pigmentation procedure'),

(11, 'Laser Melasma Treatment',
 'Laser-based melasma procedure'),


-- LASER / SCARS
(12, 'Laser Scar Treatment',
 'Laser-based scar treatment'),

(12, 'Scar Resurfacing',
 'Scar resurfacing procedure'),


-- WEIGHT MANAGEMENT / CONSULTATION
(13, 'Weight Management Consultation',
 'Initial weight management consultation'),

(13, 'Body Composition Assessment',
 'Body composition assessment'),


-- WEIGHT MANAGEMENT / DIET
(14, 'Personalized Diet Plan',
 'Personalized nutrition plan'),

(14, 'Diet Plan Revision',
 'Revision of an existing diet plan'),

(14, 'Lifestyle Modification Plan',
 'Lifestyle and activity planning'),


-- WEIGHT MANAGEMENT / MONITORING
(15, 'Weight Monitoring',
 'Weight progress monitoring'),

(15, 'Weight Management Follow-up',
 'Follow-up consultation'),


-- WEIGHT MANAGEMENT / THERAPIES
(16, 'Weight Management Therapy',
 'Clinic-provided weight management service');