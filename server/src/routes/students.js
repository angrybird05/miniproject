import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "../config.js";
import { getDb } from "../db.js";
import { jsonError, jsonOk } from "../http.js";
import { isEmailConfigured, sendTempPasswordEmail } from "../email.js";

export const studentsRouter = express.Router();

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(config.uploadDir, "faces");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 1 * 1024 * 1024 } // 1MB limit
});

const StudentSchema = z.object({
  name: z.string().min(1),
  studentId: z.string().min(1),
  department: z.string().min(1),
  email: z.string().email(),
});

studentsRouter.get("/", async (req, res) => {
  const { db } = await getDb();
  const q = String(req.query.q || "").toLowerCase();
  const rows = db.exec(
    q
      ? `SELECT id, student_id AS studentId, name, department, email, face_image_path AS faceImagePath, created_at AS createdAt
         FROM students
         WHERE lower(name) LIKE '%' || ? || '%' OR lower(student_id) LIKE '%' || ? || '%' OR lower(email) LIKE '%' || ? || '%'
         ORDER BY id DESC`
      : `SELECT id, student_id AS studentId, name, department, email, face_image_path AS faceImagePath, created_at AS createdAt
         FROM students
         ORDER BY id DESC`,
    q ? [q, q, q] : [],
  );
  const data = rows[0]?.values?.map(([id, studentId, name, department, email, faceImagePath, createdAt]) => ({
    id,
    studentId,
    name,
    department,
    email,
    faceImagePath,
    createdAt,
  })) ?? [];
  return jsonOk(res, data);
});

studentsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return jsonError(res, 400, "Invalid student id");
  const { db } = await getDb();
  const stmt = db.prepare(
    "SELECT id, student_id AS studentId, name, department, email, face_image_path AS faceImagePath, created_at AS createdAt FROM students WHERE id = ?",
  );
  stmt.bind([id]);
  const ok = stmt.step();
  if (!ok) {
    stmt.free();
    return jsonError(res, 404, "Student not found");
  }
  const row = stmt.getAsObject();
  stmt.free();
  return jsonOk(res, row);
});

// Regenerate a student's temp password so admin can share it / resend.
studentsRouter.post("/:studentId/reset-password", async (req, res) => {
  const studentId = String(req.params.studentId || "").trim();
  if (!studentId) return jsonError(res, 400, "Missing studentId");

  const { db, persist } = await getDb();
  const studentRow =
    db.exec("SELECT id, email, name FROM students WHERE student_id = ? LIMIT 1", [studentId])[0]?.values?.[0] ?? null;
  if (!studentRow) return jsonError(res, 404, "Student not found");
  const [studentDbId, email, name] = studentRow;

  const existing = db.exec(
    "SELECT id FROM users WHERE role = 'Student' AND (student_ref = ? OR email = ?) LIMIT 1",
    [studentDbId, email],
  )[0]?.values?.[0]?.[0] ?? null;

  const tempPassword = crypto.randomBytes(7).toString("base64url");
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  let created = false;
  if (existing == null) {
    db.run(
      "INSERT INTO users (email, password_hash, role, name, student_ref) VALUES (?, ?, 'Student', ?, ?)",
      [email, passwordHash, name, studentDbId],
    );
    created = true;
  } else {
    db.run("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, existing]);
  }

  const studentUser = { created, email, tempPassword, emailSent: false, emailError: "" };
  if (isEmailConfigured()) {
    try {
      const mail = await sendTempPasswordEmail({ to: email, studentName: name, tempPassword });
      studentUser.emailSent = Boolean(mail.sent);
      if (!mail.sent) studentUser.emailError = mail.error || "Failed to send email";
    } catch (e) {
      studentUser.emailSent = false;
      studentUser.emailError = e?.message || "Failed to send email";
    }
  } else {
    studentUser.emailSent = false;
    studentUser.emailError =
      "SMTP is not configured. Create `server/.env` (copy from `.env.example`) and set SMTP_HOST/SMTP_FROM (and usually SMTP_USER/SMTP_PASS).";
  }

  persist();
  return jsonOk(res, { studentUser });
});

studentsRouter.post("/", (req, res, next) => {
  upload.single("faceImage")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return jsonError(res, 400, "Image too large. Maximum size is 1MB.");
      }
      return jsonError(res, 400, err.message);
    } else if (err) {
      return jsonError(res, 500, "Upload error", err.message);
    }
    next();
  });
}, async (req, res) => {
  const parsed = StudentSchema.safeParse({
    name: req.body.name,
    studentId: req.body.studentId,
    department: req.body.department,
    email: req.body.email,
  });
  if (!parsed.success) return jsonError(res, 400, "Invalid request", parsed.error.flatten());

  let faceDescriptor = null;
  if (req.body.faceDescriptor) {
    try {
      const parsedJson = JSON.parse(req.body.faceDescriptor);
      const ok =
        Array.isArray(parsedJson) &&
        parsedJson.length === 128 &&
        parsedJson.every((n) => typeof n === "number" && Number.isFinite(n));
      if (!ok) return jsonError(res, 400, "Invalid faceDescriptor. Expected 128-length numeric array.");
      faceDescriptor = JSON.stringify(parsedJson);
    } catch {
      return jsonError(res, 400, "Invalid faceDescriptor JSON.");
    }
  }

  // Return a path that the frontend can request via `/uploads/...`.
  const faceImagePath = req.file
    ? path.relative(config.uploadDir, req.file.path).replace(/\\/g, "/")
    : null;
  const { db, persist } = await getDb();
  try {
    const stmt = db.prepare(
      "INSERT INTO students (student_id, name, department, email, face_image_path, face_descriptor) VALUES (?, ?, ?, ?, ?, ?)",
    );
    stmt.run([
      parsed.data.studentId,
      parsed.data.name,
      parsed.data.department,
      parsed.data.email,
      faceImagePath,
      faceDescriptor,
    ]);
    stmt.free();

    const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    // Also create a default performance row.
    db.run(
      "INSERT OR IGNORE INTO performance_records (student_id, attendance_percentage, internal_marks, assignment_score, overall_score) VALUES (?, 0, 0, 0, 0)",
      [id],
    );

    // Create a Student login automatically (use student's email).
    const existingUser = (db.exec("SELECT 1 FROM users WHERE email = ? LIMIT 1", [parsed.data.email])[0]?.values?.length ?? 0) > 0;
    let studentUser = { created: false };
    if (!existingUser) {
      const tempPassword = crypto.randomBytes(7).toString("base64url"); // ~9-10 chars
      const passwordHash = bcrypt.hashSync(tempPassword, 10);
      db.run(
        "INSERT INTO users (email, password_hash, role, name, student_ref) VALUES (?, ?, 'Student', ?, ?)",
        [parsed.data.email, passwordHash, parsed.data.name, id],
      );
      // Return tempPassword to the admin so they can share it if SMTP isn't configured / email delivery fails.
      studentUser = { created: true, email: parsed.data.email, tempPassword };

      // Send password email if SMTP is configured. If sending fails, return the temp password so admin can share.
      if (isEmailConfigured()) {
        try {
          const mail = await sendTempPasswordEmail({
            to: parsed.data.email,
            studentName: parsed.data.name,
            tempPassword,
          });
          studentUser.emailSent = mail.sent;
          studentUser.messageId = mail.messageId;
          if (!mail.sent) {
            studentUser.emailError = mail.error || "Failed to send email";
          }
        } catch (e) {
          studentUser.emailSent = false;
          studentUser.emailError = e?.message || "Failed to send email";
        }
      } else {
        studentUser.emailSent = false;
        studentUser.emailError =
          "SMTP is not configured. Create `server/.env` (copy from `.env.example`) and set SMTP_HOST/SMTP_FROM (and SMTP_USER/SMTP_PASS).";
      }
    }
    persist();
    return jsonOk(res, { id, studentUser });
  } catch (e) {
    return jsonError(res, 409, "Student already exists", String(e?.message || e));
  }
});
