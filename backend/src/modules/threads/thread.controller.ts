/**
 * ThreadController – HTTP Layer
 *
 * Externally visible REST API:
 *   GET    /api/threads          → 200  Thread[]
 *   POST   /api/threads          body: { redditUrl }  → 201 Thread
 *   POST   /api/threads/custom   body: { title, comments: [{author,content}] } → 201 Thread
 *   DELETE /api/threads/:id      → 204 | 404
 */

import { Request, Response, NextFunction } from "express";
import { ThreadService } from "./thread.service";
import { ThreadRepository } from "./thread.repository";
import { RedditService } from "../../services/reddit.service";

const repo = new ThreadRepository();
const reddit = new RedditService();
const service = new ThreadService(repo, reddit);

export async function getThreads(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const threads = await service.getAllThreads();
    res.json(threads);
  } catch (err) {
    next(err);
  }
}

export async function createThread(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { redditUrl } = req.body as { redditUrl?: string };

    if (!redditUrl || typeof redditUrl !== "string" || !redditUrl.trim()) {
      res.status(400).json({ error: "redditUrl is required" });
      return;
    }

    try {
      const thread = await service.addRedditThread(redditUrl.trim());
      res.status(201).json(thread);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith("Invalid Reddit URL") || msg.startsWith("No readable comments")) {
        res.status(400).json({ error: msg });
      } else if (msg.startsWith("Failed to reach Reddit API") || msg.startsWith("Reddit API returned")) {
        res.status(502).json({ error: msg });
      } else {
        throw err;
      }
    }
  } catch (err) {
    next(err);
  }
}

export async function createCustomThread(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, comments } = req.body as {
      title?: string;
      comments?: { author: string; content: string }[];
    };

    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (!Array.isArray(comments) || comments.length === 0) {
      res.status(400).json({ error: "At least one comment is required" });
      return;
    }

    const thread = await service.createCustomThread(title.trim(), comments);
    res.status(201).json(thread);
  } catch (err) {
    next(err);
  }
}

export async function deleteThread(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { threadId } = req.params;
    const deleted = await service.deleteThread(threadId);
    if (!deleted) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/threads/seed/refresh
 * Wipes stale auto-seeded threads, fetches today's hot posts from Reddit,
 * and returns the full updated thread list.
 * Called by the frontend on every page load so users always see fresh content.
 */
export async function refreshSeededThreads(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await service.seedDefaultThreads();
    const threads = await service.getAllThreads();
    res.json(threads);
  } catch (err) {
    next(err);
  }
}
