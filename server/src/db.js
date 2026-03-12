import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { syncAllPerformanceFromAttendance } from "./performanceSync.js";

let dbPromise;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readDbFile(dbPath) {
  if (!fs.existsSync(dbPath)) return null;
  return fs.readFileSync(dbPath);
}

function writeDbFile(dbPath, db) {
  const data = db.export();
  ensureDir(path.dirname(dbPath));
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function runMigrations(db) {
  // Minimal schema focused on the frontend pages. Safe to re-run on startup.
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Admin','Student')),
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      face_image_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Present','Late','Absent')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS performance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
      attendance_percentage INTEGER NOT NULL DEFAULT 0,
      internal_marks INTEGER NOT NULL DEFAULT 0,
      assignment_score INTEGER NOT NULL DEFAULT 0,
      overall_score INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // SQLite (and sql.js) doesn't support `ADD COLUMN IF NOT EXISTS`, so we introspect.
  const userCols = db.exec("PRAGMA table_info(users)")[0]?.values ?? [];
  const hasStudentRef = userCols.some((row) => row[1] === "student_ref");
  if (!hasStudentRef) db.run("ALTER TABLE users ADD COLUMN student_ref INTEGER");

  const studentCols = db.exec("PRAGMA table_info(students)")[0]?.values ?? [];
  const hasFaceDescriptor = studentCols.some((row) => row[1] === "face_descriptor");
  if (!hasFaceDescriptor) db.run("ALTER TABLE students ADD COLUMN face_descriptor TEXT");
}

function seed(db) {
  // Keep seeding minimal by default. Demo seed is opt-in via SEED_DEMO=true.
  const seedDemo = Boolean(config.seedDemo);
  const studentsCount = db.exec("SELECT COUNT(*) AS c FROM students")[0]?.values?.[0]?.[0] ?? 0;
  const classesCount = db.exec("SELECT COUNT(*) AS c FROM classes")[0]?.values?.[0]?.[0] ?? 0;

  const hasAdmin = (db.exec("SELECT 1 FROM users WHERE email = ? LIMIT 1", ["admin@campus.edu"])[0]?.values?.length ?? 0) > 0;
  if (!hasAdmin) {
    const adminHash = bcrypt.hashSync("admin123", 10);
    db.run("INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, 'Admin', ?)", [
      "admin@campus.edu",
      adminHash,
      "Admin",
    ]);
  }

  if (seedDemo && classesCount === 0) {
    const stmt = db.prepare("INSERT INTO classes (code, title, department) VALUES (?, ?, ?)");
    [
      ["CSE-3", "Data Structures", "Computer Science"],
      ["ECE-2", "Digital Systems", "Electronics"],
      ["MBA-1", "Business Analytics", "Business Administration"],
      ["ME-2", "Thermodynamics", "Mechanical"],
    ].forEach((row) => {
      stmt.run(row);
    });
    stmt.free();
  }

  if (seedDemo && studentsCount === 0) {
    const insertStudent = db.prepare(
      "INSERT INTO students (student_id, name, department, email, face_image_path) VALUES (?, ?, ?, ?, ?)",
    );
    const sample = [
      ["STU-1001", "Aarav Sharma", "Computer Science", "aarav@campus.edu", null],
      ["STU-1002", "Priya Nair", "Computer Science", "priya@campus.edu", null],
      ["STU-1003", "Rohan Patel", "Electronics", "rohan@campus.edu", null],
      ["STU-1004", "Sneha Iyer", "Business Administration", "sneha@campus.edu", null],
      ["STU-1005", "Kabir Singh", "Mechanical", "kabir@campus.edu", null],
    ];
    sample.forEach((row) => insertStudent.run(row));
    insertStudent.free();

    // Seed performance rows
    const getId = db.prepare("SELECT id FROM students WHERE student_id = ?");
    const perf = db.prepare(
      "INSERT INTO performance_records (student_id, attendance_percentage, internal_marks, assignment_score, overall_score) VALUES (?, ?, ?, ?, ?)",
    );
    const perfRows = [
      ["STU-1001", 96, 88, 92, 91],
      ["STU-1002", 93, 84, 86, 87],
      ["STU-1003", 81, 74, 69, 73],
      ["STU-1004", 88, 79, 81, 80],
      ["STU-1005", 65, 58, 61, 60],
    ];
    perfRows.forEach(([sid, attendance, internal, assignment, overall]) => {
      getId.bind([sid]);
      getId.step();
      const id = getId.getAsObject().id;
      getId.reset();
      perf.run([id, attendance, internal, assignment, overall]);
    });
    getId.free();
    perf.free();

    // Seed attendance records for recent days
    const classId = db.exec("SELECT id FROM classes WHERE code = 'CSE-3'")[0]?.values?.[0]?.[0] ?? null;
    const att = db.prepare(
      "INSERT INTO attendance_records (student_id, class_id, date, time, status) VALUES (?, ?, ?, ?, ?)",
    );
    const studentIds = db.exec("SELECT id FROM students ORDER BY id")[0]?.values?.map((v) => v[0]) ?? [];
    const rows = [
      [studentIds[0], classId, "2026-03-06", "09:02 AM", "Present"],
      [studentIds[1], classId, "2026-03-06", "09:03 AM", "Present"],
      [studentIds[2], classId, "2026-03-06", "09:05 AM", "Late"],
      [studentIds[3], classId, "2026-03-05", "09:01 AM", "Present"],
      [studentIds[4], classId, "2026-03-05", "09:04 AM", "Absent"],
    ];
    rows.forEach((r) => att.run(r));
    att.free();
  }
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs();
      const dbFile = readDbFile(config.dbPath);
      const db = dbFile ? new SQL.Database(dbFile) : new SQL.Database();
      runMigrations(db);
      seed(db);
      // Keep attendance-derived performance in sync on boot (useful for existing DB data).
      syncAllPerformanceFromAttendance(db);
      writeDbFile(config.dbPath, db);

      const persist = () => writeDbFile(config.dbPath, db);
      return { db, persist };
    })();
  }
  return dbPromise;
}
