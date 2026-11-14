for running the application follow following steps


Step 1 — Start the backend
Open a new CMD window and run these commands one at a time:

.................................................................................................
cd /d D:\abdul\clinic\ClinicApp\backend

py -m venv .venv

.venv\Scripts\activate

python -m pip install -r requirements.txt

python -m uvicorn main:app --host 127.0.0.1 --port 8000

....................................................................................................

Keep this terminal open.
Step 2 — Start the frontend
Open a second CMD window and run:

...................................................................................................
cd /d D:\abdul\clinic\ClinicApp\clinic-management-ui\clinic_frontend
npm run dev
......................................................................................................

If it reports missing dependencies, run npm install first, then npm run dev.
Keep this terminal open too.
Step 3 — Open ClinicApp
Open Chrome and navigate to: http://localhost:3000/

ui will be open to use