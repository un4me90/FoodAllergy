# Render Deployment

This project is prepared for:

- App server: Render Web Service
- Database: Render Postgres

## Included files

- `render.yaml`: Render Blueprint definition
- `backend/src/db/client.ts`: PostgreSQL connection and table initialization
- `backend/src/db/subscriptions.ts`: push subscription storage in Postgres
- `backend/src/db/meals.ts`: meal cache storage in Postgres

## Before deploy

You need these environment values:

- `NEIS_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`

## Deploy steps

1. Push this project to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Connect the GitHub repo.
4. Render will detect `render.yaml`.
5. Confirm creation of:
   - `food-allergy-app` web service
   - `food-allergy-db` Postgres database
6. In the web service settings, fill in:
   - `NEIS_API_KEY`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL`
7. Deploy.

## Health check

- `GET /api/health`

## Notes

- The current Blueprint uses Render free plans for testing.
- Free services may sleep, so scheduled 7:00 AM push delivery is not guaranteed for production use.
- For stable scheduled notifications, move the app and database to paid plans.
