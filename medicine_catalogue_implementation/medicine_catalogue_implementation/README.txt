Medicine Catalogue implementation

Copy the files into:
- clinic-management-ui/clinic_frontend/app/medicines/page.tsx
- clinic-management-ui/clinic_frontend/app/medicines/page.module.css
- clinic-management-ui/clinic_frontend/lib/api.ts

The API helper is based on the api.ts file supplied for this task and preserves its existing methods.
The page uses the existing FastAPI routes:
GET/POST /medicines/
PUT/DELETE /medicines/{medicine_id}

No database migration is included or required.

Open http://localhost:3000/medicines after restarting the Next.js dev server if required.

Navigation:
The uploaded layout.tsx is only the Next.js root document wrapper; it has no sidebar or navigation. The sidebar is rendered inside the dashboard page in the older project snapshot. To avoid overwriting current dashboard work, this package does not replace app/page.tsx. Add a link with href="/medicines" and label "Medicine Catalogue" to the existing sidebar's Clinical or Administration section.
