"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, Medicine, MedicinePayload } from "../../lib/api";
import styles from "./page.module.css";

type FormState = {
  medicine_name: string;
  generic_name: string;
  form: string;
  strength: string;
  manufacturer: string;
  notes: string;
};

const emptyForm: FormState = {
  medicine_name: "",
  generic_name: "",
  form: "",
  strength: "",
  manufacturer: "",
  notes: ""
};

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function loadMedicines() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getMedicines();
      setMedicines(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load medicine catalogue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadMedicines(); }, []);

  const filteredMedicines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicines.filter((m) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? m.is_active === 1 : m.is_active === 0);
      const haystack = [
        m.medicine_name, m.generic_name, m.form, m.strength, m.manufacturer
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    }).sort((a, b) => a.medicine_name.localeCompare(b.medicine_name));
  }, [medicines, search, statusFilter]);

  const counts = useMemo(() => ({
    total: medicines.length,
    active: medicines.filter((m) => m.is_active === 1).length,
    inactive: medicines.filter((m) => m.is_active === 0).length
  }), [medicines]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEdit(medicine: Medicine) {
    setEditingId(medicine.medicine_id);
    setForm({
      medicine_name: medicine.medicine_name || "",
      generic_name: medicine.generic_name || "",
      form: medicine.form || "",
      strength: medicine.strength || "",
      manufacturer: medicine.manufacturer || "",
      notes: medicine.notes || ""
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.medicine_name.trim()) {
      setError("Medicine name is required.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    const payload: MedicinePayload = {
      medicine_name: form.medicine_name.trim(),
      generic_name: form.generic_name.trim() || null,
      form: form.form.trim() || null,
      strength: form.strength.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      notes: form.notes.trim() || null
    };
    try {
      if (editingId === null) {
        await api.createMedicine(payload);
        setSuccess("Medicine added to the catalogue.");
      } else {
        await api.updateMedicine(editingId, payload);
        setSuccess("Medicine details updated.");
      }
      setModalOpen(false);
      setForm(emptyForm);
      await loadMedicines();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save medicine.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(medicine: Medicine) {
    const next = medicine.is_active === 1 ? 0 : 1;
    const action = next === 1 ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${action} ${medicine.medicine_name}?`)) return;
    setError("");
    setSuccess("");
    try {
      if (next === 0) {
        await api.deactivateMedicine(medicine.medicine_id);
      } else {
        await api.updateMedicine(medicine.medicine_id, { is_active: 1 });
      }
      setSuccess(`${medicine.medicine_name} ${next === 1 ? "activated" : "deactivated"}.`);
      await loadMedicines();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to ${action} medicine.`);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.topline}>
        <div>
          <div className={styles.eyebrow}>ADMINISTRATION</div>
          <h1>Medicine Catalogue</h1>
          <p>Manage medicines available for clinical prescriptions.</p>
        </div>
        <div className={styles.actions}>
          <a className={styles.secondaryButton} href="/prescriptions">Back to Prescriptions</a>
          <button className={styles.primaryButton} onClick={openCreate}>＋ Add Medicine</button>
        </div>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {success && <div className={styles.alertSuccess}>{success}</div>}

      <section className={styles.stats}>
        <button className={`${styles.stat} ${statusFilter === "all" ? styles.statSelected : ""}`} onClick={() => setStatusFilter("all")}>
          <span>All medicines</span><strong>{counts.total}</strong>
        </button>
        <button className={`${styles.stat} ${statusFilter === "active" ? styles.statSelected : ""}`} onClick={() => setStatusFilter("active")}>
          <span>Active</span><strong>{counts.active}</strong>
        </button>
        <button className={`${styles.stat} ${statusFilter === "inactive" ? styles.statSelected : ""}`} onClick={() => setStatusFilter("inactive")}>
          <span>Inactive</span><strong>{counts.inactive}</strong>
        </button>
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <span>⌕</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicine, generic name, form, strength or manufacturer..." />
          </div>
          <button className={styles.refreshButton} onClick={() => void loadMedicines()} disabled={loading}>↻ Refresh</button>
        </div>

        {loading ? <div className={styles.empty}>Loading medicine catalogue…</div> :
          filteredMedicines.length === 0 ? <div className={styles.empty}>No medicines match your search.</div> :
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr>
                <th>Medicine</th><th>Generic name</th><th>Form</th><th>Strength</th><th>Manufacturer</th><th>Status</th><th className={styles.actionHead}>Actions</th>
              </tr></thead>
              <tbody>{filteredMedicines.map((m) => <tr key={m.medicine_id}>
                <td><strong>{m.medicine_name}</strong><small>MED-{String(m.medicine_id).padStart(4, "0")}</small></td>
                <td>{m.generic_name || "—"}</td>
                <td>{m.form || "—"}</td>
                <td>{m.strength || "—"}</td>
                <td>{m.manufacturer || "—"}</td>
                <td><span className={m.is_active === 1 ? styles.activeBadge : styles.inactiveBadge}>{m.is_active === 1 ? "Active" : "Inactive"}</span></td>
                <td><div className={styles.rowActions}>
                  <button onClick={() => openEdit(m)}>Edit</button>
                  <button className={m.is_active === 1 ? styles.deactivate : styles.activate} onClick={() => void toggleStatus(m)}>{m.is_active === 1 ? "Deactivate" : "Activate"}</button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>}
        <div className={styles.tableFooter}>Showing {filteredMedicines.length} of {medicines.length} medicines</div>
      </section>

      {modalOpen && <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="medicine-modal-title">
          <div className={styles.modalHeader}>
            <div><div className={styles.eyebrow}>{editingId === null ? "NEW CATALOGUE ENTRY" : `MEDICINE #${editingId}`}</div><h2 id="medicine-modal-title">{editingId === null ? "Add Medicine" : "Edit Medicine"}</h2></div>
            <button className={styles.closeButton} onClick={() => setModalOpen(false)} aria-label="Close">×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <label className={styles.full}>Medicine name <span>*</span><input autoFocus value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name: e.target.value })} required maxLength={200} placeholder="e.g. Brand name" /></label>
              <label>Generic name<input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} maxLength={200} /></label>
              <label>Dosage form<input value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} maxLength={100} placeholder="Tablet, cream, capsule…" /></label>
              <label>Strength<input value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} maxLength={100} placeholder="e.g. 500 mg" /></label>
              <label>Manufacturer<input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} maxLength={200} /></label>
              <label className={styles.full}>Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} /></label>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryButton} onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
              <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? "Saving…" : editingId === null ? "Add to Catalogue" : "Save Changes"}</button>
            </div>
          </form>
        </section>
      </div>}
    </main>
  );
}
