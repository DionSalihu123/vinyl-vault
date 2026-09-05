const express = require('express');
const { pool } = require('./db');
const { requireAuth, requireRole, requireInternalKey } = require('./auth');

const router = express.Router();

function mapAlbum(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    genre: row.genre,
    releaseYear: row.release_year,
    decade: Math.floor(row.release_year / 10) * 10,
    price: Number(row.price),
    stock: row.stock,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function albumFilters(query) {
  const conditions = [];
  const params = [];
  const search = query.search ? String(query.search).trim() : '';
  const genre = query.genre ? String(query.genre).trim() : '';
  const decade = parseOptionalNumber(query.decade);
  const minPrice = parseOptionalNumber(query.minPrice);
  const maxPrice = parseOptionalNumber(query.maxPrice);
  const year = parseOptionalNumber(query.year);

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(title ILIKE $${params.length} OR artist ILIKE $${params.length})`);
  }
  if (genre) {
    params.push(genre);
    conditions.push(`LOWER(genre) = LOWER($${params.length})`);
  }
  if (Number.isFinite(decade) && decade !== null) {
    params.push(decade, decade + 9);
    conditions.push(`release_year BETWEEN $${params.length - 1} AND $${params.length}`);
  }
  if (Number.isFinite(year) && year !== null) {
    params.push(year);
    conditions.push(`release_year = $${params.length}`);
  }
  if (Number.isFinite(minPrice) && minPrice !== null) {
    params.push(minPrice);
    conditions.push(`price >= $${params.length}`);
  }
  if (Number.isFinite(maxPrice) && maxPrice !== null) {
    params.push(maxPrice);
    conditions.push(`price <= $${params.length}`);
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function sortClause(sort) {
  switch (sort) {
    case 'price_asc':
      return 'ORDER BY price ASC, title ASC';
    case 'price_desc':
      return 'ORDER BY price DESC, title ASC';
    case 'year_asc':
      return 'ORDER BY release_year ASC, title ASC';
    case 'year_desc':
      return 'ORDER BY release_year DESC, title ASC';
    case 'title_desc':
      return 'ORDER BY title DESC';
    default:
      return 'ORDER BY title ASC';
  }
}

router.get('/albums/random', async (req, res, next) => {
  try {
    const { where, params } = albumFilters(req.query);
    const inStock = where ? `${where} AND stock > 0` : 'WHERE stock > 0';
    const result = await pool.query(
      `SELECT * FROM albums ${inStock} ORDER BY RANDOM() LIMIT 1`,
      params
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No album matched the challenge criteria' });
    }
    return res.json({ album: mapAlbum(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
});

router.get('/albums', async (req, res, next) => {
  try {
    const ids = req.query.ids
      ? String(req.query.ids)
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    if (ids.length) {
      const result = await pool.query('SELECT * FROM albums WHERE id = ANY($1::uuid[])', [ids]);
      return res.json({ albums: result.rows.map(mapAlbum) });
    }

    const { where, params } = albumFilters(req.query);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 24));
    const offset = (page - 1) * limit;
    const sort = sortClause(req.query.sort);

    const count = await pool.query(`SELECT COUNT(*)::int AS n FROM albums ${where}`, params);
    const result = await pool.query(
      `SELECT * FROM albums ${where} ${sort} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return res.json({
      albums: result.rows.map(mapAlbum),
      total: count.rows[0].n,
      page,
      limit,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/albums/meta/genres', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT DISTINCT genre FROM albums ORDER BY genre');
    return res.json({ genres: result.rows.map((row) => row.genre) });
  } catch (err) {
    return next(err);
  }
});

router.get('/albums/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM albums WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    return res.json({ album: mapAlbum(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
});

function validateAlbumBody(body, partial = false) {
  const errors = [];
  const data = {};
  const fields = ['title', 'artist', 'genre', 'releaseYear', 'price', 'stock', 'description', 'coverImageUrl'];
  for (const field of fields) {
    if (body[field] === undefined) continue;
    data[field] = body[field];
  }
  if (!partial) {
    if (!body.title) errors.push('title is required');
    if (!body.artist) errors.push('artist is required');
    if (!body.genre) errors.push('genre is required');
    if (body.releaseYear == null) errors.push('releaseYear is required');
    if (body.price == null) errors.push('price is required');
  }
  if (data.releaseYear != null && (!Number.isInteger(Number(data.releaseYear)) || Number(data.releaseYear) < 1900)) {
    errors.push('releaseYear must be an integer >= 1900');
  }
  if (data.price != null && !(Number(data.price) >= 0)) errors.push('price must be >= 0');
  if (data.stock != null && (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0)) {
    errors.push('stock must be an integer >= 0');
  }
  return { errors, data };
}

router.post('/albums', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { errors, data } = validateAlbumBody(req.body, false);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    const result = await pool.query(
      `INSERT INTO albums (title, artist, genre, release_year, price, stock, description, cover_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.title,
        data.artist,
        data.genre,
        Number(data.releaseYear),
        Number(data.price),
        data.stock == null ? 0 : Number(data.stock),
        data.description || null,
        data.coverImageUrl || null,
      ]
    );
    return res.status(201).json({ album: mapAlbum(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
});

router.put('/albums/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { errors, data } = validateAlbumBody(req.body, true);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    const existing = await pool.query('SELECT * FROM albums WHERE id = $1', [req.params.id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Album not found' });
    const current = existing.rows[0];
    const result = await pool.query(
      `UPDATE albums SET
         title = $1, artist = $2, genre = $3, release_year = $4, price = $5,
         stock = $6, description = $7, cover_image_url = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        data.title ?? current.title,
        data.artist ?? current.artist,
        data.genre ?? current.genre,
        data.releaseYear != null ? Number(data.releaseYear) : current.release_year,
        data.price != null ? Number(data.price) : current.price,
        data.stock != null ? Number(data.stock) : current.stock,
        data.description !== undefined ? data.description : current.description,
        data.coverImageUrl !== undefined ? data.coverImageUrl : current.cover_image_url,
        req.params.id,
      ]
    );
    return res.json({ album: mapAlbum(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
});

router.delete('/albums/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM albums WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Album not found' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.post('/internal/stock/commit', requireInternalKey, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'items are required' });
    await client.query('BEGIN');
    const albums = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.albumId || !Number.isInteger(quantity) || quantity < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Each item needs albumId and a positive integer quantity' });
      }
      const locked = await client.query('SELECT * FROM albums WHERE id = $1 FOR UPDATE', [item.albumId]);
      if (locked.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Album ${item.albumId} not found`, failures: [{ albumId: item.albumId, reason: 'not_found' }] });
      }
      const album = locked.rows[0];
      if (album.stock < quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Insufficient stock for ${album.title}`,
          failures: [{ albumId: album.id, reason: 'insufficient_stock', available: album.stock, requested: quantity }],
        });
      }
      const updated = await client.query(
        'UPDATE albums SET stock = stock - $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [quantity, item.albumId]
      );
      albums.push(mapAlbum(updated.rows[0]));
    }
    await client.query('COMMIT');
    return res.json({ ok: true, albums });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    return next(err);
  } finally {
    client.release();
  }
});

router.post('/internal/stock/release', requireInternalKey, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    await client.query('BEGIN');
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.albumId || !Number.isInteger(quantity) || quantity < 1) continue;
      await client.query(
        'UPDATE albums SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
        [quantity, item.albumId]
      );
    }
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    return next(err);
  } finally {
    client.release();
  }
});

module.exports = { router, mapAlbum };
