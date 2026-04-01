# Reddit AI Debate Analyzer – Backend

Node.js + Express + TypeScript backend for the CS485 Term Project.
Supports **User Story A** (Inline AI Reasoning Summary) and **User Story B** (Moderator Debate Summary).

---

## Dependencies

| Name | Type | Purpose |
|------|------|---------|
| `express` | framework | HTTP server & routing |
| `cors` | middleware | Cross-origin requests from the Vite frontend |
| `pg` | driver | PostgreSQL client (connection pooling) |
| `ioredis` | driver | Redis client for caching |
| `uuid` | utility | Generate UUIDs for new DB rows |
| `dotenv` | utility | Load environment variables from `.env` |
| `typescript` | dev | Type-safe compilation |
| `ts-node-dev` | dev | Hot-reload during development |
| `jest` + `ts-jest` | dev | Unit test runner |
| `supertest` | dev | HTTP integration testing |

### External services (mocked in P4, real in P5)

| Service | Purpose | Mock behaviour |
|---------|---------|---------------|
| OpenAI GPT-4 | Comment reasoning scores + debate summaries | `AIService` returns deterministic heuristic scores |

---

## Databases

| Database | Tables | Description |
|----------|--------|-------------|
| PostgreSQL | `threads` | One row per discussion thread |
| PostgreSQL | `comments` | Comments with AI-generated `reasoning_score` and `ai_summary` |
| PostgreSQL | `debate_summaries` | AI-generated debate summary per thread |
| Redis | _(key-value)_ | Cache: `thread:{id}:comments` (5 min TTL), `thread:{id}:summary` (10 min TTL) |

---

## Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL + Redis)
- Node.js ≥ 18
- npm ≥ 9

### Install dependencies

```bash
cd backend
npm install
```

### Configure environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work with the docker-compose stack)
```

### Start infrastructure

```bash
docker compose up -d
# Wait for the health checks to pass (~10 s)
```

### Run migrations & seed data

```bash
npm run db:setup
```

### Start the backend (development)

```bash
npm run dev
# Listening on http://localhost:3001
```

---

## Startup / Stop / Reset

### Start

```bash
docker compose up -d          # start PostgreSQL + Redis
npm run dev                   # start backend (hot-reload)
```

### Stop

```bash
# Ctrl-C to stop the backend process
docker compose stop           # stop containers without removing data
```

### Full reset (wipe all data)

```bash
docker compose down -v        # stop containers AND delete volumes
docker compose up -d
npm run db:setup              # re-run migrations + seed
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/threads/:threadId/comments` | User Story A – enriched comments |
| `GET` | `/api/threads/:threadId/summary` | User Story B – debate summary |
| `POST` | `/api/threads/:threadId/summary/regenerate` | Force new debate summary |

The default thread ID used by the frontend is **`thread-default`**.

---

## Running tests

### Prerequisites
- Node.js ≥ 18
- No database or Redis required — all external calls are mocked with Jest

### Run all tests
```bash
cd backend
npm install        # first time only
npm test           # runs all 35 tests
```

### Run tests with coverage report
```bash
npm run test:coverage
```

Tests are in `backend/tests/`. All database and Redis calls are mocked with Jest so no infrastructure is needed.
