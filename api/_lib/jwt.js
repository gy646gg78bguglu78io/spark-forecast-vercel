// ═══════════════════════════════════════════════════════════
// JWT helpers — replaces PHP session auth
// ═══════════════════════════════════════════════════════════
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'spark-fallback-secret-change-me';
const COOKIE_NAME = 'spark_token';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/** Create a signed JWT for the given username */
function createToken(username) {
  return jwt.sign({ user: username }, SECRET, { expiresIn: MAX_AGE });
}

/** Verify a JWT and return the payload, or null if invalid */
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

/** Parse cookies from the request header */
function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach((c) => {
    const [key, ...rest] = c.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

/** Get the authenticated username from the request, or null */
function getAuthUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = verifyToken(token);
  return payload ? payload.user : null;
}

/** Build a Set-Cookie header to store the JWT */
function setTokenCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}

/** Build a Set-Cookie header that clears the JWT */
function clearTokenCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

module.exports = {
  createToken,
  verifyToken,
  parseCookies,
  getAuthUser,
  setTokenCookie,
  clearTokenCookie,
  COOKIE_NAME,
};
