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

// ── Comment fixtures ────────────────────────────────────────────────────────
const unanalysedComment: Comment = {
  id: "c1",
  threadId: "t1",
  author: "Alice",
  content:
    "The longitudinal design provides temporal precedence and multivariate regression controls for confounders.",
  reasoningScore: 0,
  summary: "",
  analyzedAt: "",        // falsy → triggers background analysis
  createdAt: new Date().toISOString(),
};

const analysedComment: Comment = {
  ...unanalysedComment,
  reasoningScore: 90,
  summary: "Highlights longitudinal design and temporal precedence.",
  analyzedAt: new Date().toISOString(), // truthy → already done
};

// ── Mock repository ─────────────────────────────────────────────────────────
const mockRepo = {
  findByThreadId: jest.fn().mockResolvedValue([analysedComment]),
  findUnanalysed: jest.fn().mockResolvedValue([unanalysedComment]),
  saveAnalysis: jest.fn().mockResolvedValue(undefined),
  threadExists: jest.fn().mockResolvedValue(true),
};

// ── Mock Redis (always cache-miss unless overridden) ─────────────────────────
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

  // ── Basic response shape ──────────────────────────────────────────────────

  it("returns enriched comments with reasoning score > 0", async () => {
    const comments = await service.getEnrichedComments("t1");
    expect(comments).toHaveLength(1);
    expect(comments[0].reasoningScore).toBeGreaterThan(0);
  });

  // ── Background analysis triggered only for unanalysed comments ───────────

  it("calls saveAnalysis for unanalysed comments", async () => {
    mockRepo.findByThreadId.mockResolvedValueOnce([unanalysedComment]);

    await service.getEnrichedComments("t1");
    await new Promise((r) => setImmediate(r));

    expect(mockRepo.saveAnalysis).toHaveBeenCalledWith(
      "c1",
      expect.any(Number),
      expect.any(String)
    );
  });

  it("does NOT call saveAnalysis when all comments are already analysed", async () => {
    mockRepo.findByThreadId.mockResolvedValueOnce([analysedComment]);

    await service.getEnrichedComments("t1");
    await new Promise((r) => setImmediate(r));

    expect(mockRepo.saveAnalysis).not.toHaveBeenCalled();
  });

  it("calls findUnanalysed during background analysis", async () => {
    mockRepo.findByThreadId.mockResolvedValueOnce([unanalysedComment]);

    await service.getEnrichedComments("t1");
    await new Promise((r) => setImmediate(r));

    expect(mockRepo.findUnanalysed).toHaveBeenCalledWith("t1");
  });

  // ── Cache population ──────────────────────────────────────────────────────

  it("sets cache with exact TTL of 300 seconds when all comments are analysed", async () => {
    const { redis } = await import("../src/config/redis");
    mockRepo.findByThreadId.mockResolvedValueOnce([analysedComment]);

    await service.getEnrichedComments("t1");

    expect(redis.setex).toHaveBeenCalledWith(
      "thread:t1:comments",
      300,               // must be exactly 300 – kills off-by-one mutations
      expect.any(String)
    );
  });

  it("does NOT cache when there are unanalysed comments (avoids caching partial data)", async () => {
    const { redis } = await import("../src/config/redis");
    mockRepo.findByThreadId.mockResolvedValueOnce([unanalysedComment]);

    await service.getEnrichedComments("t1");

    expect(redis.setex).not.toHaveBeenCalled();
  });

  it("uses correct cache key format thread:{threadId}:comments", async () => {
    const { redis } = await import("../src/config/redis");
    mockRepo.findByThreadId.mockResolvedValueOnce([analysedComment]);

    await service.getEnrichedComments("t1");

    expect(redis.setex).toHaveBeenCalledWith(
      "thread:t1:comments",
      expect.any(Number),
      expect.any(String)
    );
  });

  it("cache key varies with threadId", async () => {
    const { redis } = await import("../src/config/redis");
    mockRepo.findByThreadId.mockResolvedValue([analysedComment]);

    await service.getEnrichedComments("other-thread");

    expect(redis.setex).toHaveBeenCalledWith(
      "thread:other-thread:comments",
      expect.any(Number),
      expect.any(String)
    );
  });

  // ── Cache hit path ────────────────────────────────────────────────────────

  it("returns from cache when Redis has data (no DB hit)", async () => {
    const { redis } = await import("../src/config/redis");
    const cachedData = JSON.stringify([{ ...analysedComment, reasoningScore: 90 }]);
    (redis.get as jest.Mock).mockResolvedValueOnce(cachedData);

    const comments = await service.getEnrichedComments("t1");

    expect(comments[0].reasoningScore).toBe(90);
    expect(mockRepo.findByThreadId).not.toHaveBeenCalled();
  });

  it("reads cache using key thread:{threadId}:comments", async () => {
    const { redis } = await import("../src/config/redis");

    await service.getEnrichedComments("t1");

    expect(redis.get).toHaveBeenCalledWith("thread:t1:comments");
  });

  // ── invalidateCache ───────────────────────────────────────────────────────

  it("invalidateCache calls redis.del with exact key", async () => {
    const { redis } = await import("../src/config/redis");

    await service.invalidateCache("t1");

    expect(redis.del).toHaveBeenCalledWith("thread:t1:comments");
    expect(redis.del).toHaveBeenCalledTimes(1);
  });

  it("invalidateCache key includes the correct threadId", async () => {
    const { redis } = await import("../src/config/redis");

    await service.invalidateCache("thread-xyz");

    expect(redis.del).toHaveBeenCalledWith("thread:thread-xyz:comments");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

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

  it("clamps score to exactly 100 when AI returns a value above 100", async () => {
    // Override generateContent on the existing mock instance to return out-of-range score
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const mockInstance = (GoogleGenerativeAI as jest.Mock).mock.results[0]?.value;
    const mockModel = mockInstance?.getGenerativeModel?.mock?.results[0]?.value;
    if (mockModel?.generateContent) {
      (mockModel.generateContent as jest.Mock).mockResolvedValueOnce({
        response: { text: () => '[{"index":0,"reasoningScore":150,"summary":"Great."}]' },
      });
    }
    const result = await ai.analyseComment("test");
    expect(result.reasoningScore).toBeLessThanOrEqual(100);
  });

  it("clamps score to at least 0 when AI returns a negative value", async () => {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const mockInstance = (GoogleGenerativeAI as jest.Mock).mock.results[0]?.value;
    const mockModel = mockInstance?.getGenerativeModel?.mock?.results[0]?.value;
    if (mockModel?.generateContent) {
      (mockModel.generateContent as jest.Mock).mockResolvedValueOnce({
        response: { text: () => '[{"index":0,"reasoningScore":-20,"summary":"Poor."}]' },
      });
    }
    const result = await ai.analyseComment("test");
    expect(result.reasoningScore).toBeGreaterThanOrEqual(0);
  });

  it("returns empty array for empty input without calling Gemini", async () => {
    const result = await ai.analyseComments([]);
    expect(result).toEqual([]);
  });

  it("returns one result per input comment preserving order", async () => {
    const results = await ai.analyseComments(["first comment", "second comment"]);
    expect(results).toHaveLength(2);
  });
});
