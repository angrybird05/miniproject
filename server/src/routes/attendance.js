import express from "express";
import { z } from "zod";
import { getDb } from "../db.js";
import { jsonError, jsonOk } from "../http.js";
import { requireRole } from "../auth.js";
import { updatePerformanceFromAttendance } from "../performanceSync.js";

export const attendanceRouter = express.Router();
const COOLDOWN_HOURS = 4;

attendanceRouter.get("/records", async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const date = String(req.query.date || "");
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)));
  const offset = (page - 1) * pageSize;

  const where = [];
  const params = [];
  if (req.user?.role !== "Admin") {
    const studentRef = req.user?.studentRef ?? null;
    if (!studentRef) return jsonError(res, 400, "Student account is not linked to a student record.");
    where.push("a.student_id = ?");
    params.push(studentRef);
  }
  if (q) {
    where.push("(lower(s.name) LIKE '%' || ? || '%' OR lower(s.student_id) LIKE '%' || ? || '%' OR lower(c.code) LIKE '%' || ? || '%')");
    params.push(q, q, q);
  }
  if (date) {
    where.push("a.date = ?");
    params.push(date);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { db } = await getDb();
  const total = db.exec(
    `SELECT COUNT(*) AS c
     FROM attendance_records a
     JOIN students s ON s.id = a.student_id
     LEFT JOIN classes c ON c.id = a.class_id
     ${whereSql}`,
    params,
  )[0]?.values?.[0]?.[0] ?? 0;

  const rows = db.exec(
    `SELECT a.id, s.name, s.student_id, c.code, a.date, a.time, a.status
     FROM attendance_records a
     JOIN students s ON s.id = a.student_id
     LEFT JOIN classes c ON c.id = a.class_id
     ${whereSql}
     ORDER BY a.date DESC, a.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  const data = rows[0]?.values?.map(([id, name, studentId, classCode, d, time, status]) => ({
    id,
    name,
    studentId,
    classCode: classCode || null,
    date: d,
    time,
    status,
  })) ?? [];

  return jsonOk(res, { page, pageSize, total, data });
});

const CaptureSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1),
  date: z.string().min(4).optional(),
  time: z.string().min(3).optional(),
  status: z.enum(["Present", "Late"]).optional(),
  classCode: z.string().min(1),
});

attendanceRouter.post("/capture", requireRole("Admin"), async (req, res) => {
  const parsed = CaptureSchema.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, "Invalid request", parsed.error.flatten());

  const date = parsed.data.date || new Date().toISOString().slice(0, 10);
  const time =
    parsed.data.time ||
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const status = parsed.data.status || "Present";
  const classCode = parsed.data.classCode;

  const { db, persist } = await getDb();
  const classId = db.exec("SELECT id FROM classes WHERE code = ?", [classCode])[0]?.values?.[0]?.[0] ?? null;
  if (classId == null) return jsonError(res, 404, "Class not found");

  const idStmt = db.prepare("SELECT id FROM students WHERE student_id = ?");
  const insert = db.prepare(
    "INSERT INTO attendance_records (student_id, class_id, date, time, status) VALUES (?, ?, ?, ?, ?)",
  );
  const recentForClass = db.prepare(
    `SELECT created_at, status
     FROM attendance_records
     WHERE student_id = ?
       AND class_id = ?
       AND created_at >= datetime('now', ?)
     ORDER BY created_at DESC
     LIMIT 1`,
  );

  const inserted = [];
  const insertedDbIds = [];
  const skipped = [];
  const notFound = [];
  const seen = new Set();

  parsed.data.studentIds.forEach((sid) => {
    if (seen.has(sid)) return;
    seen.add(sid);

    idStmt.bind([sid]);
    const ok = idStmt.step();
    if (!ok) {
      idStmt.reset();
      notFound.push(sid);
      return;
    }
    const id = idStmt.getAsObject().id;
    idStmt.reset();

    const cooldownArg = `-${COOLDOWN_HOURS} hours`;
    let recent = null;
    recentForClass.bind([id, classId, cooldownArg]);
    if (recentForClass.step()) recent = recentForClass.getAsObject();
    recentForClass.reset();

    if (recent?.created_at) {
      skipped.push({ studentId: sid, lastMarkedAt: recent.created_at, lastStatus: recent.status });
      return;
    }

    insert.run([id, classId, date, time, status]);
    inserted.push(sid);
    insertedDbIds.push(id);
  });
  idStmt.free();
  insert.free();
  recentForClass.free();

  updatePerformanceFromAttendance(db, insertedDbIds);
  persist();

  return jsonOk(res, {
    recognizedCount: inserted.length,
    recognized: inserted,
    skippedCount: skipped.length,
    skipped,
    notFoundCount: notFound.length,
    notFound,
    cooldownHours: COOLDOWN_HOURS,
  });
});

const ManualMarkSchema = z.object({
  classCode: z.string().min(1),
  date: z.string().min(4).optional(),
  time: z.string().min(3).optional(),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["Present", "Late", "Absent"]),
      }),
    )
    .min(1),
});

// Admin-only manual attendance marking (no camera).
attendanceRouter.post("/mark", requireRole("Admin"), async (req, res) => {
  const parsed = ManualMarkSchema.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, "Invalid request", parsed.error.flatten());

  const date = parsed.data.date || new Date().toISOString().slice(0, 10);
  const time =
    parsed.data.time ||
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const { db, persist } = await getDb();

  const classId =
    db.exec("SELECT id FROM classes WHERE code = ?", [parsed.data.classCode])[0]?.values?.[0]?.[0] ?? null;
  if (classId == null) return jsonError(res, 404, "Class not found");

  const idStmt = db.prepare("SELECT id FROM students WHERE student_id = ?");
  const insert = db.prepare(
    "INSERT INTO attendance_records (student_id, class_id, date, time, status) VALUES (?, ?, ?, ?, ?)",
  );
  const recent = db.prepare(
    `SELECT created_at, status
     FROM attendance_records
     WHERE student_id = ?
       AND class_id = ?
       AND created_at >= datetime('now', ?)
     ORDER BY created_at DESC
     LIMIT 1`,
  );

  const inserted = [];
  const insertedDbIds = [];
  const skipped = [];
  const notFound = [];

  // Deduplicate by studentId; last status wins.
  const byStudent = new Map();
  parsed.data.records.forEach((r) => {
    byStudent.set(r.studentId, r.status);
  });

  for (const [studentId, status] of byStudent.entries()) {
    idStmt.bind([studentId]);
    const ok = idStmt.step();
    if (!ok) {
      idStmt.reset();
      notFound.push(studentId);
      continue;
    }
    const id = idStmt.getAsObject().id;
    idStmt.reset();

    const cooldownArg = `-${COOLDOWN_HOURS} hours`;
    recent.bind([id, classId, cooldownArg]);
    let recentRow = null;
    if (recent.step()) recentRow = recent.getAsObject();
    recent.reset();

    if (recentRow?.created_at) {
      skipped.push({ studentId, lastMarkedAt: recentRow.created_at, lastStatus: recentRow.status });
      continue;
    }

    insert.run([id, classId, date, time, status]);
    inserted.push({ studentId, status });
    insertedDbIds.push(id);
  }

  idStmt.free();
  insert.free();
  recent.free();

  updatePerformanceFromAttendance(db, insertedDbIds);
  persist();

  return jsonOk(res, {
    insertedCount: inserted.length,
    inserted,
    skippedCount: skipped.length,
    skipped,
    notFoundCount: notFound.length,
    notFound,
    cooldownHours: COOLDOWN_HOURS,
  });
});
