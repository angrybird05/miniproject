import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");

// Load env vars from `server/.env` regardless of the process working directory.
dotenv.config({ path: path.resolve(serverRoot, ".env") });
// Optional local overrides (not required).
dotenv.config({ path: path.resolve(serverRoot, ".env.local") });

function resolveFromServerRoot(value, fallback) {
  const raw = value || fallback;
  if (path.isAbsolute(raw)) return raw;
  // Treat relative paths as relative to the `server/` folder, not process cwd.
  return path.resolve(serverRoot, raw);
}

export const config = {
  port: Number(process.env.PORT || 8080),
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  dbPath: resolveFromServerRoot(process.env.DB_PATH, "./data/app.sqlite"),
  uploadDir: resolveFromServerRoot(process.env.UPLOAD_DIR, "./uploads"),
  corsOrigin:
    process.env.CORS_ORIGIN || "http://127.0.0.1:5173,http://localhost:5173",
  seedDemo: String(process.env.SEED_DEMO || "").toLowerCase() === "true",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: process.env.SMTP_PORT || "587",
  // If omitted, we auto-pick based on port (465 => true).
  smtpSecure: process.env.SMTP_SECURE || "",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  smtpRequireTls: process.env.SMTP_REQUIRE_TLS || "",
  smtpTlsRejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "",
  smtpDebug: process.env.SMTP_DEBUG || "",
};
