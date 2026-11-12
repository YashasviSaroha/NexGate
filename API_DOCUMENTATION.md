# NexGate HTTP API

Base URL in local development: `http://localhost:3000`.

The browser sends the session cookie. Gateway clients send `X-API-Key`.

## Authentication

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | `name`, `email`, `password`, `organizationName`, optional `intent` of `provider` or `developer` | Creates a user and organization |
| POST | `/api/v1/auth/login` | `email`, `password` | Sets the session cookie |
| POST | `/api/v1/auth/demo` | none | Opens the read-only demo workspace and returns a sandbox key |
| POST | `/api/v1/auth/logout` | none | Clears the cookie and revokes the token id when Redis is up |
| GET | `/api/v1/auth/me` | none | Current user, memberships, and `demo` |
| PUT | `/api/v1/auth/me` | `name`, optional `newPassword` | Updates the signed-in profile |
| POST | `/api/v1/auth/forgot-password` | `email` | Stores a reset token. No email is sent |
| POST | `/api/v1/auth/reset-password` | `token`, `newPassword` | Sets a new password |

The demo mailbox cannot use `/login`.

## Demo

`POST /api/v1/demo/reset` deletes live request logs for `public-demo` and keeps rows marked `demo-sample`. Registered organizations are not modified. A normal account receives 403.

## Assistant

All of these require a session. They do not accept a Gemini key from the client.

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/v1/ai/usage` | none |
| POST | `/api/v1/ai/documentation` | `apiId` |
| POST | `/api/v1/ai/explain` | `requestLogId` |
| POST | `/api/v1/ai/insights` | `organizationId` |
| POST | `/api/v1/ai/examples` | `apiId` |

Daily caps come from `DEMO_DAILY_AI_LIMIT` and `USER_DAILY_AI_LIMIT`. A missing `GEMINI_API_KEY` returns 503, except examples, which still return local snippets that use `YOUR_API_KEY`.

## Management

Organization routes sit under `/api/v1/organizations/:orgId/` for `apis`, `applications`, `plans`, `analytics`, `request-logs`, and `webhooks`. The caller must be an active member. Demo sessions can read and cannot create or update those resources.

## Gateway

```bash
curl -X GET "http://localhost:3000/gateway/demo-weather/v1/current?city=Tokyo" \
  -H "X-API-Key: YOUR_API_KEY"
```

```bash
curl -X GET "http://localhost:3000/gateway/demo-catalog/v1/products" \
  -H "X-API-Key: YOUR_API_KEY"
```

The Instant Demo playground fills `YOUR_API_KEY` with the sandbox key for that browser session. Invalid, revoked, and over-quota keys are rejected by the gateway and written to the request log.

## Health

- `GET /health` reports that the process is up.
- `GET /health/ready` reports whether PostgreSQL accepted a query.
