# Appendix Env And Runbook

- Doc Class: Appendix
- Authority: Local environment and startup reference
- Change Policy: Update when local run commands or defaults change
- Status: Active
- Last Updated: 2026-04-04

## Backend

```powershell
cd c:\Users\PlayerX\Desktop\main\backend
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

## Frontend

```powershell
cd c:\Users\PlayerX\Desktop\main\frontend
powershell -ExecutionPolicy Bypass -File .\start-all-gonep.ps1
```

## Local URLs
- Backend: `http://localhost:8000`
- Admin: `http://localhost:8000/admin/`
- Patient: `http://localhost:8081`
- Provider: `http://localhost:8082`
- Rider: `http://localhost:8083`

## Important Note
One browser profile shares one Django session across all three portals because they all authenticate against `http://localhost:8000`.
