const express = require('express');
const { initDb } = require('./db');
const routes = require('./routes');

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());
app.get('/health', (_req, res) => res.json({ service: 'auth', status: 'ok' }));
app.use(routes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Auth service listening on ${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
