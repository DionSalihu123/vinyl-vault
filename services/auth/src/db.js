const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function waitForDb() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Could not connect to auth_db');
}

async function initDb() {
  await waitForDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const adminEmail = 'admin@vinylvault.local';
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existing.rowCount === 0) {
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [adminEmail, passwordHash, 'ADMIN']
    );
  }

  const demoEmail = 'user@vinylvault.local';
  const demo = await pool.query('SELECT id FROM users WHERE email = $1', [demoEmail]);
  if (demo.rowCount === 0) {
    const passwordHash = await bcrypt.hash('User123!', 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [demoEmail, passwordHash, 'USER']
    );
  }
}

module.exports = { pool, initDb };
