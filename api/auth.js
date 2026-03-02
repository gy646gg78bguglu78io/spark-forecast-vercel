// ═══════════════════════════════════════════════════════════
// SPARK! FORECAST — Auth API  (Vercel Serverless Function)
// ═══════════════════════════════════════════════════════════
// GET  /api/auth   → Check auth status
// POST /api/auth   → Login
// DELETE /api/auth → Logout
//
// Replaces the PHP session-based auth with JWT in a cookie.

const { createToken, getAuthUser, setTokenCookie, clearTokenCookie } = require('./_lib/jwt');

module.exports = async function handler(req, res) {
  // ─── CORS / preflight ─────────────────────────────────
  res.setHeader('Content-Type', 'application/json');

  const method = req.method;

  // ─── GET — check auth status ──────────────────────────
  if (method === 'GET') {
    const user = getAuthUser(req);
    return res.json({
      authenticated: !!user,
      user: user || null,
    });
  }

  // ─── POST — login ─────────────────────────────────────
  if (method === 'POST') {
    const { username, password } = req.body || {};
    const user = (username || '').toLowerCase().trim();

    // Load user accounts from env var (JSON string)
    let users = {};
    try {
      users = JSON.parse(process.env.APP_USERS || '{}');
    } catch {
      return res.status(500).json({ error: 'Server config error' });
    }

    if (users[user] && users[user] === password) {
      const token = createToken(user);
      res.setHeader('Set-Cookie', setTokenCookie(token));
      return res.json({ success: true, user });
    }

    return res.status(401).json({ error: 'Wrong username or password' });
  }

  // ─── DELETE — logout ──────────────────────────────────
  if (method === 'DELETE') {
    res.setHeader('Set-Cookie', clearTokenCookie());
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
