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

async function clearAllStudents() {
  const SQL = await initSqlJs();
  const dbFile = readDbFile(config.dbPath);
  
  if (!dbFile) {
    console.log("Database file not found at:", config.dbPath);
    return;
  }

  const db = new SQL.Database(dbFile);
  db.run("PRAGMA foreign_keys = ON;");

  try {
    // Delete all students. Cascading handles attendance_records and performance_records.
    const result = db.exec("SELECT COUNT(*) as count FROM students");
    const count = result[0]?.values[0][0] || 0;
    
    db.run("DELETE FROM students;");
    
    // Also clear any student users from the users table (non-Admin)
    db.run("DELETE FROM users WHERE role = 'Student';");
    
    // Reset student references in users table
    db.run("UPDATE users SET student_ref = NULL;");

    writeDbFile(config.dbPath, db);
    console.log(`Successfully removed ${count} students and all associated records.`);
    
    // Clean up face images if they exist
    if (fs.existsSync(config.uploadDir)) {
      const files = fs.readdirSync(config.uploadDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(config.uploadDir, file));
        }
      }
      console.log("Cleared student face images folder.");
    }

  } catch (error) {
    console.error("Error clearing students:", error);
  }
}

clearAllStudents();
