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
import type { Appointment, Patient } from "../../lib/types";

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<"Today" | "Upcoming" | "All">("Today");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | Appointment["status"]
  >("All");

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  async function loadAppointments() {
    try {
      setLoading(true);
      setError("");

      const [appointmentData, patientData] = await Promise.all([
        api.getAppointments(),
        api.getPatients()
      ]);

      setAppointments(appointmentData);
      setPatients(patientData);
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
                <span />
              </div>

              {filteredAppointments.map((appointment) => (
                <button
                  key={appointment.appointment_id}
                  className="appointment-table-row"
                  onClick={() =>
                    setSelectedAppointment(appointment)
                  }
                >
                  <span className="appointment-date">
                    {formatDate(
                      appointment.appointment_timestamp
                    )}
                  </span>

                  <span className="appointment-time">
                    {formatDateTime(
                      appointment.appointment_timestamp
                    )
                      .split(", ")
                      .slice(1)
                      .join(", ")}
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
                      {appointment.visit_type}
                    </span>
                  </span>

                  <span className="appointment-treatment">
                    <strong>
                      {appointment.category_name ||
                        "Treatment"}
                    </strong>

                    <small>
                      {appointment.treatment_name ||
                        "General consultation"}
                    </small>
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
                    <ChevronRight size={17} />
                  </span>
                </button>
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