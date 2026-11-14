from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (
    allergies,
    appointments,
    categories,
    clinical_history,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(visits.router)
app.include_router(clinical_history.router)
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