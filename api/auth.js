// ═══════════════════════════════════════════════════════════
// SPARK! FORECAST — Auth API  (Vercel Serverless Function)
// ═══════════════════════════════════════════════════════════
// GET  /api/auth   → Check auth status
// POST /api/auth   → Login
// DELETE /api/auth → Logout
//
// Replaces the PHP session-based auth with JWT in a cookie.

const crypto = require('crypto');
const { createToken, getAuthUser, setTokenCookie, clearTokenCookie } = require('./_lib/jwt');

/** Timing-safe string comparison to prevent timing attacks */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to keep constant time, then return false
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

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

    // Input validation
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length > 64 || password.length > 128) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = username.toLowerCase().trim();

    // Load user accounts from env var (JSON string)
    let users = {};
    try {
      users = JSON.parse(process.env.APP_USERS || '{}');
    } catch {
      return res.status(500).json({ error: 'Server config error' });
    }

    if (users[user] && safeCompare(users[user], password)) {
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
