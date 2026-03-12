import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { authMiddleware, requireRole } from "./auth.js";
import { jsonOk } from "./http.js";
import { getDb } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { studentsRouter } from "./routes/students.js";
import { attendanceRouter } from "./routes/attendance.js";
import { performanceRouter } from "./routes/performance.js";
import { analyticsRouter } from "./routes/analytics.js";
import { statsRouter } from "./routes/stats.js";
import { faceRouter } from "./routes/face.js";
import { meRouter } from "./routes/me.js";
import { emailRouter } from "./routes/email.js";
import { classesRouter } from "./routes/classes.js";

import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowedOrigins = String(config.corsOrigin || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      return cb(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));

// Ensure DB initializes on boot.
await getDb();

app.get("/health", (req, res) => jsonOk(res, { status: "ok" }));

app.use("/api/auth", authRouter);

// Everything below requires auth.
app.use("/api", authMiddleware);
app.use("/api/me", meRouter);
app.use("/api/stats", requireRole("Admin"), statsRouter);
app.use("/api/classes", requireRole("Admin"), classesRouter);
app.use("/api/students", requireRole("Admin"), studentsRouter);
app.use("/api/email", requireRole("Admin"), emailRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/performance", performanceRouter);
app.use("/api/analytics", requireRole("Admin"), analyticsRouter);
app.use("/api/face", requireRole("Admin"), faceRouter);

// Serve uploaded images (face images). Keep it simple for the prototype.
app.use("/uploads", express.static(config.uploadDir));

// Serve frontend if running in combined mode (production)
const clientBuildPath = path.join(__dirname, "../../dist");
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

const host = process.env.HOST || "0.0.0.0";
app.listen(config.port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://${host}:${config.port}`);
});
