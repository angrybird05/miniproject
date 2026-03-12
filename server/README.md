# Smart Attendance Backend

Express + file-backed SQLite (via `sql.js`) API for:
- Auth (JWT)
- Student registration (including face image upload metadata)
- Attendance capture + records
- Performance records
- Analytics summary/charts

## Run

1. Install deps: `npm --prefix server install`
2. Configure env: edit `server/.env` (copy from `.env.example` if missing) and set `JWT_SECRET`
3. Start: `npm --prefix server run dev`

Server listens on `http://127.0.0.1:8080` by default.

## Email (SMTP) for Temporary Passwords

When an Admin registers a student, the backend generates a temporary password and will email it to the student's
email address if SMTP is configured.

Set these in `server/.env`:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
- `SMTP_USER`, `SMTP_PASS`
- `SMTP_FROM`

Common setups:

- Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true` (use a Gmail App Password)
- Office365: `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=true`

You can test SMTP via `POST /api/email/test` (Admin only).

## Default admin

- Email: `admin@campus.edu`
- Password: `admin123`
- Role: `Admin`

## Student Accounts

When an Admin registers a student via `POST /api/students`, the backend automatically creates a `Student` user
for that student's email with a generated temporary password (returned in the API response).

## API

- `POST /api/auth/login`
- `GET /api/me/summary` (Student only)
- `GET /api/stats/summary` (Admin only)
- `GET /api/students` `POST /api/students` `GET /api/students/:id` (Admin only)
- `GET /api/face/roster` (Admin only)
- `GET /api/attendance/records` (Admin all, Student scoped) · `POST /api/attendance/capture` (Admin only)
- `GET /api/performance` (Admin all, Student scoped) · `POST /api/performance/:studentId` (Admin recommended)
- `GET /api/analytics` (Admin only)
