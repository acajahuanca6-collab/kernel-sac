// middleware/auth.js
// Middlewares y helpers de autenticación para Kernel SAC

export function requireAuth(req, res, next) {
  if (!req.session.usuario) return res.status(401).json({ error: "Debes iniciar sesión." });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session.usuario || req.session.usuario.rol !== "admin") {
    return res.status(403).json({ error: "Acceso solo para administradores." });
  }
  next();
}

export function sinPassword(u) {
  if (!u) return null;
  const { password_hash, ...resto } = u;
  return resto;
}
