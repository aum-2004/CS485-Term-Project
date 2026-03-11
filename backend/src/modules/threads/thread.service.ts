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
   * Fetch hot posts from a curated set of subreddits and persist them
   * so users see real threads the moment they open the app.
   * Skips any thread already in the DB (idempotent).
   * Externally visible.
   */
  async seedDefaultThreads(): Promise<void> {
    const SUBREDDITS = ["technology", "worldnews", "science"];
    const POSTS_PER_SUB = 1; // 1 hot post per subreddit = 3 default threads

    for (const sub of SUBREDDITS) {
      try {
        const urls = await this._reddit.fetchSubredditHot(sub, POSTS_PER_SUB + 2);
        for (const url of urls) {
          try {
            await this.addRedditThread(url); // idempotent
            break; // only need 1 successful thread per sub
          } catch {
            // comment-less or deleted post – try the next one
          }
        }
      } catch (err) {
        console.warn(`[seed] Could not fetch r/${sub}:`, (err as Error).message);
      }
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
