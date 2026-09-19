const express = require('express');
const { pool } = require('./db');
const { requireAuth, requireRole } = require('./auth');
const catalog = require('./catalogClient');

const router = express.Router();

async function getOrCreateCart(userId) {
  const existing = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
  if (existing.rowCount) return existing.rows[0];
  const created = await pool.query(
    'INSERT INTO carts (user_id) VALUES ($1) RETURNING *',
    [userId]
  );
  return created.rows[0];
}

async function loadCart(userId) {
  const cart = await getOrCreateCart(userId);
  const items = await pool.query(
    'SELECT * FROM cart_items WHERE cart_id = $1 ORDER BY album_id',
    [cart.id]
  );
  return { cart, items: items.rows };
}

async function enrichCartItems(items) {
  const albums = await catalog.getAlbumsByIds(items.map((item) => item.album_id));
  const byId = new Map(albums.map((album) => [album.id, album]));
  return items.map((item) => {
    const album = byId.get(item.album_id);
    return {
      id: item.id,
      albumId: item.album_id,
      quantity: item.quantity,
      album: album || null,
      unavailable: !album,
      lineTotal: album ? Number((album.price * item.quantity).toFixed(2)) : null,
    };
  });
}

function mapOrder(order, items) {
  return {
    id: order.id,
    userId: order.user_id,
    status: order.status,
    total: Number(order.total),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: items.map((item) => ({
      id: item.id,
      albumId: item.album_id,
      albumTitle: item.album_title,
      artist: item.artist,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      lineTotal: Number((Number(item.unit_price) * item.quantity).toFixed(2)),
    })),
  };
}

router.get('/cart', requireAuth, async (req, res, next) => {
  try {
    const { cart, items } = await loadCart(req.user.sub);
    let enriched;
    try {
      enriched = await enrichCartItems(items);
    } catch (err) {
      if (err instanceof catalog.CatalogUnavailableError) {
        enriched = items.map((item) => ({
          id: item.id,
          albumId: item.album_id,
          quantity: item.quantity,
          album: null,
          unavailable: true,
          catalogError: true,
          lineTotal: null,
        }));
      } else {
        throw err;
      }
    }
    return res.json({ cartId: cart.id, items: enriched });
  } catch (err) {
    return next(err);
  }
});

router.post('/cart/items', requireAuth, async (req, res, next) => {
  try {
    const albumId = req.body.albumId;
    const quantity = Number(req.body.quantity || 1);
    if (!albumId) return res.status(400).json({ error: 'albumId is required' });
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    let albums;
    try {
      albums = await catalog.getAlbumsByIds([albumId]);
    } catch (err) {
      if (err instanceof catalog.CatalogUnavailableError) {
        return res.status(503).json({ error: 'Catalog service unavailable; cannot add this album yet' });
      }
      throw err;
    }
    const album = albums[0];
    if (!album) return res.status(404).json({ error: 'Album not found in catalog' });

    const { cart } = await loadCart(req.user.sub);
    const existing = await pool.query(
      'SELECT quantity FROM cart_items WHERE cart_id = $1 AND album_id = $2',
      [cart.id, albumId]
    );
    const currentQuantity = existing.rowCount ? Number(existing.rows[0].quantity) : 0;
    if (currentQuantity + quantity > album.stock) {
      return res.status(409).json({
        error: `Only ${album.stock} copies in stock`,
        available: album.stock,
        requested: currentQuantity + quantity,
      });
    }

    await pool.query(
      `INSERT INTO cart_items (cart_id, album_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, album_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [cart.id, albumId, quantity]
    );
    await pool.query('UPDATE carts SET updated_at = NOW() WHERE id = $1', [cart.id]);

    const { items } = await loadCart(req.user.sub);
    return res.status(201).json({ cartId: cart.id, items: await enrichCartItems(items) });
  } catch (err) {
    return next(err);
  }
});

router.patch('/cart/items/:albumId', requireAuth, async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'quantity must be an integer >= 0' });
    }

    let albums;
    try {
      albums = await catalog.getAlbumsByIds([req.params.albumId]);
    } catch (err) {
      if (err instanceof catalog.CatalogUnavailableError) {
        return res.status(503).json({ error: 'Catalog service unavailable; cannot update cart quantity right now' });
      }
      throw err;
    }

    const album = albums[0];
    if (!album) return res.status(404).json({ error: 'Album not found in catalog' });
    if (quantity > album.stock) {
      return res.status(409).json({ error: `Only ${album.stock} copies in stock`, available: album.stock, requested: quantity });
    }

    const { cart } = await loadCart(req.user.sub);
    if (quantity === 0) {
      await pool.query('DELETE FROM cart_items WHERE cart_id = $1 AND album_id = $2', [
        cart.id,
        req.params.albumId,
      ]);
    } else {
      const updated = await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND album_id = $3 RETURNING id',
        [quantity, cart.id, req.params.albumId]
      );
      if (!updated.rowCount) return res.status(404).json({ error: 'Cart item not found' });
    }
    const { items } = await loadCart(req.user.sub);
    return res.json({ cartId: cart.id, items: await enrichCartItems(items) });
  } catch (err) {
    return next(err);
  }
});

router.delete('/cart/items/:albumId', requireAuth, async (req, res, next) => {
  try {
    const { cart } = await loadCart(req.user.sub);
    const result = await pool.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND album_id = $2 RETURNING id',
      [cart.id, req.params.albumId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Cart item not found' });
    const { items } = await loadCart(req.user.sub);
    return res.json({ cartId: cart.id, items: await enrichCartItems(items) });
  } catch (err) {
    return next(err);
  }
});

router.post('/orders/checkout', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  let reservedItems = null;
  try {
    const { cart, items } = await loadCart(req.user.sub);
    if (!items.length) return res.status(400).json({ error: 'Cart is empty' });

    let albums;
    try {
      albums = await catalog.getAlbumsByIds(items.map((item) => item.album_id));
    } catch (err) {
      if (err instanceof catalog.CatalogUnavailableError) {
        return res.status(503).json({ error: 'Catalog service unavailable; checkout cannot proceed' });
      }
      throw err;
    }

    const byId = new Map(albums.map((album) => [album.id, album]));
    for (const item of items) {
      const album = byId.get(item.album_id);
      if (!album) {
        return res.status(409).json({ error: `Album ${item.album_id} is no longer in the catalog` });
      }
      if (album.stock < item.quantity) {
        return res.status(409).json({
          error: `Insufficient stock for ${album.title}`,
          available: album.stock,
          requested: item.quantity,
        });
      }
    }

    reservedItems = items.map((item) => ({ albumId: item.album_id, quantity: item.quantity }));
    try {
      await catalog.commitStock(reservedItems);
    } catch (err) {
      if (err instanceof catalog.CatalogUnavailableError) {
        return res.status(503).json({ error: 'Catalog service unavailable while reserving stock' });
      }
      if (err instanceof catalog.CatalogRequestError) {
        return res.status(err.status).json(err.body);
      }
      throw err;
    }

    const total = items.reduce((sum, item) => {
      const album = byId.get(item.album_id);
      return sum + album.price * item.quantity;
    }, 0);

    await client.query('BEGIN');
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total) VALUES ($1, 'CONFIRMED', $2) RETURNING *`,
      [req.user.sub, total.toFixed(2)]
    );
    const order = orderResult.rows[0];
    const orderItems = [];
    for (const item of items) {
      const album = byId.get(item.album_id);
      const inserted = await client.query(
        `INSERT INTO order_items (order_id, album_id, album_title, artist, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [order.id, album.id, album.title, album.artist, album.price, item.quantity]
      );
      orderItems.push(inserted.rows[0]);
    }
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
    await client.query('COMMIT');
    reservedItems = null;
    return res.status(201).json({ order: mapOrder(order, orderItems) });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    if (reservedItems) {
      try {
        await catalog.releaseStock(reservedItems);
      } catch (releaseErr) {
        console.error('Failed to release reserved stock after order error', releaseErr);
      }
    }
    return next(err);
  } finally {
    client.release();
  }
});

router.get('/orders', requireAuth, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const result = isAdmin
      ? await pool.query('SELECT * FROM orders ORDER BY created_at DESC')
      : await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.sub]);
    const orders = [];
    for (const order of result.rows) {
      const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      orders.push(mapOrder(order, items.rows));
    }
    return res.json({ orders });
  } catch (err) {
    return next(err);
  }
});

router.get('/orders/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Order not found' });
    const order = result.rows[0];
    if (req.user.role !== 'ADMIN' && order.user_id !== req.user.sub) {
      return res.status(403).json({ error: 'You cannot view this order' });
    }
    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    return res.json({ order: mapOrder(order, items.rows) });
  } catch (err) {
    return next(err);
  }
});

router.patch('/orders/:id/status', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const nextStatus = String(req.body.status || '').toUpperCase();
    if (!['CONFIRMED', 'SHIPPED', 'CANCELLED'].includes(nextStatus)) {
      return res.status(400).json({ error: 'status must be CONFIRMED, SHIPPED, or CANCELLED' });
    }
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];
    if (order.status === 'CANCELLED' && nextStatus !== 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cancelled orders cannot be reopened' });
    }

    const itemsResult = await client.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    if (nextStatus === 'CANCELLED' && order.status !== 'CANCELLED') {
      try {
        await catalog.releaseStock(
          itemsResult.rows.map((item) => ({ albumId: item.album_id, quantity: item.quantity }))
        );
      } catch (err) {
        await client.query('ROLLBACK');
        if (err instanceof catalog.CatalogUnavailableError) {
          return res.status(503).json({ error: 'Catalog service unavailable; cannot restock cancelled items' });
        }
        throw err;
      }
    }

    const updated = await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [nextStatus, order.id]
    );
    await client.query('COMMIT');
    return res.json({ order: mapOrder(updated.rows[0], itemsResult.rows) });
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

module.exports = router;
