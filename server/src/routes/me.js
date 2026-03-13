import express from "express";
import { getDb } from "../db.js";
import { jsonError, jsonOk } from "../http.js";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const meRouter = express.Router();

meRouter.get("/summary", async (req, res) => {
  const studentRef = req.user?.studentRef ?? null;
  if (req.user?.role !== "Student") return jsonError(res, 403, "Forbidden");
  if (!studentRef) return jsonError(res, 400, "Student account is not linked to a student record.");

  const { db } = await getDb();
  const row = db.exec(
    `SELECT s.name,
            s.student_id,
            s.department,
            COALESCE(p.attendance_percentage, 0),
            COALESCE(p.internal_marks, 0),
            COALESCE(p.assignment_score, 0),
            COALESCE(p.overall_score, 0)
     FROM students s
     LEFT JOIN performance_records p ON p.student_id = s.id
     WHERE s.id = ?`,
    [studentRef],
  )[0]?.values?.[0];

  if (!row) return jsonError(res, 404, "Student record not found.");

  const [name, studentId, department, attendancePercentage, internalMarks, assignmentScore, overallScore] = row;
  const breakdownRows = db.exec(
    `SELECT status, COUNT(*) AS c
     FROM attendance_records
     WHERE student_id = ?
     GROUP BY status`,
    [studentRef],
  )[0]?.values ?? [];

  const attendanceBreakdown = { Present: 0, Late: 0, Absent: 0 };
  breakdownRows.forEach(([status, c]) => {
    if (attendanceBreakdown[status] != null) attendanceBreakdown[status] = c;
  });

  return jsonOk(res, {
    name,
    studentId,
    department,
    attendancePercentage,
    internalMarks,
    assignmentScore,
    overallScore,
    attendanceBreakdown,
  });
});

const UpdateEmailSchema = z.object({
  email: z.string().email(),
});

meRouter.patch("/email", async (req, res) => {
  const parsed = UpdateEmailSchema.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, "Invalid email", parsed.error.flatten());

  const { email } = parsed.data;
  const userId = req.user.sub;
  const studentRef = req.user.studentRef;

  const { db, persist } = await getDb();

  try {
    // Check if email is already taken by another user
    const existingRows = db.exec("SELECT id FROM users WHERE email = ? AND id != ?", [email, userId]);
    if (existingRows.length > 0 && existingRows[0].values.length > 0) {
      return jsonError(res, 409, "Email already in use");
    }

    db.run("BEGIN TRANSACTION");
    db.run("UPDATE users SET email = ? WHERE id = ?", [email, userId]);
    if (studentRef) {
      db.run("UPDATE students SET email = ? WHERE id = ?", [email, studentRef]);
    }
    db.run("COMMIT");
    persist();
    return jsonOk(res, { message: "Email updated successfully" });
  } catch (e) {
    try {
      db.run("ROLLBACK");
    } catch (err) {
      // ignore
    }
    return jsonError(res, 500, "Failed to update email", e.message);
  }
});

const UpdatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

meRouter.patch("/password", async (req, res) => {
  const parsed = UpdatePasswordSchema.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, "Invalid request", parsed.error.flatten());

  const { currentPassword, newPassword } = parsed.data;
  const userId = req.user.sub;

  const { db, persist } = await getDb();
  const rows = db.exec("SELECT password_hash FROM users WHERE id = ?", [userId]);
  if (!rows.length || !rows[0].values.length) {
    return jsonError(res, 404, "User not found");
  }

  const passwordHash = rows[0].values[0][0];
  if (!bcrypt.compareSync(currentPassword, passwordHash)) {
    return jsonError(res, 401, "Current password incorrect");
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.run("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);
  persist();
  return jsonOk(res, { message: "Password updated successfully" });
});


