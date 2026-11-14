"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Pencil,
  RefreshCw,
  Trash2,
  Search,
  Stethoscope,
  UserPlus,
  X
} from "lucide-react";

import { api, type VisitRecord } from "../../lib/api";

import type {
  Appointment,
  Patient
} from "../../lib/types";


type DetailTab =
  | "overview"
  | "appointments"
  | "visits"
  | "treatments";


function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    value.includes("T")
      ? value
      : `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}


function formatTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    value.replace(" ", "T")
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}


function getAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return null;
  }

  const birth = new Date(dateOfBirth);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (
      today.getMonth() === birth.getMonth() &&
      today.getDate() < birth.getDate()
    );

  if (beforeBirthday) {
    age--;
  }

  return age;
}


function statusClass(status: string) {
  switch (status) {
    case "Completed":
      return "status completed";

    case "Waiting":
      return "status waiting";

    case "In Consultation":
      return "status consultation";

    case "Scheduled":
      return "status scheduled";

    case "Cancelled":
    case "No Show":
      return "status cancelled";

    default:
      return "status";
  }
}


export default function PatientsPage() {

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [visits, setVisits] =
    useState<VisitRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);

  const [activeTab, setActiveTab] =
    useState<DetailTab>("overview");

  const [showNewPatient, setShowNewPatient] =
    useState(false);

  const [showEditPatient, setShowEditPatient] =
    useState(false);

  const [savingPatient, setSavingPatient] =
    useState(false);

  const [deletingPatient, setDeletingPatient] =
    useState(false);

  const [editPatient, setEditPatient] = useState({
    name: "",
    sex: "" as "" | "Male" | "Female",
    date_of_birth: "",
    mobile_no: "",
    email: "",
    occupation: "",
    address: "",
    city: "",
    first_appointment_date: ""
  });

  const [newPatient, setNewPatient] =
    useState({
      name: "",
      sex: "" as "" | "Male" | "Female",
      date_of_birth: "",
      mobile_no: "",
      email: "",
      occupation: "",
      address: "",
      city: ""
    });


  async function loadData() {

    try {

      setLoading(true);
      setError("");

      const [
        patientData,
        appointmentData,
        visitData
      ] = await Promise.all([
        api.getPatients(),
        api.getAppointments(),
        api.getVisits()
      ]);

      setPatients(patientData);
      setAppointments(appointmentData);
      setVisits(visitData);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load patient records."
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {
    loadData();
  }, []);


  const filteredPatients =
    useMemo(() => {

      const query =
        search.trim().toLowerCase();

      if (!query) {
        return patients;
      }

      return patients.filter(
        (patient) =>
          patient.name
            .toLowerCase()
            .includes(query) ||

          patient.patient_code
            .toLowerCase()
            .includes(query) ||

          (patient.mobile_no || "")
            .toLowerCase()
            .includes(query) ||

          (patient.email || "")
            .toLowerCase()
            .includes(query)
      );

    }, [patients, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const selectedAppointments =
    useMemo(() => {

      if (!selectedPatient) {
        return [];
      }

      return appointments
        .filter(
          (appointment) =>
            appointment.patient_id ===
            selectedPatient.patient_id
        )
        .sort(
          (a, b) =>
            b.appointment_timestamp.localeCompare(
              a.appointment_timestamp
            )
        );

    }, [appointments, selectedPatient]);


  const selectedVisits =
    useMemo(() => {

      if (!selectedPatient) {
        return [];
      }

      return visits
        .filter(
          (visit) =>
            visit.patient_id ===
            selectedPatient.patient_id
        )
        .sort(
          (a, b) =>
            b.visit_date.localeCompare(
              a.visit_date
            )
        );

    }, [visits, selectedPatient]);


  const treatmentHistory =
    useMemo(() => {

      return selectedAppointments.filter(
        (appointment) =>
          appointment.treatment_id ||
          appointment.treatment_name ||
          appointment.category_name
      );

    }, [selectedAppointments]);


  function openPatient(
    patient: Patient
  ) {

    setSelectedPatient(patient);
    setActiveTab("overview");
  }


  function closePatient() {

    setSelectedPatient(null);
    setActiveTab("overview");
  }


  function openEditPatient() {
    if (!selectedPatient) return;

    setError("");
    setEditPatient({
      name: selectedPatient.name || "",
      sex: selectedPatient.sex || "",
      date_of_birth: selectedPatient.date_of_birth
        ? selectedPatient.date_of_birth.slice(0, 10)
        : "",
      mobile_no: selectedPatient.mobile_no || "",
      email: selectedPatient.email || "",
      occupation: selectedPatient.occupation || "",
      address: selectedPatient.address || "",
      city: selectedPatient.city || "",
      first_appointment_date: selectedPatient.first_appointment_date
        ? selectedPatient.first_appointment_date.slice(0, 10)
        : ""
    });
    setShowEditPatient(true);
  }

  function closeEditPatient() {
    setShowEditPatient(false);
  }

  async function savePatientChanges() {
    if (!selectedPatient) return;

    if (!editPatient.name.trim()) {
      setError("Patient name is required.");
      return;
    }
    if (!editPatient.sex) {
      setError("Patient sex is required.");
      return;
    }
    if (!editPatient.date_of_birth) {
      setError("Date of birth is required.");
      return;
    }

    try {
      setSavingPatient(true);
      setError("");

      const updated = await api.updatePatient(
        selectedPatient.patient_id,
        {
          name: editPatient.name.trim(),
          sex: editPatient.sex,
          date_of_birth: editPatient.date_of_birth,
          mobile_no: editPatient.mobile_no.trim() || undefined,
          email: editPatient.email.trim() || undefined,
          occupation: editPatient.occupation.trim() || undefined,
          address: editPatient.address.trim() || undefined,
          city: editPatient.city.trim() || undefined,
          first_appointment_date:
            editPatient.first_appointment_date || undefined
        }
      );

      setPatients((current) => current.map((patient) =>
        patient.patient_id === updated.patient_id ? updated : patient
      ));
      setSelectedPatient(updated);
      setShowEditPatient(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update patient."
      );
    } finally {
      setSavingPatient(false);
    }
  }

  async function permanentlyDeletePatient() {
    if (!selectedPatient) return;

    const confirmed = window.confirm(
      `Permanently delete patient ${selectedPatient.name} (${selectedPatient.patient_code})?\n\nThis cannot be undone. If this patient has linked appointments or clinical records, deletion may be blocked.`
    );
    if (!confirmed) return;

    try {
      setDeletingPatient(true);
      setError("");
      await api.deletePatient(selectedPatient.patient_id);
      setPatients((current) => current.filter((patient) =>
        patient.patient_id !== selectedPatient.patient_id
      ));
      setSelectedPatient(null);
      setActiveTab("overview");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete patient."
      );
    } finally {
      setDeletingPatient(false);
    }
  }


  function resetNewPatient() {

    setNewPatient({
      name: "",
      sex: "",
      date_of_birth: "",
      mobile_no: "",
      email: "",
      occupation: "",
      address: "",
      city: ""
    });
  }


  function closeNewPatient() {

    setShowNewPatient(false);
    resetNewPatient();
  }


  async function createNewPatient() {

    if (!newPatient.name.trim()) {
      setError("Patient name is required.");
      return;
    }

    if (!newPatient.sex) {
      setError("Patient sex is required.");
      return;
    }

    if (!newPatient.date_of_birth) {
      setError("Date of birth is required.");
      return;
    }

    try {

      setError("");

      const created =
        await api.createPatient({
          name: newPatient.name.trim(),
          sex: newPatient.sex,
          date_of_birth:
            newPatient.date_of_birth,

          mobile_no:
            newPatient.mobile_no.trim() ||
            undefined,

          email:
            newPatient.email.trim() ||
            undefined,

          occupation:
            newPatient.occupation.trim() ||
            undefined,

          address:
            newPatient.address.trim() ||
            undefined,

          city:
            newPatient.city.trim() ||
            undefined
        });

      setPatients((current) => [
        ...current,
        created
      ]);

      closeNewPatient();

      openPatient(created);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create patient."
      );

    }
  }


  return (
    <main className="appointments-page">

      <section className="appointments-page-inner">

        <div className="page-heading">

          <div>

            <div className="eyebrow">
              PATIENT MANAGEMENT
            </div>

            <h1>
              Patients
            </h1>

            <p>
              Search and manage patient records.
            </p>

          </div>


          <div className="appointment-header-actions">

            <a
              href="/"
              className="appointment-main-button patients-header-button"
            >
              <ArrowLeft size={16} />
              Main Dashboard
            </a>


            <button
              className="primary-button patients-header-button"
              onClick={() => {
                setError("");
                setShowNewPatient(true);
              }}
            >
              <UserPlus size={18} />
              New Patient
            </button>

          </div>

        </div>


        {error && (
          <div className="error-banner patients-error">
            {error}

            <button
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}


        <section className="appointments-toolbar">

          <div className="appointment-filters patients-filters">

            <div className="appointment-search">

              <Search size={16} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search patient, mobile or patient code..."
              />

            </div>


            <button
              className="secondary-button"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw size={15} />
              Refresh
            </button>

          </div>

        </section>


        <section className="appointments-panel">

          <div className="appointments-panel-header">

            <div>

              <div className="eyebrow">
                PATIENT RECORDS
              </div>

              <h2>
                All Patients
              </h2>

              <span>
                {filteredPatients.length} patient
                {filteredPatients.length === 1
                  ? ""
                  : "s"}
              </span>

            </div>

          </div>


          {loading ? (

            <div className="appointments-empty">
              <strong>
                Loading patient records...
              </strong>
            </div>

          ) : filteredPatients.length === 0 ? (

            <div className="appointments-empty">

              <strong>
                No patients found.
              </strong>

              <span>
                Try another search or create a new patient.
              </span>

            </div>

          ) : (

            <div className="patients-table">

              <div className="patients-table-head">

                <span>CODE</span>
                <span>PATIENT</span>
                <span>SEX</span>
                <span>DATE OF BIRTH</span>
                <span>MOBILE</span>
		<span>TREATMENT</span>
                <span>STATUS</span>

              </div>


              {paginatedPatients.map(
                (patient) => (
                  <div className="patient-record-group" key={patient.patient_id}>
                  <button
                    type="button"
                    className="patients-table-row patient-row-button"
                    onClick={() => {
                      if (selectedPatient?.patient_id === patient.patient_id) {
                        closePatient();
                      } else {
                        openPatient(patient);
                      }
                    }}
                  >

                    <div className="patient-code">
                      {patient.patient_code}
                    </div>


                    <div className="patient-name-cell">

                      <strong>
                        {patient.name}
                      </strong>

                      <small>
                        {patient.city ||
                          patient.email ||
                          "—"}
                      </small>

                    </div>


                    <div>
                      {patient.sex}
                    </div>


                    <div>
                      {formatDate(
                        patient.date_of_birth
                      )}
                    </div>


                    <div>
                      {patient.mobile_no ||
                        "—"}
                    </div>

<div className="patient-treatment-cell">
  {appointments
    .filter(
      (appointment) =>
        appointment.patient_id === patient.patient_id
    )
    .sort((a, b) =>
      b.appointment_timestamp.localeCompare(
        a.appointment_timestamp
      )
    )
    .slice(0, 1)
    .map((appointment) => (
      <div key={appointment.appointment_id}>
        <strong>
          {appointment.category_name || "Treatment"}
        </strong>
        <small>
          {appointment.treatment_name || "General consultation"}
        </small>
      </div>
    ))}
  {!appointments.some(
    (appointment) =>
      appointment.patient_id === patient.patient_id
  ) && <span>—</span>}
</div>


                    <div>

                      <span
                        className={
                          patient.status ===
                          "Active"
                            ? "patient-status active"
                            : "patient-status inactive"
                        }
                      >
                        {patient.status}
                      </span>

                    </div>

                  </button>

                        {selectedPatient && selectedPatient.patient_id === patient.patient_id && (

        <div className="patient-expanded-wrap">

          <section className="patient-detail-modal patient-expanded-detail">

            <div className="patient-modal-header">

              <div>

                <div className="eyebrow">
                  PATIENT RECORD
                </div>

                <h2>
                  {selectedPatient.name}
                </h2>

                <p>
                  {selectedPatient.patient_code}
                  {" · "}
                  {selectedPatient.sex}
                  {" · "}
                  {getAge(
                    selectedPatient.date_of_birth
                  ) ?? "—"}{" "}
                  years
                </p>

              </div>


              <div className="patient-header-actions">
                <button
                  type="button"
                  className="secondary-button patient-action-button"
                  onClick={openEditPatient}
                >
                  <Pencil size={15} />
                  Edit
                </button>
                <button
                  type="button"
                  className="danger-button patient-action-button"
                  onClick={permanentlyDeletePatient}
                  disabled={deletingPatient}
                >
                  <Trash2 size={15} />
                  {deletingPatient ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={closePatient}
                  aria-label="Close patient details"
                >
                  <X size={18} />
                </button>
              </div>

            </div>


            <div className="patient-detail-tabs">

              <button
                className={
                  activeTab === "overview"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setActiveTab("overview")
                }
              >
                Overview
              </button>


              <button
                className={
                  activeTab === "appointments"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setActiveTab("appointments")
                }
              >
                Appointment Status
                <span>
                  {selectedAppointments.length}
                </span>
              </button>


              <button
                className={
                  activeTab === "visits"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setActiveTab("visits")
                }
              >
                Visits
                <span>
                  {selectedVisits.length}
                </span>
              </button>


              <button
                className={
                  activeTab === "treatments"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setActiveTab("treatments")
                }
              >
                Treatment History
                <span>
                  {treatmentHistory.length}
                </span>
              </button>

            </div>


            <div className="patient-detail-body">

              {/* OVERVIEW */}

              {activeTab === "overview" && (

                <div className="patient-overview-grid">

                  <div className="patient-info-card">

                    <div className="eyebrow">
                      BASIC INFORMATION
                    </div>

                    <h3>
                      Patient Details
                    </h3>


                    <div className="patient-info-list">

                      <div>
                        <span>
                          Patient Code
                        </span>
                        <strong>
                          {selectedPatient.patient_code}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Name
                        </span>
                        <strong>
                          {selectedPatient.name}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Sex
                        </span>
                        <strong>
                          {selectedPatient.sex}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Date of Birth
                        </span>
                        <strong>
                          {formatDate(
                            selectedPatient.date_of_birth
                          )}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Age
                        </span>
                        <strong>
                          {getAge(
                            selectedPatient.date_of_birth
                          ) ?? "—"}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Mobile
                        </span>
                        <strong>
                          {selectedPatient.mobile_no ||
                            "—"}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Email
                        </span>
                        <strong>
                          {selectedPatient.email ||
                            "—"}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Occupation
                        </span>
                        <strong>
                          {selectedPatient.occupation ||
                            "—"}
                        </strong>
                      </div>


                      <div>
                        <span>
                          City
                        </span>
                        <strong>
                          {selectedPatient.city ||
                            "—"}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Status
                        </span>

                        <strong>
                          {selectedPatient.status}
                        </strong>
                      </div>

                    </div>

                  </div>


                  <div className="patient-summary-card">

                    <div className="eyebrow">
                      CLINICAL ACTIVITY
                    </div>

                    <h3>
                      Patient Summary
                    </h3>


                    <div className="patient-summary-stats">

                      <div>
                        <CalendarDays size={19} />

                        <strong>
                          {selectedAppointments.length}
                        </strong>

                        <span>
                          Appointments
                        </span>
                      </div>


                      <div>
                        <Stethoscope size={19} />

                        <strong>
                          {selectedVisits.length}
                        </strong>

                        <span>
                          Visits
                        </span>
                      </div>


                      <div>
                        <FileText size={19} />

                        <strong>
                          {treatmentHistory.length}
                        </strong>

                        <span>
                          Treatments
                        </span>
                      </div>

                    </div>

                  </div>

                </div>

              )}


              {/* APPOINTMENTS */}

              {activeTab === "appointments" && (

                <div className="patient-history-section">

                  <div className="eyebrow">
                    APPOINTMENT HISTORY
                  </div>

                  <h3>
                    Appointment Status
                  </h3>


                  {selectedAppointments.length === 0 ? (

                    <div className="appointments-empty">
                      <strong>
                        No appointments found.
                      </strong>
                    </div>

                  ) : (

                    <div className="patient-history-list">

                      {selectedAppointments.map(
                        (appointment) => (

                          <div
                            className="patient-history-row"
                            key={
                              appointment.appointment_id
                            }
                          >

                            <div className="history-date">

                              <strong>
                                {formatDate(
                                  appointment.appointment_timestamp
                                )}
                              </strong>

                              <small>
                                {formatTime(
                                  appointment.appointment_timestamp
                                )}
                              </small>

                            </div>


                            <div className="history-main">

                              <strong>
                                {appointment.category_name ||
                                  "Consultation"}
                              </strong>

                              <span>
                                {appointment.treatment_name ||
                                  "General consultation"}
                              </span>

                              <small>
                                {appointment.visit_type}
                              </small>

                            </div>


                            <span
                              className={statusClass(
                                appointment.status
                              )}
                            >
                              {appointment.status}
                            </span>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              )}


              {/* VISITS */}

              {activeTab === "visits" && (

                <div className="patient-history-section">

                  <div className="eyebrow">
                    CLINICAL VISITS
                  </div>

                  <h3>
                    Visit History
                  </h3>


                  {selectedVisits.length === 0 ? (

                    <div className="appointments-empty">
                      <strong>
                        No visits recorded.
                      </strong>

                      <span>
                        Visits will appear here after a clinical visit is recorded.
                      </span>
                    </div>

                  ) : (

                    <div className="patient-visits-list">

                      {selectedVisits.map(
                        (visit) => (

                          <article
                            className="patient-visit-card"
                            key={visit.visit_id}
                          >

                            <div className="patient-visit-header">

                              <div>

                                <strong>
                                  {formatDate(
                                    visit.visit_date
                                  )}
                                </strong>

                                <span>
                                  {visit.visit_type ||
                                    "Clinical Visit"}
                                </span>

                              </div>


                              {visit.status && (
                                <span
                                  className={statusClass(
                                    visit.status
                                  )}
                                >
                                  {visit.status}
                                </span>
                              )}

                            </div>


                            <div className="patient-visit-grid">

                              <div>

                                <span>
                                  Chief Complaint
                                </span>

                                <strong>
                                  {visit.chief_complaint ||
                                    "—"}
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Assessment
                                </span>

                                <strong>
                                  {visit.assessment ||
                                    "—"}
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Clinical Notes
                                </span>

                                <strong>
                                  {visit.clinical_notes ||
                                    "—"}
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Doctor Notes
                                </span>

                                <strong>
                                  {visit.doctor_notes ||
                                    "—"}
                                </strong>

                              </div>

                            </div>


                            <div className="patient-followup">

                              <Clock3 size={15} />

                              <span>
                                Follow-up:
                              </span>

                              <strong>
                                {formatDate(
                                  visit.follow_up_date
                                )}
                              </strong>

                            </div>

                          </article>

                        )
                      )}

                    </div>

                  )}

                </div>

              )}


              {/* TREATMENT HISTORY */}

              {activeTab === "treatments" && (

                <div className="patient-history-section">

                  <div className="eyebrow">
                    TREATMENT HISTORY
                  </div>

                  <h3>
                    Treatments
                  </h3>


                  {treatmentHistory.length === 0 ? (

                    <div className="appointments-empty">

                      <strong>
                        No treatment history found.
                      </strong>

                    </div>

                  ) : (

                    <div className="patient-history-list">

                      {treatmentHistory.map(
                        (appointment) => (

                          <div
                            className="patient-history-row"
                            key={
                              `treatment-${appointment.appointment_id}`
                            }
                          >

                            <div className="history-date">

                              <strong>
                                {formatDate(
                                  appointment.appointment_timestamp
                                )}
                              </strong>

                              <small>
                                {formatTime(
                                  appointment.appointment_timestamp
                                )}
                              </small>

                            </div>


                            <div className="history-main">

                              <strong>
                                {appointment.category_name ||
                                  "Treatment"}
                              </strong>

                              <span>
                                {appointment.treatment_name ||
                                  "General consultation"}
                              </span>

                            </div>


                            <span
                              className={statusClass(
                                appointment.status
                              )}
                            >
                              {appointment.status}
                            </span>


                            <span
                              className={
                                appointment.treated
                                  ? "treated-badge"
                                  : "untreated-badge"
                              }
                            >
                              {appointment.treated
                                ? "Treated"
                                : "Not Treated"}
                            </span>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              )}

            </div>

          </section>

        </div>

      )}
                  </div>
                )
              )}

              <div className="patients-pagination">
                <div className="pagination-summary">
                  Showing <strong>{filteredPatients.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong>–<strong>{Math.min(currentPage * pageSize, filteredPatients.length)}</strong> of <strong>{filteredPatients.length}</strong> patients
                </div>
                <div className="pagination-controls">
                  <label className="page-size-control">
                    <span>Rows per page</span>
                    <select
                      value={pageSize}
                      onChange={(event) => setPageSize(Number(event.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="secondary-button pagination-button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </button>
                  <span className="pagination-page">Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    className="secondary-button pagination-button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>

            </div>

          )}

        </section>

      </section>


      {/* EDIT PATIENT */}
      {showEditPatient && selectedPatient && (
        <div
          className="patient-modal-overlay new-patient-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditPatient();
          }}
        >
          <section className="patient-modal new-patient-modal" role="dialog" aria-modal="true" aria-labelledby="edit-patient-title">
            <div className="patient-modal-header">
              <div>
                <div className="eyebrow">PATIENT RECORD</div>
                <h2 id="edit-patient-title">Edit Patient</h2>
                <p>Update the patient's basic information.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeEditPatient} aria-label="Close edit patient form">
                <X size={18} />
              </button>
            </div>

            <div className="patient-form">
              <div className="patient-form-grid">
                <label>
                  <span>Name <b>*</b></span>
                  <input value={editPatient.name} onChange={(event) => setEditPatient((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label>
                  <span>Sex <b>*</b></span>
                  <select value={editPatient.sex} onChange={(event) => setEditPatient((current) => ({ ...current, sex: event.target.value as "" | "Male" | "Female" }))}>
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </label>
                <label>
                  <span>Date of Birth <b>*</b></span>
                  <input type="date" value={editPatient.date_of_birth} onChange={(event) => setEditPatient((current) => ({ ...current, date_of_birth: event.target.value }))} />
                </label>
                <label>
                  <span>Mobile</span>
                  <input value={editPatient.mobile_no} onChange={(event) => setEditPatient((current) => ({ ...current, mobile_no: event.target.value }))} />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={editPatient.email} onChange={(event) => setEditPatient((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <label>
                  <span>Occupation</span>
                  <input value={editPatient.occupation} onChange={(event) => setEditPatient((current) => ({ ...current, occupation: event.target.value }))} />
                </label>
                <label>
                  <span>City</span>
                  <input value={editPatient.city} onChange={(event) => setEditPatient((current) => ({ ...current, city: event.target.value }))} />
                </label>
                <label>
                  <span>First Appointment Date</span>
                  <input type="date" value={editPatient.first_appointment_date} onChange={(event) => setEditPatient((current) => ({ ...current, first_appointment_date: event.target.value }))} />
                </label>
                <label className="patient-form-full">
                  <span>Address</span>
                  <textarea rows={3} value={editPatient.address} onChange={(event) => setEditPatient((current) => ({ ...current, address: event.target.value }))} />
                </label>
              </div>
              <div className="patient-form-actions">
                <button type="button" className="secondary-button" onClick={closeEditPatient} disabled={savingPatient}>Cancel</button>
                <button type="button" className="primary-button" onClick={savePatientChanges} disabled={savingPatient}>
                  {savingPatient ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}


      {/* NEW PATIENT */}

      {showNewPatient && (

        <div
          className="patient-modal-overlay new-patient-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeNewPatient();
            }

          }}
        >

          <section className="patient-modal new-patient-modal">

            <div className="patient-modal-header">

              <div>

                <div className="eyebrow">
                  NEW PATIENT
                </div>

                <h2>
                  Create Patient
                </h2>

                <p>
                  Enter the patient's basic information.
                </p>

              </div>


              <button
                className="icon-button"
                onClick={closeNewPatient}
              >
                <X size={18} />
              </button>

            </div>


            <div className="patient-form">

              <div className="patient-form-grid">

                <label>

                  <span>
                    Name <b>*</b>
                  </span>

                  <input
                    value={newPatient.name}
                    onChange={(event) =>
                      setNewPatient(
                        (current) => ({
                          ...current,
                          name:
                            event.target.value
                        })
                      )
                    }
                  />

                </label>


                <label>

                  <span>
                    Sex <b>*</b>
                  </span>

                  <select
                    value={newPatient.sex}
                    onChange={(event) =>
                      setNewPatient(
                        (current) => ({
                          ...current,
                          sex:
                            event.target.value as
                              | ""
                              | "Male"
                              | "Female"
                        })
                      )
                    }
                  >

                    <option value="">
                      Select sex
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                  </select>

                </label>


                <label>

                  <span>
                    Date of Birth <b>*</b>
                  </span>

                  <input
                    type="date"
                    value={
                      newPatient.date_of_birth
                    }
                    onChange={(event) =>
                      setNewPatient(
                        (current) => ({
                          ...current,
                          date_of_birth:
                            event.target.value
                        })
                      )
                    }
                  />

                </label>


                <label>

                  <span>
                    Mobile
                  </span>

                  <input
                    value={
                      newPatient.mobile_no
                    }
                    onChange={(event) =>
                      setNewPatient(
                        (current) => ({
                          ...current,
                          mobile_no:
                            event.target.value
                        })
                      )
                    }
                  />

                </label>


                <label>

                  <span>
                    Email
                  </span>

                  <input
                    type="email"
                    value={
                      newPatient.email
                    }
                    onChange={(event) =>
                      setNewPatient(
                        (current) => ({
                          ...current,
                          email:
                            event.target.value
                        })
                      )
                    }
                  />

                </label>


                <label>

                  <span>
                    Occupation
                  </span>

                  <input
                    value={
                      newPatient.occupation
                    }
                    onChange={(event) =>
                      setNewPatient(
                        (current) => ({
                          ...current,
                          occupation:
                            event.target.value
                        })
                      )
                    }
                  />

                </label>


                <label>

                  <span>
                    City
                  </span>

                  <input
                    value={
                      newPatient.city
                    }
                    onChange={(event) =>
                      setNewPatient(
                        (current) => ({
                          ...current,
                          city:
                            event.target.value
                        })
                      )
                    }
                  />

                </label>


                <label className="patient-form-full">

                  <span>
                    Address
                  </span>

                  <textarea
                    rows={3}
                    value={
                      newPatient.address
                    }
                    onChange={(event) =>
                      setNewPatient(
                        (current) => ({
                          ...current,
                          address:
                            event.target.value
                        })
                      )
                    }
                  />

                </label>

              </div>


              <div className="patient-form-actions">

                <button
                  className="secondary-button"
                  onClick={closeNewPatient}
                >
                  Cancel
                </button>


                <button
                  className="primary-button"
                  onClick={createNewPatient}
                >
                  <UserPlus size={17} />
                  Create Patient
                </button>

              </div>

            </div>

          </section>

        </div>

      )}

      <style jsx>{`
        /* ---------------------------------------------------------
           CREATE PATIENT PANE ONLY
           The existing patient list and patient-detail pane are
           intentionally untouched.
           --------------------------------------------------------- */

        .new-patient-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          background: rgba(52, 43, 35, 0.42);
        }

        .new-patient-modal {
          width: min(820px, 100%);
          max-height: min(720px, 92vh);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
          border: 1px solid #DED4C8;
          border-radius: 10px;
          background: #FFFDF9;
          color: #4A3426;
          box-shadow: 0 24px 70px rgba(52, 43, 35, 0.28);
        }

        .new-patient-modal .patient-modal-header {
          flex: 0 0 auto;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 24px 18px;
          border-bottom: 1px solid #DED4C8;
          background: #FFFDF9;
        }

        .new-patient-modal .patient-modal-header h2 {
          margin: 5px 0 5px;
          color: #4A3426;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
        }

        .new-patient-modal .patient-modal-header p {
          margin: 0;
          color: #8A7565;
          font-size: 13px;
        }

        .new-patient-modal .patient-modal-header .eyebrow {
          color: #8A7565;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .new-patient-modal .patient-form {
          min-height: 0;
          overflow-y: auto;
          padding: 22px 24px 20px;
          background: #F7F4EF;
        }

        .new-patient-modal .patient-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px 20px;
        }

        .new-patient-modal .patient-form-grid label {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #4A3426;
          font-size: 13px;
          font-weight: 600;
        }

        .new-patient-modal .patient-form-grid label > span {
          color: #4A3426;
          line-height: 1.2;
        }

        .new-patient-modal .patient-form-grid label b {
          color: #B77A2B;
        }

        .new-patient-modal .patient-form-grid input,
        .new-patient-modal .patient-form-grid select,
        .new-patient-modal .patient-form-grid textarea {
          width: 100%;
          min-height: 40px;
          box-sizing: border-box;
          border: 1px solid #DED4C8;
          border-radius: 6px;
          outline: none;
          background: #FFFDF9;
          color: #4A3426;
          padding: 0 11px;
          font-family: inherit;
          font-size: 13px;
        }

        .new-patient-modal .patient-form-grid textarea {
          min-height: 92px;
          padding: 10px 11px;
          resize: vertical;
        }

        .new-patient-modal .patient-form-grid input:focus,
        .new-patient-modal .patient-form-grid select:focus,
        .new-patient-modal .patient-form-grid textarea:focus {
          border-color: #B8945A;
          box-shadow: 0 0 0 2px rgba(184, 148, 90, 0.12);
        }

        .new-patient-modal .patient-form-grid select option {
          background: #FFFDF9;
          color: #4A3426;
        }

        .new-patient-modal .patient-form-full {
          grid-column: 1 / -1;
        }

        .new-patient-modal .patient-form-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid #DED4C8;
        }

        .new-patient-modal .patient-form-actions .secondary-button,
        .new-patient-modal .patient-form-actions .primary-button {
          min-height: 40px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 700;
        }

        .new-patient-modal .icon-button {
          flex: 0 0 auto;
        }

        .patient-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .patient-action-button {
          min-height: 36px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13px;
        }

        .danger-button {
          border: 1px solid #D9A6A0;
          border-radius: 6px;
          background: #FFF4F2;
          color: #A33128;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .danger-button:hover:not(:disabled) {
          background: #FCE6E3;
        }

        .danger-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 700px) {
          .patient-header-actions {
            gap: 6px;
          }

          .patient-action-button {
            padding: 0 9px;
          }

          .new-patient-overlay {
            padding: 12px;
          }

          .new-patient-modal {
            max-height: 94vh;
          }

          .new-patient-modal .patient-modal-header {
            padding: 18px;
          }

          .new-patient-modal .patient-form {
            padding: 18px;
          }

          .new-patient-modal .patient-form-grid {
            grid-template-columns: 1fr;
          }

          .new-patient-modal .patient-form-full {
            grid-column: auto;
          }
        }

        .patient-record-group {
          width: 100%;
        }

        .patient-expanded-wrap {
          width: 100%;
          padding: 0 14px 18px;
          box-sizing: border-box;
          background: #F7F4EF;
          border-bottom: 1px solid #E5DDD3;
          animation: patientExpandIn 160ms ease-out;
        }

        .patient-expanded-detail {
          width: 100%;
          max-width: none;
          margin: 0;
          border: 1px solid #E4D9CC;
          border-radius: 10px;
          overflow: hidden;
          background: #FFFDF9;
          box-shadow: 0 8px 24px rgba(74, 52, 38, 0.07);
        }

        .patient-expanded-detail .patient-modal-header {
          padding: 18px 20px;
          background: #FFFDF9;
          border-bottom: 1px solid #EAE1D7;
        }

        .patient-expanded-detail .patient-detail-body {
          padding: 20px;
          background: #FBF9F5;
        }

        .patient-expanded-detail .patient-detail-tabs {
          padding: 0 18px;
          background: #FFFDF9;
          border-bottom: 1px solid #EAE1D7;
          overflow-x: auto;
        }

        .patient-expanded-detail .patient-overview-grid {
          gap: 16px;
        }

        .patient-expanded-detail .patient-info-card,
        .patient-expanded-detail .patient-summary-card {
          border-radius: 9px;
          border: 1px solid #E7DED3;
          background: #FFFFFF;
        }

        .patients-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding: 16px 18px;
          border-top: 1px solid var(--line);
          background: var(--surface, #FFFDF9);
        }

        .pagination-summary {
          color: var(--muted);
          font-size: 13px;
        }

        .pagination-summary strong {
          color: var(--text);
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .page-size-control {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--muted);
          font-size: 12px;
        }

        .page-size-control select {
          min-height: 34px;
          border: 1px solid var(--line);
          border-radius: 6px;
          padding: 0 8px;
          color: var(--text);
          background: var(--surface, #FFFDF9);
        }

        .pagination-button {
          min-height: 34px;
          padding: 0 12px;
          font-size: 12px;
        }

        .pagination-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .pagination-page {
          min-width: 78px;
          color: var(--text);
          text-align: center;
          font-size: 12px;
          font-weight: 700;
        }

        @keyframes patientExpandIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ---------------------------------------------------------
           Patients page only — restore one patient per row.
           No other page/layout is affected.
           --------------------------------------------------------- */

        .patients-table {
          width: 100%;
          overflow-x: auto;
        }

       
.patients-table-head,
.patients-table-row {
  display: grid;
  grid-template-columns:
    140px
    minmax(200px, 1.5fr)
    80px
    140px
    150px
    minmax(180px, 1.3fr)
    120px;
  gap: 18px;
  align-items: center;
  width: 100%;
  min-width: 1120px;
  box-sizing: border-box;
}


        .patients-table-head {
          min-height: 42px;
          padding: 0 18px;
          border-bottom: 1px solid var(--line);
          color: var(--muted);
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
        }

        .patients-table-row {
          min-height: 76px;
          padding: 10px 18px;
          border: 0;
          border-bottom: 1px solid var(--line);
          background: transparent;
          color: var(--text);
          text-align: left;
          cursor: pointer;
          transition: background 120ms ease;
        }

        .patients-table-row:hover {
          background: var(--surface-2);
        }

        .patient-code {
          color: var(--muted);
          font-family: "JetBrains Mono", monospace;
          font-size: 12px;
          font-weight: 700;
        }

        .patient-name-cell {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .patient-name-cell strong {
          overflow: hidden;
          color: var(--text);
          font-size: 15px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .patient-name-cell small {
          overflow: hidden;
          color: var(--muted);
          font-size: 13px;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }


.patient-treatment-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.patient-treatment-cell strong {
  display: block;
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.patient-treatment-cell small {
  display: block;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}


        .patients-table-row > div:not(.patient-name-cell):not(.patient-code) {
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
        }

        /* Main Dashboard + New Patient: identical dimensions. */
        .patients-header-button {
          height: 38px;
          min-width: 142px;
          margin-bottom: 0;
          padding: 0 14px;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          white-space: nowrap;
        }

        .patients-header-button svg {
          width: 17px;
          height: 17px;
          flex: 0 0 auto;
        }


        /* ---------------------------------------------------------
           Patient dashboard polish — matches the existing warm
           ivory / beige clinic theme. Scoped to this page only.
           --------------------------------------------------------- */
        .appointments-page {
          background: #F7F3ED;
          color: #3F3026;
        }

        .appointments-page-inner {
          max-width: 1600px;
        }

        .page-heading {
          margin-bottom: 22px;
        }

        .page-heading h1 {
          color: #38291F;
          font-size: clamp(27px, 2vw, 34px);
          font-weight: 750;
          letter-spacing: -0.035em;
          line-height: 1.15;
        }

        .page-heading p {
          margin-top: 7px;
          color: #887565;
          font-size: 14px;
        }

        .appointments-toolbar {
          margin-bottom: 18px;
          padding: 14px 16px;
          border: 1px solid #E5DBCF;
          border-radius: 12px;
          background: #FFFCF8;
          box-shadow: 0 2px 8px rgba(70, 48, 30, 0.025);
        }

        .patients-filters {
          gap: 10px;
        }

        .patients-filters .appointment-search {
          min-height: 42px;
          border: 1px solid #E2D7CA;
          border-radius: 8px;
          background: #FFFFFF;
          color: #7C6B5D;
          transition: border-color 140ms ease, box-shadow 140ms ease;
        }

        .patients-filters .appointment-search:focus-within {
          border-color: #B99A79;
          box-shadow: 0 0 0 3px rgba(185, 154, 121, 0.14);
        }

        .patients-filters .appointment-search input {
          color: #403126;
          font-size: 13px;
        }

        .patients-filters .appointment-search input::placeholder {
          color: #A09183;
        }

        .appointments-panel {
          overflow: hidden;
          border: 1px solid #E4D9CD;
          border-radius: 12px;
          background: #FFFCF8;
          box-shadow: 0 4px 18px rgba(70, 48, 30, 0.035);
        }

        .appointments-panel-header {
          min-height: 76px;
          padding: 18px 20px;
          border-bottom: 1px solid #EAE0D6;
          background: linear-gradient(180deg, #FFFCF8 0%, #FBF7F1 100%);
        }

        .appointments-panel-header h2 {
          margin: 4px 0 4px;
          color: #443126;
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -0.02em;
        }

        .appointments-panel-header span {
          color: #8C7A6B;
          font-size: 12px;
        }

        .patients-table {
          overflow-x: auto;
          background: #FFFCF8;
        }

        .patients-table-head,
        .patients-table-row {
          grid-template-columns:
            minmax(100px, 0.8fr)
            minmax(170px, 1.35fr)
            minmax(62px, 0.5fr)
            minmax(118px, 0.9fr)
            minmax(125px, 1fr)
            minmax(145px, 1.15fr)
            minmax(88px, 0.65fr);
          gap: 14px;
          min-width: 960px;
        }

        .patients-table-head {
          min-height: 42px;
          padding: 0 20px;
          background: #F7F1E9;
          border-bottom: 1px solid #E5D9CC;
          color: #8B7563;
          font-size: 10px;
          letter-spacing: 0.1em;
        }

        .patient-record-group {
          border-bottom: 1px solid #EAE1D8;
          background: #FFFCF8;
        }

        .patient-record-group:last-of-type {
          border-bottom: 0;
        }

        .patients-table-row {
          min-height: 68px;
          padding: 12px 20px;
          border-bottom: 0;
          background: #FFFCF8;
          text-align: left;
        }

        .patients-table-row:hover {
          background: #FAF4EC;
        }

        .patient-row-button:focus-visible {
          outline: 2px solid #B99A79;
          outline-offset: -3px;
        }

        .patient-record-group:has(.patient-expanded-detail) > .patients-table-row {
          background: #F5EBDD;
        }

        .patient-code {
          color: #8A6D53;
          font-size: 11px;
        }

        .patient-name-cell strong {
          color: #3E2D22;
          font-size: 13px;
          font-weight: 750;
        }

        .patient-name-cell small {
          color: #948171;
          font-size: 11px;
          font-weight: 500;
        }

        .patients-table-row > div:not(.patient-name-cell):not(.patient-code) {
          color: #514034;
          font-size: 12px;
          font-weight: 550;
        }

        .patient-treatment-cell strong {
          color: #4D3829;
          font-size: 12px;
        }

        .patient-treatment-cell small {
          color: #8B7767;
          font-size: 11px;
        }

        .patient-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .patient-status.active {
          border: 1px solid #B9D9C1;
          background: #E8F4E9;
          color: #376847;
        }

        .patient-status.inactive {
          border: 1px solid #E8C7BD;
          background: #FBEDE8;
          color: #9C5140;
        }

        .patient-expanded-wrap {
          padding: 0 12px 12px;
          background: #F5EBDD;
          animation: patientExpandIn 160ms ease-out;
        }

        .patient-expanded-detail {
          width: 100%;
          margin: 0;
          overflow: hidden;
          border: 1px solid #E3D4C4;
          border-radius: 10px;
          background: #FFFCF8;
          box-shadow: 0 3px 12px rgba(70, 48, 30, 0.045);
        }

        .patient-expanded-detail .patient-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          border-bottom: 1px solid #E9DED2;
          background: #FFFCF8;
        }

        .patient-expanded-detail .patient-modal-header .eyebrow {
          color: #9B826D;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 0.1em;
        }

        .patient-expanded-detail .patient-modal-header h2 {
          margin: 5px 0 5px;
          color: #3E2D22;
          font-size: 21px;
          font-weight: 750;
          letter-spacing: -0.025em;
        }

        .patient-expanded-detail .patient-modal-header p {
          margin: 0;
          color: #8B7767;
          font-size: 12px;
          line-height: 1.6;
        }

        .patient-expanded-detail .patient-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .patient-expanded-detail .patient-action-button,
        .patient-expanded-detail .icon-button {
          min-height: 36px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 650;
        }

        .patient-expanded-detail .patient-action-button {
          padding: 0 12px;
        }

        .patient-expanded-detail .secondary-button.patient-action-button {
          border: 1px solid #D7BFA7;
          background: #FFF9F2;
          color: #725037;
        }

        .patient-expanded-detail .secondary-button.patient-action-button:hover {
          background: #F4E7D8;
        }

        .patient-expanded-detail .danger-button.patient-action-button {
          border: 1px solid #E6C5BA;
          background: #FFF8F5;
          color: #A14F3D;
        }

        .patient-expanded-detail .danger-button.patient-action-button:hover {
          background: #FBEAE4;
        }

        .patient-expanded-detail .icon-button {
          width: 36px;
          padding: 0;
          border: 1px solid #E3D8CD;
          background: #FFFCF8;
          color: #806D5D;
        }

        .patient-expanded-detail .patient-detail-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          padding: 0 16px;
          border-bottom: 1px solid #E9DED2;
          background: #FBF7F1;
        }

        .patient-expanded-detail .patient-detail-tabs button {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 46px;
          padding: 0 13px;
          border: 0;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: #806D5D;
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
          cursor: pointer;
        }

        .patient-expanded-detail .patient-detail-tabs button:hover {
          color: #5A3D27;
          background: #F5EBDD;
        }

        .patient-expanded-detail .patient-detail-tabs button.selected {
          border-bottom-color: #9A704C;
          color: #65452C;
          background: #F5EBDD;
        }

        .patient-expanded-detail .patient-detail-tabs button span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 19px;
          height: 19px;
          padding: 0 5px;
          border-radius: 999px;
          background: #EDE0D1;
          color: #76583F;
          font-size: 10px;
          font-weight: 750;
        }

        .patient-expanded-detail .patient-detail-body {
          padding: 16px;
          background: #FFFCF8;
        }

        .patient-expanded-detail .patient-overview-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          align-items: start;
          gap: 14px;
        }

        .patient-expanded-detail .patient-info-card,
        .patient-expanded-detail .patient-summary-card {
          min-width: 0;
          padding: 17px 18px;
          border: 1px solid #E7DCCE;
          border-radius: 9px;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(70, 48, 30, 0.025);
        }

        .patient-expanded-detail .patient-info-card .eyebrow {
          color: #9B826D;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 0.08em;
        }

        .patient-expanded-detail .patient-info-card h3,
        .patient-expanded-detail .patient-summary-card h3 {
          margin: 6px 0 14px;
          color: #493426;
          font-size: 14px;
          font-weight: 750;
        }

        .patient-expanded-detail .patient-info-list > div {
          display: grid;
          grid-template-columns: minmax(115px, 0.8fr) minmax(0, 1.2fr);
          gap: 12px;
          padding: 9px 0;
          border-bottom: 1px solid #F0E8E0;
          font-size: 12px;
          line-height: 1.45;
        }

        .patient-expanded-detail .patient-info-list > div:last-child {
          border-bottom: 0;
        }

        .patient-expanded-detail .patient-info-list > div > span:first-child {
          color: #927E6D;
        }

        .patient-expanded-detail .patient-info-list > div > span:last-child {
          overflow-wrap: anywhere;
          color: #49382B;
          font-weight: 600;
        }

        .patient-expanded-detail .patient-summary-card {
          background: #F8F1E8;
        }

        .patients-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 18px;
          border-top: 1px solid #E8DED3;
          background: #FBF7F1;
        }

        .pagination-summary {
          color: #897665;
          font-size: 12px;
        }

        .pagination-summary strong {
          color: #4A3526;
        }

        .pagination-controls {
          gap: 6px;
        }

        .page-size-control {
          margin-right: 8px;
          color: #897665;
          font-size: 12px;
        }

        .page-size-control select,
        .pagination-button {
          min-height: 34px;
          border: 1px solid #E0D3C5;
          border-radius: 7px;
          background: #FFFCF8;
          color: #634A36;
        }

        .pagination-button:hover:not(:disabled) {
          border-color: #B99A79;
          background: #F4E7D8;
        }

        .pagination-page {
          color: #73563E;
          font-size: 12px;
        }

        .appointments-empty {
          padding: 44px 20px;
          color: #8A7767;
          text-align: center;
        }

        @media (max-width: 900px) {
          .patient-expanded-detail .patient-overview-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .patient-expanded-detail .patient-modal-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .patient-expanded-detail .patient-header-actions {
            justify-content: flex-start;
          }

          .patients-pagination {
            align-items: flex-start;
            flex-direction: column;
          }

          .pagination-controls {
            justify-content: flex-start;
          }
        }

        @media (max-width: 560px) {
          .patient-expanded-wrap {
            padding: 0 6px 8px;
          }

          .patient-expanded-detail .patient-detail-body {
            padding: 10px;
          }

          .patient-expanded-detail .patient-info-card,
          .patient-expanded-detail .patient-summary-card {
            padding: 13px;
          }

          .patient-expanded-detail .patient-info-list > div {
            grid-template-columns: minmax(90px, 0.8fr) minmax(0, 1.2fr);
            gap: 8px;
          }
        }

        /* Keep the existing patients table layout; only polish the expanded
           patient details so every tab uses the same full-width panel. */
        .patient-record-group {
          display: block;
          width: 100%;
          min-width: 960px;
        }

        .patient-expanded-wrap {
          display: block;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .patient-expanded-detail {
          display: block;
          width: 100%;
          max-width: none;
          min-width: 0;
          box-sizing: border-box;
        }

        .patient-expanded-detail .patient-detail-body,
        .patient-expanded-detail .patient-history-section {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .patient-expanded-detail .patient-history-section > h3 {
          margin: 8px 0 18px;
          color: #493426;
          font-size: 17px;
          font-weight: 750;
        }

        .patient-expanded-detail .patient-history-list,
        .patient-expanded-detail .patient-visits-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .patient-expanded-detail .patient-history-row,
        .patient-expanded-detail .patient-visit-card {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #E7DCCE;
          border-radius: 9px;
          background: #FFFFFF;
        }

        .patient-expanded-detail .patient-history-row {
          padding: 15px 16px;
        }

        .patient-expanded-detail .patient-visit-card {
          padding: 17px;
          box-shadow: 0 1px 3px rgba(70, 48, 30, 0.025);
        }

        .patient-expanded-detail .patient-visit-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding-bottom: 13px;
          border-bottom: 1px solid #F0E8E0;
        }

        .patient-expanded-detail .patient-visit-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px 22px;
          padding-top: 15px;
        }

        .patient-expanded-detail .patient-visit-grid > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .patient-expanded-detail .patient-visit-grid span,
        .patient-expanded-detail .patient-visit-grid strong {
          overflow-wrap: anywhere;
        }

        .patient-expanded-detail .patient-visit-grid span {
          color: #927E6D;
          font-size: 11px;
          font-weight: 650;
        }

        .patient-expanded-detail .patient-visit-grid strong {
          color: #49382B;
          font-size: 12px;
          font-weight: 550;
          line-height: 1.6;
        }

        .patient-expanded-detail .patient-followup {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #F0E8E0;
          color: #806D5D;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .patient-expanded-detail .patient-visit-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }

      `}</style>

    </main>
  );
}