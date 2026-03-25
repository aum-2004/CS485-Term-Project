/**
 * CommentController – HTTP Layer
 *
 * Externally visible REST API:
 *   GET /api/threads/:threadId/comments
 *     → 200  Comment[]
 *     → 404  { error: "Thread not found" }
 *     → 500  { error: "Internal server error" }
 */

import { Request, Response, NextFunction } from "express";
import { CommentService } from "./comment.service";
import { CommentRepository } from "./comment.repository";
import { AIService } from "../ai/ai.service";

const repo = new CommentRepository();
const ai = new AIService();
const service = new CommentService(repo, ai);

export async function getComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { threadId } = req.params;

    const exists = await repo.threadExists(threadId);
    if (!exists) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    const comments = await service.getEnrichedComments(threadId);
    res.json(comments);
  } catch (err) {
    next(err);
  }
}
