# Veritas Prep

Veritas Prep is a full-stack admissions workflow app with a public marketing site,
student accounts, PDF-based submission intake, credits, meeting scheduling, and an
admin dashboard for managing the full review process.

```text
veritas-prep/
├── client/     React + Vite frontend
├── server/     Express API + LowDB + Supabase integration
└── README.md
```

## Current product surface

- Public landing page, FAQ, pricing, and contact page
- Student signup/login with Supabase auth
- Student dashboard with profile stats, submissions, meetings, and feedback view
- Submission intake for:
  - Activity list review
  - Short essay review
  - Medium essay review
  - Long essay / Common App review
  - 15-minute meeting request
- PDF upload support for written submissions
- Admin dashboard for:
  - submission review
  - credits approval
  - meeting slot creation and booking review
  - student roster and history
  - direct PDF download
- Credits deducted only when services are approved
- Student rescheduling for meetings

## Tech stack

- Frontend: React, React Router, Vite, Tailwind CSS
- Backend: Node.js, Express, JWT auth for admin
- Auth: Supabase Auth for students
- Data:
  - Supabase for student accounts/profiles and storage
  - LowDB JSON file for admin-side operational state still stored locally
- File storage: Supabase Storage

## Local development

You need Node.js 18+.

### 1. Backend

```bash
cd server
npm install
```

Create `server/.env` from `server/.env.example`, then set at minimum:

- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLIENT_ORIGIN=http://localhost:5173`

Run:

```bash
npm run dev
```

The API runs on `http://localhost:4000`.

### 2. Frontend

```bash
cd client
npm install
```

Create `client/.env` from `client/.env.example`, then set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- optional: `VITE_SITE_URL`

Run:

```bash
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api/*` to `http://localhost:4000`.

## Free hosting walkthrough

The simplest free-ish setup for this app is:

1. Frontend on Netlify
2. Backend on Render
3. Auth/storage on Supabase

This keeps the React app static, the API separate, and avoids forcing everything into one host.

### Recommended deployment layout

- Frontend: Netlify free plan
- Backend: Render free web service
- Database/auth/storage: Supabase free plan

### Step 1. Prepare Supabase

In Supabase, make sure you have:

1. The `profiles` and `submissions` tables set up as your app expects.
2. Storage bucket for student submissions.
3. Auth redirect URLs configured:
   - `http://localhost:5173/student/verify`
   - `http://localhost:5173/student/reset-password`
   - your production frontend URLs, for example:
     - `https://your-site.netlify.app/student/verify`
     - `https://your-site.netlify.app/student/reset-password`

### Step 2. Deploy backend to Render

Create a new Render Web Service and point it at the repo.

Use these settings:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Set these environment variables in Render:

- `NODE_ENV=production`
- `PORT=10000`
- `CLIENT_ORIGIN=https://your-site.netlify.app`
- `JWT_SECRET=your-long-random-secret`
- `ADMIN_EMAIL=your-admin-email`
- `ADMIN_PASSWORD=your-admin-password`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- optional later: `RESEND_API_KEY`
- optional later: `EMAIL_FROM`
- optional later: `BUSINESS_EMAIL`

Important:

- Render free web services can sleep when idle.
- Your app still uses `server/veritas.json` for some operational state.
- On free hosting, local disk is not reliable long-term. Before real launch, migrate LowDB-managed data to Supabase/Postgres if you need durable production data.

### Step 3. Deploy frontend to Netlify

Create a new Netlify site from the same repo.

Use these settings:

- Base directory: `client`
- Build command: `npm run build`
- Publish directory: `dist`

Set these environment variables in Netlify:

- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- `VITE_SITE_URL=https://your-site.netlify.app`

After deploy, update the backend Render env:

- `CLIENT_ORIGIN=https://your-site.netlify.app`

### Step 4. Point frontend API calls at your backend

For local development, Vite proxies `/api` to `localhost:4000`.

For production, you need one of these approaches:

1. Put frontend and backend behind the same domain/proxy.
2. Add a Netlify redirect rule from `/api/*` to your Render backend.

Example Netlify redirect:

```text
/api/*  https://your-render-service.onrender.com/api/:splat  200
```

This is included in the `_redirects` file added under `client/public/`.

### Step 5. Final pre-launch checks

Before going live, verify:

1. Student signup and verification work from the deployed frontend URL.
2. Student password reset works from the deployed frontend URL.
3. Student can submit PDF-based services.
4. Admin can log in and review submissions.
5. Meeting slot creation and booking work.
6. Student dashboard reflects updated statuses.
7. Contact page works.

## Important production note

The app currently blends Supabase-backed student data with LowDB-backed admin workflow state.
That is acceptable for local testing, but not ideal for long-term hosting on a free container platform.

Before relying on production data, move these LowDB-backed records into Supabase/Postgres:

- appointments
- appointment slots
- credit requests
- any remaining operational review metadata you care about preserving

## Design notes

The visual system uses parchment, ink navy, and manuscript gold with serif-forward typography
to keep the product feeling editorial rather than generic SaaS. The dashboard intentionally stays
plain and task-oriented so admin workflows remain easy to scan.
