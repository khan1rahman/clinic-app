"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X
} from "lucide-react";

type Patient = {
  patient_id: number;
  patient_code: string;
  name: string;
  sex?: "Male" | "Female" | null;
  date_of_birth?: string | null;
  mobile_no?: string | null;
};

type Doctor = {
  doctor_id: number;
  doctor_name: string;
  specialization?: string | null;
  is_active: number;
};

type Visit = {
  visit_id: number;
  patient_id: number;
  patient_code: string;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  visit_date: string;
  visit_type: string | null;
  status: string | null;
  follow_up_date?: string | null;
};

type Medicine = {
  medicine_id: number;
  medicine_name: string;
  generic_name?: string | null;
  form?: string | null;
  strength?: string | null;
  is_active: number;
};

type Prescription = {
  prescription_id: number;
  patient_id: number;
  visit_id: number;
  doctor_id: number;
  prescription_date: string;
  general_instructions?: string | null;
  laboratory_tests?: string | null;
  follow_up_date?: string | null;
  pdf_path?: string | null;
  created_at?: string | null;
};

type PrescriptionItem = {
  prescription_item_id: number;
  patient_id: number;
  prescription_id: number;
  medicine_id?: number | null;
  medicine_name: string;
  generic_name?: string | null;
  form?: string | null;
  strength?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
  instructions?: string | null;
  sequence_no?: number | null;
  dosage_quantity?: string | null;
  dosage_unit?: string | null;
  meal_timing?: string | null;
  duration_days?: number | null;
};

type MedicineRow = {
  localId: number;
  medicine_id: string;
  dosage_quantity: string;
  dosage_unit: string;
  frequency: string[];
  meal_timing: string;
  duration_days: string;
};

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const body = await response.json();

      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body?.detail)) {
        message = body.detail
          .map((x: { msg?: string }) => x.msg)
          .join(", ");
      }
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

const emptyRow = (id: number): MedicineRow => ({
  localId: id,
  medicine_id: "",
  dosage_quantity: "",
  dosage_unit: "",
  frequency: [],
  meal_timing: "",
  duration_days: "",
});

const dosageQuantities = [
  "1",
  "1/2",
  "2",
  "3",
  "4",
  "5",
];

const dosageUnits = [
  "Tablet",
  "Capsule",
  "Tea Spoon",
  "Table Spoon",
  "ml",
  "Drop",
  "Sachet",
  "Puff",
];

const frequencyOptions = [
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
];

const mealOptions = [
  "Before Meal",
  "After Meal",
];

function formatDate(value?: string | null) {
  if (!value) return "—";

  const datePart = value.split("T")[0];
  const parts = datePart.split("-");

  if (parts.length !== 3) return value;

  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}

function calculateAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return "—";

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age >= 0 ? String(age) : "—";
}

export default function PrescriptionsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [items, setItems] = useState<PrescriptionItem[]>([]);

  const [patientId, setPatientId] = useState("");
  const [visitId, setVisitId] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [followUpDate, setFollowUpDate] = useState("");
  const [laboratoryTests, setLaboratoryTests] = useState("");
  const [instructions, setInstructions] = useState("");

  const [rows, setRows] = useState<MedicineRow[]>([
    emptyRow(1),
  ]);

  const [selectedRx, setSelectedRx] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        p,
        d,
        v,
        m,
        r,
        i,
      ] = await Promise.all([
        request<Patient[]>("/patients"),
        request<Doctor[]>("/doctors"),
        request<Visit[]>("/visits"),
        request<Medicine[]>("/medicines"),
        request<Prescription[]>("/prescriptions"),
        request<PrescriptionItem[]>("/prescription-items"),
      ]);

      setPatients(p);
      setDoctors(d);
      setVisits(v);
      setMedicines(m);
      setPrescriptions(r);
      setItems(i);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load prescription data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeMedicines = medicines.filter(
    (medicine) => medicine.is_active === 1
  );

  const patientVisits = patientId
    ? visits.filter(
        (visit) => visit.patient_id === Number(patientId)
      )
    : [];

  const selectedPatient = patients.find(
    (patient) => patient.patient_id === Number(patientId)
  );

  const selectedVisit = visits.find(
    (visit) => visit.visit_id === Number(visitId)
  );

  const selectedDoctor = doctors.find(
    (doctor) => doctor.doctor_id === Number(doctorId)
  );

  const filteredRx = useMemo(() => {
    const q = search.toLowerCase().trim();

    return [...prescriptions]
      .filter((prescription) => {
        const patient = patients.find(
          (p) => p.patient_id === prescription.patient_id
        );

        return (
          !q ||
          patient?.name.toLowerCase().includes(q) ||
          patient?.patient_code.toLowerCase().includes(q) ||
          String(prescription.prescription_id).includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.prescription_date).getTime() -
          new Date(a.prescription_date).getTime()
      );
  }, [prescriptions, patients, search]);

  const selectedPrescription = prescriptions.find(
    (prescription) =>
      prescription.prescription_id === Number(selectedRx)
  );

  const selectedItems = items
    .filter(
      (item) =>
        item.prescription_id === Number(selectedRx)
    )
    .sort(
      (a, b) =>
        (a.sequence_no || 0) -
        (b.sequence_no || 0)
    );

  const selectedPrintPatient = selectedPrescription
    ? patients.find(
        (patient) =>
          patient.patient_id ===
          selectedPrescription.patient_id
      )
    : undefined;

  const selectedPrintDoctor = selectedPrescription
    ? doctors.find(
        (doctor) =>
          doctor.doctor_id ===
          selectedPrescription.doctor_id
      )
    : undefined;

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function resetForm() {
    setPatientId("");
    setVisitId("");
    setDoctorId("");
    setPrescriptionDate(
      new Date().toISOString().slice(0, 10)
    );
    setFollowUpDate("");
    setLaboratoryTests("");
    setInstructions("");
    setRows([emptyRow(Date.now())]);
  }

  function handlePatientChange(value: string) {
    setPatientId(value);
    setVisitId("");
    setDoctorId("");
    setFollowUpDate("");
  }

  function handleVisitChange(value: string) {
    setVisitId(value);

    const visit = visits.find(
      (item) => item.visit_id === Number(value)
    );

    if (visit) {
      setDoctorId(String(visit.doctor_id));
      setFollowUpDate(visit.follow_up_date || "");
    } else {
      setDoctorId("");
      setFollowUpDate("");
    }
  }

  function selectMedicine(
    localId: number,
    medicineId: string
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.localId === localId
          ? {
              ...row,
              medicine_id: medicineId,
            }
          : row
      )
    );
  }

  function updateRow(
    localId: number,
    field:
      | "dosage_quantity"
      | "dosage_unit"
      | "meal_timing"
      | "duration_days",
    value: string
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.localId === localId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function toggleFrequency(
    localId: number,
    frequency: string
  ) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.localId !== localId) {
          return row;
        }

        const exists =
          row.frequency.includes(frequency);

        return {
          ...row,
          frequency: exists
            ? row.frequency.filter(
                (value) => value !== frequency
              )
            : [...row.frequency, frequency],
        };
      })
    );
  }

  function addMedicine() {
    setRows((currentRows) => [
      ...currentRows,
      emptyRow(Date.now()),
    ]);
  }

  function removeMedicine(localId: number) {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return [emptyRow(Date.now())];
      }

      return currentRows.filter(
        (row) => row.localId !== localId
      );
    });
  }

  function printPrescription() {
    if (!selectedPrescription) {
      setError("Please select a prescription first.");
      return;
    }

    clearMessages();
    window.print();
  }

  async function save(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessages();

    if (!patientId) {
      setError("Please select a patient.");
      return;
    }

    if (!visitId) {
      setError("Please select a visit.");
      return;
    }

    if (!doctorId) {
      setError("Doctor could not be determined from the visit.");
      return;
    }

    if (!prescriptionDate) {
      setError("Prescription date is required.");
      return;
    }

    const selectedVisitForSave = visits.find(
      (visit) => visit.visit_id === Number(visitId)
    );

    if (!selectedVisitForSave) {
      setError("The selected consultation could not be found.");
      return;
    }

    if (!selectedVisitForSave.follow_up_date) {
      setError(
        "This consultation does not have a follow-up date. Please update the consultation before creating the prescription."
      );
      return;
    }

    const consultationFollowUpDate =
      selectedVisitForSave.follow_up_date;

    const validRows = rows.filter(
      (row) => row.medicine_id
    );

    if (!validRows.length) {
      setError("Add at least one medicine.");
      return;
    }

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      if (!row.dosage_quantity) {
        setError(
          `Select dosage quantity for Medicine ${i + 1}.`
        );
        return;
      }

      if (!row.dosage_unit) {
        setError(
          `Select dosage unit for Medicine ${i + 1}.`
        );
        return;
      }

      if (!row.frequency.length) {
        setError(
          `Select at least one frequency for Medicine ${i + 1}.`
        );
        return;
      }

      if (!row.meal_timing) {
        setError(
          `Select before or after meal for Medicine ${i + 1}.`
        );
        return;
      }

      if (!row.duration_days) {
        setError(
          `Enter treatment duration for Medicine ${i + 1}.`
        );
        return;
      }

      const days = Number(row.duration_days);

      if (!Number.isInteger(days) || days <= 0) {
        setError(
          `Treatment duration for Medicine ${i + 1} must be a positive number.`
        );
        return;
      }
    }

    setSaving(true);

    try {
      const prescription = await request<Prescription>(
        "/prescriptions",
        {
          method: "POST",
          body: JSON.stringify({
            patient_id: Number(patientId),
            visit_id: Number(visitId),
            doctor_id: Number(doctorId),
            prescription_date:
              `${prescriptionDate}T00:00:00`,
            general_instructions:
              instructions.trim() || null,
            laboratory_tests:
              laboratoryTests.trim() || null,
            follow_up_date:
              consultationFollowUpDate,
          }),
        }
      );

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];

        await request(
          "/prescription-items",
          {
            method: "POST",
            body: JSON.stringify({
              prescription_id:
                prescription.prescription_id,

              medicine_id:
                Number(row.medicine_id),

              dosage_quantity:
                row.dosage_quantity,

              dosage_unit:
                row.dosage_unit,

              frequency:
                row.frequency.join(", "),

              meal_timing:
                row.meal_timing,

              duration_days:
                Number(row.duration_days),

              sequence_no: i + 1,
            }),
          }
        );
      }

      setSuccess(
        `Prescription #${prescription.prescription_id} saved successfully.`
      );

      await loadData();

      resetForm();

      setSelectedRx(
        String(prescription.prescription_id)
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save prescription."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell prescriptions-page">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>

          <div>
            <strong>Dr. ADNAN'S CLINIC</strong>
            <span>LOCAL CLINIC MANAGEMENT</span>
          </div>
        </div>

        <nav>
          <div className="nav-section">
            WORKSPACE
          </div>

          <a
            className="nav-item"
            href="/"
          >
            <FileText size={17} />
            Dashboard
          </a>

          <a
            className="nav-item"
            href="/appointments"
          >
            <FileText size={17} />
            Appointments
          </a>

          <a
            className="nav-item"
            href="/patients"
          >
            <FileText size={17} />
            Patients
          </a>

          <a
            className="nav-item"
            href="/consultations"
          >
            <FileText size={17} />
            Consultations
          </a>

          <div className="nav-section">
            CLINICAL
          </div>

          <a
            className="nav-item"
            href="/treatments"
          >
            <FileText size={17} />
            Treatments
          </a>

          <a
            className="nav-item active"
            href="/prescriptions"
          >
            <FileText size={17} />
            Prescriptions
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="online-dot" />
          FastAPI · SQLite online
          <small>
            Local network application
          </small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="search-box">
            <Search size={16} />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search patient, mobile, code..."
            />
          </div>

          <div className="top-actions">
            <span className="connection">
              <span className="online-dot" />
              LOCAL LAN
            </span>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                CLINICAL DOCUMENTATION
              </div>

              <h1>Prescriptions</h1>

              <p>
                Create and manage patient prescriptions.
              </p>
            </div>

            <div className="prescription-actions">
              <a
                className="secondary-button"
                href="/"
              >
                <ArrowLeft size={16} />
                Dashboard
              </a>

              <button
                className="secondary-button"
                type="button"
                onClick={loadData}
                disabled={loading || saving}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          {success && (
            <div className="success-banner">
              {success}
            </div>
          )}

          <div className="rx-layout">
            <section className="panel rx-editor">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">
                    NEW PRESCRIPTION
                  </div>

                  <h2>
                    Prescription Details
                  </h2>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    clearMessages();
                    resetForm();
                  }}
                >
                  <X size={16} />
                  Clear
                </button>
              </div>

              <form onSubmit={save}>
                <div className="rx-selection">
                  <label>
                    Patient

                    <select
                      value={patientId}
                      onChange={(e) =>
                        handlePatientChange(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select patient
                      </option>

                      {patients.map((patient) => (
                        <option
                          key={patient.patient_id}
                          value={patient.patient_id}
                        >
                          {patient.patient_code} ·{" "}
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Visit

                    <select
                      value={visitId}
                      disabled={!patientId}
                      onChange={(e) =>
                        handleVisitChange(
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select visit
                      </option>

                      {patientVisits.map((visit) => (
                        <option
                          key={visit.visit_id}
                          value={visit.visit_id}
                        >
                          Visit #{visit.visit_id} ·{" "}
                          {visit.visit_date} ·{" "}
                          {visit.visit_type ||
                            "Consultation"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Doctor

                    <input
                      value={
                        selectedDoctor?.doctor_name ||
                        selectedVisit?.doctor_name ||
                        ""
                      }
                      placeholder="Automatically loaded from visit"
                      readOnly
                      disabled={!visitId}
                    />
                  </label>

                  <label>
                    Prescription Date

                    <input
                      type="date"
                      value={prescriptionDate}
                      onChange={(e) =>
                        setPrescriptionDate(
                          e.target.value
                        )
                      }
                    />
                  </label>

                  <label>
                    Follow-up Date (from Consultation)

                    <input
                      type="date"
                      value={followUpDate}
                      readOnly
                      disabled={!visitId || !followUpDate}
                      title={
                        visitId
                          ? "Follow-up date is taken from the selected consultation."
                          : "Select a consultation to load the follow-up date."
                      }
                    />

                    {visitId && !followUpDate && (
                      <small className="follow-up-warning">
                        No follow-up date is recorded for this consultation.
                      </small>
                    )}
                  </label>
                </div>

                {selectedPatient && (
                  <div className="patient-strip">
                    <span>
                      SELECTED PATIENT
                    </span>

                    <strong>
                      {selectedPatient.name}
                    </strong>

                    <span>
                      PATIENT CODE
                    </span>

                    <strong>
                      {selectedPatient.patient_code}
                    </strong>
                  </div>
                )}

                <div className="section-heading">
                  <div>
                    <div className="eyebrow">
                      MEDICATION
                    </div>

                    <h3>
                      Prescription Medicines
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={addMedicine}
                  >
                    <Plus size={16} />
                    Add Medicine
                  </button>
                </div>

                <div className="medicine-list">
                  {rows.map((row, index) => {
                    const medicine =
                      medicines.find(
                        (item) =>
                          item.medicine_id ===
                          Number(row.medicine_id)
                      );

                    return (
                      <div
                        className="medicine-card"
                        key={row.localId}
                      >
                        <div className="medicine-head">
                          <strong>
                            Medicine {index + 1}
                          </strong>

                          <button
                            type="button"
                            className="icon-danger"
                            onClick={() =>
                              removeMedicine(
                                row.localId
                              )
                            }
                            title="Remove medicine"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="medicine-grid">
                          <label className="wide">
                            Medicine

                            <select
                              value={
                                row.medicine_id
                              }
                              onChange={(e) =>
                                selectMedicine(
                                  row.localId,
                                  e.target.value
                                )
                              }
                            >
                              <option value="">
                                Select medicine
                              </option>

                              {activeMedicines.map(
                                (item) => (
                                  <option
                                    key={
                                      item.medicine_id
                                    }
                                    value={
                                      item.medicine_id
                                    }
                                  >
                                    {item.medicine_name}
                                    {item.strength
                                      ? ` · ${item.strength}`
                                      : ""}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <label>
                            Generic Name

                            <input
                              value={
                                medicine?.generic_name ||
                                ""
                              }
                              readOnly
                              disabled
                              placeholder="Auto loaded"
                            />
                          </label>

                          <label>
                            Form

                            <input
                              value={
                                medicine?.form || ""
                              }
                              readOnly
                              disabled
                              placeholder="Auto loaded"
                            />
                          </label>

                          <label>
                            Strength

                            <input
                              value={
                                medicine?.strength || ""
                              }
                              readOnly
                              disabled
                              placeholder="Auto loaded"
                            />
                          </label>

                          <div className="field-block">
                            <label>
                              Dosage Quantity
                            </label>

                            <select
                              value={
                                row.dosage_quantity
                              }
                              onChange={(e) =>
                                updateRow(
                                  row.localId,
                                  "dosage_quantity",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">
                                Select quantity
                              </option>

                              {dosageQuantities.map(
                                (quantity) => (
                                  <option
                                    key={quantity}
                                    value={quantity}
                                  >
                                    {quantity}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div className="field-block">
                            <label>
                              Dosage Unit
                            </label>

                            <select
                              value={
                                row.dosage_unit
                              }
                              onChange={(e) =>
                                updateRow(
                                  row.localId,
                                  "dosage_unit",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">
                                Select unit
                              </option>

                              {dosageUnits.map(
                                (unit) => (
                                  <option
                                    key={unit}
                                    value={unit}
                                  >
                                    {unit}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div className="frequency-block">
                            <label>
                              Frequency
                            </label>

                            <div className="frequency-buttons">
                              {frequencyOptions.map(
                                (frequency) => {
                                  const active =
                                    row.frequency.includes(
                                      frequency
                                    );

                                  return (
                                    <button
                                      key={
                                        frequency
                                      }
                                      type="button"
                                      className={
                                        active
                                          ? "frequency-button active"
                                          : "frequency-button"
                                      }
                                      onClick={() =>
                                        toggleFrequency(
                                          row.localId,
                                          frequency
                                        )
                                      }
                                    >
                                      {frequency}
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          </div>

                          <div className="meal-block">
                            <label>
                              Meal Timing
                            </label>

                            <div className="meal-buttons">
                              {mealOptions.map(
                                (meal) => (
                                  <button
                                    key={meal}
                                    type="button"
                                    className={
                                      row.meal_timing ===
                                      meal
                                        ? "meal-button active"
                                        : "meal-button"
                                    }
                                    onClick={() =>
                                      updateRow(
                                        row.localId,
                                        "meal_timing",
                                        meal
                                      )
                                    }
                                  >
                                    {meal}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          <label>
                            Treatment Days

                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={
                                row.duration_days
                              }
                              onChange={(e) =>
                                updateRow(
                                  row.localId,
                                  "duration_days",
                                  e.target.value
                                )
                              }
                              placeholder="Number of days"
                            />
                          </label>

                          <div className="medicine-summary">
                            <span>
                              PRESCRIPTION
                            </span>

                            <strong>
                              {row.dosage_quantity &&
                              row.dosage_unit
                                ? `${row.dosage_quantity} ${row.dosage_unit}`
                                : "Dosage not selected"}
                            </strong>

                            <small>
                              {row.frequency.length
                                ? row.frequency.join(
                                    " · "
                                  )
                                : "Frequency not selected"}

                              {row.meal_timing
                                ? ` · ${row.meal_timing}`
                                : ""}

                              {row.duration_days
                                ? ` · ${row.duration_days} days`
                                : ""}
                            </small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="clinical-fields">
                  <label>
                    Laboratory Test Suggestions

                    <textarea
                      rows={4}
                      value={laboratoryTests}
                      onChange={(e) =>
                        setLaboratoryTests(
                          e.target.value
                        )
                      }
                      placeholder="Enter suggested laboratory tests..."
                    />
                  </label>

                  <label>
                    General Instructions

                    <textarea
                      rows={4}
                      value={instructions}
                      onChange={(e) =>
                        setInstructions(
                          e.target.value
                        )
                      }
                      placeholder="General prescription instructions..."
                    />
                  </label>
                </div>

                <div className="save-row">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={saving || loading}
                  >
                    <FileText size={16} />

                    {saving
                      ? "Saving..."
                      : "Save Prescription"}
                  </button>
                </div>
              </form>
            </section>

            <aside className="panel rx-history">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">
                    HISTORY
                  </div>

                  <h2>
                    Prescriptions
                  </h2>
                </div>

                <strong>
                  {filteredRx.length}
                </strong>
              </div>

              {loading ? (
                <div className="empty-state">
                  Loading prescriptions...
                </div>
              ) : filteredRx.length === 0 ? (
                <div className="empty-state">
                  No prescriptions found.
                </div>
              ) : (
                <div className="history-list">
                  {filteredRx.map(
                    (prescription) => (
                      <button
                        type="button"
                        className={
                          selectedRx ===
                          String(
                            prescription.prescription_id
                          )
                            ? "history-item selected"
                            : "history-item"
                        }
                        key={
                          prescription.prescription_id
                        }
                        onClick={() =>
                          setSelectedRx(
                            String(
                              prescription.prescription_id
                            )
                          )
                        }
                      >
                        <div>
                          <strong>
                            RX #
                            {
                              prescription.prescription_id
                            }
                          </strong>

                          <span>
                            {patients.find(
                              (patient) =>
                                patient.patient_id ===
                                prescription.patient_id
                            )?.name ||
                              `Patient #${prescription.patient_id}`}
                          </span>
                        </div>

                        <div>
                          <span>
                            {
                              prescription.prescription_date
                            }
                          </span>

                          <small>
                            {doctors.find(
                              (doctor) =>
                                doctor.doctor_id ===
                                prescription.doctor_id
                            )?.doctor_name ||
                              `Doctor #${prescription.doctor_id}`}
                          </small>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}

              {selectedPrescription && (
                <div className="rx-detail">
                  <div className="eyebrow">
                    RX #
                    {
                      selectedPrescription.prescription_id
                    }
                  </div>

                  <h3>
                    {patients.find(
                      (patient) =>
                        patient.patient_id ===
                        selectedPrescription.patient_id
                    )?.name || "Patient"}
                  </h3>

                  <div className="detail-grid">
                    <div>
                      <span>
                        Prescription Date
                      </span>

                      <strong>
                        {
                          selectedPrescription.prescription_date
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Follow-up
                      </span>

                      <strong>
                        {
                          selectedPrescription.follow_up_date ||
                          "—"
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="print-action">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={printPrescription}
                    >
                      <Printer size={16} />
                      Print Prescription
                    </button>
                  </div>

                  {selectedPrescription.laboratory_tests && (
                    <div className="history-instructions">
                      <div className="eyebrow">
                        LABORATORY TESTS
                      </div>

                      <p>
                        {
                          selectedPrescription.laboratory_tests
                        }
                      </p>
                    </div>
                  )}

                  <div className="history-meds">
                    <div className="eyebrow">
                      MEDICINES
                    </div>

                    {selectedItems.length ? (
                      selectedItems.map((item) => (
                        <div
                          className="history-med"
                          key={
                            item.prescription_item_id
                          }
                        >
                          <strong>
                            {item.medicine_name}
                          </strong>

                          <span>
                            {[
                              item.generic_name,
                              item.form,
                              item.strength,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>

                          <span>
                            {[
                              item.dosage_quantity &&
                                item.dosage_unit
                                ? `${item.dosage_quantity} ${item.dosage_unit}`
                                : item.dosage,
                              item.frequency,
                              item.meal_timing,
                              item.duration_days
                                ? `${item.duration_days} days`
                                : item.duration,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>
                        No medicine items recorded.
                      </p>
                    )}
                  </div>

                  {selectedPrescription.general_instructions && (
                    <div className="history-instructions">
                      <div className="eyebrow">
                        GENERAL INSTRUCTIONS
                      </div>

                      <p>
                        {
                          selectedPrescription.general_instructions
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>

      {selectedPrescription && (
        <div className="print-prescription">
          <div className="print-header">
            <div className="print-clinic-name">
              ATELIER CLINIC
            </div>
            <div className="print-clinic-subtitle">
              COSMETIC & AESTHETIC CLINIC
            </div>
            <div className="print-clinic-local">
              LOCAL CLINIC MANAGEMENT
            </div>
          </div>

          <div className="print-title">
            PRESCRIPTION
          </div>

          <div className="print-meta-grid">
            <div>
              <span>Prescription No.</span>
              <strong>
                RX #{selectedPrescription.prescription_id}
              </strong>
            </div>
            <div>
              <span>Date</span>
              <strong>
                {formatDate(selectedPrescription.prescription_date)}
              </strong>
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">
              PATIENT INFORMATION
            </div>

            <div className="print-patient-grid">
              <div>
                <span>Patient Name</span>
                <strong>{selectedPrintPatient?.name || "—"}</strong>
              </div>
              <div>
                <span>Patient Code</span>
                <strong>{selectedPrintPatient?.patient_code || "—"}</strong>
              </div>
              <div>
                <span>Age</span>
                <strong>{calculateAge(selectedPrintPatient?.date_of_birth)}</strong>
              </div>
              <div>
                <span>Sex</span>
                <strong>{selectedPrintPatient?.sex || "—"}</strong>
              </div>
              <div>
                <span>Mobile</span>
                <strong>{selectedPrintPatient?.mobile_no || "—"}</strong>
              </div>
              <div>
                <span>Doctor</span>
                <strong>{selectedPrintDoctor?.doctor_name || "—"}</strong>
              </div>
            </div>
          </div>

          <div className="print-rx-symbol">Rx</div>

          <div className="print-section">
            <div className="print-section-title">MEDICATION</div>

            <div className="print-medicine-list">
              {selectedItems.length ? (
                selectedItems.map((item, index) => (
                  <div
                    className="print-medicine"
                    key={item.prescription_item_id}
                  >
                    <div className="print-medicine-number">
                      {index + 1}.
                    </div>

                    <div className="print-medicine-content">
                      <div className="print-medicine-name">
                        {item.medicine_name}
                      </div>

                      <div className="print-medicine-details">
                        {[
                          item.generic_name,
                          item.form,
                          item.strength,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>

                      <div className="print-dosage">
                        <strong>
                          {item.dosage_quantity && item.dosage_unit
                            ? `${item.dosage_quantity} ${item.dosage_unit}`
                            : item.dosage || "—"}
                        </strong>

                        {item.frequency && (
                          <span>{item.frequency}</span>
                        )}

                        {item.meal_timing && (
                          <span>{item.meal_timing}</span>
                        )}

                        {item.duration_days ? (
                          <span>{item.duration_days} days</span>
                        ) : item.duration ? (
                          <span>{item.duration}</span>
                        ) : null}
                      </div>

                      {item.route && (
                        <div className="print-small-line">
                          Route: {item.route}
                        </div>
                      )}

                      {item.instructions && (
                        <div className="print-small-line">
                          Instructions: {item.instructions}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div>No medicines recorded.</div>
              )}
            </div>
          </div>

          {selectedPrescription.laboratory_tests && (
            <div className="print-section">
              <div className="print-section-title">
                LABORATORY TESTS
              </div>
              <div className="print-text">
                {selectedPrescription.laboratory_tests}
              </div>
            </div>
          )}

          {selectedPrescription.general_instructions && (
            <div className="print-section">
              <div className="print-section-title">
                GENERAL INSTRUCTIONS
              </div>
              <div className="print-text">
                {selectedPrescription.general_instructions}
              </div>
            </div>
          )}

          {selectedPrescription.follow_up_date && (
            <div className="print-followup">
              <span>Follow-up Date:</span>
              <strong>
                {formatDate(selectedPrescription.follow_up_date)}
              </strong>
            </div>
          )}

          <div className="print-footer">
            <div className="print-doctor">
              <strong>
                {selectedPrintDoctor?.doctor_name || "Doctor"}
              </strong>
              {selectedPrintDoctor?.specialization && (
                <span>{selectedPrintDoctor.specialization}</span>
              )}
            </div>

            <div className="signature-area">
              <div className="signature-line" />
              <span>Doctor Signature</span>
            </div>
          </div>

          <div className="print-bottom-line">
            This prescription is generated from the clinic management system.
          </div>
        </div>
      )}

      <style jsx global>{`
        .prescriptions-page .page-heading h1 {
          font-size: 30px;
        }

        .prescriptions-page .panel-header h2 {
          font-size: 18px;
        }

        .prescriptions-page label {
          display: grid;
          gap: 7px;
          color: var(--muted);
          font-size: 13px;
        }

        .prescriptions-page select,
        .prescriptions-page input,
        .prescriptions-page textarea {
          box-sizing: border-box;
          width: 100%;
          font-size: 15px;
          line-height: 1.4;
          color: #111827 !important;
          background: #ffffff !important;
          -webkit-text-fill-color: #111827 !important;
          opacity: 1 !important;
        }

        .prescriptions-page select,
        .prescriptions-page input {
          min-height: 40px;
          padding: 8px 10px;
        }

        .prescriptions-page textarea {
          padding: 9px 10px;
          resize: vertical;
        }

        .prescriptions-page select option {
          color: #111827 !important;
          background: #ffffff !important;
          font-size: 15px;
        }

        .prescriptions-page select:disabled,
        .prescriptions-page input:disabled,
        .prescriptions-page textarea:disabled {
          color: #6b7280 !important;
          -webkit-text-fill-color: #6b7280 !important;
          background: #f3f4f6 !important;
          opacity: 1 !important;
        }

        .prescriptions-page input::placeholder,
        .prescriptions-page textarea::placeholder {
          color: #6b7280 !important;
          -webkit-text-fill-color: #6b7280 !important;
          opacity: 1 !important;
        }

        .prescription-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .rx-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) 390px;
          gap: 18px;
          align-items: start;
        }

        .rx-selection {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 14px;
          padding: 18px;
          border-bottom: 1px solid var(--line);
        }

        .patient-strip {
          display: flex;
          gap: 14px;
          align-items: baseline;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line);
          font-size: 14px;
        }

        .patient-strip span {
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--muted);
          margin-left: 10px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px;
        }

        .section-heading h3 {
          margin: 4px 0 0;
          font-size: 17px;
          font-weight: 500;
        }

        .medicine-list {
          display: grid;
          gap: 14px;
          padding: 0 18px;
        }

        .medicine-card {
          border: 1px solid var(--line);
          border-radius: 7px;
          padding: 15px;
        }

        .medicine-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          font-size: 15px;
        }

        .icon-danger {
          border: 0;
          background: transparent;
          color: var(--danger, #b42318);
          cursor: pointer;
          padding: 5px;
        }

        .medicine-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .medicine-grid .wide {
          grid-column: span 2;
        }

        .field-block {
          display: grid;
          gap: 7px;
        }

        .frequency-block {
          grid-column: span 2;
          display: grid;
          gap: 7px;
        }

        .meal-block {
          grid-column: span 2;
          display: grid;
          gap: 7px;
        }

        .frequency-buttons,
        .meal-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .frequency-button,
        .meal-button {
          min-height: 40px;
          padding: 7px 12px;
          border: 1px solid var(--line-active);
          border-radius: 5px;
          background: #ffffff;
          color: #111827;
          font-size: 13px;
          cursor: pointer;
        }

        .frequency-button:hover,
        .meal-button:hover {
          border-color: #9ca3af;
        }

        .frequency-button.active,
        .meal-button.active {
          background: #111827;
          color: #ffffff;
          border-color: #111827;
        }

        .medicine-summary {
          grid-column: span 2;
          display: grid;
          gap: 4px;
          align-content: center;
          min-height: 65px;
          padding: 10px 12px;
          border: 1px solid var(--line);
          border-radius: 5px;
          background: #f8fafc;
        }

        .medicine-summary span {
          font-size: 9px;
          letter-spacing: 0.08em;
          color: var(--muted);
        }

        .medicine-summary strong {
          font-size: 14px;
          color: #111827;
        }

        .medicine-summary small {
          font-size: 12px;
          color: #6b7280;
        }

        .clinical-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin: 18px;
        }

        .save-row {
          display: flex;
          justify-content: flex-end;
          padding: 0 18px 18px;
        }

        .rx-history {
          position: sticky;
          top: 18px;
        }

        .history-list {
          display: grid;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          text-align: left;
          border: 0;
          border-bottom: 1px solid var(--line);
          background: transparent;
          color: var(--text);
          padding: 13px 16px;
          cursor: pointer;
        }

        .history-item:hover,
        .history-item.selected {
          background: rgba(255, 255, 255, 0.035);
        }

        .history-item > div {
          display: grid;
          gap: 4px;
        }

        .history-item > div:last-child {
          text-align: right;
        }

        .history-item strong {
          font-size: 14px;
        }

        .history-item span,
        .history-item small {
          font-size: 12px;
          color: var(--muted);
        }

        .rx-detail {
          margin: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
        }

        .rx-detail h3 {
          margin: 5px 0 15px;
          font-size: 18px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .detail-grid div {
          display: grid;
          gap: 4px;
        }

        .detail-grid span {
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
        }

        .detail-grid strong {
          font-size: 13px;
        }

        .history-meds {
          margin-top: 18px;
        }

        .history-med {
          display: grid;
          gap: 4px;
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
        }

        .history-med strong {
          font-size: 14px;
        }

        .history-med span {
          font-size: 12px;
          color: var(--muted);
        }

        .history-instructions {
          margin-top: 18px;
        }

        .history-instructions p {
          font-size: 13px;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .follow-up-warning {
          color: #b42318;
          font-size: 11px;
          line-height: 1.35;
        }

        .print-action {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .print-prescription {
          display: none;
        }

        .print-header {
          text-align: center;
          border-bottom: 2px solid #111827;
          padding-bottom: 12px;
        }

        .print-clinic-name {
          font-size: 25px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .print-clinic-subtitle {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
        }

        .print-clinic-local {
          margin-top: 3px;
          font-size: 9px;
          letter-spacing: 0.08em;
          color: #555;
        }

        .print-title {
          text-align: center;
          margin: 18px 0 14px;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.12em;
        }

        .print-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid #222;
          margin-bottom: 16px;
        }

        .print-meta-grid > div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 10px;
        }

        .print-meta-grid > div:first-child {
          border-right: 1px solid #222;
        }

        .print-meta-grid span {
          font-size: 10px;
          color: #555;
        }

        .print-meta-grid strong {
          font-size: 11px;
        }

        .print-section {
          margin-top: 16px;
        }

        .print-section-title {
          padding-bottom: 5px;
          border-bottom: 1px solid #222;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .print-patient-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-left: 1px solid #bbb;
          border-top: 1px solid #bbb;
        }

        .print-patient-grid > div {
          display: grid;
          gap: 3px;
          min-height: 43px;
          padding: 7px 8px;
          border-right: 1px solid #bbb;
          border-bottom: 1px solid #bbb;
        }

        .print-patient-grid span {
          font-size: 8px;
          text-transform: uppercase;
          color: #666;
          letter-spacing: 0.05em;
        }

        .print-patient-grid strong {
          font-size: 11px;
        }

        .print-rx-symbol {
          margin-top: 20px;
          font-family: Georgia, serif;
          font-size: 27px;
          font-weight: 700;
          font-style: italic;
        }

        .print-medicine-list {
          margin-top: 8px;
        }

        .print-medicine {
          display: grid;
          grid-template-columns: 25px 1fr;
          gap: 4px;
          padding: 9px 0;
          border-bottom: 1px solid #ddd;
          break-inside: avoid;
        }

        .print-medicine-number {
          font-size: 12px;
          font-weight: 700;
        }

        .print-medicine-content {
          display: grid;
          gap: 3px;
        }

        .print-medicine-name {
          font-size: 13px;
          font-weight: 700;
        }

        .print-medicine-details {
          font-size: 10px;
          color: #555;
        }

        .print-dosage {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 3px;
          font-size: 10px;
        }

        .print-dosage strong {
          font-size: 11px;
        }

        .print-small-line {
          font-size: 9px;
          color: #444;
          white-space: pre-wrap;
        }

        .print-text {
          padding-top: 8px;
          font-size: 10px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .print-followup {
          display: flex;
          gap: 8px;
          margin-top: 22px;
          padding: 9px 10px;
          border: 1px solid #222;
          font-size: 11px;
        }

        .print-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 55px;
          break-inside: avoid;
        }

        .print-doctor {
          display: grid;
          gap: 3px;
        }

        .print-doctor strong {
          font-size: 12px;
        }

        .print-doctor span {
          font-size: 9px;
          color: #555;
        }

        .signature-area {
          width: 180px;
          text-align: center;
        }

        .signature-line {
          width: 180px;
          border-top: 1px solid #111;
          margin-bottom: 5px;
        }

        .signature-area span {
          font-size: 9px;
        }

        .print-bottom-line {
          margin-top: 28px;
          padding-top: 7px;
          border-top: 1px solid #ccc;
          text-align: center;
          font-size: 8px;
          color: #777;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-prescription,
          .print-prescription * {
            visibility: visible !important;
          }

          .print-prescription {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #111111 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }

          .print-prescription,
          .print-prescription * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-section,
          .print-medicine {
            break-inside: avoid;
          }
        }

        @media (max-width: 1100px) {
          .rx-layout {
            grid-template-columns: 1fr;
          }

          .rx-history {
            position: static;
          }
        }

        @media (max-width: 900px) {
          .rx-selection,
          .medicine-grid {
            grid-template-columns: 1fr 1fr;
          }

          .medicine-grid .wide {
            grid-column: span 2;
          }

          .clinical-fields {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .rx-selection,
          .medicine-grid {
            grid-template-columns: 1fr;
          }

          .medicine-grid .wide,
          .frequency-block,
          .meal-block,
          .medicine-summary {
            grid-column: span 1;
          }

          .patient-strip {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}