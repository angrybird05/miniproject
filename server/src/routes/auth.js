import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "../db.js";
import { jsonError, jsonOk } from "../http.js";
import { signToken } from "../auth.js";

export const authRouter = express.Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["Admin", "Student"]).optional(),
});

authRouter.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, "Invalid request", parsed.error.flatten());

  const { email, password, role } = parsed.data;
  const { db } = await getDb();
  const stmt = db.prepare("SELECT id, email, password_hash, role, name, student_ref FROM users WHERE email = ?");
  stmt.bind([email]);
  const hasRow = stmt.step();
  if (!hasRow) {
    stmt.free();
    return jsonError(res, 401, "Invalid email or password");
  }
  const row = stmt.getAsObject();
  stmt.free();

  if (role && row.role !== role) return jsonError(res, 401, "Role mismatch");
  const ok = bcrypt.compareSync(password, row.password_hash);
  if (!ok) return jsonError(res, 401, "Invalid email or password");

  const studentRef = row.student_ref ?? null;
  const token = signToken({
    sub: row.id,
    role: row.role,
    email: row.email,
    name: row.name || "",
    studentRef,
  });
  return jsonOk(res, {
    token,
    user: { id: row.id, email: row.email, role: row.role, name: row.name || "", studentRef },
  });
});
