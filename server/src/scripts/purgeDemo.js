import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import { config } from "../config.js";

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

const DEMO_STUDENT_IDS = ["STU-1001", "STU-1002", "STU-1003", "STU-1004", "STU-1005"];

const SQL = await initSqlJs();
const dbFile = readDbFile(config.dbPath);
const db = dbFile ? new SQL.Database(dbFile) : new SQL.Database();

db.run("PRAGMA foreign_keys = ON;");

// Delete seeded demo students (cascades attendance + performance).
db.run(
  `DELETE FROM students WHERE student_id IN (${DEMO_STUDENT_IDS.map(() => "?").join(",")})`,
  DEMO_STUDENT_IDS,
);

// Remove demo student user if it exists.
db.run("DELETE FROM users WHERE email = ?", ["student@campus.edu"]);

// Remove any orphan student_ref links.
db.run(
  `UPDATE users
   SET student_ref = NULL
   WHERE student_ref IS NOT NULL
     AND student_ref NOT IN (SELECT id FROM students)`,
);

writeDbFile(config.dbPath, db);

// eslint-disable-next-line no-console
console.log("Purged demo students:", DEMO_STUDENT_IDS.join(", "));
