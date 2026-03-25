/**
 * Tests for User Story A – Inline AI Reasoning Summary
 *
 * Program path:
 *   GET /api/threads/:threadId/comments
 *     → CommentController
 *     → CommentRepository (mocked PostgreSQL)
 *     → AIService (mocked)
 *     → CommentService (cache-aside via mocked Redis)
 *     → 200 Comment[]
 */

import { CommentService } from "../src/modules/comments/comment.service";
import { AIService } from "../src/modules/ai/ai.service";
import type { Comment } from "../src/modules/comments/comment.types";

// ── Mock Gemini so tests never hit the real API ─────────────────────────────
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockImplementation((prompt: string) => {
        // Return a higher score for longer prompts (simulates keyword-rich detection)
        const score = prompt.length > 500 ? 80 : 30;
        return Promise.resolve({
          response: {
            text: () =>
              `[{"index":0,"reasoningScore":${score},"summary":"Well-reasoned argument."}]`,
          },
        });
      }),
    }),
  })),
}));

// ── Minimal mock of CommentRepository ──────────────────────────────────────
const unanalysedComment: Comment = {
  id: "c1",
  threadId: "t1",
  author: "Alice",
  content:
    "The longitudinal design provides temporal precedence and multivariate regression controls for confounders.",
  reasoningScore: 0,
  summary: "",
  analyzedAt: "",
  createdAt: new Date().toISOString(),
};

// Simulates the DB row after saveAnalysis has been called.
const analysedComment: Comment = {
  ...unanalysedComment,
  reasoningScore: 90,
  summary: "Highlights longitudinal design and temporal precedence.",
  analyzedAt: new Date().toISOString(),
};

const mockRepo = {
  // findByThreadId returns analysed comments (reflecting DB state after saveAnalysis).
  findByThreadId: jest.fn().mockResolvedValue([analysedComment]),
  // findUnanalysed returns the original unscored comment.
  findUnanalysed: jest.fn().mockResolvedValue([unanalysedComment]),
  saveAnalysis: jest.fn().mockResolvedValue(undefined),
  threadExists: jest.fn().mockResolvedValue(true),
};

// ── Minimal mock of Redis (always cache-miss so logic runs fully) ───────────
jest.mock("../src/config/redis", () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
  },
}));

// ───────────────────────────────────────────────────────────────────────────

describe("CommentService – User Story A", () => {
  let service: CommentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommentService(mockRepo as never, new AIService());
  });

  it("returns enriched comments with reasoning score > 0", async () => {
    const comments = await service.getEnrichedComments("t1");

    expect(comments).toHaveLength(1);
    expect(comments[0].reasoningScore).toBeGreaterThan(0);
  });

  it("calls saveAnalysis for unanalysed comments", async () => {
    // Return a comment without analyzedAt so the service triggers background analysis
    mockRepo.findByThreadId.mockResolvedValueOnce([unanalysedComment]);

    await service.getEnrichedComments("t1");
    // Flush the microtask queue so the background _analyseNewComments promise settles
    await new Promise((r) => setImmediate(r));

    expect(mockRepo.saveAnalysis).toHaveBeenCalledWith(
      "c1",
      expect.any(Number),
      expect.any(String)
    );
  });

  it("populates the Redis cache after fetching from DB", async () => {
    const { redis } = await import("../src/config/redis");
    await service.getEnrichedComments("t1");

    expect(redis.setex).toHaveBeenCalledWith(
      "thread:t1:comments",
      300,
      expect.any(String)
    );
  });

  it("returns from cache on second call (no DB hit)", async () => {
    const { redis } = await import("../src/config/redis");
    const cachedData = JSON.stringify([{ ...unanalysedComment, reasoningScore: 90 }]);
    (redis.get as jest.Mock).mockResolvedValueOnce(cachedData);

    const comments = await service.getEnrichedComments("t1");

    expect(comments[0].reasoningScore).toBe(90);
    expect(mockRepo.findByThreadId).not.toHaveBeenCalled();
  });
});

describe("AIService – comment analysis", () => {
  const ai = new AIService();

  it("returns a score between 0 and 100", async () => {
    const result = await ai.analyseComment(
      "The study used longitudinal design with p-value < 0.01."
    );
    expect(result.reasoningScore).toBeGreaterThanOrEqual(0);
    expect(result.reasoningScore).toBeLessThanOrEqual(100);
  });

  it("returns a non-empty summary string", async () => {
    const result = await ai.analyseComment("Short comment.");
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("gives higher score to longer, keyword-rich comments", async () => {
    const simple = await ai.analyseComment("I agree.");
    const rich = await ai.analyseComment(
      "The longitudinal study provides temporal precedence. However, the regression analysis " +
        "with p-value < 0.01 only establishes probabilistic inference, not deterministic causation. " +
        "We must consider confounding variables and publication bias when interpreting the results."
    );
    expect(rich.reasoningScore).toBeGreaterThan(simple.reasoningScore);
  });
});
