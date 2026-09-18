# Smart Complaint Management — Backend API

Production-ready REST API for the Smart Complaint Management App.

**Stack:** Node.js · Express 4 · TypeScript · PostgreSQL · Prisma · Redis (ioredis) · JWT · bcrypt · Multer · Zod · Helmet · CORS · Pino · Jest + Supertest · Swagger · Docker

---

## Quick start

### 1. Prerequisites

- Node.js **>= 18**
- PostgreSQL **>= 13** running locally (or a remote connection string)
- Redis **>= 6** (optional, but recommended) — see [Redis](#redis-caching--queues--rate-limiting)

> Prefer Docker? `docker compose up -d` starts PostgreSQL + Redis + the API for you
> (see [Docker](#docker-optional)).

Create the local databases (skip if using Docker):

```bash
createdb smart_complaint_app
createdb smart_complaint_test   # only needed to run the test suite
```

### 2. Install & configure

```bash
npm install                 # installs deps + runs prisma generate
cp .env.example .env        # then edit DATABASE_URL / JWT_SECRET / PORT / REDIS_*
```

### 3. Sync schema & seed

```bash
npx prisma db push          # creates/updates tables from schema.prisma
npm run db:seed             # demo dataset (departments, categories, staff, complaints)
```

### 4. Run

```bash
npm run dev        # tsx watch (hot reload)
npm run build      # tsc -> dist/
npm start          # run compiled build
```

Open:

- **API root:** `http://localhost:4000/api`
- **Health check:** `http://localhost:4000/api/health`
- **Swagger docs:** `http://localhost:4000/api/docs`

> **Port note:** `.env.example` uses `PORT=5000`. The frontend looks for the API at
> `http://localhost:4000/api`, so the checked-in `.env` sets `PORT=4000`. Either value works —
> update the frontend `VITE_API_URL` if you change it.

---

## Demo credentials (after seeding)

All seeded users share the password `Password123!`.

| Email            | Role  | Department     |
| ---------------- | ----- | -------------- |
| `admin@test.com` | ADMIN | —              |
| `staff@test.com` | STAFF | Water Supply   |
| `staff2@test.com`| STAFF | Electricity    |
| `user@test.com`  | USER  | —              |
| `user2@test.com` | USER  | —              |

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma        # models + enums
│   └── seed.ts              # 8 complaints with full status history, feedback, notifications
├── src/
│   ├── app.ts               # express app (helmet, cors, pino-http, swagger, routes, Redis limiters, errors)
│   ├── server.ts            # bootstrap + workers + graceful shutdown (incl. Redis disconnect)
│   ├── config/              # env validation (zod), prisma client, redis client (degraded-mode aware)
│   ├── controllers/         # request handlers
│   ├── docs/                # OpenAPI spec
│   ├── middleware/          # auth, role, validation, multer, redis-rate-limit, error handler
│   ├── routes/              # mounted under /api
│   ├── services/            # business logic incl. classifier + SLA, notifications
│   ├── services/redis/      # cache.service, queue.service, rate-limit.service (no-op when Redis is down)
│   ├── types/               # Express augmentation, module declarations
│   ├── utils/               # jwt, password, complaint number, logger, http helpers, SLA
│   ├── validators/          # zod schemas
│   └── workers/             # background workers: complaint processing, notification delivery
├── tests/                   # Jest + Supertest (auth, complaints, admin, feedback, redis)
├── uploads/                 # multer storage (git-ignored, keeps .gitkeep)
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## API overview

Everything is served under `/api`. Responses use a consistent envelope:

```json
{ "success": true, "message": "Complaint submitted", "data": { ... } }
{ "success": false, "message": "Validation failed", "error": [ { "field": "email", "message": "..." } ] }
```

Paginated endpoints also return:

```json
"pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
```

### Health — `/api/health` (public)

| Method | Path               | Notes                                            |
| ------ | ------------------ | ------------------------------------------------ |
| GET    | `/`                | process + uptime                                 |
| GET    | `/database`        | runs `SELECT 1` against PostgreSQL               |
| GET    | `/redis`           | pings Redis (`{ ok: true }` even when disabled)  |

Useful for container healthchecks — the Docker Compose stack relies on them.

### Auth — `/api/auth`

| Method | Path               | Body / Notes                                 |
| ------ | ------------------ | -------------------------------------------- |
| POST   | `/register`        | name, email, phone?, password                |
| POST   | `/login`           | email, password (rate limited)               |
| POST   | `/forgot-password` | email → reset token returned in dev mode     |
| POST   | `/reset-password`  | token, password                              |
| GET    | `/me`              | current user (auth)                          |
| PUT    | `/profile`         | update name / phone (auth)                   |
| PUT    | `/change-password` | currentPassword, newPassword (auth)          |
| POST   | `/logout`          | (auth)                                       |

### Complaints — `/api/complaints` (all routes require auth)

| Method | Path                     | Notes                                            |
| ------ | ------------------------ | ------------------------------------------------ |
| GET    | `/`                      | filters: status, category, priority, search, page, limit |
| GET    | `/stats`                 | counts for the caller's scope                    |
| GET    | `/assigned`              | staff/assigned view                              |
| GET    | `/overdue`               | admin only, SLA breach list                      |
| GET    | `/:id`                   | detail incl. updates, feedback, assignees        |
| POST   | `/`                      | multipart: fields + `image` / `document` / `attachments` (see file uploads) |
| PUT    | `/:id`                   | owner/admin edits pre-work                       |
| POST   | `/:id/status`            | staff/admin; transition-validated                |
| POST   | `/:id/assign`            | admin (or staff self-assign)                     |
| POST   | `/:id/comments`          | get a timeline entry + notifies the counterpart  |
| DELETE | `/:id`                   | owner (non-terminal) or admin                    |

**Status flow:** `SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`
(plus `REJECTED` from `SUBMITTED`, `UNDER_REVIEW` or `ASSIGNED`, and `WAITING_FOR_USER` for
follow-up requests while in progress). Every transition writes a `ComplaintUpdate` timeline entry.

Complaint numbers follow `SCM-YYYY-NNNNNN` and are generated transactionally to stay unique.

### Classifier & SLA

Creating a complaint runs a **rule-based classifier** over title + description:

- Category keyword matching → `WATER | ELECTRICITY | ROADS | SANITATION | TRANSPORT | SAFETY | OTHER`
- Priority keyword matching → `LOW | MEDIUM | HIGH | CRITICAL`
- Deterministic department assignment: `WATER → Water Supply`, `ELECTRICITY → Electricity`,
  `ROADS → Roads`, `SANITATION → Sanitation`, `TRANSPORT → Transportation`,
  `SAFETY → Public Safety`, `OTHER → General`

Explicit category/priority supplied by the user always wins over the classifier.

**SLA resolution targets:** LOW = 7 days · MEDIUM = 5 days · HIGH = 2 days · CRITICAL = 24 hours.
A non-terminal complaint past its deadline counts as **overdue** (`/api/dashboard/overdue`, `/api/complaints/overdue`).

Every new complaint generates notifications for the owner, admins and department staff.

### Feedback — `/api/feedback`

POST `/` with `{ complaintId, rating (1-5), comment? }`. Only the owner of a
`RESOLVED`/`CLOSED` complaint may submit, once per complaint (unique constraint).

### Notifications — `/api/notifications`

GET `/` (paginated) · PUT `/read-all` · PUT `/:id/read` · DELETE `/:id`

### Departments — `/api/departments`

| Method | Path         | Notes                                          |
| ------ | ------------ | ---------------------------------------------- |
| GET    | `/`          | departments with staff and complaint counts    |
| GET    | `/:id/stats` | ADMIN / STAFF — SLA + open/resolved breakdown  |

### Dashboard & analytics

| Method | Path                          | Access         |
| ------ | ----------------------------- | -------------- |
| GET    | `/api/dashboard`              | ADMIN / STAFF  |
| GET    | `/api/dashboard/overdue`      | ADMIN          |
| GET    | `/api/analytics?startDate&endDate` | ADMIN / STAFF |
| GET    | `/api/analytics/agent-performance` | ADMIN / STAFF |

### Admin — `/api/admin` (ADMIN only)

| Method  | Path             | Notes                                  |
| ------- | ---------------- | -------------------------------------- |
| GET     | `/dashboard`     | totals                                 |
| GET     | `/users`         | paginated, search + role filter        |
| GET     | `/users/:id`     | detail                                 |
| POST    | `/users`         | create with role/department            |
| PUT     | `/users/:id`     | update role/active/department/password |
| DELETE  | `/users/:id`     | deactivates users with history         |
| GET     | `/sla`           | SLA table per priority                 |
| PUT     | `/sla`           | update response/resolution hours       |
| GET     | `/audit-logs`    | from the `AuditLog` table (paged, search + action filter) |

### File uploads

- Producer fields: `image` (jpg/jpeg/png) and `document` (jpg/jpeg/png/pdf) — the **first**
  uploaded image becomes `imageUrl`, the **first** document becomes `documentUrl`.
- Additional files go to the `attachments` field (`ComplaintAttachment` records), **up to 10**.
- Limits: max **5 MB** each; extension + MIME whitelist enforced; sanitized filenames
  (`<timestamp>-<rand>-<name>.ext`).
- Stored under `UPLOAD_DIR` (default `./uploads`), served statically at `/uploads/<filename>`.

---

## Redis: caching, queues & rate limiting

Redis is optional but unlocks the platform features. All Redis access goes through a client that
**degrades gracefully** — if Redis is disabled or unreachable the helpers become no-ops, `express-rate-limit`
stays as the in-memory baseline, and the API keeps working (health `/api/health/redis` still answers).

### Caching

`cacheRemember(key, ttl, fn)` memoizes results; mutations invalidate the keys they touch.

| Key (`SmartComplaint:*`)      | TTL  |
| ----------------------------- | ---- |
| `user:{id}` / `department:{id}` | 5 / 2 min |
| `complaint:{id}` / `complaint:number:{n}` | 5 min |
| `dashboard:stats:{userId}`    | 1 min |
| `department:stats:{id}`       | 2 min |
| `ai:classification:{id}`      | 30 min |
| `notifications:{userId}`      | 2 min |

### Queues

Lightweight Redis-list queues consumed by background workers (`src/workers/`) started with the
server and stopped on graceful shutdown:

- `complaints` — post-submit work (classification confidence, notifications for admins/department staff).
- `notifications` — created via `enqueueNotificationJob()` (e.g. on status change, assignment, feedback).

### Distributed rate limiting

A custom middleware counts requests in Redis so limits are shared across instances:

| Scope          | Limit               | Key                          |
| -------------- | ------------------- | ---------------------------- |
| `/api/auth/login` | **5 / 15 min / IP** | `rate-limit:ip:{ip}`   |
| General `/api` | **100 / 1 min / user** | `rate-limit:user:{id}` |
| `POST /api/complaints` | **10 / hour / user** | `rate-limit:complaints:user:{id}` |

---

## Security

- **bcrypt** password hashing (10 rounds); passwords never serialized to responses.
- **JWT** access tokens with `iss`/`aud` claims (`JWT_EXPIRES_IN`, default 7d).
- **Helmet** security headers; **CORS** restricted to `CLIENT_URL`.
- **Rate limiting**: Redis-distributed limiters (auth, API, complaint submission) layered on an
  `express-rate-limit` baseline; auth events (`LOGIN`, `REGISTER`, `LOGOUT`) are audited with IP.
- **Validation** with Zod at every boundary; uploads validated by extension + MIME + size.
- **Pino logging** with automatic redaction of passwords/authorization headers.
- Environment validation fails fast and refuses to boot with a missing/invalid config.
- Production builds hide internal error details (`error: null`) and suppress SQL query logs.

---

## Tests

The suite uses a dedicated test database (`TEST_DATABASE_URL`) that Jest re-syncs automatically
via `prisma db push` in the global setup.

```bash
npm test
```

Coverage: auth (register/login/me/validation), complaints (create + auto-classification,
scoping, transitions, assignment, stats), admin (RBAC, SLA, users, audit), feedback
(resolve → feedback, duplicate prevention, status guard).

**Redis integration tests** (`tests/redis.test.ts`) are opt-in and skipped by default — run them
against a live Redis to verify ping, cache roundtrip + TTL, `cacheRemember` single-load, cache
invalidation, queue enqueue/dequeue and the 429 rate-limit path:

```bash
$env:REDIS_ENABLED='true'; npm test -- redis.test.ts   # PowerShell
REDIS_ENABLED=true npm test redis.test.ts              # bash
```

---

## Environment variables

| Variable             | Default                         | Description                            |
| -------------------- | ------------------------------- | -------------------------------------- |
| `DATABASE_URL`       | — (required)                    | PostgreSQL connection string           |
| `JWT_SECRET`         | — (required, ≥16 chars)         | Token signing secret                   |
| `JWT_EXPIRES_IN`     | `7d`                            | Token lifetime                         |
| `PORT`               | `5000`                          | Listen port                            |
| `NODE_ENV`           | `development`                   | `development` / `test` / `production`  |
| `CLIENT_URL`         | `http://localhost:3000`         | Allowed CORS origin (no wildcard)      |
| `UPLOAD_DIR`         | `./uploads`                     | Multer storage directory               |
| `TEST_DATABASE_URL`  | —                               | Used by the Jest suite only            |
| `RATE_LIMIT_MAX`     | `300`                           | Global requests / window               |
| `LOGIN_RATE_LIMIT_MAX` | `10`                          | Login attempts / 15 min                |
| `REDIS_ENABLED`      | `true`                          | `"false"` runs without Redis (degraded mode) |
| `REDIS_CONNECTION_STRING` | `redis://localhost:6379`   | Redis URL                                |
| `JWT_ISSUER`         | `smart-complaint-api`           | JWT `iss` claim                         |
| `JWT_AUDIENCE`       | `smart-complaint-app`           | JWT `aud` claim                         |

---

## Docker (optional)

A full stack (`postgres:16` + `redis:7` + the API) is defined in `docker-compose.yml`:

```bash
docker compose up -d --build     # build + start everything
docker compose ps                # watch healthchecks
docker compose logs -f backend   # follow API logs
```

The backend container runs `prisma db push` before starting, so schema is always current. Demo
data is **not** seeded automatically (the seed resets existing data), so run it once manually:

```bash
docker compose exec backend npm run db:seed
```

Healthchecks use the API's own endpoints (`/api/health/database`, `/api/health/redis`).
Stop with `docker compose down` (add `-v` to also drop the volumes).