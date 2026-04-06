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

## Running Integration Tests

Integration tests exercise the full frontend-to-backend code pathways against a live PostgreSQL database.

**Prerequisites:** PostgreSQL running locally (see above) and the database migrated.

```bash
cd backend
npm run db:migrate     # if not already done
npm run test:integration
```

Run against the **cloud deployment** instead of localhost:

```bash
BASE_URL=https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/prod \
  npm run test:integration
```

Tests are in `backend/tests/integration/` and use [Jest](https://jestjs.io/) + [supertest](https://github.com/ladjs/supertest).

---

## Live Deployment

| Resource | URL |
|---|---|
| Frontend (Amplify) | `https://<branch>.amplifyapp.com` |
| Backend REST API (API Gateway → Lambda) | `https://<api-id>.execute-api.us-east-1.amazonaws.com/prod` |

> Replace the placeholder URLs above with the real endpoints once deployed.

### Using the Deployed App
1. Open the Amplify frontend URL in any browser.
2. Click **Refresh** to load the latest hot Reddit threads, or paste a Reddit thread URL to import one manually.
3. Click a thread to view AI-scored comments.
4. Click **Debate Summary** to see the AI-generated moderator summary.

---

## Deploying Your Own Instance on AWS

Follow these steps if you fork this repo and want to deploy it yourself.

### 1. Create AWS account
Sign up at [aws.amazon.com](https://aws.amazon.com). Free-tier is sufficient for this project.

### 2. Create an RDS PostgreSQL database (free tier)
```
Engine: PostgreSQL 16
Instance class: db.t3.micro (free tier)
DB name: debate_analyzer
Username: debate_user
Password: <your-password>
```
Note the endpoint — you'll use it as `DATABASE_URL`.

### 3. Package and deploy the Lambda function
```bash
cd backend
cp .env.example .env
# Set DATABASE_URL, GEMINI_API_KEY, CORS_ORIGIN in .env
npm ci
npm run build:lambda     # compiles TS + zips dist/ + node_modules
aws lambda create-function \
  --function-name debate-analyzer-backend \
  --runtime nodejs20.x \
  --handler lambda.lambdaHandler \
  --zip-file fileb://lambda.zip \
  --role arn:aws:iam::<account-id>:role/lambda-execution-role \
  --environment "Variables={DATABASE_URL=...,GEMINI_API_KEY=...,CORS_ORIGIN=...}"
```

### 4. Create API Gateway (REST API)
- Create a new REST API in the AWS Console.
- Add a **proxy resource** (`/{proxy+}`) pointing to the Lambda function.
- Deploy the API to a stage named `prod`.
- Note the **Invoke URL** — this is your backend endpoint.

### 5. Deploy the frontend to Amplify
- In the AWS Amplify Console, click **New app → Host web app**.
- Connect your GitHub repository.
- Set **App root directory** to `frontend`.
- Set build command: `npm run build` and output dir: `dist`.
- Add environment variable: `VITE_API_URL=<your-api-gateway-invoke-url>`.
- Deploy.

### 6. Set GitHub Actions secrets
In your GitHub repo Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_REGION` | e.g. `us-east-1` |
| `LAMBDA_FUNCTION_NAME` | e.g. `debate-analyzer-backend` |
| `AMPLIFY_APP_ID` | From Amplify console (e.g. `d1abc123xyz`) |
| `VITE_API_URL` | API Gateway invoke URL |
| `GEMINI_API_KEY` | Google Gemini API key |

---

## CI / GitHub Actions

| Workflow | Trigger | File |
|---|---|---|
| Frontend Tests | Push/PR to `frontend/**` | `.github/workflows/run-frontend-tests.yml` |
| Backend Tests | Push/PR to `backend/**` | `.github/workflows/run-backend-tests.yml` |
| Integration Tests | Every push/PR | `.github/workflows/run-integration-tests.yml` |
| Deploy Backend → Lambda | Push to `main` (backend changes) | `.github/workflows/deploy-aws-lambda.yml` |
| Deploy Frontend → Amplify | Push to `main` (frontend changes) | `.github/workflows/deploy-aws-amplify.yml` |
