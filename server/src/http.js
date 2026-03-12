export function jsonOk(res, data) {
  res.json({ ok: true, data });
}

export function jsonError(res, status, message, details) {
  res.status(status).json({ ok: false, error: { message, details } });
}

export function requireFields(obj, fields) {
  const missing = fields.filter((f) => !obj?.[f]);
  return missing.length ? missing : null;
}
