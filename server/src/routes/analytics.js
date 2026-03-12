import express from "express";
import { getDb } from "../db.js";
import { jsonOk } from "../http.js";

export const analyticsRouter = express.Router();

analyticsRouter.get("/", async (req, res) => {
  const { db } = await getDb();

  // Monthly series from attendance + performance snapshots. For demo purposes we synthesize months.
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const perfAvg = db.exec("SELECT AVG(overall_score) FROM performance_records")[0]?.values?.[0]?.[0] ?? 0;
  const attendanceAvg = db.exec("SELECT AVG(attendance_percentage) FROM performance_records")[0]?.values?.[0]?.[0] ?? 0;

  const attendanceVsPerformance = months.map((m, i) => ({
    month: m,
    attendance: Math.max(40, Math.min(100, Math.round(attendanceAvg - 6 + i * 2))),
    performance: Math.max(40, Math.min(100, Math.round(perfAvg - 10 + i * 3))),
  }));

  const topRows = db.exec(
    `SELECT s.name, p.overall_score
     FROM performance_records p
     JOIN students s ON s.id = p.student_id
     ORDER BY p.overall_score DESC
     LIMIT 5`,
  );
  const topPerformers =
    topRows[0]?.values?.map(([name, score]) => ({ name: String(name).split(" ")[0], score })) ?? [];

  const lowRows = db.exec(
    `SELECT s.name, p.attendance_percentage
     FROM performance_records p
     JOIN students s ON s.id = p.student_id
     ORDER BY p.attendance_percentage ASC
     LIMIT 5`,
  );
  const lowAttendanceStudents =
    lowRows[0]?.values?.map(([name, attendance]) => ({ name: String(name).split(" ")[0], attendance })) ?? [];

  const monthlyPerformanceTrend = months.map((m, i) => ({
    month: m,
    score: Math.max(40, Math.min(100, Math.round(perfAvg - 12 + i * 3))),
  }));

  return jsonOk(res, {
    attendanceVsPerformance,
    topPerformers,
    lowAttendanceStudents,
    monthlyPerformanceTrend,
  });
});
