/**
 * CommentRepository – Data Abstraction Layer
 *
 * Stable storage: PostgreSQL via pg Pool.
 *
 * Abstraction function:
 *   DB row  →  Comment domain object
 *
 * Rep invariant:
 *   Every row has a non-null id, thread_id, author, and content.
 *   reasoning_score and ai_summary are non-null only after the AI analysis step.
 */

import { pool } from "../../config/database";
import type { Comment, CommentRow } from "./comment.types";

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    threadId: row.thread_id,
    author: row.author,
    content: row.content,
    reasoningScore: parseFloat(row.reasoning_score ?? "0"),
    summary: row.ai_summary ?? "",
    analyzedAt: row.analyzed_at?.toISOString() ?? "",
    createdAt: row.created_at.toISOString(),
  };
}

export class CommentRepository {
  /** Return all comments for a thread, ordered by creation time ascending. */
  async findByThreadId(threadId: string): Promise<Comment[]> {
    const { rows } = await pool.query<CommentRow>(
      `SELECT id, thread_id, author, content, reasoning_score, ai_summary, analyzed_at, created_at
         FROM comments
        WHERE thread_id = $1
        ORDER BY created_at ASC`,
      [threadId]
    );
    return rows.map(rowToComment);
  }

  /** Return comments that have not yet been analysed by the AI service. */
  async findUnanalysed(threadId: string): Promise<Comment[]> {
    const { rows } = await pool.query<CommentRow>(
      `SELECT id, thread_id, author, content, reasoning_score, ai_summary, analyzed_at, created_at
         FROM comments
        WHERE thread_id = $1
          AND analyzed_at IS NULL`,
      [threadId]
    );
    return rows.map(rowToComment);
  }

  /**
   * Persist the AI analysis result back into stable storage.
   * Externally visible.
   */
  async saveAnalysis(
    commentId: string,
    reasoningScore: number,
    aiSummary: string
  ): Promise<void> {
    await pool.query(
      `UPDATE comments
          SET reasoning_score = $2,
              ai_summary      = $3,
              analyzed_at     = NOW()
        WHERE id = $1`,
      [commentId, reasoningScore, aiSummary]
    );
  }

  /** Check whether a thread exists. */
  async threadExists(threadId: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM threads WHERE id = $1`,
      [threadId]
    );
    return rows.length > 0;
  }
}
