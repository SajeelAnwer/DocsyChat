const jwt = require('jsonwebtoken');

// ── Auth middleware ───────────────────────────────────────────────────────
// Verifies JWT locally — no DB round trip needed.
// The JWT is cryptographically signed, so if it's valid it can be trusted.
// We only hit the DB at login time (to verify password + verified status).
// This saves ~150-200ms on every authenticated request.
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Trust the JWT — no DB lookup needed for normal requests.
    // JWT contains userId; email/name are stored in localStorage on the frontend.
    req.user = {
      id: decoded.userId,
      email: decoded.email || '',
      first_name: decoded.firstName || '',
      last_name: decoded.lastName || '',
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
