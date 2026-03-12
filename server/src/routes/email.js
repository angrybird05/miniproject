import express from "express";
import { z } from "zod";
import { jsonError, jsonOk } from "../http.js";
import { isEmailConfigured, sendTempPasswordEmail } from "../email.js";

export const emailRouter = express.Router();

const TestSchema = z.object({
  to: z.string().email(),
});

emailRouter.post("/test", async (req, res) => {
  const parsed = TestSchema.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 400, "Invalid request", parsed.error.flatten());

  if (!isEmailConfigured()) {
    return jsonError(
      res,
      400,
      "SMTP is not configured",
      "Create `server/.env` (copy from `.env.example`) and set SMTP_HOST/SMTP_FROM (and usually SMTP_USER/SMTP_PASS).",
    );
  }

  try {
    // Reuse the temp-password email template for a test. Password is clearly marked as test.
    const info = await sendTempPasswordEmail({
      to: parsed.data.to,
      studentName: "SMTP Test",
      tempPassword: "TEST-PASSWORD-123",
    });
    if (!info.sent) return jsonError(res, 500, "Email send failed", info.error || "Unknown error");
    return jsonOk(res, { sent: true, messageId: info.messageId });
  } catch (e) {
    return jsonError(res, 500, "Email send failed", e?.message || String(e));
  }
});
