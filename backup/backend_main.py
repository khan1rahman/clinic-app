from fastapi import FastAPI

from routers import (
    allergies,
    appointments,
    categories,
    doctors,
    family_history,
    habits,
    measurements,
    medicines,
    patients,
    past_history,
    personal_history,
    prescription_items,
    prescriptions,
    subcategories,
    treatments,
    visits,
)


app = FastAPI(title="Clinic Management API")


app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(visits.router)
app.include_router(measurements.router)
app.include_router(habits.router)
app.include_router(personal_history.router)
app.include_router(past_history.router)
app.include_router(family_history.router)
app.include_router(allergies.router)
app.include_router(categories.router)
app.include_router(subcategories.router)
app.include_router(treatments.router)
app.include_router(prescriptions.router)
app.include_router(prescription_items.router)
app.include_router(medicines.router)
app.include_router(appointments.router)


@app.get("/")
def root():
    return {"message": "Clinic API is running"}