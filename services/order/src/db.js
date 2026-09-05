const { Pool } = require('pg');

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
  throw new Error('Could not connect to order_db');
}

async function initDb() {
  await waitForDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS carts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      album_id UUID NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      UNIQUE (cart_id, album_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'SHIPPED', 'CANCELLED')),
      total NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      album_id UUID NOT NULL,
      album_title TEXT NOT NULL,
      artist TEXT NOT NULL,
      unit_price NUMERIC(10, 2) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0)
    );

    CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id, created_at DESC);
  `);
}

module.exports = { pool, initDb };
