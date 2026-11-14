"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  UserCheck,
  XCircle
} from "lucide-react";

type AppointmentStatus =
  | "Scheduled"
  | "Waiting"
  | "In Consultation"
  | "Completed"
  | "Cancelled"
  | "No Show";

type Appointment = {
  appointment_id: number;
  appointment_timestamp: string;
  patient_id: number;
  patient_code?: string | null;
  patient_name?: string | null;
  mobile_no?: string | null;
  visit_type: string;
  queue_number?: number | null;
  status: AppointmentStatus;
  cancellation_reason?: string | null;
  treated?: number | null;
  category_id?: number | null;
  category_name?: string | null;
  subcategory_id?: number | null;
  subcategory_name?: string | null;
  treatment_id?: number | null;
  treatment_name?: string | null;
  doctor_id?: number | null;
  doctor_name?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

async function fetchAppointments(): Promise<Appointment[]> {
  const response = await fetch("/api/appointments", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Unable to load appointments: ${response.status}`);
  }

  return response.json();
}

async function updateAppointmentStatus(
  appointmentId: number,
  status: AppointmentStatus,
  cancellationReason?: string
): Promise<Appointment> {
  const response = await fetch(`/api/appointments/${appointmentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status,
      ...(cancellationReason
        ? { cancellation_reason: cancellationReason }
        : {})
    })
  });

  if (!response.ok) {
    let message = `Unable to update appointment: ${response.status}`;

    try {
      const body = await response.json();

      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body?.detail)) {
        message = body.detail
          .map((item: { msg?: string }) => item.msg)
          .join(", ");
      }
    } catch {
      // Keep default error.
    }

    throw new Error(message);
  }

  return response.json();
}

function formatTime(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function statusClass(status: AppointmentStatus) {
  switch (status) {
    case "Scheduled":
      return "appointment-status scheduled";

    case "Waiting":
      return "appointment-status waiting";

    case "In Consultation":
      return "appointment-status consultation";

    case "Completed":
      return "appointment-status completed";

    case "Cancelled":
      return "appointment-status cancelled";

    case "No Show":
      return "appointment-status no-show";

    default:
      return "appointment-status";
  }
}

export default function AppointmentStatusPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadAppointments() {
    try {
      setError("");
      setLoading(true);

      const data = await fetchAppointments();

      setAppointments(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load appointments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const todayAppointments = useMemo(() => {
    const today = new Date();

    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    return appointments
      .filter((appointment) => {
        const appointmentDate = new Date(
          appointment.appointment_timestamp
        );

        return (
          appointmentDate.getFullYear() === year &&
          appointmentDate.getMonth() === month &&
          appointmentDate.getDate() === date
        );
      })
      .filter((appointment) => {
        if (!search.trim()) {
          return true;
        }

        const query = search.trim().toLowerCase();

        return [
          appointment.patient_name,
          appointment.patient_code,
          appointment.mobile_no,
          appointment.category_name,
          appointment.treatment_name,
          appointment.doctor_name,
          String(appointment.queue_number ?? "")
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );
      })
      .sort((a, b) => {
        const aTime = new Date(
          a.appointment_timestamp
        ).getTime();

        const bTime = new Date(
          b.appointment_timestamp
        ).getTime();

        return aTime - bTime;
      });
  }, [appointments, search]);

  const summary = useMemo(() => {
    return {
      total: todayAppointments.length,

      scheduled: todayAppointments.filter(
        (appointment) => appointment.status === "Scheduled"
      ).length,

      waiting: todayAppointments.filter(
        (appointment) => appointment.status === "Waiting"
      ).length,

      consultation: todayAppointments.filter(
        (appointment) =>
          appointment.status === "In Consultation"
      ).length,

      completed: todayAppointments.filter(
        (appointment) => appointment.status === "Completed"
      ).length
    };
  }, [todayAppointments]);

  async function changeStatus(
    appointment: Appointment,
    newStatus: AppointmentStatus
  ) {
    let cancellationReason: string | undefined;

    if (newStatus === "Cancelled") {
      const reason = window.prompt(
        "Enter cancellation reason:"
      );

      if (reason === null) {
        return;
      }

      cancellationReason = reason.trim();

      if (!cancellationReason) {
        window.alert(
          "Cancellation reason is required."
        );
        return;
      }
    }

    try {
      setError("");
      setUpdatingId(appointment.appointment_id);

      const updated = await updateAppointmentStatus(
        appointment.appointment_id,
        newStatus,
        cancellationReason
      );

      setAppointments((current) =>
        current.map((item) =>
          item.appointment_id === updated.appointment_id
            ? updated
            : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update appointment."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function renderAction(appointment: Appointment) {
    const isUpdating =
      updatingId === appointment.appointment_id;

    if (isUpdating) {
      return (
        <button
          className="appointment-action-button disabled"
          disabled
        >
          <Loader2
            size={15}
            className="spin"
          />
          Updating
        </button>
      );
    }

    if (appointment.status === "Scheduled") {
      return (
        <button
          className="appointment-action-button waiting-action"
          onClick={() =>
            changeStatus(
              appointment,
              "Waiting"
            )
          }
        >
          <UserCheck size={15} />
          Mark Arrived
        </button>
      );
    }

    if (appointment.status === "Waiting") {
      return (
        <button
          className="appointment-action-button consultation-action"
          onClick={() =>
            changeStatus(
              appointment,
              "In Consultation"
            )
          }
        >
          <PlayCircle size={15} />
          Start
        </button>
      );
    }

    if (
      appointment.status ===
      "In Consultation"
    ) {
      return (
        <button
          className="appointment-action-button complete-action"
          onClick={() =>
            changeStatus(
              appointment,
              "Completed"
            )
          }
        >
          <CheckCircle2 size={15} />
          Complete
        </button>
      );
    }

    return (
      <span className="appointment-action-complete">
        {appointment.status === "Completed"
          ? "Finished"
          : appointment.status}
      </span>
    );
  }

  return (
    <main className="appointments-page">
      <div className="appointments-page-inner">

        {/* HEADER */}
        <header className="appointments-header">
          <div>
            <div className="appointments-title-row">
              <CalendarDays size={24} />
              <h1>Appointment Status</h1>
            </div>

            <p>
              Manage today's patient queue and
              consultation status.
            </p>
          </div>

          <div className="appointments-header-actions">
            <button
              className="appointment-refresh-button"
              onClick={loadAppointments}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={
                  loading ? "spin" : ""
                }
              />
              Refresh
            </button>

            <a
              href="/"
              className="appointment-main-button"
            >
              <ArrowLeft size={16} />
              Main Dashboard
            </a>
          </div>
        </header>

        {/* SUMMARY */}
        <section className="appointment-summary">

          <div className="appointment-summary-card">
            <span>Total</span>
            <strong>{summary.total}</strong>
          </div>

          <div className="appointment-summary-card scheduled-summary">
            <span>Scheduled</span>
            <strong>{summary.scheduled}</strong>
          </div>

          <div className="appointment-summary-card waiting-summary">
            <span>Waiting</span>
            <strong>{summary.waiting}</strong>
          </div>

          <div className="appointment-summary-card consultation-summary">
            <span>In Consultation</span>
            <strong>{summary.consultation}</strong>
          </div>

          <div className="appointment-summary-card completed-summary">
            <span>Completed</span>
            <strong>{summary.completed}</strong>
          </div>

        </section>

        {/* TOOLBAR */}
        <section className="appointment-status-toolbar">

          <div className="appointment-status-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search patient, mobile, queue, doctor..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="appointment-date-display">
            <Clock3 size={16} />
            {formatDate(
              new Date().toISOString()
            )}
          </div>

        </section>

        {/* ERROR */}
        {error && (
          <div className="appointment-status-error">
            <XCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* TABLE */}
        <section className="appointments-panel">

          <div className="appointments-panel-header">
            <div>
              <h2>Today's Queue</h2>
              <span>
                {todayAppointments.length} appointment
                {todayAppointments.length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="appointment-status-empty">
              <Loader2
                size={28}
                className="spin"
              />
              <strong>Loading appointments...</strong>
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="appointment-status-empty">
              <CalendarDays size={32} />

              <strong>
                No appointments found
              </strong>

              <span>
                There are no appointments matching
                your search for today.
              </span>
            </div>
          ) : (
            <div className="appointment-status-table-wrapper">

              <table className="appointment-status-table">

                <thead>
                  <tr>
                    <th>Queue</th>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Visit</th>
                    <th>Category / Treatment</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {todayAppointments.map(
                    (appointment) => (
                      <tr
                        key={
                          appointment.appointment_id
                        }
                      >

                        <td>
                          <span className="queue-number">
                            {appointment.queue_number ??
                              "-"}
                          </span>
                        </td>

                        <td>
                          <div className="appointment-time">
                            <Clock3 size={15} />
                            {formatTime(
                              appointment.appointment_timestamp
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="status-patient">
                            <strong>
                              {appointment.patient_name ??
                                "Unknown Patient"}
                            </strong>

                            <small>
                              {appointment.patient_code ??
                                `Patient #${appointment.patient_id}`}
                            </small>

                            {appointment.mobile_no && (
                              <small>
                                {appointment.mobile_no}
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="visit-type">
                            {appointment.visit_type}
                          </span>
                        </td>

                        <td>
                          <div className="status-treatment">
                            <strong>
                              {appointment.category_name ??
                                "-"}
                            </strong>

                            <small>
                              {appointment.treatment_name ??
                                appointment.subcategory_name ??
                                "General Consultation"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <span className="doctor-name">
                            {appointment.doctor_name ??
                              "Not Assigned"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={statusClass(
                              appointment.status
                            )}
                          >
                            {appointment.status}
                          </span>
                        </td>

                        <td>
                          <div className="appointment-status-actions">
                            {renderAction(
                              appointment
                            )}

                            {[
                              "Scheduled",
                              "Waiting"
                            ].includes(
                              appointment.status
                            ) && (
                              <button
                                className="appointment-cancel-button"
                                onClick={() =>
                                  changeStatus(
                                    appointment,
                                    "Cancelled"
                                  )
                                }
                                disabled={
                                  updatingId ===
                                  appointment.appointment_id
                                }
                                title="Cancel appointment"
                              >
                                <XCircle size={15} />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}