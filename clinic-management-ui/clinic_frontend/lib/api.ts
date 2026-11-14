import type {
  Appointment,
  AppointmentCreate,
  Category,
  Doctor,
  Patient,
  Subcategory,
  Treatment
} from "./types";


export type VisitClinicalHistory = {
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
};

export type VisitRecord = {
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
  created_at?: string | null;
  updated_at?: string | null;
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
        message = body.detail
          .map((item: { msg?: string }) => item.msg)
          .join(", ");
      }
    } catch {
      // Keep the HTTP status message.
    }

    throw new Error(message);
  }

  return response.json();
}

export const api = {
  // -----------------------------
  // PATIENTS
  // -----------------------------

  getPatients: () =>
    request<Patient[]>("/patients"),

  createPatient: (payload: {
    name: string;
    sex: "Male" | "Female";
    date_of_birth: string;
    mobile_no?: string;
    email?: string;
    occupation?: string;
    address?: string;
    city?: string;
    first_appointment_date?: string;
  }) =>
    request<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  updatePatient: (
    patientId: number,
    payload: {
      name?: string;
      sex?: "Male" | "Female";
      date_of_birth?: string;
      mobile_no?: string;
      email?: string;
      occupation?: string;
      address?: string;
      city?: string;
      first_appointment_date?: string;
    }
  ) =>
    request<Patient>(`/patients/${patientId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  deletePatient: (patientId: number) =>
    request<{ message: string; patient_id: number }>(
      `/patients/${patientId}`,
      {
        method: "DELETE"
      }
    ),

  // -----------------------------
  // DOCTORS
  // -----------------------------

  getDoctors: () =>
    request<Doctor[]>("/doctors"),

  // -----------------------------
  // TREATMENTS
  // -----------------------------

  getCategories: () =>
    request<Category[]>("/categories"),

  getSubcategories: () =>
    request<Subcategory[]>("/subcategories"),

  getTreatments: () =>
    request<Treatment[]>("/treatments"),

  // -----------------------------
  // APPOINTMENTS
  // -----------------------------

  getAppointments: () =>
    request<Appointment[]>("/appointments"),

  getVisits: () =>
    request<VisitRecord[]>("/visits"),

  getVisitClinicalHistory: (visitId: number) =>
    request<VisitClinicalHistory>(`/visits/${visitId}/clinical-history`),

  saveVisitClinicalHistory: (visitId: number, payload: Omit<VisitClinicalHistory, "visit_id">) =>
    request<VisitClinicalHistory>(`/visits/${visitId}/clinical-history`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  createAppointment: (payload: AppointmentCreate) =>
    request<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  updateAppointment: (
    appointmentId: number,
    payload: Partial<AppointmentCreate>
  ) =>
    request<Appointment>(`/appointments/${appointmentId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  cancelAppointment: (appointmentId: number) =>
    request<{ message: string; appointment_id: number }>(
      `/appointments/${appointmentId}`,
      {
        method: "DELETE"
      }
    )



};