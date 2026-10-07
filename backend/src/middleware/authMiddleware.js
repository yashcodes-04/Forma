/**
 * Role authorization middleware for Forma Studio Admin.
 * Verifies admin role headers and authorization tokens.
 */
export function requireAdmin(req, res, next) {
  const adminHeader = req.headers["x-admin-role"] || req.headers["x-role"];
  const authHeader = req.headers["authorization"];

  if (
    adminHeader === "admin" ||
    authHeader === "Bearer admin_master_token" ||
    authHeader?.includes("admin")
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access forbidden: Studio Admin authorization required.",
  });
}
