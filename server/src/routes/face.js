import express from "express";
import { getDb } from "../db.js";
import { jsonOk } from "../http.js";

export const faceRouter = express.Router();

// Returns only students that have a stored face embedding (descriptor).
faceRouter.get("/roster", async (req, res) => {
  const { db } = await getDb();
  const rows = db.exec(
    `SELECT id, student_id, name, department, face_descriptor
     FROM students
     WHERE face_descriptor IS NOT NULL
     ORDER BY id DESC`,
  );

  const data =
    rows[0]?.values
      ?.map(([id, studentId, name, department, descriptor]) => {
        try {
          const parsed = JSON.parse(descriptor);
          if (!Array.isArray(parsed) || parsed.length !== 128) return null;
          return { id, studentId, name, department, descriptor: parsed };
        } catch {
          return null;
        }
      })
      .filter(Boolean) ?? [];

  return jsonOk(res, data);
});
