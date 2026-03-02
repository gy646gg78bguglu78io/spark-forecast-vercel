// ═══════════════════════════════════════════════════════════
// Database helper — Neon Serverless Postgres
// ═══════════════════════════════════════════════════════════
// Auto-creates the forecast_data table on first use.
// Set DATABASE_URL env var (auto-injected by Neon integration).

const { neon } = require('@neondatabase/serverless');

let tableReady = false;

function getSQL() {
  return neon(process.env.DATABASE_URL);
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
