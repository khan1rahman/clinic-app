"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  Settings2,
  Stethoscope,
  UserRound,
  Users,
  X
} from "lucide-react";

type Patient = {
  patient_id: number;
  patient_code: string;
  name: string;
  sex: "Male" | "Female";
  date_of_birth: string | null;
  mobile_no: string | null;
  status: string | null;
};

type Doctor = {
  doctor_id: number;
  doctor_name: string;
  specialization: string | null;
  is_active: number;
};

type Appointment = {
  appointment_id: number;
  appointment_timestamp: string;
  patient_id: number;
  visit_type: "First Visit" | "Repeat Visit";
  status: string;
  doctor_id: number | null;
  patient_name?: string | null;
  patient_code?: string | null;
  doctor_name?: string | null;
};

type Visit = {
  visit_id: number;
  patient_id: number;
  doctor_id: number;
  visit_date: string;
  visit_type: string | null;
  chief_complaint: string | null;
  clinical_notes: string | null;
  assessment: string | null;
  doctor_notes: string | null;
  follow_up_date: string | null;
  status?: string | null;
  patient_name?: string | null;
  patient_code?: string | null;
  doctor_name?: string | null;
};


type Measurement = {
  measurement_id: number;
  patient_id: number;
  visit_id: number;
  measurement_date?: string;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  body_fat_percent: number | null;
  notes: string | null;
};

type Habit = {
  habit_id: number;
  patient_id: number;
  smoking: string | null;
  smoking_frequency: string | null;
  alcohol: string | null;
  alcohol_frequency: string | null;
  exercise: string | null;
  exercise_frequency: string | null;
  sleep_hours: number | null;
  diet_type: string | null;
  water_intake: string | null;
  other_habits: string | null;
  notes: string | null;
};


type PersonalHistory = {
  personal_history_id: number;
  patient_id: number;
  diet_details: string | null;
  sleep_details: string | null;
  exercise_details: string | null;
  lifestyle_details: string | null;
  other_details: string | null;
  notes: string | null;
};


type Allergy = {
  allergy_id: number;
  patient_id: number;
  allergen: string;
  reaction: string | null;
  severity: string | null;
  notes: string | null;
};



async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body?.detail)) {
        message = body.detail.map((item: { msg?: string }) => item.msg).join(", ");
      }
    } catch {
      // Keep status message.
    }
    throw new Error(message);
  }

  return response.json();
}

function localDate(value: string) {
  return value.replace(" ", "T");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(localDate(value));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function isToday(value: string) {
  const date = new Date(localDate(value));
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function ageFromDob(value: string | null) {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

const emptyForm = {
  patient_id: "",
  doctor_id: "",
  visit_date: new Date().toISOString().slice(0, 10),
  visit_type: "First Visit",
  chief_complaint: "",
  clinical_notes: "",
  assessment: "",
  doctor_notes: "",
  follow_up_date: ""
};

function calculateBMI(heightCm: string, weightKg: string) {
  const height = Number(heightCm);
  const weight = Number(weightKg);

  if (!heightCm || !weightKg || height <= 0 || weight <= 0) {
    return "";
  }

  return (weight / ((height / 100) ** 2)).toFixed(2);
}


export default function ConsultationsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  
  const [personalHistories, setPersonalHistories] = useState<PersonalHistory[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([""]);
  const [customAllergy, setCustomAllergy] = useState("");
  // UI-only clinical history fields. Persistence requires matching backend/database support.
  const [clinicalHistoryForm, setClinicalHistoryForm] = useState({
    historyOfPresentIllness: "",
    skinType: "",
    skinCharacteristics: "",
    hairConcerns: "",
    scalpCondition: "",
    pastMedicalHistory: "",
    surgicalHistory: "",
    medicationHistory: "",
    familyHistory: "",
    previousCosmeticTreatments: "",
  });

  function updateClinicalHistory(field: keyof typeof clinicalHistoryForm, value: string) {
    setClinicalHistoryForm((previous) => ({ ...previous, [field]: value }));
  }

  function resetClinicalHistoryForm() {
    setClinicalHistoryForm({
      historyOfPresentIllness: "",
      skinType: "",
      skinCharacteristics: "",
      hairConcerns: "",
      scalpCondition: "",
      pastMedicalHistory: "",
      surgicalHistory: "",
      medicationHistory: "",
      familyHistory: "",
      previousCosmeticTreatments: "",
    });
  }

  function applyClinicalHistory(record: {
    history_of_present_illness?: string | null;
    skin_type?: string | null;
    skin_characteristics?: string | null;
    hair_concerns?: string | null;
    scalp_condition?: string | null;
    past_medical_history?: string | null;
    surgical_history?: string | null;
    medication_history?: string | null;
    family_history?: string | null;
    previous_cosmetic_treatments?: string | null;
  }) {
    setClinicalHistoryForm({
      historyOfPresentIllness: record.history_of_present_illness ?? "",
      skinType: record.skin_type ?? "",
      skinCharacteristics: record.skin_characteristics ?? "",
      hairConcerns: record.hair_concerns ?? "",
      scalpCondition: record.scalp_condition ?? "",
      pastMedicalHistory: record.past_medical_history ?? "",
      surgicalHistory: record.surgical_history ?? "",
      medicationHistory: record.medication_history ?? "",
      familyHistory: record.family_history ?? "",
      previousCosmeticTreatments: record.previous_cosmetic_treatments ?? "",
    });
  }

  async function loadClinicalHistory(visitId: number) {
    const record = await request<{
      visit_id: number;
      history_of_present_illness: string | null;
      skin_type: string | null;
      skin_characteristics: string | null;
      hair_concerns: string | null;
      scalp_condition: string | null;
      past_medical_history: string | null;
      surgical_history: string | null;
      medication_history: string | null;
      family_history: string | null;
      previous_cosmetic_treatments: string | null;
    }>(`/visits/${visitId}/clinical-history`);
    applyClinicalHistory(record);
  }

  function clinicalHistoryPayload() {
    return {
      history_of_present_illness: clinicalHistoryForm.historyOfPresentIllness.trim() || null,
      skin_type: clinicalHistoryForm.skinType.trim() || null,
      skin_characteristics: clinicalHistoryForm.skinCharacteristics.trim() || null,
      hair_concerns: clinicalHistoryForm.hairConcerns.trim() || null,
      scalp_condition: clinicalHistoryForm.scalpCondition.trim() || null,
      past_medical_history: clinicalHistoryForm.pastMedicalHistory.trim() || null,
      surgical_history: clinicalHistoryForm.surgicalHistory.trim() || null,
      medication_history: clinicalHistoryForm.medicationHistory.trim() || null,
      family_history: clinicalHistoryForm.familyHistory.trim() || null,
      previous_cosmetic_treatments: clinicalHistoryForm.previousCosmeticTreatments.trim() || null,
    };
  }
  const [editingPersonalHistoryId, setEditingPersonalHistoryId] = useState<number | null>(null);

  const [personalHistoryForm, setPersonalHistoryForm] = useState({
  diet_details: "",
  sleep_details: "",
  exercise_details: "",
  lifestyle_details: "",
  other_details: "",
  notes: "",
});

  const [editingHabitId, setEditingHabitId] = useState<number | null>(null);
  const [habitForm, setHabitForm] = useState({
  smoking: "No",
  smoking_frequency: "",
  alcohol: "No",
  alcohol_frequency: "",
  exercise: "Yes",
  exercise_frequency: "",
  sleep_hours: "8",
  diet_type: "Mixed",
  water_intake: "2 liters/day",
  other_habits: "",
  notes: "",
});

  const [editingMeasurementId, setEditingMeasurementId] = useState<number | null>(null);
  const [measurementForm, setMeasurementForm] = useState({
  height_cm: "",
  weight_kg: "",
  bmi: "",
  waist_cm: "",
  hip_cm: "",
  body_fat_percent: "",
  notes: "",
});

function updateMeasurement(field: string, value: string) {
  setMeasurementForm((previous) => {
    const updated = {
      ...previous,
      [field]: value,
    };

    if (field === "height_cm" || field === "weight_kg") {
      updated.bmi = calculateBMI(
        updated.height_cm,
        updated.weight_kg
      );
    }

    return updated;
  });
}

function updateHabit(field: string, value: string) {
  setHabitForm((previous) => ({
    ...previous,
    [field]: value,
  }));
}


function loadPatientHabits(patientId: number | null) {
  const existingHabit = patientId
    ? habits.find((item) => Number(item.patient_id) === patientId)
    : undefined;

  setEditingHabitId(existingHabit?.habit_id ?? null);

  setHabitForm({
    smoking: existingHabit?.smoking ?? "No",
    smoking_frequency: existingHabit?.smoking_frequency ?? "",
    alcohol: existingHabit?.alcohol ?? "No",
    alcohol_frequency: existingHabit?.alcohol_frequency ?? "",
    exercise: existingHabit?.exercise ?? "Yes",
    exercise_frequency: existingHabit?.exercise_frequency ?? "",
    sleep_hours:
      existingHabit?.sleep_hours != null
        ? String(existingHabit.sleep_hours)
        : "8",
    diet_type: existingHabit?.diet_type ?? "Mixed",
    water_intake: existingHabit?.water_intake ?? "2 liters/day",
    other_habits: existingHabit?.other_habits ?? "",
    notes: existingHabit?.notes ?? "",
  });
}


function loadPatientPersonalHistory(patientId: number | null) {
  const existingHistory = patientId
    ? personalHistories.find(
        (item) => Number(item.patient_id) === patientId
      )
    : undefined;

  setEditingPersonalHistoryId(
    existingHistory?.personal_history_id ?? null
  );

  setPersonalHistoryForm({
    diet_details: existingHistory?.diet_details ?? "",
    sleep_details: existingHistory?.sleep_details ?? "",
    exercise_details: existingHistory?.exercise_details ?? "",
    lifestyle_details: existingHistory?.lifestyle_details ?? "",
    other_details: existingHistory?.other_details ?? "",
    notes: existingHistory?.notes ?? "",
  });
}


function loadPatientAllergies(patientId: number | null) {
  const existingAllergies = patientId
    ? allergies.filter(
        (item) => Number(item.patient_id) === patientId
      )
    : [];

  const patientAllergenNames = existingAllergies.map(
    (item) => item.allergen
  );

  setSelectedAllergies(
    patientAllergenNames.length > 0
      ? patientAllergenNames
      : [""]
  );

  setCustomAllergy("");
}

async function saveHabits() {
  const patientId = Number(form.patient_id);

  if (!patientId) {
    setApiError("Please select a patient before saving habits.");
    return;
  }

  setApiError("");
  setMessage("");

  try {
    const payload = {
      patient_id: patientId,
      smoking: habitForm.smoking || null,
      smoking_frequency: habitForm.smoking_frequency || null,
      alcohol: habitForm.alcohol || null,
      alcohol_frequency: habitForm.alcohol_frequency || null,
      exercise: habitForm.exercise || null,
      exercise_frequency: habitForm.exercise_frequency || null,
      sleep_hours: habitForm.sleep_hours
        ? Number(habitForm.sleep_hours)
        : null,
      diet_type: habitForm.diet_type || null,
      water_intake: habitForm.water_intake || null,
      other_habits: habitForm.other_habits.trim() || null,
      notes: habitForm.notes.trim() || null,
    };

    if (editingHabitId !== null) {
      await request(`/habits/${editingHabitId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await request("/habits/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    const updatedHabits = await request<Habit[]>("/habits/");
    setHabits(updatedHabits);

    const savedHabit = updatedHabits.find(
      (item) => Number(item.patient_id) === patientId
    );

    setEditingHabitId(savedHabit?.habit_id ?? null);
    setMessage("Patient habits saved successfully.");
  } catch (error) {
    setApiError(
      error instanceof Error
        ? error.message
        : "Unable to save patient habits."
    );
  }
}





  const [search, setSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [message, setMessage] = useState("");


async function loadData() {
  setLoading(true);
  setApiError("");

  try {
   
const [p, d, a, v, m, h, ph, al] = await Promise.all([
  request<Patient[]>("/patients"),
  request<Doctor[]>("/doctors"),
  request<Appointment[]>("/appointments"),
  request<Visit[]>("/visits"),
  request<Measurement[]>("/measurements"),
  request<Habit[]>("/habits/"),
  request<PersonalHistory[]>("/personal-history/"),
  request<Allergy[]>("/allergies/"),
]);


    setPatients(p);
    setDoctors(d);
    setAppointments(a);
    setVisits(v);
    setMeasurements(m);
    setHabits(h);
    setPersonalHistories(ph);
    setAllergies(al);
  } catch (error) {
    setApiError(
      error instanceof Error
        ? error.message
        : "Unable to load consultation data"
    );
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    loadData();
  }, []);

  const activeDoctors = useMemo(
    () => doctors.filter((doctor) => doctor.is_active === 1),
    [doctors]
  );

  const activePatients = useMemo(
    () => patients.filter((patient) => patient.status !== "Inactive"),
    [patients]
  );

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            isToday(appointment.appointment_timestamp) &&
            ["Waiting", "In Consultation"].includes(appointment.status)
        )
        .sort((a, b) =>
          a.appointment_timestamp.localeCompare(b.appointment_timestamp)
        ),
    [appointments]
  );

  const todayVisits = useMemo(
    () => visits.filter((visit) => isToday(visit.visit_date)),
    [visits]
  );

  const completedVisits = todayVisits.filter(
    (visit) => !visit.status || visit.status === "Completed"
  );

  const followUps = visits.filter(
    (visit) => visit.follow_up_date && visit.follow_up_date >= new Date().toISOString().slice(0, 10)
  );

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activePatients.slice(0, 12);

    return activePatients
      .filter(
        (patient) =>
          patient.name.toLowerCase().includes(query) ||
          patient.patient_code.toLowerCase().includes(query) ||
          (patient.mobile_no || "").toLowerCase().includes(query)
      )
      .slice(0, 12);
  }, [activePatients, search]);

  const selectedPatient = patients.find(
    (patient) => patient.patient_id === selectedPatientId
  );

  const selectedPatientVisits = useMemo(
    () =>
      selectedPatientId !== null
        ? visits
            .filter(
              (visit) => Number(visit.patient_id) === Number(selectedPatientId)
            )
            .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
        : [],
    [visits, selectedPatientId]
  );

  function resetForm() {
    resetClinicalHistoryForm();
    setEditingVisitId(null);
setEditingMeasurementId(null);
setMeasurementForm({
  height_cm: "",
  weight_kg: "",
  bmi: "",
  waist_cm: "",
  hip_cm: "",
  body_fat_percent: "",
  notes: "",
});
    setForm({
      ...emptyForm,
      visit_date: new Date().toISOString().slice(0, 10)
    });
  }

  async function openNewConsultation(patientId?: number, appointment?: Appointment) {
    resetClinicalHistoryForm();
    const patient = patientId
      ? patients.find((item) => item.patient_id === patientId)
      : undefined;

const patientAppointment =
  appointment ??
  (patientId
    ? appointments
        .filter(
          (item) =>
            item.patient_id === patientId &&
            ["Waiting", "In Consultation"].includes(item.status)
        )
        .sort((a, b) =>
          b.appointment_timestamp.localeCompare(a.appointment_timestamp)
        )[0]
    : undefined);

const appointmentDoctor = patientAppointment?.doctor_id
  ? String(patientAppointment.doctor_id)
  : "";

    const patientVisits = patientId
      ? visits
          .filter(
            (visit) => Number(visit.patient_id) === Number(patientId)
          )
          .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
      : [];

const existing = patientVisits[0];

const existingToday = existing && isToday(existing.visit_date)
  ? existing
  : undefined;

const existingMeasurement = existingToday
  ? measurements.find((item) => item.visit_id === existingToday.visit_id)
  : undefined;

setEditingMeasurementId(existingMeasurement?.measurement_id ?? null);

setMeasurementForm({
  height_cm: existingMeasurement?.height_cm != null
    ? String(existingMeasurement.height_cm)
    : "",
  weight_kg: existingMeasurement?.weight_kg != null
    ? String(existingMeasurement.weight_kg)
    : "",
  bmi: existingMeasurement?.bmi != null
    ? String(existingMeasurement.bmi)
    : "",
  waist_cm: existingMeasurement?.waist_cm != null
    ? String(existingMeasurement.waist_cm)
    : "",
  hip_cm: existingMeasurement?.hip_cm != null
    ? String(existingMeasurement.hip_cm)
    : "",
  body_fat_percent: existingMeasurement?.body_fat_percent != null
    ? String(existingMeasurement.body_fat_percent)
    : "",
  notes: existingMeasurement?.notes ?? "",
});

    setSelectedPatientId(patientId || null);
    loadPatientHabits(patientId ?? null);
    loadPatientPersonalHistory(patientId ?? null);
    loadPatientAllergies(patientId ?? null);
    setMessage("");
    setApiError("");

    if (existingToday) {
      setEditingVisitId(existing.visit_id);
      setForm({
        patient_id: String(existing.patient_id),
        doctor_id: String(existing.doctor_id),
        visit_date: existing.visit_date.slice(0, 10),
        visit_type: existing.visit_type || appointment?.visit_type || "Repeat Visit",
        chief_complaint: existing.chief_complaint || "",
        clinical_notes: existing.clinical_notes || "",
        assessment: existing.assessment || "",
        doctor_notes: existing.doctor_notes || "",
        follow_up_date: existing.follow_up_date || ""
      });
      try {
        await loadClinicalHistory(existing.visit_id);
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Unable to load clinical history.");
      }
      return;
    }

    setEditingVisitId(null);
    setForm({
      patient_id: patientId ? String(patientId) : "",
      doctor_id: appointmentDoctor,
      visit_date: new Date().toISOString().slice(0, 10),
      visit_type:
        appointment?.visit_type ||
        (patientVisits.length > 0 ? "Repeat Visit" : "First Visit"),
      chief_complaint: "",
      clinical_notes: "",
      assessment: "",
      doctor_notes: "",
      follow_up_date: ""
    });
  }

  async function openExistingVisit(visit: Visit) {
    resetClinicalHistoryForm();
    setSelectedPatientId(visit.patient_id);
    loadPatientHabits(visit.patient_id);
    loadPatientPersonalHistory(visit.patient_id);
    loadPatientAllergies(visit.patient_id);
    setEditingVisitId(visit.visit_id);
    const existingMeasurement = measurements.find(
  (item) => item.visit_id === visit.visit_id
);

setEditingMeasurementId(existingMeasurement?.measurement_id ?? null);

setMeasurementForm({
  height_cm: existingMeasurement?.height_cm != null
    ? String(existingMeasurement.height_cm)
    : "",
  weight_kg: existingMeasurement?.weight_kg != null
    ? String(existingMeasurement.weight_kg)
    : "",
  bmi: existingMeasurement?.bmi != null
    ? String(existingMeasurement.bmi)
    : "",
  waist_cm: existingMeasurement?.waist_cm != null
    ? String(existingMeasurement.waist_cm)
    : "",
  hip_cm: existingMeasurement?.hip_cm != null
    ? String(existingMeasurement.hip_cm)
    : "",
  body_fat_percent: existingMeasurement?.body_fat_percent != null
    ? String(existingMeasurement.body_fat_percent)
    : "",
  notes: existingMeasurement?.notes ?? "",
});
    setMessage("");
    setApiError("");
    setForm({
      patient_id: String(visit.patient_id),
      doctor_id: String(visit.doctor_id),
      visit_date: visit.visit_date.slice(0, 10),
      visit_type: visit.visit_type || "Repeat Visit",
      chief_complaint: visit.chief_complaint || "",
      clinical_notes: visit.clinical_notes || "",
      assessment: visit.assessment || "",
      doctor_notes: visit.doctor_notes || "",
      follow_up_date: visit.follow_up_date || ""
    });
    try {
      await loadClinicalHistory(visit.visit_id);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to load clinical history.");
    }
  }

  async function saveConsultation() {
    if (!form.patient_id || !form.doctor_id || !form.visit_date) {
      setApiError("Patient, doctor and visit date are required.");
      return;
    }

    setSaving(true);
    setApiError("");
    setMessage("");

    try {
      const payload = {
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        visit_date: form.visit_date,
        visit_type: form.visit_type || null,
        chief_complaint: form.chief_complaint.trim() || null,
        clinical_notes: form.clinical_notes.trim() || null,
        assessment: form.assessment.trim() || null,
        doctor_notes: form.doctor_notes.trim() || null,
        follow_up_date: form.follow_up_date || null
      };

const measurementPayload = {
  height_cm: measurementForm.height_cm
    ? Number(measurementForm.height_cm)
    : null,
  weight_kg: measurementForm.weight_kg
    ? Number(measurementForm.weight_kg)
    : null,
  bmi: measurementForm.bmi
    ? Number(measurementForm.bmi)
    : null,
  waist_cm: measurementForm.waist_cm
    ? Number(measurementForm.waist_cm)
    : null,
  hip_cm: measurementForm.hip_cm
    ? Number(measurementForm.hip_cm)
    : null,
  body_fat_percent: measurementForm.body_fat_percent
    ? Number(measurementForm.body_fat_percent)
    : null,
  notes: measurementForm.notes.trim() || null,
};

const hasMeasurements = Object.values(measurementPayload).some(
  (value) => value !== null
);



    
      let savedVisitId: number;

      if (editingVisitId) {
        await request(`/visits/${editingVisitId}/`, {
          method: "PUT",
          body: JSON.stringify({
            doctor_id: payload.doctor_id,
            visit_date: payload.visit_date,
            visit_type: payload.visit_type,
            chief_complaint: payload.chief_complaint,
            clinical_notes: payload.clinical_notes,
            assessment: payload.assessment,
            doctor_notes: payload.doctor_notes,
            follow_up_date: payload.follow_up_date,
            status: "Completed"
          })
        });

        savedVisitId = editingVisitId;
        setMessage("Consultation updated successfully.");
      } else {
        const savedVisit = await request<Visit>("/visits/", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        savedVisitId = savedVisit.visit_id;
        setMessage("Consultation saved successfully.");
      }

      // Save the ten additional clinical-history fields against this visit.
      await request(`/visits/${savedVisitId}/clinical-history`, {
        method: "PUT",
        body: JSON.stringify(clinicalHistoryPayload())
      });

      if (hasMeasurements) {
        const measurementData = {
          visit_id: savedVisitId,
          ...measurementPayload
        };

      
        if (editingMeasurementId !== null) {
          await request(`/measurements/${editingMeasurementId}`, {
            method: "PUT",
            body: JSON.stringify(measurementPayload)
          });
        } else {
          const savedMeasurement = await request<Measurement>(
            "/measurements/",
            {
              method: "POST",
              body: JSON.stringify(measurementData)
            }
          );

          setEditingMeasurementId(savedMeasurement.measurement_id);
        }

      }


      const habitPayload = {
        patient_id: Number(form.patient_id),
        smoking: habitForm.smoking || null,
        smoking_frequency: habitForm.smoking_frequency || null,
        alcohol: habitForm.alcohol || null,
        alcohol_frequency: habitForm.alcohol_frequency || null,
        exercise: habitForm.exercise || null,
        exercise_frequency: habitForm.exercise_frequency || null,
        sleep_hours: habitForm.sleep_hours
          ? Number(habitForm.sleep_hours)
          : null,
        diet_type: habitForm.diet_type || null,
        water_intake: habitForm.water_intake || null,
        other_habits: habitForm.other_habits.trim() || null,
        notes: habitForm.notes.trim() || null,
      };

      if (editingHabitId !== null) {
        await request(`/habits/${editingHabitId}`, {
          method: "PUT",
          body: JSON.stringify(habitPayload),
        });
      } else {
        await request("/habits/", {
          method: "POST",
          body: JSON.stringify(habitPayload),
        });
      }

      const personalHistoryPayload = {
        patient_id: Number(form.patient_id),
        diet_details: personalHistoryForm.diet_details.trim() || null,
        sleep_details: personalHistoryForm.sleep_details.trim() || null,
        exercise_details: personalHistoryForm.exercise_details.trim() || null,
        lifestyle_details: personalHistoryForm.lifestyle_details.trim() || null,
        other_details: personalHistoryForm.other_details.trim() || null,
        notes: personalHistoryForm.notes.trim() || null,
      };

      const hasPersonalHistory = Object.values(personalHistoryPayload).some(
        (value) => value !== null && value !== personalHistoryPayload.patient_id
      );

      if (hasPersonalHistory) {
        if (editingPersonalHistoryId !== null) {
          await request(`/personal-history/${editingPersonalHistoryId}`, {
            method: "PUT",
            body: JSON.stringify(personalHistoryPayload),
          });
        } else {
          await request("/personal-history/", {
            method: "POST",
            body: JSON.stringify(personalHistoryPayload),
          });
        }
      }


      const patientId = Number(form.patient_id);

      const existingPatientAllergies = allergies.filter(
        (item) => Number(item.patient_id) === patientId
      );

      const selectedAllergenNames = [
        ...new Set(
          selectedAllergies
            .map((item) => item.trim())
            .filter(Boolean)
        ),
      ];

      // Remove allergy records that are no longer selected.
      for (const existingAllergy of existingPatientAllergies) {
        if (
          !selectedAllergenNames.some(
            (name) =>
              name.toLowerCase() ===
              existingAllergy.allergen.trim().toLowerCase()
          )
        ) {
          await request(`/allergies/${existingAllergy.allergy_id}`, {
            method: "DELETE",
          });
        }
      }

      // Add only allergies that do not already exist for this patient.
      for (const allergen of selectedAllergenNames) {
        const alreadyExists = existingPatientAllergies.some(
          (item) =>
            item.allergen.trim().toLowerCase() ===
            allergen.toLowerCase()
        );

        if (!alreadyExists) {
          await request("/allergies/", {
            method: "POST",
            body: JSON.stringify({
              patient_id: patientId,
              allergen,
              reaction: null,
              severity: null,
              notes: null,
            }),
          });
        }
      }



await loadData();
setEditingVisitId(savedVisitId);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to save consultation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>Dr. ADNAN'S CLINIC</strong>
            <span>LOCAL CLINIC MANAGEMENT</span>
          </div>
        </div>

        <nav>
          <div className="nav-section">WORKSPACE</div>
          <a className="nav-item" href="/">
            <LayoutDashboard size={17} /> Dashboard
          </a>
          <a className="nav-item" href="/appointments">
            <CalendarDays size={17} /> Appointments
          </a>
          <a className="nav-item" href="/patients">
            <Users size={17} /> Patients
          </a>
          <a className="nav-item active" href="/consultations">
            <Stethoscope size={17} /> Consultations
          </a>

          <div className="nav-section">CLINICAL</div>
         <a className="nav-item" href="/treatments">
 	 <Activity size={17} /> Treatments
	</a>
	<a className="nav-item" href="/prescriptions">
 	 <FileText size={17} /> Prescriptions
	</a>

          <div className="nav-section">ADMINISTRATION</div>
          <a className="nav-item">
            <Settings2 size={17} /> Doctors & Catalogue
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="online-dot" />
          FastAPI · SQLite online
          <small>Local network application</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <button className="icon-button">
              <Menu size={19} />
            </button>
            <strong>ATELIER CLINIC</strong>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search patient, mobile, code..." />
            <kbd>Ctrl K</kbd>
          </div>

          <div className="top-actions">
            <span className="connection">
              <span className="online-dot" /> LOCAL LAN
            </span>
            <button className="icon-button">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <section className="content consultation-page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">CLINICAL WORKSPACE</div>
              <h1>Consultations</h1>
              <p>Clinical visits, examination notes and follow-up records.</p>
            </div>

            <div className="consultation-heading-actions">
              <a className="secondary-button dashboard-button" href="/">
                <LayoutDashboard size={16} />
                Main Dashboard
              </a>
              <button
                className="secondary-button"
                type="button"
                onClick={() => loadData()}
                disabled={loading}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setSelectedPatientId(null);
                  resetForm();
                  setMessage("");
                  setApiError("");
                }}
              >
                <Stethoscope size={17} />
                New Consultation
              </button>
            </div>
          </div>

          {apiError && (
            <div className="error-banner">
              <span>{apiError}</span>
              <button type="button" onClick={() => setApiError("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {message && (
            <div className="success-banner">
              <CheckCircle2 size={16} />
              <span>{message}</span>
            </div>
          )}

          <div className="stats-grid">
            <StatCard
              label="Today's Visits"
              value={todayVisits.length}
              hint="TODAY"
              icon={<Stethoscope size={17} />}
            />
            <StatCard
              label="Waiting"
              value={todayAppointments.filter((a) => a.status === "Waiting").length}
              hint="QUEUE"
              tone="amber"
              icon={<Clock3 size={17} />}
            />
            <StatCard
              label="Completed"
              value={completedVisits.length}
              hint="FINISHED"
              tone="green"
              icon={<CheckCircle2 size={17} />}
            />
            <StatCard
              label="Follow-ups"
              value={followUps.length}
              hint="PLANNED"
              tone="cyan"
              icon={<CalendarDays size={17} />}
            />
          </div>

          <div className="consultation-layout">
            <section className="clinical-card">
              <div className="clinical-card-header">
                <div>
                  <div className="eyebrow">TODAY'S QUEUE</div>
                  <h2>Patients Ready for Consultation</h2>
                </div>
                <span className="record-count">{todayAppointments.length}</span>
              </div>

              <div className="patient-search-row">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search patient, mobile or patient code..."
                />
              </div>

              {todayAppointments.length > 0 && (
                <div className="queue-list">
                  {todayAppointments.map((appointment) => {
                    const patient =
                      patients.find((p) => p.patient_id === appointment.patient_id);
                    const doctor =
                      doctors.find((d) => d.doctor_id === appointment.doctor_id);
                    return (
                      <article className="queue-row" key={appointment.appointment_id}>
                        <div className="queue-patient">
                          <div className="queue-avatar">
                            <UserRound size={17} />
                          </div>
                          <div>
                            <strong>{appointment.patient_name || patient?.name || `Patient #${appointment.patient_id}`}</strong>
                            <span>
                              {appointment.patient_code || patient?.patient_code || `P-${appointment.patient_id}`}
                              {" · "}
                              {appointment.visit_type}
                            </span>
                          </div>
                        </div>

                        <div className="queue-meta">
                          <span>{doctor?.doctor_name || appointment.doctor_name || "Doctor pending"}</span>
                          <span className={`queue-status ${appointment.status.toLowerCase().replaceAll(" ", "-")}`}>
                            {appointment.status}
                          </span>
                        </div>

                        <button
                          className="row-action"
                          type="button"
                          onClick={() => openNewConsultation(appointment.patient_id, appointment)}
                        >
                          Open
                          <ChevronRight size={15} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="clinical-subsection">
                <div className="clinical-subsection-header">
                  <div>
                    <div className="eyebrow">PATIENT DIRECTORY</div>
                    <h3>Select a patient</h3>
                  </div>
                </div>

                <div className="patient-directory">
                  {filteredPatients.map((patient) => (
                    <button
                      className={`patient-pick ${
                        selectedPatientId === patient.patient_id ? "selected" : ""
                      }`}
                      type="button"
                      key={patient.patient_id}
                      onClick={() => openNewConsultation(patient.patient_id)}
                    >
                      <span className="queue-avatar">
                        <UserRound size={16} />
                      </span>
                      <span className="patient-pick-copy">
                        <strong>{patient.name}</strong>
                        <small>
                          {patient.patient_code}
                          {ageFromDob(patient.date_of_birth) !== null
                            ? ` · ${ageFromDob(patient.date_of_birth)} yrs`
                            : ""}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="consultation-editor">
              <div className="editor-header">
                <div>
                  <div className="eyebrow">CLINICAL CONSULTATION</div>
                  <h2>
                    {selectedPatient ? selectedPatient.name : "Select a patient"}
                  </h2>
                  <p>
                    {selectedPatient
                      ? `${selectedPatient.patient_code} · ${selectedPatient.sex}`
                      : "Choose a patient from the queue or directory."}
                  </p>
                </div>
                {editingVisitId && (
                  <span className="editor-badge">EDITING VISIT #{editingVisitId}</span>
                )}
              </div>

              <div className="editor-form">
                <div className="editor-grid">
                  <Field label="Patient">
                    <select
                      value={form.patient_id}
onChange={(event) => {
  const id = Number(event.target.value);
  setSelectedPatientId(id || null);
  loadPatientHabits(id || null);
  loadPatientAllergies(id || null);
setEditingMeasurementId(null);
setMeasurementForm({
  height_cm: "",
  weight_kg: "",
  bmi: "",
  waist_cm: "",
  hip_cm: "",
  body_fat_percent: "",
  notes: "",
});

  const patientAppointment = appointments
    .filter(
      (item) =>
        item.patient_id === id &&
        ["Waiting", "In Consultation"].includes(item.status)
    )
    .sort((a, b) =>
      b.appointment_timestamp.localeCompare(a.appointment_timestamp)
    )[0];

  setForm((current) => ({
    ...current,
    patient_id: event.target.value,
    doctor_id: patientAppointment?.doctor_id
      ? String(patientAppointment.doctor_id)
      : current.doctor_id
  }));
}}
                    >
                      <option value="">Select patient</option>
                      {activePatients.map((patient) => (
                        <option key={patient.patient_id} value={patient.patient_id}>
                          {patient.patient_code} — {patient.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Doctor">
                    <select
                      value={form.doctor_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          doctor_id: event.target.value
                        }))
                      }
                    >
                      <option value="">Select doctor</option>
                      {activeDoctors.map((doctor) => (
                        <option key={doctor.doctor_id} value={doctor.doctor_id}>
                          {doctor.doctor_name}
                          {doctor.specialization ? ` — ${doctor.specialization}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Visit Date">
                    <input
                      type="date"
                      value={form.visit_date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          visit_date: event.target.value
                        }))
                      }
                    />
                  </Field>

                  <Field label="Visit Type">
                    <select
                      value={form.visit_type}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          visit_type: event.target.value
                        }))
                      }
                    >
                      <option>First Visit</option>
                      <option>Repeat Visit</option>
                    </select>
                  </Field>
                
                </div>
               <div className="clinical-info-grid">
                <div className="consultation-field">
                  <div className="consultation-field-header">
                    <div className="consultation-field-title">
                      <span>Measurements</span>
                    </div>
                  </div>

                  <div className="editor-grid">
                    <Field label="Height (cm)">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={measurementForm.height_cm}
                        onChange={(event) =>
                          updateMeasurement("height_cm", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Weight (kg)">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={measurementForm.weight_kg}
                        onChange={(event) =>
                          updateMeasurement("weight_kg", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="BMI (calculated)">
                      <input
                        type="number"
                        value={measurementForm.bmi}
                        readOnly
                      />
                    </Field>

                    <Field label="Waist (cm)">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={measurementForm.waist_cm}
                        onChange={(event) =>
                          updateMeasurement("waist_cm", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Hip (cm)">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={measurementForm.hip_cm}
                        onChange={(event) =>
                          updateMeasurement("hip_cm", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Body Fat (%)">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={measurementForm.body_fat_percent}
                        onChange={(event) =>
                          updateMeasurement("body_fat_percent", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Measurement Notes">
                      <input
                        type="text"
                        value={measurementForm.notes}
                        onChange={(event) =>
                          updateMeasurement("notes", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                </div>

<div className="consultation-field">
  <div className="consultation-field-header">
    <div className="consultation-field-title">
      <span>Habits</span>
    </div>
  </div>

  <div className="editor-grid">
    <Field label="Smoking">
      <select
        value={habitForm.smoking}
        onChange={(event) =>
          updateHabit("smoking", event.target.value)
        }
      >
        <option value="No">No</option>
        <option value="Yes">Yes</option>
        <option value="Former Smoker">Former Smoker</option>
      </select>
    </Field>

    <Field label="Smoking Frequency">
      <select
        value={habitForm.smoking_frequency}
        onChange={(event) =>
          updateHabit("smoking_frequency", event.target.value)
        }
      >
        <option value="">Select frequency</option>
        <option value="Occasionally">Occasionally</option>
        <option value="1-5 per day">1–5 per day</option>
        <option value="6-10 per day">6–10 per day</option>
        <option value="More than 10 per day">More than 10 per day</option>
      </select>
    </Field>

    <Field label="Alcohol Consumption">
      <select
        value={habitForm.alcohol}
        onChange={(event) =>
          updateHabit("alcohol", event.target.value)
        }
      >
        <option value="No">No</option>
        <option value="Yes">Yes</option>
        <option value="Former">Former</option>
      </select>
    </Field>

    <Field label="Alcohol Frequency">
      <select
        value={habitForm.alcohol_frequency}
        onChange={(event) =>
          updateHabit("alcohol_frequency", event.target.value)
        }
      >
        <option value="">Select frequency</option>
        <option value="Occasionally">Occasionally</option>
        <option value="Weekly">Weekly</option>
        <option value="Several times a week">Several times a week</option>
        <option value="Daily">Daily</option>
      </select>
    </Field>

    <Field label="Exercise">
      <select
        value={habitForm.exercise}
        onChange={(event) =>
          updateHabit("exercise", event.target.value)
        }
      >
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </Field>

    <Field label="Exercise Frequency">
      <select
        value={habitForm.exercise_frequency}
        onChange={(event) =>
          updateHabit("exercise_frequency", event.target.value)
        }
      >
        <option value="">Select frequency</option>
        <option value="Daily">Daily</option>
        <option value="4-6 days per week">4–6 days per week</option>
        <option value="1-3 days per week">1–3 days per week</option>
        <option value="Rarely">Rarely</option>
      </select>
    </Field>

    <Field label="Sleep (hours per day)">
      <select
        value={habitForm.sleep_hours}
        onChange={(event) =>
          updateHabit("sleep_hours", event.target.value)
        }
      >
        {Array.from({ length: 13 }, (_, index) => index + 4).map(
          (hours) => (
            <option key={hours} value={String(hours)}>
              {hours} hours
            </option>
          )
        )}
      </select>
    </Field>

    <Field label="Diet Type">
      <select
        value={habitForm.diet_type}
        onChange={(event) =>
          updateHabit("diet_type", event.target.value)
        }
      >
        <option value="Mixed">Mixed</option>
        <option value="Vegetarian">Vegetarian</option>
        <option value="Vegan">Vegan</option>
        <option value="Non-Vegetarian">Non-Vegetarian</option>
        <option value="Other">Other</option>
      </select>
    </Field>

    <Field label="Daily Water Intake">
      <select
        value={habitForm.water_intake}
        onChange={(event) =>
          updateHabit("water_intake", event.target.value)
        }
      >
        <option value="Less than 1 liter/day">Less than 1 liter/day</option>
        <option value="1 liter/day">1 liter/day</option>
        <option value="1.5 liters/day">1.5 liters/day</option>
        <option value="2 liters/day">2 liters/day</option>
        <option value="2.5 liters/day">2.5 liters/day</option>
        <option value="3 liters/day">3 liters/day</option>
        <option value="More than 3 liters/day">More than 3 liters/day</option>
      </select>
    </Field>

    <Field label="Other Habits">
      <input
        type="text"
        value={habitForm.other_habits}
        onChange={(event) =>
          updateHabit("other_habits", event.target.value)
        }
        placeholder="Other relevant habits"
      />
    </Field>

    <Field label="Habit Notes">
      <input
        type="text"
        value={habitForm.notes}
        onChange={(event) =>
          updateHabit("notes", event.target.value)
        }
        placeholder="Additional notes"
      />
    </Field>
  </div>
</div>


<div className="consultation-field">
  <div className="consultation-field-header">
    <div className="consultation-field-title">
      <span>Personal History</span>
    </div>
  </div>

  <div className="personal-history-fields">
    <Field label="Diet Details">
      <input
        type="text"
        value={personalHistoryForm.diet_details}
        onChange={(event) =>
          setPersonalHistoryForm((previous) => ({
            ...previous,
            diet_details: event.target.value,
          }))
        }
      />
    </Field>

    <Field label="Sleep Details">
      <input
        type="text"
        value={personalHistoryForm.sleep_details}
        onChange={(event) =>
          setPersonalHistoryForm((previous) => ({
            ...previous,
            sleep_details: event.target.value,
          }))
        }
      />
    </Field>

    <Field label="Exercise Details">
      <input
        type="text"
        value={personalHistoryForm.exercise_details}
        onChange={(event) =>
          setPersonalHistoryForm((previous) => ({
            ...previous,
            exercise_details: event.target.value,
          }))
        }
      />
    </Field>

    <Field label="Lifestyle Details">
      <input
        type="text"
        value={personalHistoryForm.lifestyle_details}
        onChange={(event) =>
          setPersonalHistoryForm((previous) => ({
            ...previous,
            lifestyle_details: event.target.value,
          }))
        }
      />
    </Field>

    <Field label="Other Details">
      <input
        type="text"
        value={personalHistoryForm.other_details}
        onChange={(event) =>
          setPersonalHistoryForm((previous) => ({
            ...previous,
            other_details: event.target.value,
          }))
        }
      />
    </Field>

    <Field label="Notes">
      <input
        type="text"
        value={personalHistoryForm.notes}
        onChange={(event) =>
          setPersonalHistoryForm((previous) => ({
            ...previous,
            notes: event.target.value,
          }))
        }
      />
    </Field>
  </div>
</div>

<div className="consultation-field">
  <div className="consultation-field-header">
    <div className="consultation-field-title">
      <span>Allergies</span>
    </div>
  </div>




{selectedAllergies.map((allergy, index) => (
  <div
    key={`allergy-${index}`}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      marginBottom: "8px",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: "34px",
          margin: 0,
          fontSize: "14px",
          color: "#756c61",
          whiteSpace: "nowrap",
        }}
      >
        Allergy {index + 1}
      </label>

      <select
        value={allergy}
        onChange={(event) =>
          setSelectedAllergies((previous) =>
            previous.map((item, itemIndex) =>
              itemIndex === index ? event.target.value : item
            )
          )
        }
        style={{
          height: "34px",
          minHeight: "34px",
          boxSizing: "border-box",
          margin: 0,
        }}
      >
        <option value="">Select allergy</option>
        {[
          "Penicillin",
          "Sulfa drugs",
          "Aspirin",
          "Latex",
          "Peanuts",
          "Tree nuts",
          "Milk",
          "Eggs",
          "Soy",
          "Wheat",
          "Fish",
          "Shellfish",
          "Dust",
          "Pollen",
          "Fragrance",
          "Cosmetics",
        ]
          .concat(allergies.map((item) => item.allergen))
          .filter((item, optionIndex, items) =>
            items.indexOf(item) === optionIndex
          )
          .sort((a, b) => a.localeCompare(b))
          .map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
      </select>

      <button
        className="secondary-button"
        type="button"
        title="Add another allergy"
        aria-label="Add another allergy"
        style={{
          height: "34px",
          minHeight: "34px",
          minWidth: "34px",
          padding: "0",
        }}
        onClick={() =>
          setSelectedAllergies((previous) => [...previous, ""])
        }
      >
        +
      </button>
    </div>

    <button
      className="secondary-button"
      type="button"
      style={{
        height: "34px",
        minHeight: "34px",
      }}
      onClick={() =>
        setSelectedAllergies((previous) =>
          previous.filter((_, itemIndex) => itemIndex !== index)
        )
      }
    >
      Remove
    </button>
  </div>
))}


<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: "12px",
    alignItems: "end",
    marginTop: "8px",
  }}
>
  <Field label="Add new allergy">
    <input
      type="text"
      value={customAllergy}
      onChange={(event) => setCustomAllergy(event.target.value)}
      placeholder="Enter a new allergy"
    />
  </Field>

  <div style={{ display: "flex", alignItems: "end" }}>
    <button
      className="secondary-button"
      type="button"
      onClick={() => {
        const value = customAllergy.trim();

        if (!value) return;

        const knownAllergies = [
          ...allergies.map((item) => item.allergen),
          ...selectedAllergies,
        ];

        if (
          knownAllergies.some(
            (item) => item.toLowerCase() === value.toLowerCase()
          )
        ) {
          setApiError("This allergy is already in the list.");
          return;
        }

        setSelectedAllergies((previous) => {
          const emptyIndex = previous.findIndex((item) => !item.trim());

          if (emptyIndex === -1) return [...previous, value];

          return previous.map((item, index) =>
            index === emptyIndex ? value : item
          );
        });

        setCustomAllergy("");
        setApiError("");
      }}
    >
      Add New Allergy
    </button>
  </div>
</div>
</div>
</div>



                <section className="clinical-history-panel">
                  <div className="clinical-history-heading">
                    <div>
                      <div className="eyebrow">PATIENT BACKGROUND</div>
                      <h3>Clinical & Cosmetic History</h3>
                      <p>Additional history fields for the consultation record.</p>
                    </div>
                    <span className="draft-badge">SAVED WITH VISIT</span>
                  </div>

                  <div className="clinical-history-grid">
                    <ClinicalHistoryField
                      label="History of Present Illness"
                      hint="Onset, duration, progression, symptoms and previous treatment"
                      value={clinicalHistoryForm.historyOfPresentIllness}
                      onChange={(value) => updateClinicalHistory("historyOfPresentIllness", value)}
                    />
                    <ClinicalHistoryField
                      label="Skin Type & Fitzpatrick Classification"
                      hint="Skin type, Fitzpatrick type, sensitivity and pigmentation"
                      value={clinicalHistoryForm.skinType}
                      onChange={(value) => updateClinicalHistory("skinType", value)}
                    />
                    <ClinicalHistoryField
                      label="Skin Characteristics"
                      hint="Dry, oily, combination, sensitive, acne-prone or other observations"
                      value={clinicalHistoryForm.skinCharacteristics}
                      onChange={(value) => updateClinicalHistory("skinCharacteristics", value)}
                    />
                    <ClinicalHistoryField
                      label="Hair Concerns"
                      hint="Hair loss pattern, duration, density and previous treatments"
                      value={clinicalHistoryForm.hairConcerns}
                      onChange={(value) => updateClinicalHistory("hairConcerns", value)}
                    />
                    <ClinicalHistoryField
                      label="Scalp Condition"
                      hint="Scalp findings, irritation, dandruff or other observations"
                      value={clinicalHistoryForm.scalpCondition}
                      onChange={(value) => updateClinicalHistory("scalpCondition", value)}
                    />
                    <ClinicalHistoryField
                      label="Past Medical History"
                      hint="Existing or previous medical conditions"
                      value={clinicalHistoryForm.pastMedicalHistory}
                      onChange={(value) => updateClinicalHistory("pastMedicalHistory", value)}
                    />
                    <ClinicalHistoryField
                      label="Surgical & Hospitalisation History"
                      hint="Previous surgeries, procedures and hospitalisations"
                      value={clinicalHistoryForm.surgicalHistory}
                      onChange={(value) => updateClinicalHistory("surgicalHistory", value)}
                    />
                    <ClinicalHistoryField
                      label="Medication & Supplement History"
                      hint="Current and previous medicines, supplements and topical products"
                      value={clinicalHistoryForm.medicationHistory}
                      onChange={(value) => updateClinicalHistory("medicationHistory", value)}
                    />
                    <ClinicalHistoryField
                      label="Family History"
                      hint="Relevant hereditary or family medical conditions"
                      value={clinicalHistoryForm.familyHistory}
                      onChange={(value) => updateClinicalHistory("familyHistory", value)}
                    />
                    <ClinicalHistoryField
                      label="Previous Cosmetic Treatments"
                      hint="Previous procedures, dates, outcomes and any complications"
                      value={clinicalHistoryForm.previousCosmeticTreatments}
                      onChange={(value) => updateClinicalHistory("previousCosmeticTreatments", value)}
                    />
                  </div>
                </section>

                <ConsultationField
                  number="1"
                  title="Chief Complaint"

                  value={form.chief_complaint}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, chief_complaint: value }))
                  }
                  placeholder="Record the patient's main complaint or reason for today's visit."
                />

                <ConsultationField
                  number="2"
                  title="Clinical Assessment & Examination"
                  value={form.assessment}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, assessment: value }))
                  }
                  placeholder="Document clinical findings, examination and assessment."
                />

                <ConsultationField
                  number="3"
                  title="Clinical & Procedural Notes"
                  value={form.clinical_notes}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, clinical_notes: value }))
                  }
                  placeholder="Record procedure details, observations, products or protocols used."
                />

                <ConsultationField
                  number="4"
                  title="Doctor Internal Notes"
                  value={form.doctor_notes}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, doctor_notes: value }))
                  }
                  placeholder="Internal clinical notes for staff reference."
                  privateField
                />

                <div className="editor-grid">
                  <Field label="Follow-up Date">
                    <input
                      type="date"
                      value={form.follow_up_date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          follow_up_date: event.target.value
                        }))
                      }
                    />
                  </Field>
                  <div className="field-spacer" />
                </div>

                <div className="editor-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={resetForm}
                  >
                    Clear
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={saving || !form.patient_id || !form.doctor_id}
                    onClick={saveConsultation}
                  >
                    <CheckCircle2 size={17} />
                    {saving ? "Saving..." : editingVisitId ? "Update Consultation" : "Save Consultation"}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section className="clinical-card visit-history-card">
            <div className="clinical-card-header">
              <div>
                <div className="eyebrow">CONSULTATION HISTORY</div>
                <h2>
                  {selectedPatient
                    ? `${selectedPatient.name}'s Visits`
                    : "Recent Consultation Records"}
                </h2>
              </div>
              <span className="record-count">
                {selectedPatient ? selectedPatientVisits.length : visits.length}
              </span>
            </div>

            <div className="visit-history-list">
              {(selectedPatientId !== null
                ? selectedPatientVisits
                : visits.slice(0, 10)
              ).map(
                (visit) => (
                  <button
                    className="visit-history-row"
                    type="button"
                    key={visit.visit_id}
                    onClick={() => openExistingVisit(visit)}
                  >
                    <div>
                      <strong>
                        {visit.patient_name ||
                          patients.find((p) => p.patient_id === visit.patient_id)?.name ||
                          `Patient #${visit.patient_id}`}
                      </strong>
                      <span>
                        {formatDate(visit.visit_date)} ·{" "}
                        {visit.visit_type || "Consultation"}
                      </span>
                    </div>
                    <div>
                      <span>
                        {visit.doctor_name ||
                          doctors.find((d) => d.doctor_id === visit.doctor_id)
                            ?.doctor_name ||
                          "Doctor"}
                      </span>
                      <ChevronRight size={16} />
                    </div>
                  </button>
                )
              )}

              {!loading &&
                (selectedPatientId !== null
                  ? selectedPatientVisits.length
                  : visits.length) === 0 && (
                  <div className="empty-state">
                    No consultation records yet.
                  </div>
                )}
            </div>
          </section>
        </section>
      </main>

      <style jsx>{`
        .consultation-page h1 {
          font-size: 23px;
        }

        :global(.stat-card .eyebrow) {
          font-size: 20px !important;
          line-height: 1.25;
          letter-spacing: 0.04em;
        }

        .consultation-heading-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .consultation-heading-actions .secondary-button,
        .consultation-heading-actions .primary-button {
          min-height: 42px;
          height: 42px;
          font-size: 14px;
          font-weight: 600;
        }

        .dashboard-button {
          text-decoration: none;
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 13px 16px;
          border: 1px solid rgba(76, 175, 80, 0.35);
          border-radius: 7px;
          background: rgba(76, 175, 80, 0.07);
          color: #39753d;
          margin-bottom: 16px;
          font-size: 14px;
	}
  	 .consultation-layout {
  	  display: grid;
	  grid-template-columns: minmax(0, 1fr);
	  gap: 18px;
	  align-items: start;
	}

        .clinical-card,
        .consultation-editor {
          background: #ffffff;
          border: 1px solid #ded6ca;
          border-radius: 9px;
          overflow: hidden;
        }

        .consultation-editor {
          min-width: 0;
          width: 100%;
        }

        .clinical-card-header,
        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 20px;
          border-bottom: 1px solid #ded6ca;
        }

        .consultation-page h2,
        .consultation-page h3,
        .clinical-card-header h2,
        .editor-header h2 {
          font-size: 23px;
        }

        .clinical-card-header h2,
        .editor-header h2 {
          margin: 5px 0 0;
          line-height: 1.25;
          letter-spacing: -0.01em;
        }

        .editor-header p {
          margin: 7px 0 0;
          color: #756c61;
          font-size: 14px;
          line-height: 1.5;
        }

        .record-count {
          min-width: 34px;
          height: 34px;
          padding: 0 9px;
          border: 1px solid #d6ccbd;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: #756c61;
        }

        .patient-search-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 16px 20px;
          padding: 0 14px;
          height: 46px;
          border: 1px solid #363940;
          border-radius: 7px;
          background: #fbfaf8;
          color: #756c61;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .patient-search-row:focus-within {
          border-color: #b79b70;
          box-shadow: 0 0 0 3px rgba(183, 155, 112, 0.12);
        }

        .patient-search-row input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #302b26;
          font-size: 15px;
        }

        .patient-search-row input::placeholder {
          color: #8a8177;
        }

                .queue-list {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          padding: 12px 20px;
          border-top: 1px solid #ded6ca;
        }

        .queue-row {
          display: grid;
          grid-template-columns: minmax(200px, 1.3fr) minmax(150px, 0.9fr) auto;
          gap: 14px;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid #ded6ca;
        }

        .queue-patient {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .queue-avatar {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d6ccbd;
          color: #a98655;
          background: #faf7f2;
        }

        .queue-patient strong,
        .queue-patient span,
        .queue-meta span {
          display: block;
        }

        .queue-patient strong {
          font-size: 14px;
          line-height: 1.35;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queue-patient span,
        .queue-meta span {
          margin-top: 4px;
          color: #756c61;
          font-size: 12px;
          line-height: 1.35;
        }

        .queue-meta {
          min-width: 0;
        }

        .queue-status {
          display: inline-block !important;
          width: fit-content;
          padding: 4px 8px;
          border-radius: 5px;
          border: 1px solid #d6ccbd;
        }

        .queue-status.waiting {
          color: #9a6e24;
        }

        .queue-status.in-consultation {
          color: #287e9c;
        }

        .row-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 38px;
          padding: 0 12px;
          border: 1px solid #d6ccbd;
          border-radius: 6px;
          background: #ffffff;
          color: #302b26;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .row-action:hover {
          background: #f5f1ea;
          border-color: #b9aa95;
        }

        .clinical-subsection {
          border-top: 1px solid #ded6ca;
          padding: 18px 20px 20px;
        }

        .clinical-subsection-header h3 {
          margin: 5px 0 14px;
          font-size: 23px;
        }

        .patient-directory {
 	 display: grid;
	  grid-template-columns: repeat(4, minmax(0, 1fr));
 	 gap: 9px;
	}

        .patient-pick {
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          min-height: 58px;
          padding: 10px;
          border: 1px solid #ded6ca;
          border-radius: 7px;
          background: #ffffff;
          color: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
        }

        .patient-pick:hover,
        .patient-pick.selected {
          border-color: #716956;
          background: #f8f4ed;
        }

        .patient-pick:hover {
          transform: translateY(-1px);
        }

        .patient-pick-copy {
          min-width: 0;
        }

        .patient-pick-copy strong,
        .patient-pick-copy small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .patient-pick-copy strong {
          font-size: 14px;
        }

        .patient-pick-copy small {
          margin-top: 4px;
          color: #756c61;
          font-size: 12px;
        }

        .editor-badge {
          padding: 6px 9px;
          border: 1px solid #d6ccbd;
          border-radius: 5px;
          color: #8a6d45;
          font-size: 11px;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .editor-form {
          padding: 22px;
        }

        .editor-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 18px;
        }
.clinical-info-grid > .consultation-field:nth-child(1) :global(.field),
.clinical-info-grid > .consultation-field:nth-child(2) :global(.field) {
  display: grid;
  grid-template-columns: minmax(120px, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.clinical-info-grid > .consultation-field:nth-child(1) :global(.field label),
.clinical-info-grid > .consultation-field:nth-child(2) :global(.field label) {
  margin: 0;
  color: #756c61;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
}

.clinical-info-grid > .consultation-field:nth-child(1) :global(.field input),
.clinical-info-grid > .consultation-field:nth-child(1) :global(.field select),
.clinical-info-grid > .consultation-field:nth-child(2) :global(.field input),
.clinical-info-grid > .consultation-field:nth-child(2) :global(.field select) {
  width: 100%;
  min-width: 0;
  height: 34px;
  box-sizing: border-box;
  padding: 0 8px;
  font-size: 13px;
}

.clinical-info-grid > .consultation-field:nth-child(1) .editor-grid,
.clinical-info-grid > .consultation-field:nth-child(2) .editor-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}


.clinical-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 14px;
  row-gap: 0;
  align-items: stretch;
}

.clinical-info-grid .consultation-field {
  min-width: 0;
  height: calc(100% - 15px);
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .clinical-info-grid {
    grid-template-columns: 1fr;
  }
}




.personal-history-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.personal-history-fields :global(.field) {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  width: 100%;
}

.personal-history-fields :global(.field label) {
  color: #756c61;
  font-size: 14px;
  font-weight: 600;
}

.personal-history-fields :global(.field input) {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

@media (max-width: 700px) {
  .personal-history-fields :global(.field) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}

@media (max-width: 700px) {
  .personal-history-fields .field {
    grid-template-columns: 1fr;
  }
}


        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          color: #d0d2d7;
          font-size: 23px;
          text-transform: none;
          letter-spacing: 0.01em;
          font-weight: 600;
        }

        .field input,
        .field select {
          box-sizing: border-box;
          width: 100%;
          height: 48px;
          padding: 0 13px;
          border: 1px solid #d6ccbd;
          border-radius: 7px;
          background-color: #ffffff;
          color: #302b26;
          outline: none;
          font: inherit;
          font-size: 17px;
          color-scheme: dark;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .field select {
          appearance: none;
          padding-right: 38px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23b6b9c0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 15px;
        }

        .field input:hover,
        .field select:hover {
          border-color: #b9aa95;
          background-color: #fbfaf8;
        }

        .field input:focus,
        .field select:focus {
          border-color: #82775f;
          box-shadow: 0 0 0 3px rgba(183, 155, 112, 0.12);
          background-color: #faf7f2;
        }

        .consultation-field {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin-top: 15px;
          padding: 16px;
          border: 1px solid #ded6ca;
          border-radius: 8px;
          background: #fbfaf8;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
        }

        .consultation-field-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .consultation-field-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8a6d45;
          font-size: 23px;
          letter-spacing: 0.01em;
          font-weight: 700;
        }

        .private-badge {
          padding: 4px 7px;
          border-radius: 4px;
          border: 1px solid #d6ccbd;
          color: #756c61;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .consultation-field textarea {
          display: block;
          width: 100% !important;
          min-width: 100%;
          max-width: 100%;
          min-height: 145px;
          max-height: 360px;
          resize: vertical;
          overflow-x: hidden;
          overflow-y: auto;
          box-sizing: border-box;
          padding: 12px 14px;
          border: 1px solid #d6ccbd;
          border-radius: 7px;
          background: #0c0d10;
          color: #302b26;
          outline: none;
          line-height: 1.35;
          font: inherit;
          font-size: 23px;
          color-scheme: dark;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .consultation-field textarea::placeholder {
          color: #8a8177;
          opacity: 1;
        }

        .consultation-field textarea:hover {
          border-color: #b9aa95;
        }

        .consultation-field textarea:focus {
          border-color: #82775f;
          box-shadow: 0 0 0 3px rgba(183, 155, 112, 0.12);
        }

        .consultation-field textarea.is-scrollable {
          overflow-y: auto;
        }

        .field-spacer {
          min-height: 1px;
        }

        :global(.clinical-history-panel) {
          margin-top: 24px;
          padding: 22px;
          border: 1px solid #e4e0d8;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 2px 10px rgba(35, 30, 22, 0.04);
        }

        :global(.clinical-history-heading) {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee9e1;
        }

        :global(.clinical-history-heading h3) {
          margin: 5px 0 5px;
          color: #29251f;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.3;
        }

        :global(.clinical-history-heading p) {
          margin: 0;
          color: #71695f;
          font-size: 13px;
          line-height: 1.5;
        }

        :global(.draft-badge) {
          flex: 0 0 auto;
          padding: 6px 9px;
          border: 1px solid #e8d6b7;
          border-radius: 999px;
          color: #795b2e;
          background: #fbf5e9;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .06em;
        }

        :global(.clinical-history-grid) {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        :global(.clinical-history-field) {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 7px;
          min-width: 0;
          padding: 15px;
          border: 1px solid #eee9e1;
          border-radius: 9px;
          background: #fdfcfb;
        }

        :global(.clinical-history-field label) {
          display: block;
          margin: 0;
          color: #302b25;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.4;
        }

        :global(.clinical-history-field small) {
          display: block;
          min-height: 32px;
          color: #766e64;
          font-size: 12px;
          line-height: 1.45;
        }

        :global(.clinical-history-field textarea) {
          display: block;
          width: 100%;
          min-width: 0;
          min-height: 108px;
          box-sizing: border-box;
          margin: 3px 0 0;
          padding: 11px 12px;
          resize: vertical;
          border: 1px solid #d8d2c8;
          border-radius: 7px;
          background: #ffffff;
          color: #29251f;
          font-family: inherit;
          font-size: 13px;
          line-height: 1.55;
          color-scheme: light;
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        :global(.clinical-history-field textarea::placeholder) {
          color: #a29a8f;
        }

        :global(.clinical-history-field textarea:focus) {
          outline: none;
          border-color: #a98b5d;
          box-shadow: 0 0 0 3px rgba(169, 139, 93, .14);
        }

        @media (max-width: 900px) {
          :global(.clinical-history-grid) {
            grid-template-columns: 1fr;
          }
        }

        .editor-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #ded6ca;
        }

        .editor-actions .secondary-button,
        .editor-actions .primary-button {
          min-height: 42px;
          height: 42px;
          font-size: 14px;
          font-weight: 600;
        }

        .visit-history-card {
          margin-top: 18px;
        }

        .visit-history-list {
          display: flex;
          flex-direction: column;
        }

        .visit-history-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 15px 20px;
          border: 0;
          border-bottom: 1px solid #ded6ca;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .visit-history-row:hover {
          background: #15161a;
        }

        .visit-history-row > div:last-child {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #756c61;
          font-size: 13px;
        }

        .visit-history-row strong,
        .visit-history-row span {
          display: block;
        }

        .visit-history-row strong {
          font-size: 14px;
        }

        .visit-history-row span {
          margin-top: 4px;
          color: #756c61;
          font-size: 12px;
        }

        .empty-state {
          padding: 30px;
          text-align: center;
          color: #756c61;
          font-size: 14px;
        }

        .secondary-button {
          height: 42px;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 15px;
          border: 1px solid #44474e;
          border-radius: 7px;
          background: #ffffff;
          color: #302b26;
          cursor: pointer;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .secondary-button:hover {
          background: #f5f1ea;
          border-color: #60636b;
        }

        .secondary-button:disabled {
          opacity: 0.55;
          cursor: default;
        }

        @media (max-width: 1100px) {
          .consultation-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .editor-grid,
          .patient-directory,
          .clinical-history-grid {
            grid-template-columns: 1fr;
          }

          .queue-row {
            grid-template-columns: 1fr;
          }

          .consultation-heading-actions {
            width: 100%;
          }

          .consultation-heading-actions .secondary-button,
          .consultation-heading-actions .primary-button {
            flex: 1;
          }

          .editor-form {
            padding: 16px;
          }

          .consultation-field {
            padding: 13px;
          }

          .consultation-field textarea {
            min-height: 145px;
          }
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function ConsultationField({
  number,
  title,
  value,
  onChange,
  placeholder,
  privateField
}: {
  number: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  privateField?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const maxHeight = 360;

  function resizeTextarea(element?: HTMLTextAreaElement | null) {
    const textarea = element || textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";

    const nextHeight = Math.max(textarea.scrollHeight, 145);
    const shouldScroll = nextHeight > maxHeight;

    textarea.style.height = `${Math.min(nextHeight, maxHeight)}px`;
    textarea.classList.toggle("is-scrollable", shouldScroll);
  }

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  return (
    <div className="consultation-field">
      <div className="consultation-field-header">
        <div className="consultation-field-title">
          <span>{number}.</span>
          <span>{title}</span>
          {privateField && <span className="private-badge">Private / Staff Only</span>}
        </div>
        <span style={{ color: "#6f747d", fontSize: 11 }}>
          {value.length} chars
        </span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        rows={2}
        style={{
          width: "100%",
          minWidth: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          fontSize: "23px",
          minHeight: "145px"
        }}
        onChange={(event) => {
          onChange(event.target.value);
          resizeTextarea(event.currentTarget);
        }}
        onInput={(event) => resizeTextarea(event.currentTarget)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ClinicalHistoryField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="clinical-history-field">
      <label>{label}</label>
      <small>{hint}</small>
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`Enter ${label.toLowerCase()} here...`}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  tone?: "amber" | "cyan" | "green";
}) {
  return (
    <article className={`stat-card ${tone ? `tone-${tone}` : ""}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="eyebrow">{label}</div>
        <strong>{String(value).padStart(2, "0")}</strong>
        <span>{hint}</span>
      </div>
    </article>
  );
}
