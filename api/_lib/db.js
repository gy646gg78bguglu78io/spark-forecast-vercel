// ═══════════════════════════════════════════════════════════
// Database helper — Neon Serverless Postgres
// ═══════════════════════════════════════════════════════════
// Auto-creates the forecast_data table on first use.
// DATABASE_URL is auto-injected by the Neon integration.

const { neon } = require('@neondatabase/serverless');

let tableReady = false;

function getSQL() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — add a Neon Postgres store to this Vercel project');
  }
  return neon(url);
}

async function ensureTable() {
  if (tableReady) return;
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS forecast_data (
      data_key   VARCHAR(255) PRIMARY KEY,
      data_value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  tableReady = true;
}

module.exports = { getSQL, ensureTable };
