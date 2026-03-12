import express from "express";
import { z } from "zod";
import { getDb } from "../db.js";
import { jsonError, jsonOk } from "../http.js";
import { requireRole } from "../auth.js";

export const performanceRouter = express.Router();

performanceRouter.get("/", async (req, res) => {
  const { db } = await getDb();
  const isAdmin = req.user?.role === "Admin";
  const studentRef = req.user?.studentRef ?? null;
  if (!isAdmin && !studentRef) return jsonError(res, 400, "Student account is not linked to a student record.");

  const rows = db.exec(
    `SELECT s.name,
            s.student_id,
            p.attendance_percentage,
            p.internal_marks,
            p.assignment_score,
            p.overall_score
     FROM students s
     LEFT JOIN performance_records p ON p.student_id = s.id
     ${isAdmin ? "" : "WHERE s.id = ?"}
     ORDER BY p.overall_score DESC, s.id ASC`,
    isAdmin ? [] : [studentRef],
  );
  const data = rows[0]?.values?.map(([name, studentId, attendance, internalMarks, assignmentScore, overall]) => ({
    name,
    studentId,
    attendancePercentage: attendance ?? 0,
    internalMarks: internalMarks ?? 0,
    assignmentScore: assignmentScore ?? 0,
    overallPerformanceScore: overall ?? 0,
  })) ?? [];
  return jsonOk(res, data);
});

const UpdateSchema = z.object({
  attendancePercentage: z.number().int().min(0).max(100).optional(),
  internalMarks: z.number().int().min(0).max(100).optional(),
  assignmentScore: z.number().int().min(0).max(100).optional(),
});

performanceRouter.post("/:studentId", requireRole("Admin"), async (req, res) => {
  const sid = String(req.params.studentId || "");
  if (!sid) return jsonError(res, 400, "Missing studentId");

  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, "Invalid request", parsed.error.flatten());

  const { db, persist } = await getDb();
  const studentRow = db.exec("SELECT id FROM students WHERE student_id = ?", [sid])[0]?.values?.[0]?.[0];
  if (!studentRow) return jsonError(res, 404, "Student not found");

  // Fetch existing
  const existing = db.exec(
    "SELECT attendance_percentage, internal_marks, assignment_score FROM performance_records WHERE student_id = ?",
    [studentRow],
  )[0]?.values?.[0] ?? [0, 0, 0];

  const attendance = parsed.data.attendancePercentage ?? existing[0] ?? 0;
  const internal = parsed.data.internalMarks ?? existing[1] ?? 0;
  const assignment = parsed.data.assignmentScore ?? existing[2] ?? 0;
  const overall = Math.round(attendance * 0.2 + internal * 0.5 + assignment * 0.3);

  db.run(
    `INSERT INTO performance_records (student_id, attendance_percentage, internal_marks, assignment_score, overall_score, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(student_id) DO UPDATE SET
       attendance_percentage=excluded.attendance_percentage,
       internal_marks=excluded.internal_marks,
       assignment_score=excluded.assignment_score,
       overall_score=excluded.overall_score,
       updated_at=excluded.updated_at`,
    [studentRow, attendance, internal, assignment, overall],
  );
  persist();
  return jsonOk(res, { studentId: sid, overall });
});
