import nodemailer from "nodemailer";
import { config } from "./config.js";

let transporterPromise;

function isTruthy(value) {
  return String(value || "").trim().length > 0;
}

function parseBool(value, fallback) {
  if (!isTruthy(value)) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

function parsePort(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildTransportOptions() {
  const host = config.smtpHost;
  const port = parsePort(config.smtpPort, 587);
  const secure = parseBool(config.smtpSecure, port === 465);
  const user = config.smtpUser;
  const pass = config.smtpPass;
  const requireTLS = parseBool(config.smtpRequireTls, false);
  const rejectUnauthorized = parseBool(config.smtpTlsRejectUnauthorized, true);
  const debug = parseBool(config.smtpDebug, false);

  const opts = {
    host,
    port,
    secure,
    // Avoid long hangs on misconfigured SMTP.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
  if (isTruthy(user) && isTruthy(pass)) {
    opts.auth = { user, pass };
  }
  if (requireTLS) {
    opts.requireTLS = true;
  }
  if (!rejectUnauthorized) {
    // Only use for local/testing SMTP or unusual cert setups.
    opts.tls = { rejectUnauthorized: false };
  }
  if (debug) {
    opts.logger = true;
    opts.debug = true;
  }
  return opts;
}

export function isEmailConfigured() {
  return isTruthy(config.smtpHost) && isTruthy(config.smtpFrom);
}

async function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const transport = nodemailer.createTransport(buildTransportOptions());
      return transport;
    })();
  }
  return transporterPromise;
}

export async function sendTempPasswordEmail({ to, studentName, tempPassword }) {
  const transport = await getTransporter();
  if (!transport) {
    return {
      sent: false,
      skipped: true,
      messageId: null,
      error:
        "SMTP is not configured. Create `server/.env` (copy from `.env.example`) and set SMTP_HOST/SMTP_FROM (and usually SMTP_USER/SMTP_PASS).",
    };
  }

  const subject = "Your Smart Attendance Login (Temporary Password)";
  const text = [
    `Hello ${studentName || ""},`.trim(),
    "",
    "Your account has been created for the Smart Attendance & Performance system.",
    "",
    `Email: ${to}`,
    `Temporary password: ${tempPassword}`,
    "",
    "Please sign in and change your password as soon as possible.",
    "",
    "Regards,",
    "Smart Attendance System",
  ].join("\n");

  const info = await transport.sendMail({
    from: config.smtpFrom,
    to,
    subject,
    text,
  });

  return { sent: true, skipped: false, messageId: info.messageId || null, error: null };
}
