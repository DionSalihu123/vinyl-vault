const { Pool } = require('pg');
const { ALBUMS } = require('./seed');

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
  throw new Error('Could not connect to catalog_db');
}

async function initDb() {
  await waitForDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS albums (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      genre TEXT NOT NULL,
      release_year INTEGER NOT NULL CHECK (release_year >= 1900),
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      description TEXT,
      cover_image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS albums_title_artist_idx
    ON albums (title, artist)
  `);

  for (const album of ALBUMS) {
    await pool.query(
      `INSERT INTO albums (title, artist, genre, release_year, price, stock, description, cover_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (title, artist) DO UPDATE SET
         genre = EXCLUDED.genre,
         release_year = EXCLUDED.release_year,
         price = EXCLUDED.price,
         stock = EXCLUDED.stock,
         description = EXCLUDED.description,
         cover_image_url = EXCLUDED.cover_image_url,
         updated_at = NOW()`,
      [
        album.title,
        album.artist,
        album.genre,
        album.release_year,
        album.price,
        album.stock,
        album.description,
        album.cover_image_url,
      ]
    );
  }

  if (ALBUMS.length > 0) {
    const values = ALBUMS.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ');
    const params = ALBUMS.flatMap((album) => [album.title, album.artist]);

    await pool.query(
      `DELETE FROM albums a
       WHERE NOT EXISTS (
         SELECT 1 FROM (VALUES ${values}) AS v(title, artist)
         WHERE a.title = v.title AND a.artist = v.artist
       )`,
      params
    );
  } else {
    await pool.query('DELETE FROM albums');
  }
}

module.exports = { pool, initDb };
