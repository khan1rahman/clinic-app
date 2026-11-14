"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  RefreshCw,
  Search,
  UserRound
} from "lucide-react";

import { api } from "../../lib/api";
import type {
  Appointment,
  Patient,
  Category,
  Subcategory,
  Treatment
} from "../../lib/types";

function formatDateTime(value: string) {
  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function formatDate(value: string) {
  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function isToday(value: string) {
  const date = new Date(value.replace(" ", "T"));
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isUpcoming(value: string) {
  const date = new Date(value.replace(" ", "T"));
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return date >= today;
}

function statusClass(status: Appointment["status"]) {
  switch (status) {
    case "Scheduled":
      return "status scheduled";

    case "Waiting":
      return "status waiting";

    case "In Consultation":
      return "status consultation";

    case "Completed":
      return "status completed";

    case "Cancelled":
      return "status cancelled";

    case "No Show":
      return "status no-show";

    default:
      return "status";
  }
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const [editCategoryId, setEditCategoryId] = useState("");
  const [editSubcategoryId, setEditSubcategoryId] = useState("");
  const [editTreatmentId, setEditTreatmentId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<"Today" | "Upcoming" | "All">("Today");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | Appointment["status"]
  >("All");

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  
  
const [editingAppointmentId, setEditingAppointmentId] =
  useState<number | null>(null);

const [editTimestamp, setEditTimestamp] = useState("");
const [editVisitType, setEditVisitType] =
  useState<"First Visit" | "Repeat Visit">("First Visit");
const [editNotes, setEditNotes] = useState("");
const [savingAppointment, setSavingAppointment] = useState(false);


  async function loadAppointments() {
    try {
      setLoading(true);
      setError("");

     const [
  appointmentData,
  patientData,
  categoryData,
  subcategoryData,
  treatmentData
] = await Promise.all([
  api.getAppointments(),
  api.getPatients(),
  api.getCategories(),
  api.getSubcategories(),
  api.getTreatments()
]);

      setAppointments(appointmentData);
      setPatients(patientData);
      setCategories(categoryData);
      setSubcategories(subcategoryData);
      setTreatments(treatmentData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load appointments"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const patientLookup = useMemo(() => {
    const map = new Map<number, Patient>();

    patients.forEach((patient) => {
      map.set(patient.patient_id, patient);
    });

    return map;
  }, [patients]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments
      .filter((appointment) => {
        if (view === "Today" && !isToday(appointment.appointment_timestamp)) {
          return false;
        }

        if (
          view === "Upcoming" &&
          !isUpcoming(appointment.appointment_timestamp)
        ) {
          return false;
        }

        if (
          statusFilter !== "All" &&
          appointment.status !== statusFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const patient = patientLookup.get(appointment.patient_id);

        const patientName =
          appointment.patient_name ||
          patient?.name ||
          "";

        const patientCode =
          appointment.patient_code ||
          patient?.patient_code ||
          "";

        const mobile = patient?.mobile_no || "";

        return (
          patientName.toLowerCase().includes(query) ||
          patientCode.toLowerCase().includes(query) ||
          mobile.toLowerCase().includes(query)
        );
      })
      .sort((a, b) =>
        a.appointment_timestamp.localeCompare(b.appointment_timestamp)
      );
  }, [
    appointments,
    patients,
    patientLookup,
    search,
    statusFilter,
    view
  ]);

  function getPatientName(appointment: Appointment) {
    return (
      appointment.patient_name ||
      patientLookup.get(appointment.patient_id)?.name ||
      `Patient #${appointment.patient_id}`
    );
  }

  function getPatientCode(appointment: Appointment) {
    return (
      appointment.patient_code ||
      patientLookup.get(appointment.patient_id)?.patient_code ||
      `P-${appointment.patient_id}`
    );
  }

async function saveAppointmentUpdate(appointment: Appointment) {
  try {
    setSavingAppointment(true);
    setError("");

    await api.updateAppointment(appointment.appointment_id, {
      appointment_timestamp: editTimestamp.replace("T", " "),
      patient_id: appointment.patient_id,
      visit_type: editVisitType,
      
      category_id: Number(editCategoryId),
      subcategory_id: editSubcategoryId ? Number(editSubcategoryId) : null,
      treatment_id: editTreatmentId ? Number(editTreatmentId) : null,

      doctor_id: appointment.doctor_id,
      notes: editNotes
    });

    setEditingAppointmentId(null);
    await loadAppointments();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to update appointment"
    );
  } finally {
    setSavingAppointment(false);
  }
}

async function cancelAppointment(appointment: Appointment) {
  const confirmed = window.confirm(
    `Cancel appointment #${appointment.appointment_id} for ${getPatientName(appointment)}?`
  );

  if (!confirmed) return;

  try {
    setError("");
    await api.cancelAppointment(appointment.appointment_id);

    if (selectedAppointment?.appointment_id === appointment.appointment_id) {
      setSelectedAppointment(null);
    }

    await loadAppointments();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to cancel appointment"
    );
  }
}

  return (
    <main className="appointments-page">
      <section className="appointments-page-inner">
        <a
          href="/"
          className="appointment-main-button"
        >
          <ArrowLeft size={16} />
          Main Dashboard
        </a>
        <div className="page-heading">
          <div>
            <div className="eyebrow">CLINIC SCHEDULING</div>

            <h1>Appointments</h1>

            <p>
              View and manage patient appointments and schedules.
            </p>
          </div>

          <div className="appointment-header-actions">
            <a
              href="/appointment_status"
              className="appointment-update-button"
            >
              Update
            </a>

            <button
              type="button"
              className="appointment-new-button"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              <CalendarDays size={18} />
              <span>New Appointment</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>{error}</span>

            <button onClick={loadAppointments}>
              Retry
            </button>
          </div>
        )}

        <section className="appointments-toolbar">
          <div className="appointment-tabs">
            {(["Today", "Upcoming", "All"] as const).map((item) => (
              <button
                key={item}
                className={view === item ? "active" : ""}
                onClick={() => setView(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="appointment-filters">
            <div className="appointment-search">
              <Search size={16} />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient, mobile or code..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "All"
                    | Appointment["status"]
                )
              }
            >
              <option value="All">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Waiting">Waiting</option>
              <option value="In Consultation">
                In Consultation
              </option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>

            <button
              className="secondary-button"
              onClick={loadAppointments}
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
                {view === "Today"
                  ? "TODAY"
                  : view === "Upcoming"
                    ? "UPCOMING SCHEDULE"
                    : "COMPLETE APPOINTMENT LIST"}
              </div>

              <h2>
                {filteredAppointments.length}{" "}
                {filteredAppointments.length === 1
                  ? "Appointment"
                  : "Appointments"}
              </h2>
            </div>

            <div className="appointment-summary">
              <Clock3 size={15} />

              <span>
                {appointments.filter(
                  (appointment) =>
                    appointment.status === "Scheduled"
                ).length}{" "}
                Scheduled
              </span>
            </div>
          </div>

          {loading ? (
            <div className="appointments-empty">
              Loading appointments…
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="appointments-empty">
              <CalendarDays size={30} />

              <strong>No appointments found</strong>

              <span>
                Try another date view, search term or status filter.
              </span>
            </div>
          ) : (
            <div className="appointment-table">
              <div className="appointment-table-head">
                <span>Date</span>
                <span>Time</span>
                <span>Patient</span>
                <span>Visit</span>
                <span>Treatment</span>
                <span>Status</span>
                <span>Actions</span>
              </div>


            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.appointment_id}
                className="appointment-table-row"
                >
                

                
                 
<span className="appointment-date">
  {editingAppointmentId === appointment.appointment_id ? (
    <input
      type="date"
      value={editTimestamp.slice(0, 10)}
      onChange={(event) =>
        setEditTimestamp(
          `${event.target.value}T${editTimestamp.slice(11, 16)}`
        )
      }
    />
  ) : (
    formatDate(appointment.appointment_timestamp)
  )}
</span>



                
<span className="appointment-time">
  {editingAppointmentId === appointment.appointment_id ? (
    <input
      type="time"
      value={editTimestamp.slice(11, 16)}
      onChange={(event) =>
        setEditTimestamp(
          `${editTimestamp.slice(0, 10)}T${event.target.value}`
        )
      }
      aria-label="Appointment time"
    />
  ) : (
    formatDateTime(appointment.appointment_timestamp)
      .split(", ")
      .slice(1)
      .join(", ")
  )}
</span>


                  <span className="appointment-patient">
                    <strong>
                      {getPatientName(appointment)}
                    </strong>

                    <small>
                      {getPatientCode(appointment)}
                    </small>
                  </span>

                  
                  <span>
                    <span className="mono-chip">
                      {editingAppointmentId === appointment.appointment_id ? (
                      <select
                        value={editVisitType}
                        onChange={(event) =>
                        setEditVisitType(
                        event.target.value as "First Visit" | "Repeat Visit"
                          )
                        }
                      >
                        <option value="First Visit">First Visit</option>
                        <option value="Repeat Visit">Repeat Visit</option>
                      </select>
                      ) : (
                            appointment.visit_type
                      )}
                    </span>
                  </span>


                  
<span className="appointment-treatment">
  {editingAppointmentId === appointment.appointment_id ? (
    <div className="appointment-edit-treatment">
      <select
        aria-label="Category"
        value={editCategoryId}
        onChange={(event) => {
          setEditCategoryId(event.target.value);
          setEditSubcategoryId("");
          setEditTreatmentId("");
        }}
      >
        <option value="">Select category</option>
        {categories
          .filter((category) => category.is_active)
          .map((category) => (
            <option
              key={category.category_id}
              value={String(category.category_id)}
            >
              {category.category_name}
            </option>
          ))}
      </select>

      <select
        aria-label="Subcategory"
        value={editSubcategoryId}
        disabled={!editCategoryId}
        onChange={(event) => {
          setEditSubcategoryId(event.target.value);
          setEditTreatmentId("");
        }}
      >
        <option value="">Select subcategory</option>
        {subcategories
          .filter(
            (subcategory) =>
              subcategory.is_active &&
              String(subcategory.category_id) === editCategoryId
          )
          .map((subcategory) => (
            <option
              key={subcategory.subcategory_id}
              value={String(subcategory.subcategory_id)}
            >
              {subcategory.subcategory_name}
            </option>
          ))}
      </select>

      <select
        aria-label="Treatment"
        value={editTreatmentId}
        disabled={!editSubcategoryId}
        onChange={(event) => setEditTreatmentId(event.target.value)}
      >
        <option value="">Select treatment</option>
        {treatments
          .filter(
            (treatment) =>
              treatment.is_active &&
              String(treatment.subcategory_id) === editSubcategoryId
          )
          .map((treatment) => (
            <option
              key={treatment.treatment_id}
              value={String(treatment.treatment_id)}
            >
              {treatment.treatment_name}
            </option>
          ))}
      </select>
    </div>
  ) : (
    <>
      <strong>{appointment.category_name || "Treatment"}</strong>
      <small>
        {appointment.treatment_name || "General consultation"}
      </small>
    </>
  )}
</span>


                  <span>
                    <span
                      className={statusClass(
                        appointment.status
                      )}
                    >
                      <span />
                      {appointment.status}
                    </span>
                  </span>

<span className="appointment-open">
  {editingAppointmentId === appointment.appointment_id ? (
    <div className="appointment-row-actions">
      <input
        value={editNotes}
        onChange={(event) => setEditNotes(event.target.value)}
        placeholder="Notes"
        aria-label="Appointment notes"
      />

      <button
        type="button"
        disabled={savingAppointment}
        onClick={() => saveAppointmentUpdate(appointment)}
      >
        {savingAppointment ? "Saving..." : "Save"}
      </button>

      <button
        type="button"
        onClick={() => setEditingAppointmentId(null)}
      >
        Cancel edit
      </button>
    </div>
  ) : (
    <div className="appointment-row-actions">
      <button
        type="button"
        disabled={appointment.status === "Completed"}
        onClick={() => {
          setEditingAppointmentId(appointment.appointment_id);
          setEditTimestamp(
            appointment.appointment_timestamp
              .replace(" ", "T")
              .slice(0, 16)
          );
          setEditVisitType(appointment.visit_type);
          setEditNotes(appointment.notes ?? "");
	  setEditCategoryId(String(appointment.category_id));
	  setEditSubcategoryId(
  	  appointment.subcategory_id == null
     	  ? ""
    	  : String(appointment.subcategory_id)
);
setEditTreatmentId(
  appointment.treatment_id == null
    ? ""
    : String(appointment.treatment_id)
);
        }}
      >
        Update
      </button>

      <button
        type="button"
        disabled={
  appointment.status === "Cancelled" ||
  appointment.status === "Completed"
}
        onClick={() => cancelAppointment(appointment)}
      >
        Cancel appointment
      </button>
    </div>
  )}
</span>

                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      {selectedAppointment && (
        <div
          className="drawer-backdrop"
          onMouseDown={() =>
            setSelectedAppointment(null)
          }
        >
          <aside
            className="drawer appointment-detail-drawer"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="drawer-header">
              <div>
                <div className="eyebrow">
                  APPOINTMENT DETAILS
                </div>

                <h2>Appointment #{selectedAppointment.appointment_id}</h2>

                <p>
                  View appointment and patient schedule information.
                </p>
              </div>

              <button
                className="icon-button"
                onClick={() =>
                  setSelectedAppointment(null)
                }
              >
                ×
              </button>
            </div>

            <div className="appointment-detail-content">
              <section className="appointment-detail-card">
                <div className="eyebrow">PATIENT</div>

                <h3>
                  {getPatientName(selectedAppointment)}
                </h3>

                <p>
                  {getPatientCode(selectedAppointment)}
                </p>

                <div className="detail-row">
                  <UserRound size={16} />
                  Patient ID:{" "}
                  {selectedAppointment.patient_id}
                </div>
              </section>

              <section className="appointment-detail-card">
                <div className="eyebrow">SCHEDULE</div>

                <div className="detail-row">
                  <CalendarDays size={16} />

                  {formatDateTime(
                    selectedAppointment.appointment_timestamp
                  )}
                </div>

                <div className="detail-row">
                  <Clock3 size={16} />

                  {selectedAppointment.visit_type}
                </div>
              </section>

              <section className="appointment-detail-card">
                <div className="eyebrow">TREATMENT</div>

                <h3>
                  {selectedAppointment.category_name ||
                    "Treatment"}
                </h3>

                <p>
                  {selectedAppointment.treatment_name ||
                    "General consultation"}
                </p>
              </section>

              <section className="appointment-detail-card">
                <div className="eyebrow">STATUS</div>

                <span
                  className={statusClass(
                    selectedAppointment.status
                  )}
                >
                  <span />
                  {selectedAppointment.status}
                </span>
              </section>

              {selectedAppointment.notes && (
                <section className="appointment-detail-card">
                  <div className="eyebrow">NOTES</div>

                  <p>{selectedAppointment.notes}</p>
                </section>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}