import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { jsonError } from "./http.js";

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "12h" });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return jsonError(res, 401, "Missing Authorization token");
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return jsonError(res, 401, "Invalid or expired token");
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return jsonError(res, 403, "Forbidden");
    return next();
  };
}
