# Clinic Management UI

This is the editable React/Next.js frontend for the local clinic application.

## Architecture

Browser
→ Next.js
→ `/api/*` rewrite
→ FastAPI `http://127.0.0.1:8000`
→ SQLite

The browser does NOT connect directly to SQLite.

## Start

1. Make sure FastAPI is running:

```cmd
cd C:\ClinicApp\backend
.venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

2. In this frontend directory:

```cmd
npm install
npm run dev
```

3. Open:

```text
http://127.0.0.1:3000
```

For another PC on the same LAN, use:

```text
http://<SERVER-LAPTOP-IP>:3000
```

The Next.js rewrite proxies `/api/*` to the FastAPI server, so CORS changes are not required for this frontend.

## Current working UI

- Live dashboard
- Today's appointment statistics
- Appointment queue
- Patient lookup
- Create Appointment drawer
- Category → Subcategory → Treatment cascading selection
- Doctor selection
- Queue number
- Appointment notes
- Mark Arrived
- Start Consultation
- Complete Appointment
- Mark Treated
- Real FastAPI data loading

## Important

The UI intentionally uses only fields represented by the current FastAPI API. It does not create fake rooms, inventory, equipment telemetry, unsupported clinical measurements, or other invented data.