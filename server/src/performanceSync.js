function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function updatePerformanceFromAttendance(db, studentDbIds) {
  const ids = Array.from(new Set((studentDbIds || []).map((v) => toInt(v)).filter((v) => v > 0)));
  if (ids.length === 0) return;

  const countsStmt = db.prepare(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status IN ('Present','Late') THEN 1 ELSE 0 END) AS presentCount
     FROM attendance_records
     WHERE student_id = ?`,
  );
  const perfStmt = db.prepare(
    `SELECT internal_marks AS internalMarks,
            assignment_score AS assignmentScore
     FROM performance_records
     WHERE student_id = ?`,
  );
  const upsert = db.prepare(
    `INSERT INTO performance_records (student_id, attendance_percentage, internal_marks, assignment_score, overall_score, updated_at)
     VALUES (?, ?, 0, 0, ?, datetime('now'))
     ON CONFLICT(student_id) DO UPDATE SET
       attendance_percentage=excluded.attendance_percentage,
       overall_score=excluded.overall_score,
       updated_at=excluded.updated_at`,
  );

  ids.forEach((id) => {
    countsStmt.bind([id]);
    countsStmt.step();
    const counts = countsStmt.getAsObject();
    countsStmt.reset();

    const total = toInt(counts.total);
    const presentCount = toInt(counts.presentCount);
    const attendance = total > 0 ? Math.round((presentCount * 100) / total) : 0;

    perfStmt.bind([id]);
    let internal = 0;
    let assignment = 0;
    if (perfStmt.step()) {
      const perf = perfStmt.getAsObject();
      internal = toInt(perf.internalMarks);
      assignment = toInt(perf.assignmentScore);
    }
    perfStmt.reset();

    const overall = Math.round(attendance * 0.2 + internal * 0.5 + assignment * 0.3);
    upsert.run([id, attendance, overall]);
  });

  countsStmt.free();
  perfStmt.free();
  upsert.free();
}

export function syncAllPerformanceFromAttendance(db) {
  const ids = db.exec("SELECT id FROM students")[0]?.values?.map((row) => row[0]) ?? [];
  updatePerformanceFromAttendance(db, ids);
}

