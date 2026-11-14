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
    const [p, d, a, v, m, h] = await Promise.all([
  request<Patient[]>("/patients"),
  request<Doctor[]>("/doctors"),
  request<Appointment[]>("/appointments"),
  request<Visit[]>("/visits"),
  request<Measurement[]>("/measurements"),
  request<Habit[]>("/habits/"),
]);

    setPatients(p);
    setDoctors(d);
    setAppointments(a);
    setVisits(v);
    setMeasurements(m);
    setHabits(h);
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

  function openNewConsultation(patientId?: number, appointment?: Appointment) {
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

  function openExistingVisit(visit: Visit) {
    setSelectedPatientId(visit.patient_id);
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
          <a className="nav-item">
            <Activity size={17} /> Treatments
          </a>
          <a className="nav-item">
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
          grid-template-columns: minmax(460px, 0.86fr) minmax(680px, 1.34fr);
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
          grid-template-columns: 1fr 1fr;
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
          .patient-directory {
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
