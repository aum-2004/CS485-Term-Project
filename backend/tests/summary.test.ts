/**
 * Tests for User Story B – Moderator Debate Summary
 *
 * Program path:
 *   GET /api/threads/:threadId/summary
 *     → SummaryController
 *     → SummaryRepository (mocked PostgreSQL)
 *     → CommentRepository (mocked – provides comment texts to AI)
 *     → AIService (mocked)
 *     → SummaryService (cache-aside via mocked Redis)
 *     → 200 DebateSummary
 */

import { SummaryService } from "../src/modules/summary/summary.service";
import { AIService } from "../src/modules/ai/ai.service";
import type { DebateSummary } from "../src/modules/summary/summary.types";
import type { Comment } from "../src/modules/comments/comment.types";

// ── Mock Gemini so tests never hit the real API ─────────────────────────────
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () =>
            '{"mainPositions":["Position A","Position B"],"supportingEvidence":["Evidence 1"],"areasOfDisagreement":["Disagreement 1"]}',
        },
      }),
    }),
  })),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────
const mockSummary: DebateSummary = {
  id: "s1",
  threadId: "t1",
  mainPositions: ["Position A", "Position B"],
  supportingEvidence: ["Evidence 1"],
  areasOfDisagreement: ["Disagreement 1"],
  generatedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockComment: Comment = {
  id: "c1",
  threadId: "t1",
  author: "Alice",
  content: "The longitudinal study establishes temporal precedence.",
  reasoningScore: 90,
  summary: "Supports causal inference via longitudinal design.",
  analyzedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

// ── Mock repos ────────────────────────────────────────────────────────────────
const mockSummaryRepo = {
  findByThreadId: jest.fn(),
  upsert: jest.fn().mockResolvedValue(mockSummary),
};

const mockCommentRepo = {
  findByThreadId: jest.fn().mockResolvedValue([mockComment]),
  threadExists: jest.fn().mockResolvedValue(true),
};

jest.mock("../src/config/redis", () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
  },
}));

// ─────────────────────────────────────────────────────────────────────────────

describe("SummaryService – User Story B", () => {
  let service: SummaryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SummaryService(
      mockSummaryRepo as never,
      mockCommentRepo as never,
      new AIService()
    );
  });

  // ── Generate on first request ─────────────────────────────────────────────

  it("generates and returns a new summary when none exists", async () => {
    mockSummaryRepo.findByThreadId.mockResolvedValueOnce(null);

    const summary = await service.getSummary("t1");

    expect(mockSummaryRepo.upsert).toHaveBeenCalled();
    expect(summary.mainPositions.length).toBeGreaterThan(0);
    expect(summary.supportingEvidence.length).toBeGreaterThan(0);
    expect(summary.areasOfDisagreement.length).toBeGreaterThan(0);
  });

  it("upsert receives the correct threadId", async () => {
    mockSummaryRepo.findByThreadId.mockResolvedValueOnce(null);

    await service.getSummary("t1");

    expect(mockSummaryRepo.upsert).toHaveBeenCalledWith(
      "t1",
      expect.any(Array),
      expect.any(Array),
      expect.any(Array)
    );
  });

  it("upsert is called with all three non-empty arrays", async () => {
    mockSummaryRepo.findByThreadId.mockResolvedValueOnce(null);

    await service.getSummary("t1");

    const [, positions, evidence, disagreements] = (mockSummaryRepo.upsert as jest.Mock).mock.calls[0];
    expect(positions.length).toBeGreaterThan(0);
    expect(evidence.length).toBeGreaterThan(0);
    expect(disagreements.length).toBeGreaterThan(0);
  });

  // ── Return stored summary without AI ─────────────────────────────────────

  it("returns stored summary without calling AI when one already exists", async () => {
    mockSummaryRepo.findByThreadId.mockResolvedValueOnce(mockSummary);

    const summary = await service.getSummary("t1");

    expect(mockSummaryRepo.upsert).not.toHaveBeenCalled();
    expect(summary.id).toBe("s1");
  });

  it("caches the summary loaded from DB with exact TTL of 600 seconds", async () => {
    const { redis } = await import("../src/config/redis");
    mockSummaryRepo.findByThreadId.mockResolvedValueOnce(mockSummary);

    await service.getSummary("t1");

    expect(redis.setex).toHaveBeenCalledWith(
      "thread:t1:summary",
      600,               // must be exactly 600 – kills off-by-one mutations
      expect.any(String)
    );
  });

  // ── Cache population after generation ────────────────────────────────────

  it("caches the newly generated summary with exact TTL of 600 seconds", async () => {
    const { redis } = await import("../src/config/redis");
    mockSummaryRepo.findByThreadId.mockResolvedValueOnce(null);

    await service.getSummary("t1");

    expect(redis.setex).toHaveBeenCalledWith(
      "thread:t1:summary",
      600,
      expect.any(String)
    );
  });

  it("uses correct cache key format thread:{threadId}:summary", async () => {
    const { redis } = await import("../src/config/redis");
    mockSummaryRepo.findByThreadId.mockResolvedValueOnce(null);

    await service.getSummary("t1");

    expect(redis.setex).toHaveBeenCalledWith(
      "thread:t1:summary",
      expect.any(Number),
      expect.any(String)
    );
  });

  // ── Cache hit path ────────────────────────────────────────────────────────

  it("returns cached summary without hitting DB", async () => {
    const { redis } = await import("../src/config/redis");
    (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockSummary));

    const summary = await service.getSummary("t1");

    expect(summary.id).toBe("s1");
    expect(mockSummaryRepo.findByThreadId).not.toHaveBeenCalled();
  });

  it("reads cache using key thread:{threadId}:summary", async () => {
    const { redis } = await import("../src/config/redis");

    await service.getSummary("t1");

    expect(redis.get).toHaveBeenCalledWith("thread:t1:summary");
  });

  // ── regenerateSummary ─────────────────────────────────────────────────────

  it("regenerateSummary forces a new AI call and upsert", async () => {
    const newSummary = await service.regenerateSummary("t1");

    expect(mockSummaryRepo.upsert).toHaveBeenCalled();
    expect(newSummary).toBeDefined();
  });

  it("regenerateSummary deletes the cache before generating", async () => {
    const { redis } = await import("../src/config/redis");

    await service.regenerateSummary("t1");

    expect(redis.del).toHaveBeenCalledWith("thread:t1:summary");
  });

  it("regenerateSummary calls redis.del before redis.setex (correct order)", async () => {
    const { redis } = await import("../src/config/redis");
    const callOrder: string[] = [];
    (redis.del as jest.Mock).mockImplementation(() => { callOrder.push("del"); return Promise.resolve(1); });
    (redis.setex as jest.Mock).mockImplementation(() => { callOrder.push("setex"); return Promise.resolve("OK"); });

    await service.regenerateSummary("t1");

    expect(callOrder[0]).toBe("del");
    expect(callOrder).toContain("setex");
  });

  // ── AI failure must not persist ───────────────────────────────────────────

  it("does NOT call upsert when AI throws (bad data must not reach DB)", async () => {
    // Spy directly on AIService so we bypass the module-level singleton
    const ai = new AIService();
    jest.spyOn(ai, "generateDebateSummary").mockRejectedValueOnce(
      new Error("Gemini down — not a quota error")
    );
    const failingService = new SummaryService(
      mockSummaryRepo as never,
      mockCommentRepo as never,
      ai
    );
    mockSummaryRepo.findByThreadId.mockResolvedValueOnce(null);

    await expect(failingService.getSummary("t1")).rejects.toThrow();
    expect(mockSummaryRepo.upsert).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("AIService – debate summary", () => {
  const ai = new AIService();

  it("returns mainPositions, supportingEvidence, and areasOfDisagreement arrays", async () => {
    const result = await ai.generateDebateSummary([
      "Comment about correlation vs causation.",
    ]);
    expect(Array.isArray(result.mainPositions)).toBe(true);
    expect(Array.isArray(result.supportingEvidence)).toBe(true);
    expect(Array.isArray(result.areasOfDisagreement)).toBe(true);
  });

  it("each array has at least one item", async () => {
    const result = await ai.generateDebateSummary(["Text."]);
    expect(result.mainPositions.length).toBeGreaterThan(0);
    expect(result.supportingEvidence.length).toBeGreaterThan(0);
    expect(result.areasOfDisagreement.length).toBeGreaterThan(0);
  });

  it("each item in every array is a non-empty string", async () => {
    const result = await ai.generateDebateSummary(["Text."]);
    for (const item of [...result.mainPositions, ...result.supportingEvidence, ...result.areasOfDisagreement]) {
      expect(typeof item).toBe("string");
      expect(item.length).toBeGreaterThan(0);
    }
  });
});
