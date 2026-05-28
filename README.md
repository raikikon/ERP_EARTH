# Earth & Soil ERP

Node/Express + MongoDB backend and React frontend for sand, soil, aggregate, vehicle, driver, operator, job, attendance, and alert management.

## Run

Install dependencies:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

Build the frontend into the backend:

```bash
npm run build
```

Backend:

```bash
npm --prefix backend run dev
```

Frontend:

```bash
npm --prefix frontend run dev -- --host 127.0.0.1
```

The backend runs on `http://localhost:5050` because port `5000` is already used on this machine. After `npm run build`, opening `http://localhost:5050` serves the frontend from the backend. For live frontend development, the Vite server still runs on `http://127.0.0.1:5173`.

Smoke test the full role workflow while both servers are running:

```bash
npm run smoke:test
```

## Default Login

Admin account is seeded automatically:

```text
admin@earthmovers.local
init@123
```

All operator and driver accounts created by admin default to `init@123`, and admin can reset them back to that password.

## API Style

The backend intentionally uses only `GET` and `POST`. Delete and update operations are implemented as POST endpoints such as `/api/admin/delete-driver/:driverId` and `/api/admin/update-vehicle/:vehicleId`.

## Vercel Deployment

This repository includes `vercel.json` and `api/index.js` so Vercel can serve the React build and route `/api/*` requests to the Express backend.

Set these environment variables in Vercel:

```text
MONGODB_URI
JWT_SECRET
IMAGEBB_API_KEY
IMAGE_HOST_URL
CRON_SECRET
```

Vercel cron calls `/api/cron/alerts` every 15 minutes. The local Node server still runs `node-cron` directly.
