"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings2,
  Stethoscope,
  UserRound,
  Users,
  X
} from "lucide-react";

import { api } from "../lib/api";
import type {
  Appointment,
  Category,
  Doctor,
  Patient,
  Subcategory,
  Treatment
} from "../lib/types";

const statusClass: Record<Appointment["status"], string> = {
  Scheduled: "status scheduled",
  Waiting: "status waiting",
  "In Consultation": "status consultation",
  Completed: "status completed",
  Cancelled: "status cancelled",
  "No Show": "status cancelled"
};

function formatTime(value: string) {
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isToday(value: string) {
  const date = new Date(value.replace(" ", "T"));
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getAge(dob?: string | null) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());

  if (beforeBirthday) age--;
  return age;
}

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientCreated, setPatientCreated] = useState(false);

  const [newPatient, setNewPatient] = useState({
    name: "",
    sex: "" as "" | "Male" | "Female",
    date_of_birth: "",
    mobile_no: "",
    email: "",
    occupation: "",
    address: "",
   city: ""
});

  const [form, setForm] = useState({
    patient_id: "",
    appointment_timestamp: "",
    visit_type: "First Visit" as "First Visit" | "Repeat Visit",
    queue_number: "",
    category_id: "",
    subcategory_id: "",
    treatment_id: "",
    doctor_id: "3",
    notes: ""
  });

  async function loadData() {
    setLoading(true);
    setApiError("");

    try {
      const [p, d, c, s, t, a] = await Promise.all([
        api.getPatients(),
        api.getDoctors(),
        api.getCategories(),
        api.getSubcategories(),
        api.getTreatments(),
        api.getAppointments()
      ]);

      setPatients(p);
      setDoctors(d);
      setCategories(c);
      setSubcategories(s);
      setTreatments(t);
      setAppointments(a);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to connect to FastAPI");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activePatients = useMemo(
    () => patients.filter((p) => p.status === "Active"),
    [patients]
  );

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => isToday(a.appointment_timestamp))
        .sort((a, b) =>
          a.appointment_timestamp.localeCompare(b.appointment_timestamp)
        ),
    [appointments]
  );

  const waiting = todayAppointments.filter((a) => a.status === "Waiting");
  const consultation = todayAppointments.filter(
    (a) => a.status === "In Consultation"
  );
  const completed = todayAppointments.filter((a) => a.status === "Completed");

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return activePatients.slice(0, 8);

    return activePatients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patient_code.toLowerCase().includes(q) ||
          (p.mobile_no || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [activePatients, patientSearch]);

  const selectedCategory = Number(form.category_id);
  const availableSubcategories = subcategories.filter(
    (s) => s.category_id === selectedCategory && s.is_active
  );

  const selectedSubcategory = Number(form.subcategory_id);
  const availableTreatments = treatments.filter(
    (t) =>
      t.subcategory_id === selectedSubcategory &&
      t.is_active &&
      (!selectedCategory || t.category_id === selectedCategory)
  );
function resetForm() {
  setForm({
    patient_id: "",
    appointment_timestamp: "",
    visit_type: "First Visit",
    queue_number: "",
    category_id: "",
    subcategory_id: "",
    treatment_id: "",
    doctor_id: "3",
    notes: ""
  });

  setPatientSearch("");
  setPatientCreated(false);

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
  function openNewAppointment() {
    resetForm();
    setDrawerOpen(true);
  }

async function createNewPatient() {
  if (!newPatient.name.trim()) {
    setApiError("Patient name is required.");
    return;
  }

  if (!newPatient.sex) {
    setApiError("Patient sex is required.");
    return;
  }

  if (!newPatient.date_of_birth) {
    setApiError("Date of birth is required.");
    return;
  }

  try {
    setApiError("");

    const created = await api.createPatient({
      name: newPatient.name.trim(),
      sex: newPatient.sex,
      date_of_birth: newPatient.date_of_birth,
      mobile_no: newPatient.mobile_no.trim() || undefined,
      email: newPatient.email.trim() || undefined,
      occupation: newPatient.occupation.trim() || undefined,
      address: newPatient.address.trim() || undefined,
      city: newPatient.city.trim() || undefined,
      first_appointment_date: form.appointment_timestamp
        ? form.appointment_timestamp.slice(0, 10)
        : undefined
    });

    setPatients((current) => [...current, created]);

    setForm((current) => ({
      ...current,
      patient_id: String(created.patient_id)
    }));

    setPatientSearch(created.name);
    setPatientCreated(true);
  } catch (error) {
    setApiError(
      error instanceof Error
        ? error.message
        : "Unable to create patient"
    );
  }
}

  async function submitAppointment(event: React.FormEvent) {
    event.preventDefault();

    if (!form.appointment_timestamp || !form.category_id) {
      setApiError("Appointment time and treatment category are required.");
      return;
    }

    if (!form.patient_id) {
      setApiError(
        form.visit_type === "First Visit"
          ? "Please create the new patient before scheduling the appointment."
          : "Please select an existing patient before scheduling the appointment."
      );
      return;
    }

    try {
      setApiError("");

      await api.createAppointment({
        appointment_timestamp: `${form.appointment_timestamp}:00`,
        patient_id: Number(form.patient_id),
        visit_type: form.visit_type,
        queue_number: form.queue_number ? Number(form.queue_number) : null,
        status: "Scheduled",
        treated: 0,
        category_id: Number(form.category_id),
        subcategory_id: form.subcategory_id
          ? Number(form.subcategory_id)
          : null,
        treatment_id: form.treatment_id ? Number(form.treatment_id) : null,
        doctor_id: form.doctor_id ? Number(form.doctor_id) : null,
        notes: form.notes || null
      });

      setDrawerOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to create appointment"
      );
    }
  }

  async function updateStatus(
    appointment: Appointment,
    status: Appointment["status"]
  ) {
    try {
      await api.updateAppointment(appointment.appointment_id, { status });
      await loadData();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to update appointment");
    }
  }

  async function toggleTreated(appointment: Appointment) {
    try {
      await api.updateAppointment(appointment.appointment_id, {
        treated: appointment.treated ? 0 : 1
      });
      await loadData();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to update appointment");
    }
  }

  function patientName(appointment: Appointment) {
    return (
      appointment.patient_name ||
      patients.find((p) => p.patient_id === appointment.patient_id)?.name ||
      `Patient #${appointment.patient_id}`
    );
  }

  function patientCode(appointment: Appointment) {
    return (
      appointment.patient_code ||
      patients.find((p) => p.patient_id === appointment.patient_id)?.patient_code ||
      `P-${appointment.patient_id}`
    );
  }

  function categoryName(appointment: Appointment) {
    return (
      appointment.category_name ||
      categories.find((c) => c.category_id === appointment.category_id)
        ?.category_name ||
      "Treatment"
    );
  }

  function treatmentName(appointment: Appointment) {
    return (
      appointment.treatment_name ||
      treatments.find((t) => t.treatment_id === appointment.treatment_id)
        ?.treatment_name ||
      "General consultation"
    );
  }

  function doctorName(appointment: Appointment) {
    return (
      appointment.doctor_name ||
      doctors.find((d) => d.doctor_id === appointment.doctor_id)?.doctor_name ||
      "Doctor pending"
    );
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
          <a className="nav-item active">
            <LayoutDashboard size={17} /> Dashboard
          </a>
          <a
  className="nav-item"
  href="/appointments"
>
  <CalendarDays size={17} /> Appointments
</a>
          <a className="nav-item" href="/patients">
            <Users size={17} /> Patients
          </a>
          <a className="nav-item" href="/consultations">
            <Stethoscope size={17} /> Consultations
          </a>

          <div className="nav-section">CLINICAL</div>
          <a className="nav-item" href="/treatments">
            <Activity size={17} /> Treatments
          </a>
          <a
            className="nav-item"
            href="/prescriptions"
          >
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

        <section className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">OPERATIONAL OVERVIEW</div>
              <h1>DR. ADNAN'S CLINIC</h1>
              <p>Appointments, patient flow and consultation queue.</p>
            </div>
            <button className="primary-button" onClick={openNewAppointment}>
              <Plus size={18} /> New Appointment
            </button>
          </div>

          {apiError && (
            <div className="error-banner">
              <span>{apiError}</span>
              <button onClick={() => setApiError("")}>
                <X size={16} />
              </button>
            </div>
          )}

          <div className="stats-grid">
            <StatCard
              label="Appointments"
              value={todayAppointments.length}
              hint="TODAY"
              icon={<CalendarDays size={17} />}
            />
            <StatCard
              label="Waiting"
              value={waiting.length}
              hint="QUEUE"
              tone="amber"
              icon={<Clock3 size={17} />}
            />
            <StatCard
              label="In Consultation"
              value={consultation.length}
              hint="ACTIVE"
              tone="cyan"
              icon={<Stethoscope size={17} />}
            />
            <StatCard
              label="Completed"
              value={completed.length}
              hint="FINISHED"
              tone="green"
              icon={<CircleCheck size={17} />}
            />
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">LIVE INTAKE QUEUE</div>
                <h2>Today&apos;s Appointments</h2>
              </div>
              <button className="secondary-button" onClick={loadData}>
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="empty-state">Loading FastAPI data…</div>
            ) : todayAppointments.length === 0 ? (
              <div className="empty-state">
                No appointments scheduled for today.
              </div>
            ) : (
              <div className="queue-list">
                {todayAppointments.slice(0, 12).map((appointment) => (
                  <article className="queue-row" key={appointment.appointment_id}>
                    <div className="queue-number">
                      #{appointment.queue_number ?? "—"}
                    </div>

                    <div className="queue-time">
                      {formatTime(appointment.appointment_timestamp)}
                    </div>

                    <div className="patient-cell">
                      <strong>{patientName(appointment)}</strong>
                      <span>{patientCode(appointment)}</span>
                    </div>

                    <div className="visit-cell">
                      <span className="mono-chip">{appointment.visit_type}</span>
                      <small>
                        {categoryName(appointment)} ·{" "}
                        {treatmentName(appointment)}
                      </small>
                    </div>

                    <div className="doctor-cell">
                      <UserRound size={14} />
                      {doctorName(appointment)}
                    </div>

                    <div className={statusClass[appointment.status]}>
                      <span />
                      {appointment.status}
                    </div>

                    <div className="queue-actions">
                      {appointment.status === "Scheduled" && (
                        <button
                          onClick={() => updateStatus(appointment, "Waiting")}
                        >
                          Mark Arrived
                        </button>
                      )}

                      {appointment.status === "Waiting" && (
                        <button
                          onClick={() =>
                            updateStatus(appointment, "In Consultation")
                          }
                        >
                          Start
                        </button>
                      )}

                      {appointment.status === "In Consultation" && (
                        <button
                          onClick={() => updateStatus(appointment, "Completed")}
                        >
                          Complete
                        </button>
                      )}

                      {(appointment.status === "In Consultation" ||
                        appointment.status === "Completed") && (
                        <button
                          className={appointment.treated ? "treated" : ""}
                          onClick={() => toggleTreated(appointment)}
                        >
                          {appointment.treated ? "Treated" : "Mark Treated"}
                        </button>
                      )}

                      <ChevronRight size={17} className="muted-icon" />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="module-grid">

            <ModuleCard
              icon={<CalendarDays />}
              title="Appointments"
              text="Schedule & queue"
              href="/appointments"
            />
            <ModuleCard
              icon={<Users />}
              title="Patients"
              text="Search & patient records"
              href="/patients"
            />
            <ModuleCard
              icon={<Stethoscope />}
              title="Consultations"
              text="Visits & clinical notes"
              href="/consultations"
            />
            <ModuleCard
              icon={<Activity />}
              title="Treatments"
              text="Categories & procedures"
              href="/treatments"
            />
            <ModuleCard
              icon={<FileText />}
              title="Prescriptions"
              text="Digital prescription builder"
              href="/prescriptions"
            />
            <ModuleCard
              icon={<Settings2 />}
              title="Administration"
              text="Doctors & catalogue"
            />
          </section>
        </section>
      </main>

      {drawerOpen && (
        <div className="drawer-backdrop" onMouseDown={() => setDrawerOpen(false)}>
          <aside
            className="drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <div className="eyebrow">NEW APPOINTMENT</div>
                <h2>Create Appointment</h2>
                <p>Record visit schedule into the FastAPI system.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={19} />
              </button>
            </div>

            <form className="drawer-form" onSubmit={submitAppointment}>
              <div className="form-section">
                <label>1 · Visit Type</label>

                <div className="segmented">
                  {(["First Visit", "Repeat Visit"] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={form.visit_type === type ? "selected" : ""}
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          visit_type: type,
                          patient_id: ""
                        }));

                        setPatientSearch("");
                        setPatientCreated(false);

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
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {form.visit_type === "First Visit" ? (
                <div className="form-section">
                  <label>2 · New Patient Details</label>

                  <input
                    value={newPatient.name}
                    onChange={(e) =>
                      setNewPatient((current) => ({
                        ...current,
                        name: e.target.value
                      }))
                    }
                    placeholder="Patient full name *"
                    required
                  />

                  <select
                    value={newPatient.sex}
                    onChange={(e) =>
                      setNewPatient((current) => ({
                        ...current,
                        sex: e.target.value as "" | "Male" | "Female"
                      }))
                    }
                    required
                  >
                    <option value="">Select sex *</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>

                  <input
                    type="date"
                    value={newPatient.date_of_birth}
                    onChange={(e) =>
                      setNewPatient((current) => ({
                        ...current,
                        date_of_birth: e.target.value
                      }))
                    }
                    required
                  />

                  <input
                    value={newPatient.mobile_no}
                    onChange={(e) =>
                      setNewPatient((current) => ({
                        ...current,
                        mobile_no: e.target.value
                      }))
                    }
                    placeholder="Mobile number"
                  />

                  <input
                    type="email"
                    value={newPatient.email}
                    onChange={(e) =>
                      setNewPatient((current) => ({
                        ...current,
                        email: e.target.value
                      }))
                    }
                    placeholder="Email"
                  />

                  <input
                    value={newPatient.occupation}
                    onChange={(e) =>
                      setNewPatient((current) => ({
                        ...current,
                        occupation: e.target.value
                      }))
                    }
                    placeholder="Occupation"
                  />

                  <input
                    value={newPatient.address}
                    onChange={(e) =>
                      setNewPatient((current) => ({
                        ...current,
                        address: e.target.value
                      }))
                    }
                    placeholder="Address"
                  />

                  <input
                    value={newPatient.city}
                    onChange={(e) =>
                      setNewPatient((current) => ({
                        ...current,
                        city: e.target.value
                      }))
                    }
                    placeholder="City"
                  />

                  {!patientCreated ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={createNewPatient}
                    >
                      Create Patient
                    </button>
                  ) : (
                    <div className="selection selected">
                      <span>
                        <strong>✓ Patient created</strong>
                        <small>
                          {patientSearch} · Patient ID generated automatically
                        </small>
                      </span>
                      <CircleCheck size={17} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-section">
                  <label>2 · Existing Patient</label>

                  <input
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setForm((current) => ({
                        ...current,
                        patient_id: ""
                      }));
                    }}
                    placeholder="Search patient, mobile or code"
                  />

                  <div className="selection-list">
                    {filteredPatients.map((patient) => (
                      <button
                        type="button"
                        key={patient.patient_id}
                        className={
                          form.patient_id === String(patient.patient_id)
                            ? "selection selected"
                            : "selection"
                        }
                        onClick={() => {
                          setForm((current) => ({
                            ...current,
                            patient_id: String(patient.patient_id)
                          }));

                          setPatientSearch(patient.name);
                        }}
                      >
                        <span>
                          <strong>{patient.name}</strong>
                          <small>
                            {patient.patient_code} ·{" "}
                            {patient.mobile_no || "No mobile"}
                          </small>
                        </span>

                        {form.patient_id === String(patient.patient_id) && (
                          <CircleCheck size={17} />
                        )}
                      </button>
                    ))}

                    {filteredPatients.length === 0 && patientSearch.trim() && (
                      <div className="empty-state">
                        No active patient found.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-section">
                <label>3 · Schedule Time</label>
               
		<input
 		 type="datetime-local"
		  lang="da-DK"
		  value={form.appointment_timestamp}
		  onChange={(e) => {
		    const appointmentTimestamp = e.target.value;
		    const appointmentDate = appointmentTimestamp.slice(0, 10);

		    const existingQueueNumbers = appointments
		      .filter(
		        (appointment) =>
		          appointment.appointment_timestamp.slice(0, 10) === appointmentDate &&
		          appointment.queue_number != null
		      )
		      .map((appointment) => Number(appointment.queue_number));
		
		    const nextQueueNumber =
		      existingQueueNumbers.length > 0
		        ? Math.max(...existingQueueNumbers) + 1	
		        : 1;

		    setForm((current) => ({
		      ...current,
		      appointment_timestamp: appointmentTimestamp,
		      queue_number: appointmentTimestamp ? String(nextQueueNumber) : ""
		    }));
		  }}
		  required
		/>


              </div>

              <div className="form-section">
                <label>4 · Treatment Requirement</label>

                <select
                  value={form.category_id}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      category_id: e.target.value,
                      subcategory_id: "",
                      treatment_id: ""
                    }))
                  }
                  required
                >
                  <option value="">Select category</option>
                  {categories
                    .filter((c) => c.is_active)
                    .map((category) => (
                      <option
                        key={category.category_id}
                        value={category.category_id}
                      >
                        {category.category_name}
                      </option>
                    ))}
                </select>

                <select
                  value={form.subcategory_id}
                  disabled={!form.category_id}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      subcategory_id: e.target.value,
                      treatment_id: ""
                    }))
                  }
                >
                  <option value="">Select subcategory</option>
                  {availableSubcategories.map((subcategory) => (
                    <option
                      key={subcategory.subcategory_id}
                      value={subcategory.subcategory_id}
                    >
                      {subcategory.subcategory_name}
                    </option>
                  ))}
                </select>

                <select
                  value={form.treatment_id}
                  disabled={!form.subcategory_id}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      treatment_id: e.target.value
                    }))
                  }
                >
                  <option value="">Select treatment</option>
                  {availableTreatments.map((treatment) => (
                    <option
                      key={treatment.treatment_id}
                      value={treatment.treatment_id}
                    >
                      {treatment.treatment_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="two-column">
                <div className="form-section">
                  <label>5 · Doctor</label>
                  <select
                    value={form.doctor_id}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        doctor_id: e.target.value
                      }))
                    }
                  >
                    <option value={3}>Dr. Adnan</option>
                    {doctors
                      .filter((doctor) => doctor.is_active)
                      .map((doctor) => (
                        <option
                          key={doctor.doctor_id}
                          value={doctor.doctor_id}
                        >
                          {doctor.doctor_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-section">
                  <label>6 · Queue Number</label>
                 
			<input
			  type="number"
			  min="1"
			  value={form.queue_number}
			  readOnly
			  placeholder="Select date/time"
			/>


                </div>
              </div>

              <div className="form-section">
                <label>7 · Notes</label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      notes: e.target.value
                    }))
                  }
                  placeholder="Appointment notes..."
                />
              </div>

              <div className="drawer-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDrawerOpen(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  <CalendarDays size={17} /> Confirm & Schedule
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "gold"
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  tone?: "gold" | "amber" | "cyan" | "green";
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="eyebrow">{label}</div>
        <strong>{value.toString().padStart(2, "0")}</strong>
        <span>{hint}</span>
      </div>
    </div>
  );
}

function ModuleCard({
  icon,
  title,
  text,
  href
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="module-icon">{icon}</span>
      <strong>{title}</strong>
      <small>{text}</small>
    </>
  );

  if (href) {
    return (
      <a
        className="module-card"
        href={href}
      >
        {content}
      </a>
    );
  }

  return (
    <button className="module-card">
      {content}
    </button>
  );
}