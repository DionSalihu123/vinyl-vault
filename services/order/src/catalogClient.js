const CATALOG_URL = process.env.CATALOG_URL || 'http://catalog-service:3002';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

class CatalogUnavailableError extends Error {
  constructor(message = 'Catalog service unavailable') {
    super(message);
    this.name = 'CatalogUnavailableError';
    this.status = 503;
  }
}

class CatalogRequestError extends Error {
  constructor(status, body) {
    super(body.error || 'Catalog request failed');
    this.name = 'CatalogRequestError';
    this.status = status;
    this.body = body;
  }
}

async function catalogFetch(path, options = {}) {
  let response;
  try {
    response = await fetch(`${CATALOG_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    throw new CatalogUnavailableError(err.message);
  }

  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }

  if (!response.ok) {
    throw new CatalogRequestError(response.status, body);
  }
  return body;
}

async function getAlbumsByIds(ids) {
  if (!ids.length) return [];
  const data = await catalogFetch(`/albums?ids=${ids.join(',')}`);
  return data.albums || [];
}

async function commitStock(items) {
  return catalogFetch('/internal/stock/commit', {
    method: 'POST',
    headers: { 'X-Internal-Key': INTERNAL_API_KEY },
    body: JSON.stringify({ items }),
  });
}

async function releaseStock(items) {
  return catalogFetch('/internal/stock/release', {
    method: 'POST',
    headers: { 'X-Internal-Key': INTERNAL_API_KEY },
    body: JSON.stringify({ items }),
  });
}

module.exports = {
  getAlbumsByIds,
  commitStock,
  releaseStock,
  CatalogUnavailableError,
  CatalogRequestError,
};
