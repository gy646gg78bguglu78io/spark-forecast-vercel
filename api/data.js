// ═══════════════════════════════════════════════════════════
// SPARK! FORECAST — Data API  (Vercel Serverless Function)
// ═══════════════════════════════════════════════════════════
// GET  /api/data          → Load forecast data
// POST /api/data          → Save forecast data
// GET  /api/data?history  → Get save history
//
// Uses Neon Postgres. Requires authentication (JWT cookie).

const { getAuthUser } = require('./_lib/jwt');
const { getSQL, ensureTable } = require('./_lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // ─── Auth check ───────────────────────────────────────
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // ─── DB init ──────────────────────────────────────────
  let sql;
  try {
    await ensureTable();
    sql = getSQL();
  } catch (err) {
    console.error('DB connection error:', err.message);
    return res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }

  const method = req.method;

  // ─── GET — load data ──────────────────────────────────
  if (method === 'GET') {
    try {
      // Return save history
      if (req.query.history !== undefined) {
        const rows = await sql`
          SELECT data_key, updated_at, LENGTH(data_value) AS size_bytes
          FROM forecast_data
          ORDER BY updated_at DESC
          LIMIT 20
        `;
        return res.json({ history: rows });
      }

      // Return forecast data
      const rows = await sql`
        SELECT data_value, updated_at
        FROM forecast_data
        WHERE data_key = 'forecast'
      `;

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
      return res.status(500).json({ error: 'Database read failed: ' + err.message });
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
      await sql`
        INSERT INTO forecast_data (data_key, data_value, updated_at)
        VALUES ('forecast', ${jsonData}, CURRENT_TIMESTAMP)
        ON CONFLICT (data_key)
        DO UPDATE SET data_value = ${jsonData}, updated_at = CURRENT_TIMESTAMP
      `;

      return res.json({
        success: true,
        saved_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        size_bytes: Buffer.byteLength(jsonData, 'utf8'),
      });
    } catch (err) {
      console.error('DB write error:', err.message);
      return res.status(500).json({ error: 'Database write failed: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
