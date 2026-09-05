# Vinyl Vault

A microservices e-commerce shop for music albums. The system is split into three independently deployable Node.js services, each with its own PostgreSQL database, plus an API gateway and a React storefront. Everything runs locally with Docker Compose.

## Architecture

```text
Browser (React)
    │  HTTP/JSON
    ▼
API Gateway          /api/auth/*    → Auth Service    → auth_db
                     /api/albums/*  → Catalog Service → catalog_db
                     /api/cart/*    → Order Service   → order_db
                     /api/orders/*  → Order Service   → order_db

Order Service ──HTTP──► Catalog Service   (price, stock, reservation)
```

Services never query another service’s database. Cross-service relationships use identifiers (for example `album_id` on an order line) and REST calls.

| Service | Responsibility | Database |
| --- | --- | --- |
| Auth | Registration, login, password hashing, JWT, USER/ADMIN roles | `auth_db` |
| Catalog | Album CRUD, search/filter/sort, stock, random album challenge | `catalog_db` |
| Order | Carts, checkout, order history/status, line-item price snapshots | `order_db` |
| Gateway | Public routing only | — |

## Run the stack

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). The gateway is also on [http://localhost:8080](http://localhost:8080).

Seeded accounts:

- User: `user@vinylvault.local` / `User123!`
- Admin: `admin@vinylvault.local` / `Admin123!`

The catalog is seeded with albums across metal, jazz, rock, hip-hop, pop, electronic, punk, soul, and folk, from the late 1950s through the 2010s.

## Main user flow

1. The storefront loads albums through the gateway → Catalog Service → `catalog_db`.
2. Login goes through the gateway → Auth Service → `auth_db`. A JWT (user id + role) is returned and sent on later requests.
3. Cart operations hit the Order Service. On add-to-cart and checkout, Order calls Catalog over HTTP for current title, price, and stock. Checkout reserves stock in `catalog_db` via Catalog’s internal API, then writes an order into `order_db` with snapshotted title and unit price.
4. If Catalog is down, checkout returns `503` instead of touching another database. If order persistence fails after a stock reserve, Order asks Catalog to release the stock.

## HTTP surface (via gateway)

**Auth**

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

**Catalog**

- `GET /api/albums` — `search`, `genre`, `decade`, `year`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`
- `GET /api/albums/random` — same filters; example: `/api/albums/random?genre=metal&decade=1980&minPrice=10&maxPrice=30`
- `GET /api/albums/:id`
- `POST/PUT/DELETE /api/albums` — ADMIN JWT
- Internal (Order → Catalog only, `X-Internal-Key`): `POST /internal/stock/commit`, `POST /internal/stock/release`

**Orders**

- `GET/POST /api/cart`, `PATCH/DELETE /api/cart/items/:albumId`
- `POST /api/orders/checkout`
- `GET /api/orders`, `GET /api/orders/:id`
- `PATCH /api/orders/:id/status` — ADMIN (`CONFIRMED` / `SHIPPED` / `CANCELLED`; cancel restocks via Catalog)

JWT verification is local to Catalog and Order using the shared `JWT_SECRET`. Auth is the only issuer.

## Project layout

```text
gateway/              Express reverse proxy
services/auth/
services/catalog/
services/order/
frontend/             React (Vite) + nginx in Docker
docker-compose.yml
```

Containers talk to each other by Compose service name (`auth-service`, `catalog-db`, …), not `localhost`.
