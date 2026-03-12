# Smart Attendance System

An AI-powered campus attendance management system with real-time **face recognition**, **manual attendance tracking**, and **student performance analytics**.

## Features

- **Face Recognition Attendance** — Camera-based student identification using face-api.js
- **Manual Attendance** — Mark students Present/Late/Absent from a class roster
- **Student Registration** — Enroll students with face images and auto-generate login credentials
- **Performance Analytics** — Charts showing attendance trends, top performers, and at-risk students
- **Class Management** — Create and manage class sections by department
- **Student Portal** — Students can view their own attendance and performance
- **Role-Based Access** — Admin and Student roles with scoped data visibility
- **Email Notifications** — Optional SMTP integration to email temporary passwords

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | React 18, Vite, Tailwind CSS, Recharts          |
| Backend  | Express.js, sql.js (SQLite), JWT authentication |
| AI/ML    | face-api.js (TinyFaceDetector + FaceRecognition)|

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
npm --prefix server install
```

### 2. Configure Environment

```bash
# Copy the example env file
cp server/.env.example server/.env
# Edit server/.env and set JWT_SECRET (and SMTP settings if desired)
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend (http://127.0.0.1:8080)
npm run dev:server

# Terminal 2 — Frontend (http://localhost:5173)
npm run dev
```

### 4. Login

| Role    | Email              | Password  |
| ------- | ------------------ | --------- |
| Admin   | admin@campus.edu   | admin123  |

Student accounts are created automatically when an Admin registers a student.

## Project Structure

```
miniproject/
├── public/
│   └── models/faceapi/      # Face recognition model weights
├── server/
│   ├── src/
│   │   ├── routes/           # Express API routes
│   │   ├── db.js             # SQLite database with migrations & seeding
│   │   ├── auth.js           # JWT middleware
│   │   ├── email.js          # SMTP email transport
│   │   └── index.js          # Server entry point
│   ├── .env.example          # Environment variable template
│   └── data/                 # SQLite database file (auto-created)
├── src/
│   ├── pages/                # Route-level page components
│   ├── components/           # Reusable UI components
│   ├── charts/               # Recharts-based analytics charts
│   ├── layout/               # Dashboard layout with sidebar
│   ├── utils/                # API client, auth context, face-api helpers
│   ├── App.jsx               # Router configuration
│   └── main.jsx              # Application entry point
├── index.html                # HTML entry with SEO meta tags
├── vite.config.js            # Vite configuration with API proxy
├── tailwind.config.js        # Tailwind CSS theme & customization
└── package.json
```

## SMTP Email Configuration (Optional)

To enable emailing temporary passwords to students, configure SMTP in `server/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Smart Attendance <your-email@gmail.com>"
```

Test SMTP via the Admin API: `POST /api/email/test`

## License

This project is for educational purposes.
