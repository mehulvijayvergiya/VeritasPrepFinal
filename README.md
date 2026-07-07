# Veritas Prep

A full-stack admissions consulting platform: a marketing site, a student
application form, and a password-protected reviewer dashboard.

```
veritas-prep/
├── client/     React + Vite + Tailwind frontend
├── server/     Express API + JSON file database
└── README.md
```

## What's included

- **Landing page** — hero, about, services, FAQ, CTA
- **Application form** (`/apply`) — students submit name, email, target
  colleges, essay, activities list, and notes, with server-side validation
- **Confirmation page** shown after a successful submission
- **Reviewer sign-in** (`/admin/login`) — JWT-based auth
- **Reviewer dashboard** (`/admin`) — list all submissions, filter by status,
  read the full essay/activities/notes, set status (pending / in review /
  completed), and leave reviewer notes
- **API** — `POST /api/submissions` (public), `GET/PATCH /api/submissions`
  and `/api/submissions/:id` (protected), `POST /api/auth/login`

## Tech stack

- **Frontend:** React 18, React Router, Tailwind CSS, Vite
- **Backend:** Node.js, Express, JWT (`jsonwebtoken`), `bcryptjs`
- **Database:** [lowdb](https://github.com/typicat/lowdb) — a JSON-file
  database. No native build step, no external service to set up. Good for
  an MVP; see "Growing past the MVP" below for swapping in Postgres/Mongo
  later without touching the frontend.

## Quick start (local development)

You'll need Node.js 18+ installed.

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and set:
- `JWT_SECRET` — any long random string (this signs admin login sessions)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your reviewer login. These are only
  used to seed the first admin account on the very first run.

```bash
npm run dev
```

The API runs at `http://localhost:4000`. A `veritas.json` file is created
automatically in `server/` on first run — this is your database.

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The site runs at `http://localhost:5173`. The Vite dev server proxies
`/api/*` requests to `http://localhost:4000`, so both must be running.

### 3. Try it out

- Visit `http://localhost:5173` and click **Submit Your Application**
- Fill out and submit the form
- Visit `http://localhost:5173/admin/login` and sign in with the
  `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `server/.env`
- You'll see the submission in the dashboard — click it, change its status,
  add reviewer notes, and save

## Deployment

### Frontend → Vercel or Netlify

```bash
cd client
npm run build
```

This outputs a static `dist/` folder. Deploy it to Vercel or Netlify as you
would any Vite app. Set an environment variable or rewrite rule so `/api/*`
requests are proxied to your deployed backend URL (both platforms support
this via `vercel.json` rewrites or Netlify's `_redirects` file).

### Backend → Render or Fly.io

1. Push the `server/` folder to its own repo (or deploy the monorepo and
   point the platform at `server/` as the root directory)
2. Set the environment variables from `.env.example` in your platform's
   dashboard: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and
   `CLIENT_ORIGIN` (your deployed frontend URL, so CORS allows it)
3. Start command: `npm start`

**Important:** `veritas.json` lives on the server's local disk. Render and
Fly.io both reset local disk on redeploy unless you attach a persistent
volume — do that, or migrate to a real database (see below) before you have
real student data you can't afford to lose.

## Growing past the MVP

The codebase is intentionally organized so you can swap pieces without a
rewrite:

- **Real database:** replace the contents of `server/config/db.js` and
  `server/models/Submission.js` with a Postgres (e.g. via `pg` or Prisma)
  or MongoDB (via Mongoose) implementation. The controllers and routes
  don't know or care how `Submission.create/findAll/findById/updateStatus`
  are implemented underneath.
- **AI feedback:** the submission model already has a `status` and
  `reviewer_notes` field. A natural next step is a background job that
  calls an AI review endpoint when a submission is created and populates a
  new `ai_feedback` field for the reviewer to start from — add it as a new
  column/field and a new controller action, no schema migration tooling
  required since it's a JSON store today.
- **File uploads (PDF essays):** add `multer` to the Express app and a new
  `POST /api/submissions/:id/attachment` route; store the file path on the
  submission record.
- **Email notifications:** call a transactional email provider (Resend,
  Postmark, SendGrid) from inside `Submission.create` in
  `submissionsController.js` after a successful save.

## Design notes

The visual identity is built around the pen-nib mark in the logo: navy ink,
manuscript gold, and a warm parchment background, with a "marginalia"
motif (the small italic notes beside the hero essay excerpt) standing in
for the founder's actual review process — that's the one signature visual
element, kept deliberately restrained everywhere else. Typefaces are
Fraunces (display/serif), Public Sans (body), and IBM Plex Mono (labels
and data), loaded from Google Fonts in `client/index.html`.
