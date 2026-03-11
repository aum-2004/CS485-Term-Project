/**
 * SummaryService – Business Logic Layer
 *
 * Responsibilities:
 *  1. Check Redis cache for an existing summary.
 *  2. If cache miss, check PostgreSQL.
 *  3. If no stored summary, invoke AI service to generate one.
 *  4. Persist the new summary and populate the cache (10-minute TTL).
 *
 * Private members: _repo, _commentRepo, _ai, _buildCacheKey
 * Public members:  getSummary, regenerateSummary
 */

import { redis } from "../../config/redis";
import { AIService } from "../ai/ai.service";
import { CommentRepository } from "../comments/comment.repository";
import { SummaryRepository } from "./summary.repository";
import type { DebateSummary } from "./summary.types";

const CACHE_TTL_SECONDS = 600; // 10 minutes

export class SummaryService {
  private readonly _repo: SummaryRepository;
  private readonly _commentRepo: CommentRepository;
  private readonly _ai: AIService;

  constructor(
    repo: SummaryRepository,
    commentRepo: CommentRepository,
    ai: AIService
  ) {
    this._repo = repo;
    this._commentRepo = commentRepo;
    this._ai = ai;
  }

  private _buildCacheKey(threadId: string): string {
    return `thread:${threadId}:summary`;
  }

  /**
   * Retrieve the debate summary for a thread.
   * Generates and persists one if it does not yet exist.
   * Externally visible.
   */
  async getSummary(threadId: string): Promise<DebateSummary> {
    const cacheKey = this._buildCacheKey(threadId);

    // 1. Cache hit
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as DebateSummary;
      }
    } catch {
      // Redis unavailable – degrade gracefully
    }

    // 2. DB hit
    const existing = await this._repo.findByThreadId(threadId);
    if (existing) {
      try {
        await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(existing));
      } catch {
        // Non-fatal
      }
      return existing;
    }

    // 3. Generate, persist, cache
    return this._generateAndPersist(threadId, cacheKey);
  }

  /**
   * Force re-generation of the debate summary.
   * Clears the cache and calls the AI service again.
   * Externally visible.
   */
  async regenerateSummary(threadId: string): Promise<DebateSummary> {
    const cacheKey = this._buildCacheKey(threadId);
    try {
      await redis.del(cacheKey);
    } catch {
      // Non-fatal
    }
    return this._generateAndPersist(threadId, cacheKey);
  }

  private async _generateAndPersist(
    threadId: string,
    cacheKey: string
  ): Promise<DebateSummary> {
    const comments = await this._commentRepo.findByThreadId(threadId);
    const texts = comments.map((c) => c.content);

    const aiData = await this._ai.generateDebateSummary(texts);
    const summary = await this._repo.upsert(
      threadId,
      aiData.mainPositions,
      aiData.supportingEvidence,
      aiData.areasOfDisagreement
    );

    try {
      await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(summary));
    } catch {
      // Non-fatal
    }

    return summary;
  }
}
