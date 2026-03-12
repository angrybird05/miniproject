import express from "express";
import { getDb } from "../db.js";
import { jsonError, jsonOk } from "../http.js";

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

