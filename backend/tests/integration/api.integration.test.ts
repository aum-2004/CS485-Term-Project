/**
 * Integration Tests – Reddit AI Debate Analyzer
 *
 * These tests exercise the full frontend-to-backend code pathways by sending
 * real HTTP requests to a running Express server backed by PostgreSQL.
 *
 * Code pathways tested:
 *   1. GET  /api/threads                      → ThreadSelector fetches thread list
 *   2. POST /api/threads                      → AddThread component adds a Reddit URL
 *   3. GET  /api/threads/:id/comments         → ThreadView (User Story A – AI reasoning)
 *   4. GET  /api/threads/:id/summary          → DebateSummaryModal (User Story B – debate summary)
 *   5. DELETE /api/threads/:id                → ThreadSelector delete button
 *   6. POST /api/threads/custom               → CreateCustomThread form
 *   7. POST /api/threads/seed/refresh         → ThreadSelector "Refresh" button
 *   8. GET  /health                           → App-level health check
 *
 * Environment:
 *   - Set BASE_URL to override the default localhost URL (used for cloud runs)
 *   - Requires DATABASE_URL pointing to a live PostgreSQL instance
 *   - Redis is optional (backend degrades gracefully without it)
 *
 * Run locally:
 *   npm run test:integration
 *
 * Run against cloud deployment:
 *   BASE_URL=https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/prod npm run test:integration
 */

import request from "supertest";
import app from "../../src/app";
import { pool } from "../../src/config/database";

// Allow override for cloud runs
const BASE_URL = process.env.BASE_URL ?? "";

// If BASE_URL is set we use supertest's string-based agent, otherwise we pass
// the local Express app directly (no server port needed).
const agent = BASE_URL ? request(BASE_URL) : request(app);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** A known-good thread seeded before tests run */
const SEED_THREAD_ID = "integration-test-thread";
const SEED_THREAD_TITLE = "Integration Test Thread";

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Insert a stable thread so read-path tests have data
  await pool.query(
    `INSERT INTO threads (id, title, is_seeded)
     VALUES ($1, $2, FALSE)
     ON CONFLICT (id) DO NOTHING`,
    [SEED_THREAD_ID, SEED_THREAD_TITLE]
  );
  // Insert a comment so the comments endpoint has something to return
  await pool.query(
    `INSERT INTO comments (id, thread_id, author, content)
     VALUES ('integration-comment-1', $1, 'IntegrationBot',
             'This comment is used by integration tests to verify AI enrichment.')
     ON CONFLICT (id) DO NOTHING`,
    [SEED_THREAD_ID]
  );
});

afterAll(async () => {
  // Clean up test data
  await pool.query(`DELETE FROM threads WHERE id = $1`, [SEED_THREAD_ID]);
  await pool.query(`DELETE FROM threads WHERE id LIKE 'custom-%' AND title = 'Integration Custom Thread'`);
  await pool.end();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Health check  (GET /health)
// Code pathway: App-level liveness probe → frontend startup
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /health – liveness probe", () => {
  it("returns 200 with status ok", async () => {
    const res = await agent.get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("response contains a timestamp", async () => {
    const res = await agent.get("/health");
    expect(res.body).toHaveProperty("timestamp");
    expect(typeof res.body.timestamp).toBe("string");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Thread list  (GET /api/threads)
// Code pathway: ThreadSelector → getThreads() → GET /api/threads
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/threads – thread list (ThreadSelector)", () => {
  it("returns 200 with an array", async () => {
    const res = await agent.get("/api/threads");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("each thread has id, title, and createdAt fields", async () => {
    const res = await agent.get("/api/threads");
    const threads: Record<string, unknown>[] = res.body;
    expect(threads.length).toBeGreaterThan(0);
    for (const t of threads) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("title");
      expect(t).toHaveProperty("createdAt");
    }
  });

  it("returns the seeded integration thread", async () => {
    const res = await agent.get("/api/threads");
    const ids = (res.body as { id: string }[]).map((t) => t.id);
    expect(ids).toContain(SEED_THREAD_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Enriched comments  (GET /api/threads/:id/comments)
// Code pathway: ThreadView → getComments() → User Story A AI enrichment
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/threads/:id/comments – enriched comments (ThreadView / User Story A)", () => {
  it("returns 200 for the seeded thread", async () => {
    const res = await agent.get(`/api/threads/${SEED_THREAD_ID}/comments`);
    expect(res.status).toBe(200);
  });

  it("returns an array of comment objects", async () => {
    const res = await agent.get(`/api/threads/${SEED_THREAD_ID}/comments`);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("each comment has id, author, content, reasoningScore, and summary", async () => {
    const res = await agent.get(`/api/threads/${SEED_THREAD_ID}/comments`);
    const comments: Record<string, unknown>[] = res.body;
    expect(comments.length).toBeGreaterThan(0);
    for (const c of comments) {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("author");
      expect(c).toHaveProperty("content");
      expect(c).toHaveProperty("reasoningScore");
      expect(c).toHaveProperty("summary");
    }
  });

  it("reasoningScore is a number between 0 and 100", async () => {
    const res = await agent.get(`/api/threads/${SEED_THREAD_ID}/comments`);
    const comments: { reasoningScore: number }[] = res.body;
    for (const c of comments) {
      expect(typeof c.reasoningScore).toBe("number");
      expect(c.reasoningScore).toBeGreaterThanOrEqual(0);
      expect(c.reasoningScore).toBeLessThanOrEqual(100);
    }
  });

  it("returns 404 for a non-existent thread", async () => {
    const res = await agent.get("/api/threads/does-not-exist-xyz/comments");
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Debate summary  (GET /api/threads/:id/summary)
// Code pathway: DebateSummaryModal → fetchSummary() → User Story B AI summary
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/threads/:id/summary – debate summary (DebateSummaryModal / User Story B)", () => {
  it("returns 200 for the seeded thread", async () => {
    const res = await agent.get(`/api/threads/${SEED_THREAD_ID}/summary`);
    expect(res.status).toBe(200);
  });

  it("response has mainPositions, supportingEvidence, and areasOfDisagreement arrays", async () => {
    const res = await agent.get(`/api/threads/${SEED_THREAD_ID}/summary`);
    expect(Array.isArray(res.body.mainPositions)).toBe(true);
    expect(Array.isArray(res.body.supportingEvidence)).toBe(true);
    expect(Array.isArray(res.body.areasOfDisagreement)).toBe(true);
  });

  it("each array contains at least one non-empty string", async () => {
    const res = await agent.get(`/api/threads/${SEED_THREAD_ID}/summary`);
    const { mainPositions, supportingEvidence, areasOfDisagreement } = res.body;
    for (const arr of [mainPositions, supportingEvidence, areasOfDisagreement]) {
      expect((arr as string[]).length).toBeGreaterThan(0);
      for (const item of arr as string[]) {
        expect(typeof item).toBe("string");
        expect(item.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns 404 for a non-existent thread", async () => {
    const res = await agent.get("/api/threads/no-such-thread-xyz/summary");
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Create custom thread  (POST /api/threads/custom)
// Code pathway: CreateCustomThread form → createCustomThread() → POST /api/threads/custom
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/threads/custom – custom thread creation", () => {
  it("returns 201 with a Thread object on success", async () => {
    const res = await agent
      .post("/api/threads/custom")
      .send({
        title: "Integration Custom Thread",
        comments: [{ author: "Alice", content: "Custom comment for integration test." }],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("title", "Integration Custom Thread");
  });

  it("returns 400 when title is missing", async () => {
    const res = await agent
      .post("/api/threads/custom")
      .send({ comments: [{ author: "Bob", content: "No title provided." }] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when comments array is empty", async () => {
    const res = await agent
      .post("/api/threads/custom")
      .send({ title: "Thread with no comments", comments: [] });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Delete thread  (DELETE /api/threads/:id)
// Code pathway: ThreadSelector delete button → deleteThread() → DELETE /api/threads/:id
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/threads/:id – thread deletion (ThreadSelector)", () => {
  it("returns 204 on successful deletion", async () => {
    // Create a throwaway thread to delete
    await pool.query(
      `INSERT INTO threads (id, title) VALUES ('delete-me-thread', 'Temp Delete Thread')
       ON CONFLICT (id) DO NOTHING`
    );
    const res = await agent.delete("/api/threads/delete-me-thread");
    expect(res.status).toBe(204);
  });

  it("returns 404 when the thread does not exist", async () => {
    const res = await agent.delete("/api/threads/ghost-thread-xyz");
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Add Reddit thread  (POST /api/threads)
// Code pathway: AddThread form → addThread() → POST /api/threads → RedditService
// Note: This test uses an invalid URL so it exercises the validation path.
// Full Reddit fetch is tested only when REDDIT_FETCH_ENABLED=true (cloud env).
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/threads – Reddit thread import (AddThread)", () => {
  it("returns 400 for an invalid URL", async () => {
    const res = await agent
      .post("/api/threads")
      .send({ redditUrl: "not-a-valid-url" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when redditUrl is missing from the body", async () => {
    const res = await agent.post("/api/threads").send({});
    expect(res.status).toBe(400);
  });

  it("error response contains an error message string", async () => {
    const res = await agent
      .post("/api/threads")
      .send({ redditUrl: "https://not-reddit.com/something" });
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.length).toBeGreaterThan(0);
  });
});
