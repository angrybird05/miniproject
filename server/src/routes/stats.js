import express from "express";
import { getDb } from "../db.js";
import { jsonOk } from "../http.js";

export const statsRouter = express.Router();

statsRouter.get("/summary", async (req, res) => {
  const { db } = await getDb();

  const totalStudents = db.exec("SELECT COUNT(*) FROM students")[0]?.values?.[0]?.[0] ?? 0;
  const totalClasses = db.exec("SELECT COUNT(*) FROM classes")[0]?.values?.[0]?.[0] ?? 0;
  const attendancePercentage = db.exec("SELECT AVG(attendance_percentage) FROM performance_records")[0]?.values?.[0]?.[0] ?? 0;
  const avgPerformance = db.exec("SELECT AVG(overall_score) FROM performance_records")[0]?.values?.[0]?.[0] ?? 0;

  return jsonOk(res, {
    totalStudents,
    totalClasses,
    attendancePercentage: Number(attendancePercentage.toFixed(1)),
    averageStudentPerformance: Number(avgPerformance.toFixed(1)),
  });
});
