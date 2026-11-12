# Deployment

Do not commit `.env`. Copy `.env.example` and fill placeholders on the host.

## Services

| Piece | Local command | Host |
| --- | --- | --- |
| Frontend | `cd frontend && npm run build` | Static host. Set `VITE_BACKEND_URL` to the public API origin at build time |
| Backend | `cd backend && npm run build && npm start` | Node 18+. `PORT` and `NODE_ENV=production` |
| PostgreSQL | `docker-compose up -d` locally | Managed Postgres. `DATABASE_URL` |
| Redis | same compose file | Managed Redis. `REDIS_URL`. Rate limits fall back to memory if it is down |
| Gemini | none | `GEMINI_API_KEY` on the backend only |

## Environment

Required in production:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET` and `SESSION_SECRET` — long random strings, not the example defaults
- `FRONTEND_URL` and `BACKEND_URL` — public origins
- `ALLOW_LOCAL_UPSTREAM=false` unless the mock upstream is intentionally on that server
- `GEMINI_API_KEY` if the assistant should answer
- `DEMO_USER_EMAIL` — keep the reserved demo mailbox off any real inbox you use

`VITE_` variables are baked into the frontend bundle. Do not put `GEMINI_API_KEY` there.

## Database

From `backend`:

```bash
npx prisma generate
npx prisma migrate deploy
```

A new empty database can use `npx prisma db push` during a first local setup. Do not run an init migration against a database that was already created with `db push`.

Demo resources are created on the first `POST /api/v1/auth/demo`. They are not mixed into organizations that users register afterwards.

## Demo account

There is no published administrator password. Visitors open `/demo`. The sandbox API key is derived from `JWT_SECRET` and shown only inside that demo session. Reset live demo logs with `POST /api/v1/demo/reset` while that session is active.

## Build and start

```bash
npm install
cd backend && npm install && npx prisma generate && npm run build
cd ../frontend && npm install && npm run build
```

Start the API with `node backend/dist/index.js` and serve `frontend/dist`. The frontend calls `VITE_BACKEND_URL` or `http://localhost:3000`. Cookies need the API and the site to share a registrable domain, with `secure: true` because `NODE_ENV=production`.

## Checks before a public URL

- `GET /health` returns 200
- `GET /health/ready` returns 200
- `/demo` opens the sample Weather and Catalog APIs
- A demo request to create an API returns 403
- A new registration lands in its own organization
- Gemini usage stops at the daily cap
