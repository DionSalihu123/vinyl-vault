const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = Number(process.env.PORT || 8080);

const AUTH_URL = process.env.AUTH_URL || 'http://auth-service:3001';
const CATALOG_URL = process.env.CATALOG_URL || 'http://catalog-service:3002';
const ORDER_URL = process.env.ORDER_URL || 'http://order-service:3003';

app.get('/health', (_req, res) => res.json({ service: 'gateway', status: 'ok' }));

function prefixPath(prefix) {
  return (path) => `${prefix}${path === '/' ? '' : path}`;
}

function proxy(mountPath, target, pathRewrite) {
  app.use(
    mountPath,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite,
      onError(_err, _req, res) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream service unavailable' }));
      },
    })
  );
}

// Express already strips the mount path, so /api/auth/login arrives as /login.
proxy('/api/auth', AUTH_URL);
proxy('/api/albums', CATALOG_URL, prefixPath('/albums'));
proxy('/api/cart', ORDER_URL, prefixPath('/cart'));
proxy('/api/orders', ORDER_URL, prefixPath('/orders'));

app.use((_req, res) => {
  res.status(404).json({ error: 'No gateway route for this path' });
});

app.listen(port, () => {
  console.log(`API gateway listening on ${port}`);
});
