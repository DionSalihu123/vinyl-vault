const express = require('express');
const { initDb } = require('./db');
const routes = require('./routes');

const app = express();
const port = Number(process.env.PORT || 3003);

app.use(express.json());
app.get('/health', (_req, res) => res.json({ service: 'order', status: 'ok' }));
app.use(routes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Order service listening on ${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
