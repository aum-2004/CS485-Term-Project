/**
 * SummaryController – HTTP Layer
 *
 * Externally visible REST API:
 *   GET  /api/threads/:threadId/summary
 *     → 200  DebateSummary
 *     → 404  { error: "Thread not found" }
 *     → 500  { error: "Internal server error" }
 *
 *   POST /api/threads/:threadId/summary/regenerate
 *     → 200  DebateSummary  (freshly regenerated)
 *     → 404  { error: "Thread not found" }
 *     → 500  { error: "Internal server error" }
 */

import { Request, Response, NextFunction } from "express";
import { SummaryService } from "./summary.service";
import { SummaryRepository } from "./summary.repository";
import { CommentRepository } from "../comments/comment.repository";
import { AIService } from "../ai/ai.service";

const summaryRepo = new SummaryRepository();
const commentRepo = new CommentRepository();
const ai = new AIService();
const service = new SummaryService(summaryRepo, commentRepo, ai);

async function assertThreadExists(
  threadId: string,
  res: Response
): Promise<boolean> {
  const exists = await commentRepo.threadExists(threadId);
  if (!exists) {
    res.status(404).json({ error: "Thread not found" });
    return false;
  }
  return true;
}

export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { threadId } = req.params;
    if (!(await assertThreadExists(threadId, res))) return;

    const summary = await service.getSummary(threadId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function regenerateSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { threadId } = req.params;
    if (!(await assertThreadExists(threadId, res))) return;

    const summary = await service.regenerateSummary(threadId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}
