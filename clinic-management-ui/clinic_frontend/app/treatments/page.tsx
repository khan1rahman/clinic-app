"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X
} from "lucide-react";

type Category = {
  category_id: number;
  category_name: string;
  description?: string | null;
  is_active: number;
  created_at?: string | null;
};

type Subcategory = {
  subcategory_id: number;
  category_id: number;
  subcategory_name: string;
  description?: string | null;
  is_active: number;
  created_at?: string | null;
};

type Treatment = {
  treatment_id: number;
  subcategory_id: number;
  subcategory_name?: string | null;
  category_id: number;
  category_name?: string | null;
  treatment_name: string;
  description?: string | null;
  is_active: number;
  created_at?: string | null;
};

type EditMode = "category" | "subcategory" | "treatment";

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

export default function TreatmentsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const [tab, setTab] = useState<"catalogue" | "edit">("catalogue");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  const [editMode, setEditMode] = useState<EditMode>("category");
  const [editId, setEditId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubcategoryId, setFormSubcategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<EditMode>("category");
  const [addCategoryId, setAddCategoryId] = useState("");
  const [addSubcategoryId, setAddSubcategoryId] = useState("");
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [c, s, t] = await Promise.all([
        request<Category[]>("/categories"),
        request<Subcategory[]>("/subcategories"),
        request<Treatment[]>("/treatments")
      ]);

      setCategories(c);
      setSubcategories(s);
      setTreatments(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load treatment catalogue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.is_active),
    [categories]
  );

  const activeSubcategories = useMemo(
    () => subcategories.filter((subcategory) => subcategory.is_active),
    [subcategories]
  );

  const activeTreatments = useMemo(
    () => treatments.filter((treatment) => treatment.is_active),
    [treatments]
  );

  const categoryOptions = activeOnly
    ? activeCategories
    : categories;

  const subcategoryOptions = useMemo(() => {
    return (activeOnly ? activeSubcategories : subcategories).filter(
      (subcategory) =>
        !selectedCategory || subcategory.category_id === Number(selectedCategory)
    );
  }, [
    activeOnly,
    activeSubcategories,
    subcategories,
    selectedCategory
  ]);

  const treatmentOptions = useMemo(() => {
    return (activeOnly ? activeTreatments : treatments).filter((treatment) => {
      if (selectedCategory && treatment.category_id !== Number(selectedCategory)) {
        return false;
      }

      if (
        selectedSubcategory &&
        treatment.subcategory_id !== Number(selectedSubcategory)
      ) {
        return false;
      }

      return true;
    });
  }, [
    activeOnly,
    activeTreatments,
    treatments,
    selectedCategory,
    selectedSubcategory
  ]);

  const visibleTreatments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return treatmentOptions.filter((treatment) => {
      if (!query) return true;

      return (
        treatment.treatment_name.toLowerCase().includes(query) ||
        (treatment.subcategory_name || "").toLowerCase().includes(query) ||
        (treatment.category_name || "").toLowerCase().includes(query) ||
        (treatment.description || "").toLowerCase().includes(query)
      );
    });
  }, [treatmentOptions, search]);

  const editSubcategories = useMemo(() => {
    return subcategories.filter(
      (subcategory) =>
        !formCategoryId || subcategory.category_id === Number(formCategoryId)
    );
  }, [subcategories, formCategoryId]);

  const editTreatments = useMemo(() => {
    return treatments.filter(
      (treatment) =>
        !formSubcategoryId ||
        treatment.subcategory_id === Number(formSubcategoryId)
    );
  }, [treatments, formSubcategoryId]);

  const addSubcategories = useMemo(
    () =>
      subcategories.filter(
        (subcategory) =>
          subcategory.is_active &&
          (!addCategoryId || subcategory.category_id === Number(addCategoryId))
      ),
    [subcategories, addCategoryId]
  );

  const selectedTreatmentRecord =
    treatments.find((treatment) => treatment.treatment_id === Number(selectedTreatment)) ||
    null;

  function clearMessage() {
    setError("");
    setSuccess("");
  }

  function clearEditForm() {
    setEditId("");
    setFormCategoryId("");
    setFormSubcategoryId("");
    setName("");
    setDescription("");
  }

  function clearAddForm() {
    setAddCategoryId("");
    setAddSubcategoryId("");
    setAddName("");
    setAddDescription("");
  }

  function selectEditRecord(mode: EditMode, id: string) {
    clearMessage();
    setEditMode(mode);
    setEditId(id);

    if (!id) {
      clearEditForm();
      return;
    }

    const numericId = Number(id);

    if (mode === "category") {
      const record = categories.find((item) => item.category_id === numericId);
      if (!record) return;

      setFormCategoryId("");
      setFormSubcategoryId("");
      setName(record.category_name);
      setDescription(record.description || "");
      return;
    }

    if (mode === "subcategory") {
      const record = subcategories.find(
        (item) => item.subcategory_id === numericId
      );
      if (!record) return;

      setFormCategoryId(String(record.category_id));
      setFormSubcategoryId("");
      setName(record.subcategory_name);
      setDescription(record.description || "");
      return;
    }

    const record = treatments.find((item) => item.treatment_id === numericId);
    if (!record) return;

    setFormCategoryId(String(record.category_id));
    setFormSubcategoryId(String(record.subcategory_id));
    setName(record.treatment_name);
    setDescription(record.description || "");
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    clearMessage();

    if (!editId || !name.trim()) {
      setError("Select a record and enter a name.");
      return;
    }

    if (editMode === "subcategory" && !formCategoryId) {
      setError("Category is required for a subcategory.");
      return;
    }

    if (editMode === "treatment" && !formSubcategoryId) {
      setError("Subcategory is required for a treatment.");
      return;
    }

    setSaving(true);

    try {
      if (editMode === "category") {
        await request(`/categories/${editId}`, {
          method: "PUT",
          body: JSON.stringify({
            category_name: name.trim(),
            description: description.trim() || null
          })
        });
      } else if (editMode === "subcategory") {
        await request(`/subcategories/${editId}`, {
          method: "PUT",
          body: JSON.stringify({
            category_id: Number(formCategoryId),
            subcategory_name: name.trim(),
            description: description.trim() || null
          })
        });
      } else {
        await request(`/treatments/${editId}`, {
          method: "PUT",
          body: JSON.stringify({
            subcategory_id: Number(formSubcategoryId),
            treatment_name: name.trim(),
            description: description.trim() || null
          })
        });
      }

      setSuccess(`${editModeLabel(editMode)} updated successfully.`);
      await loadData();
      selectEditRecord(editMode, editId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update record.");
    } finally {
      setSaving(false);
    }
  }

  async function addRecord(event: React.FormEvent) {
    event.preventDefault();
    clearMessage();

    if (!addName.trim()) {
      setError("Enter a name.");
      return;
    }

    if (addMode === "subcategory" && !addCategoryId) {
      setError("Select a category.");
      return;
    }

    if (addMode === "treatment" && !addSubcategoryId) {
      setError("Select a subcategory.");
      return;
    }

    setSaving(true);

    try {
      if (addMode === "category") {
        await request("/categories", {
          method: "POST",
          body: JSON.stringify({
            category_name: addName.trim(),
            description: addDescription.trim() || null
          })
        });
      } else if (addMode === "subcategory") {
        await request("/subcategories", {
          method: "POST",
          body: JSON.stringify({
            category_id: Number(addCategoryId),
            subcategory_name: addName.trim(),
            description: addDescription.trim() || null
          })
        });
      } else {
        await request("/treatments", {
          method: "POST",
          body: JSON.stringify({
            subcategory_id: Number(addSubcategoryId),
            treatment_name: addName.trim(),
            description: addDescription.trim() || null
          })
        });
      }

      setSuccess(`${editModeLabel(addMode)} added successfully.`);
      clearAddForm();
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add record.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateRecord(mode: EditMode, id: number) {
    clearMessage();

    const label = editModeLabel(mode);
    if (!window.confirm(`Remove this ${label.toLowerCase()} from the active catalogue?`)) {
      return;
    }

    setSaving(true);

    try {
      const endpoint =
        mode === "category"
          ? `/categories/${id}`
          : mode === "subcategory"
            ? `/subcategories/${id}`
            : `/treatments/${id}`;

      await request(endpoint, { method: "DELETE" });

      setSuccess(`${label} removed from the active catalogue.`);
      clearEditForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to remove ${label.toLowerCase()}.`
      );
    } finally {
      setSaving(false);
    }
  }

  function editModeLabel(mode: EditMode) {
    if (mode === "category") return "Category";
    if (mode === "subcategory") return "Subcategory";
    return "Treatment";
  }

  return (
    <div className="app-shell treatments-page">
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
            <Activity size={17} /> Appointments
          </a>

          <a className="nav-item" href="/patients">
            <Activity size={17} /> Patients
          </a>

          <a className="nav-item" href="/consultations">
            <Activity size={17} /> Consultations
          </a>

          <div className="nav-section">CLINICAL</div>

          <a className="nav-item active" href="/treatments">
            <Activity size={17} /> Treatments
          </a>

          <a className="nav-item">
            <Activity size={17} /> Prescriptions
          </a>

          <div className="nav-section">ADMINISTRATION</div>

          <a className="nav-item">
            <Activity size={17} /> Doctors & Catalogue
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
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search patient, mobile, code..." />
            <kbd>Ctrl K</kbd>
          </div>

          <div className="top-actions">
            <span className="connection">
              <span className="online-dot" /> LOCAL LAN
            </span>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">CLINICAL CATALOGUE</div>
              <h1>Treatments</h1>
              <p>Categories, subcategories and treatment procedures.</p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <a className="secondary-button" href="/">
                <ArrowLeft size={16} /> Dashboard
              </a>

              <button
                className="secondary-button"
                onClick={loadData}
                disabled={loading || saving}
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}

          <div className="stats-grid">
            <StatCard label="Categories" value={activeCategories.length} hint="ACTIVE" />
            <StatCard
              label="Subcategories"
              value={activeSubcategories.length}
              hint="ACTIVE"
            />
            <StatCard label="Treatments" value={activeTreatments.length} hint="ACTIVE" />
            <StatCard
              label="Inactive"
              value={
                categories.filter((x) => !x.is_active).length +
                subcategories.filter((x) => !x.is_active).length +
                treatments.filter((x) => !x.is_active).length
              }
              hint="CATALOGUE"
            />
          </div>

          <div className="tabs-bar">
            <button
              className={tab === "catalogue" ? "tab-button active" : "tab-button"}
              onClick={() => setTab("catalogue")}
            >
              Catalogue
            </button>
            <button
              className={tab === "edit" ? "tab-button active" : "tab-button"}
              onClick={() => setTab("edit")}
            >
              <Edit3 size={15} /> Edit Catalogue
            </button>
          </div>

          {tab === "catalogue" ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">TREATMENT CATALOGUE</div>
                  <h2>Categories, Subcategories & Procedures</h2>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                  padding: "16px",
                  borderBottom: "1px solid var(--line)"
                }}
              >
                <select className="treatment-control"
                  value={selectedCategory}
                  onChange={(event) => {
                    setSelectedCategory(event.target.value);
                    setSelectedSubcategory("");
                    setSelectedTreatment("");
                  }}
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>

                <select className="treatment-control"
                  value={selectedSubcategory}
                  onChange={(event) => {
                    setSelectedSubcategory(event.target.value);
                    setSelectedTreatment("");
                  }}
                  disabled={!selectedCategory && subcategoryOptions.length === 0}
                >
                  <option value="">All subcategories</option>
                  {subcategoryOptions.map((subcategory) => (
                    <option
                      key={subcategory.subcategory_id}
                      value={subcategory.subcategory_id}
                    >
                      {subcategory.subcategory_name}
                    </option>
                  ))}
                </select>

                <select className="treatment-control"
                  value={selectedTreatment}
                  onChange={(event) => setSelectedTreatment(event.target.value)}
                >
                  <option value="">All treatments</option>
                  {treatmentOptions.map((treatment) => (
                    <option key={treatment.treatment_id} value={treatment.treatment_id}>
                      {treatment.treatment_name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr auto",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--line)"
                }}
              >
                <div className="search-box" style={{ width: "100%" }}>
                  <Search size={16} />
                  <input className="treatment-search-input"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search treatment, subcategory or description..."
                  />
                </div>

                <button
                  className={`secondary-button ${activeOnly ? "selected" : ""}`}
                  onClick={() => {
                    setActiveOnly((current) => !current);
                    setSelectedCategory("");
                    setSelectedSubcategory("");
                    setSelectedTreatment("");
                  }}
                >
                  {activeOnly ? "Active Only" : "All"}
                </button>
              </div>

              {selectedTreatmentRecord && (
                <div
                  style={{
                    margin: 16,
                    padding: 14,
                    border: "1px solid var(--line-active)",
                    borderRadius: 7
                  }}
                >
                  <div className="eyebrow">SELECTED TREATMENT</div>
                  <strong style={{ fontSize: 16 }}>
                    {selectedTreatmentRecord.treatment_name}
                  </strong>
                  <div style={{ marginTop: 5, color: "var(--muted)", fontSize: 12 }}>
                    {selectedTreatmentRecord.category_name} ·{" "}
                    {selectedTreatmentRecord.subcategory_name}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    {selectedTreatmentRecord.description || "No description"}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="empty-state">Loading treatment catalogue…</div>
              ) : visibleTreatments.length === 0 ? (
                <div className="empty-state">No treatments found.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Category</th>
                        <th style={thStyle}>Subcategory</th>
                        <th style={thStyle}>Treatment</th>
                        <th style={thStyle}>Description</th>
                        <th style={thStyle}>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleTreatments.map((treatment) => (
                        <tr key={treatment.treatment_id}>
                          <td style={tdStyle}>{treatment.category_name}</td>
                          <td style={tdStyle}>{treatment.subcategory_name}</td>
                          <td style={tdStyle}>
                            <strong>{treatment.treatment_name}</strong>
                          </td>
                          <td style={tdStyle}>{treatment.description || "—"}</td>
                          <td style={tdStyle}>
                            {treatment.is_active ? (
                              <span className="status completed">
                                <span />
                                <CheckCircle2 size={13} /> Active
                              </span>
                            ) : (
                              <span className="status cancelled">
                                <span />
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">CATALOGUE ADMINISTRATION</div>
                  <h2>Edit Catalogue</h2>
                </div>

                <button
                  className="primary-button"
                  onClick={() => {
                    clearMessage();
                    setShowAddForm((current) => !current);
                    clearAddForm();
                  }}
                >
                  {showAddForm ? <X size={16} /> : <Plus size={16} />}
                  {showAddForm ? "Close Add" : "Add"}
                </button>
              </div>

              {showAddForm && (
                <form
                  onSubmit={addRecord}
                  style={{
                    padding: 16,
                    borderBottom: "1px solid var(--line)"
                  }}
                >
                  <div className="eyebrow">ADD NEW</div>
                  <h3 style={{ margin: "5px 0 14px" }}>
                    Add {editModeLabel(addMode)}
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12
                    }}
                  >
                    <select className="treatment-control"
                      value={addMode}
                      onChange={(event) => {
                        const mode = event.target.value as EditMode;
                        setAddMode(mode);
                        clearAddForm();
                      }}
                    >
                      <option value="category">Category</option>
                      <option value="subcategory">Subcategory</option>
                      <option value="treatment">Treatment</option>
                    </select>

                    {addMode !== "category" && (
                      <select className="treatment-control"
                        value={addCategoryId}
                        onChange={(event) => {
                          setAddCategoryId(event.target.value);
                          setAddSubcategoryId("");
                        }}
                      >
                        <option value="">Select category</option>
                        {activeCategories.map((category) => (
                          <option
                            key={category.category_id}
                            value={category.category_id}
                          >
                            {category.category_name}
                          </option>
                        ))}
                      </select>
                    )}

                    {addMode === "treatment" && (
                      <select className="treatment-control"
                        value={addSubcategoryId}
                        onChange={(event) =>
                          setAddSubcategoryId(event.target.value)
                        }
                      >
                        <option value="">Select subcategory</option>
                        {addSubcategories.map((subcategory) => (
                          <option
                            key={subcategory.subcategory_id}
                            value={subcategory.subcategory_id}
                          >
                            {subcategory.subcategory_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <input className="treatment-text-input"
                    value={addName}
                    onChange={(event) => setAddName(event.target.value)}
                    placeholder={`${editModeLabel(addMode)} name`}
                    style={{ width: "100%", marginTop: 12 }}
                  />

                  <textarea className="treatment-textarea"
                    value={addDescription}
                    onChange={(event) => setAddDescription(event.target.value)}
                    placeholder="Description"
                    rows={3}
                    style={{ width: "100%", marginTop: 12, resize: "vertical" }}
                  />

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <button className="primary-button" type="submit" disabled={saving}>
                      <Plus size={16} /> Save {editModeLabel(addMode)}
                    </button>
                  </div>
                </form>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "280px 1fr",
                  minHeight: 500
                }}
              >
                <div style={{ borderRight: "1px solid var(--line)", padding: 16 }}>
                  <div className="eyebrow">EDIT TYPE</div>

                  <div style={{ display: "flex", gap: 7, margin: "10px 0 16px" }}>
                    {(["category", "subcategory", "treatment"] as EditMode[]).map(
                      (mode) => (
                        <button
                          key={mode}
                          className={
                            editMode === mode
                              ? "secondary-button selected"
                              : "secondary-button"
                          }
                          onClick={() => {
                            clearMessage();
                            clearEditForm();
                            setEditMode(mode);
                          }}
                        >
                          {editModeLabel(mode)}
                        </button>
                      )
                    )}
                  </div>

                  <select className="treatment-control"
                    value={editId}
                    onChange={(event) =>
                      selectEditRecord(editMode, event.target.value)
                    }
                    style={{ width: "100%" }}
                  >
                    <option value="">
                      Select {editModeLabel(editMode).toLowerCase()}
                    </option>

                    {editMode === "category" &&
                      categories.map((category) => (
                        <option
                          key={category.category_id}
                          value={category.category_id}
                        >
                          {category.category_name}
                          {!category.is_active ? " (Inactive)" : ""}
                        </option>
                      ))}

                    {editMode === "subcategory" &&
                      subcategories.map((subcategory) => (
                        <option
                          key={subcategory.subcategory_id}
                          value={subcategory.subcategory_id}
                        >
                          {subcategory.subcategory_name}
                          {!subcategory.is_active ? " (Inactive)" : ""}
                        </option>
                      ))}

                    {editMode === "treatment" &&
                      treatments.map((treatment) => (
                        <option
                          key={treatment.treatment_id}
                          value={treatment.treatment_id}
                        >
                          {treatment.treatment_name}
                          {!treatment.is_active ? " (Inactive)" : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ padding: 18 }}>
                  {!editId ? (
                    <div className="empty-state">
                      Select a category, subcategory or treatment to edit.
                    </div>
                  ) : (
                    <form onSubmit={saveEdit}>
                      <div className="eyebrow">EDIT {editModeLabel(editMode).toUpperCase()}</div>
                      <h3 style={{ margin: "5px 0 18px" }}>
                        Update {editModeLabel(editMode)}
                      </h3>

                      {editMode !== "category" && (
                        <label style={labelStyle}>
                          Category
                          <select className="treatment-control"
                            value={formCategoryId}
                            onChange={(event) => {
                              setFormCategoryId(event.target.value);
                              if (editMode === "treatment") {
                                setFormSubcategoryId("");
                              }
                            }}
                            style={{ width: "100%" }}
                          >
                            <option value="">Select category</option>
                            {activeCategories.map((category) => (
                              <option
                                key={category.category_id}
                                value={category.category_id}
                              >
                                {category.category_name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      {editMode === "treatment" && (
                        <label style={labelStyle}>
                          Subcategory
                          <select className="treatment-control"
                            value={formSubcategoryId}
                            onChange={(event) =>
                              setFormSubcategoryId(event.target.value)
                            }
                            style={{ width: "100%" }}
                          >
                            <option value="">Select subcategory</option>
                            {editSubcategories
                              .filter((subcategory) => subcategory.is_active)
                              .map((subcategory) => (
                                <option
                                  key={subcategory.subcategory_id}
                                  value={subcategory.subcategory_id}
                                >
                                  {subcategory.subcategory_name}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}

                      <label style={labelStyle}>
                        Name
                        <input className="treatment-text-input"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          style={{ width: "100%" }}
                        />
                      </label>

                      <label style={labelStyle}>
                        Description
                        <textarea className="treatment-textarea"
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                          rows={5}
                          style={{ width: "100%", resize: "vertical" }}
                        />
                      </label>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          marginTop: 18
                        }}
                      >
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() =>
                            deactivateRecord(editMode, Number(editId))
                          }
                          disabled={saving}
                        >
                          <Trash2 size={15} /> Remove
                        </button>

                        <button
                          type="submit"
                          className="primary-button"
                          disabled={saving}
                        >
                          <CheckCircle2 size={15} />
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </section>
          )}
        </section>
      </main>
      <style jsx global>{`
        /* =========================================================
           TREATMENTS PAGE - READABILITY
           Match the typography scale used by the Appointments page.
           ========================================================= */

        .treatments-page .page-heading {
          margin-bottom: 24px;
        }

        .treatments-page .page-heading h1 {
          margin: 4px 0 6px;
          font-size: 30px;
          font-weight: 600;
          letter-spacing: -0.03em;
        }

        .treatments-page .page-heading p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .treatments-page .panel-header h2 {
          margin: 4px 0 0;
          font-size: 18px;
          font-weight: 500;
        }

        .treatments-page .eyebrow {
          font-size: 10px;
        }

        .treatments-page .tabs-bar .tab-button {
          font-size: 13px;
        }

        .treatments-page .treatment-control,
        .treatments-page .treatment-text-input,
        .treatments-page .treatment-textarea {
          box-sizing: border-box;
          color: var(--text);
          font-size: 15px;
          line-height: 1.4;
        }

        .treatments-page .treatment-control {
          min-height: 40px;
          padding: 7px 10px;
          color: #111827 !important;
          background-color: #ffffff !important;
          -webkit-text-fill-color: #111827;
        }

        /* Chrome/Windows native dropdown options were inheriting the dark-theme
           text color, making the white option list unreadable. */
        .treatments-page .treatment-control option {
          color: #111827 !important;
          background-color: #ffffff !important;
          -webkit-text-fill-color: #111827;
          font-size: 15px;
        }

        .treatments-page .treatment-text-input {
          min-height: 40px;
          padding: 8px 10px;
        }

        .treatments-page .treatment-textarea {
          padding: 9px 10px;
        }

        .treatments-page .treatment-text-input::placeholder,
        .treatments-page .treatment-textarea::placeholder,
        .treatments-page .treatment-search-input::placeholder {
          font-size: 15px;
          color: var(--dim);
        }

        .treatments-page .treatment-search-input {
          font-size: 15px;
        }

        .treatments-page label {
          font-size: 13px !important;
        }

        .treatments-page table th {
          font-size: 12px !important;
          font-weight: 600;
          letter-spacing: 0.06em;
        }

        .treatments-page table td {
          font-size: 14px !important;
        }

        .treatments-page table td strong {
          font-size: 14px;
        }

        .treatments-page .status {
          font-size: 10px;
        }

        .treatments-page .secondary-button,
        .treatments-page .primary-button,
        .treatments-page .danger-button {
          font-size: 13px;
        }

        .treatments-page .empty-state {
          font-size: 14px;
        }

        .treatments-page h3 {
          font-size: 17px;
        }

        .treatments-page .stat-card .eyebrow {
          font-size: 10px;
        }
      `}</style>
    </div>

  );
}

function StatCard({
  label,
  value,
  hint
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Activity size={17} />
      </div>
      <div>
        <div className="eyebrow">{label}</div>
        <strong>{value.toString().padStart(2, "0")}</strong>
        <span>{hint}</span>
      </div>

    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
  fontSize: 12,
  color: "var(--muted)",
  marginBottom: 14
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid var(--line)",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--muted)"
};

const tdStyle: React.CSSProperties = {
  padding: "14px",
  borderBottom: "1px solid var(--line)",
  fontSize: "13px",
  verticalAlign: "top"
};
