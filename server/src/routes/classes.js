import express from "express";
import { z } from "zod";
import { getDb } from "../db.js";
import { jsonError, jsonOk } from "../http.js";

export const classesRouter = express.Router();

classesRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const where = [];
  const params = [];
  if (q) {
    where.push("(lower(code) LIKE '%' || ? || '%' OR lower(title) LIKE '%' || ? || '%' OR lower(department) LIKE '%' || ? || '%')");
    params.push(q, q, q);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { db } = await getDb();
  const rows = db.exec(
    `SELECT id, code, title, department, created_at AS createdAt
     FROM classes
     ${whereSql}
     ORDER BY id DESC`,
    params,
  );
  const data =
    rows[0]?.values?.map(([id, code, title, department, createdAt]) => ({
      id,
      code,
      title,
      department,
      createdAt,
    })) ?? [];
  return jsonOk(res, data);
});

const CreateSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  department: z.string().min(1),
});

classesRouter.post("/", async (req, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, "Invalid request", parsed.error.flatten());

  const { db, persist } = await getDb();
  try {
    db.run("INSERT INTO classes (code, title, department) VALUES (?, ?, ?)", [
      parsed.data.code.trim(),
      parsed.data.title.trim(),
      parsed.data.department.trim(),
    ]);
    const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    persist();
    return jsonOk(res, { id });
  } catch (e) {
    return jsonError(res, 409, "Class already exists", e?.message || String(e));
  }
});

