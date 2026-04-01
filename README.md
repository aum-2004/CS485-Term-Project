# Reddit AI Debate Analyzer

CS485 Term Project — Aryan Modi (aum23)

A full-stack web app that fetches Reddit threads and uses Google Gemini to score each comment's reasoning quality (0–100) and generate a structured debate summary.

---

## Running the App

### Prerequisites
- Node.js ≥ 18
- PostgreSQL 16 (Homebrew: `brew install postgresql@16`)
- Google Gemini API key

### Start PostgreSQL
```bash
brew services start postgresql@16
```

### Backend
```bash
cd backend
npm install
cp .env.example .env    # add your GEMINI_API_KEY
npm run db:setup        # first time only
npm run dev             # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

---

## Running Frontend Tests

**Prerequisites:** Node.js ≥ 18 — no backend, database, or API keys required.

```bash
cd frontend
npm install
npm test
```

**Run with coverage report:**
```bash
npm run test:coverage
```

Tests are in `frontend/src/tests/` and use [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/).
All network calls are mocked — no server needed.

---

## Running Backend Tests

**Prerequisites:** Node.js ≥ 18 — no database, Redis, or API keys required.

```bash
cd backend
npm install
npm test
```

**Run with coverage report:**
```bash
npm run test:coverage
```

Tests are in `backend/tests/` and use [Jest](https://jestjs.io/) + [ts-jest](https://kulshekhar.github.io/ts-jest/).
All PostgreSQL, Redis, and Gemini API calls are mocked.

---

## CI / GitHub Actions

| Workflow | Trigger | File |
|---|---|---|
| Frontend Tests | Push/PR to `frontend/**` | `.github/workflows/run-frontend-tests.yml` |
| Backend Tests | Push/PR to `backend/**` | `.github/workflows/run-backend-tests.yml` |
