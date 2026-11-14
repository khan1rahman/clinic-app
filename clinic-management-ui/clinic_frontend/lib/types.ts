export type Patient = {
  patient_id: number;
  patient_code: string;
  name: string;
  sex: "Male" | "Female";
  date_of_birth?: string | null;
  mobile_no?: string | null;
  email?: string | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  first_appointment_date?: string | null;
  status: "Active" | "Inactive";
};

export type Doctor = {
  doctor_id: number;
  doctor_name: string;
  specialization?: string | null;
  mobile_no?: string | null;
  email?: string | null;
  is_active: number;
};

export type Category = {
  category_id: number;
  category_name: string;
  description?: string | null;
  is_active: number;
};

export type Subcategory = {
  subcategory_id: number;
  category_id: number;
  subcategory_name: string;
  description?: string | null;
  is_active: number;
};

export type Treatment = {
  treatment_id: number;
  subcategory_id: number;
  subcategory_name?: string;
  category_id?: number;
  category_name?: string;
  treatment_name: string;
  description?: string | null;
  is_active: number;
};

export type Appointment = {
  appointment_id: number;
  appointment_timestamp: string;
  patient_id: number;
  visit_type: "First Visit" | "Repeat Visit";
  queue_number?: number | null;
  status:
    | "Scheduled"
    | "Waiting"
    | "In Consultation"
    | "Completed"
    | "Cancelled"
    | "No Show";
  cancellation_reason?: string | null;
  treated: number;
  category_id: number;
  subcategory_id?: number | null;
  treatment_id?: number | null;
  doctor_id?: number | null;
  notes?: string | null;

  // The API may return joined display fields.
  patient_name?: string;
  patient_code?: string;
  category_name?: string;
  subcategory_name?: string;
  treatment_name?: string;
  doctor_name?: string;
};

export type AppointmentCreate = {
  appointment_timestamp: string;
  patient_id: number;
  visit_type: "First Visit" | "Repeat Visit";
  queue_number?: number | null;
  status?: Appointment["status"];
  cancellation_reason?: string | null;
  treated?: number;
  category_id: number;
  subcategory_id?: number | null;
  treatment_id?: number | null;
  doctor_id?: number | null;
  notes?: string | null;
};