// ═══════════════════════════════════════════════════════════
// SPARK! FORECAST — Data API  (Vercel Serverless Function)
// ═══════════════════════════════════════════════════════════
// GET  /api/data          → Load forecast data
// POST /api/data          → Save forecast data
// GET  /api/data?history  → Get save history
//
// Requires authentication (JWT cookie).

const { getAuthUser } = require('./_lib/jwt');
const { getPool } = require('./_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // ─── Auth check ───────────────────────────────────────
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const method = req.method;
  const pool = getPool();

  // ─── GET — load data ──────────────────────────────────
  if (method === 'GET') {
    try {
      // Return save history
      if (req.query.history !== undefined) {
        const [rows] = await pool.query(
          "SELECT data_key, updated_at, LENGTH(data_value) as size_bytes FROM forecast_data ORDER BY updated_at DESC LIMIT 20"
        );
        return res.json({ history: rows });
      }

      // Return forecast data
      const [rows] = await pool.query(
        "SELECT data_value, updated_at FROM forecast_data WHERE data_key = 'forecast'"
      );

      if (rows.length > 0) {
        const data = JSON.parse(rows[0].data_value);
        return res.json({
          success: true,
          data,
          updated_at: rows[0].updated_at,
        });
      }

      return res.json({ success: true, data: null, updated_at: null });
    } catch (err) {
      console.error('DB read error:', err.message);
      return res.status(500).json({ error: 'Database read failed' });
    }
  }

  // ─── POST — save data ─────────────────────────────────
  if (method === 'POST') {
    const { data } = req.body || {};

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    let jsonData;
    try {
      jsonData = JSON.stringify(data);
    } catch {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
      await pool.query(
        `INSERT INTO forecast_data (data_key, data_value)
         VALUES ('forecast', ?)
         ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_at = CURRENT_TIMESTAMP`,
        [jsonData]
      );

      return res.json({
        success: true,
        saved_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        size_bytes: Buffer.byteLength(jsonData, 'utf8'),
      });
    } catch (err) {
      console.error('DB write error:', err.message);
      return res.status(500).json({ error: 'Database write failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
