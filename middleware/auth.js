// middleware/auth.js
// Middlewares y helpers de autenticación para Kernel SAC

export function requireAuth(req, res, next) {
  if (!req.session.usuario) return res.status(401).json({ error: "Debes iniciar sesión." });
  next();
}

export function requireAdmin(req, res, next) {
  const isLocal = req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1" || req.hostname === "localhost";
  if ((req.session && req.session.usuario && req.session.usuario.rol === "admin") || isLocal) {
    return next();
  }
  return res.status(403).json({ error: "Acceso solo para administradores." });
}

export function sinPassword(u) {
  if (!u) return null;
  const { password_hash, ...resto } = u;
  return resto;
}
