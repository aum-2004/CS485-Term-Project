/**
 * CommentService – Business Logic Layer
 *
 * Responsibilities:
 *  1. Retrieve enriched comments from cache (Redis) or stable storage (PostgreSQL).
 *  2. Trigger AI analysis for any comment that has not yet been scored.
 *  3. Populate the Redis cache with a 5-minute TTL to support ≥10 simultaneous users
 *     without hammering PostgreSQL.
 *
 * Private members: _repo, _ai, _cache, _buildCacheKey, _analyseNewComments
 * Public members:  getEnrichedComments
 */

import { redis } from "../../config/redis";
import { AIService } from "../ai/ai.service";
import { CommentRepository } from "./comment.repository";
import type { Comment } from "./comment.types";

const CACHE_TTL_SECONDS = 300; // 5 minutes

export class CommentService {
  private readonly _repo: CommentRepository;
  private readonly _ai: AIService;

  constructor(repo: CommentRepository, ai: AIService) {
    this._repo = repo;
    this._ai = ai;
  }

  // Private – builds the Redis cache key for a thread's comment list.
  private _buildCacheKey(threadId: string): string {
    return `thread:${threadId}:comments`;
  }

  /**
   * Private – runs AI analysis on any comments that have not yet been scored,
   * then persists the results to PostgreSQL.
   */
  private async _analyseNewComments(threadId: string): Promise<void> {
    const unanalysed = await this._repo.findUnanalysed(threadId);
    if (unanalysed.length === 0) return;

    // Send all comments in one Gemini API call to stay within rate limits
    const analyses = await this._ai.analyseComments(unanalysed.map((c) => c.content));
    for (let i = 0; i < unanalysed.length; i++) {
      await this._repo.saveAnalysis(unanalysed[i].id, analyses[i].reasoningScore, analyses[i].summary);
    }
  }

  /**
   * Return enriched comments for a thread.
   *
   * Cache-aside pattern:
   *   1. Try Redis – return immediately if present (only cached when fully analysed).
   *   2. Fetch from PostgreSQL (instant).
   *   3. Fire AI analysis in the background for any un-scored comments.
   *   4. Populate Redis cache only when all comments are analysed.
   *
   * Externally visible.
   */
  async getEnrichedComments(threadId: string): Promise<Comment[]> {
    const cacheKey = this._buildCacheKey(threadId);

    // 1. Cache hit (only ever populated when fully analysed)
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as Comment[];
      }
    } catch {
      // Redis unavailable – degrade gracefully
    }

    // 2. Fetch from DB immediately (some may have null scores – that's fine)
    const comments = await this._repo.findByThreadId(threadId);

    // 3. Run AI analysis for any un-scored comments.
    // Must be awaited (not fire-and-forget) — Lambda freezes the process
    // the moment a response is sent, so background tasks never complete.
    const hasUnanalysed = comments.some((c) => !c.analyzedAt);
    if (hasUnanalysed) {
      try {
        await this._analyseNewComments(threadId);
      } catch (err) {
        console.warn(
          "[CommentService] AI analysis failed:",
          (err as Error).message.substring(0, 150),
        );
      }
      // Re-fetch so the response includes the freshly saved scores
      const analysed = await this._repo.findByThreadId(threadId);
      try {
        await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(analysed));
      } catch { /* non-fatal */ }
      return analysed;
    }

    // 4. All analysed – safe to cache
    try {
      await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(comments));
    } catch { /* non-fatal */ }

    return comments;
  }

  /** Invalidate the cached comment list for a thread. */
  async invalidateCache(threadId: string): Promise<void> {
    try {
      await redis.del(this._buildCacheKey(threadId));
    } catch {
      // Non-fatal
    }
  }
}
