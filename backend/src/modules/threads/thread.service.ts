/**
 * ThreadService – Business Logic Layer
 *
 * Responsibilities:
 *  1. Return the list of all threads from PostgreSQL.
 *  2. Accept a Reddit URL, fetch the thread from Reddit's public API,
 *     persist it (idempotent), and return the Thread object.
 *
 * AI analysis of comments is NOT triggered here.
 * It happens lazily on the first call to CommentService.getEnrichedComments(),
 * which already handles unanalysed rows via _analyseNewComments().
 *
 * Private members: _repo, _reddit
 * Public members:  getAllThreads, addRedditThread
 */

import { RedditService } from "../../services/reddit.service";
import { ThreadRepository } from "./thread.repository";
import type { Thread } from "./thread.types";

export class ThreadService {
  private readonly _repo: ThreadRepository;
  private readonly _reddit: RedditService;

  constructor(repo: ThreadRepository, reddit: RedditService) {
    this._repo = repo;
    this._reddit = reddit;
  }

  /** Return all persisted threads. Externally visible. */
  async getAllThreads(): Promise<Thread[]> {
    return this._repo.findAll();
  }

  /**
   * Wipe all previously seeded threads, then fetch today's hot posts from
   * a curated set of subreddits so users always see fresh content.
   * User-added threads (is_seeded=false) are never touched.
   * Externally visible.
   */
  async seedDefaultThreads(): Promise<void> {
    const SUBREDDITS = [
      "technology", "worldnews", "science",
      "todayilearned", "news", "space",
    ];
    const POSTS_PER_SUB = 3;  // top 3 per subreddit = up to 18 total
    const CANDIDATES    = 8;  // fetch a few extras to skip comment-less posts

    // Remove stale seeded threads so fresh ones take their place
    await this._repo.deleteAllSeeded();
    console.log("[seed] Cleared old seeded threads");

    for (const sub of SUBREDDITS) {
      let added = 0;
      try {
        const urls = await this._reddit.fetchSubredditHot(sub, CANDIDATES);
        for (const url of urls) {
          if (added >= POSTS_PER_SUB) break;
          try {
            await this._addRedditThreadAsSeeded(url);
            console.log(`[seed] Added fresh thread from r/${sub}`);
            added++;
          } catch {
            // comment-less or deleted post – try next candidate
          }
        }
      } catch (err) {
        console.warn(`[seed] Could not fetch r/${sub}:`, (err as Error).message);
      }
    }
  }

  /**
   * Internal helper: fetch a Reddit thread and persist it marked as seeded.
   */
  private async _addRedditThreadAsSeeded(redditUrl: string): Promise<void> {
    const fetched = await this._reddit.fetchThread(redditUrl);
    const { threadId, title, comments } = fetched;

    await this._repo.create(threadId, title, true); // isSeeded = true
    for (const c of comments) {
      await this._repo.insertComment(threadId, c.id, c.author, c.content);
    }
  }

  /** Delete a thread and all its data. Returns false if not found. Externally visible. */
  async deleteThread(id: string): Promise<boolean> {
    return this._repo.delete(id);
  }

  /**
   * Create a custom (non-Reddit) thread with manually provided comments.
   * Externally visible.
   */
  async createCustomThread(
    title: string,
    comments: { author: string; content: string }[]
  ): Promise<Thread> {
    const threadId = `custom_${Date.now()}`;
    await this._repo.create(threadId, title);
    for (let i = 0; i < comments.length; i++) {
      await this._repo.insertComment(threadId, `${threadId}_c${i}`, comments[i].author, comments[i].content);
    }
    const all = await this._repo.findAll();
    return all.find((t) => t.id === threadId)!;
  }

  /**
   * Fetch a Reddit thread by URL, persist it, and return the Thread object.
   * Idempotent: if the thread is already in the DB the existing data is returned.
   * Externally visible.
   */
  async addRedditThread(redditUrl: string): Promise<Thread> {
    const fetched = await this._reddit.fetchThread(redditUrl);
    const { threadId, title, comments } = fetched;

    if (!(await this._repo.exists(threadId))) {
      await this._repo.create(threadId, title);
      for (const c of comments) {
        await this._repo.insertComment(threadId, c.id, c.author, c.content);
      }
    }

    const all = await this._repo.findAll();
    return all.find((t) => t.id === threadId)!;
  }
}
