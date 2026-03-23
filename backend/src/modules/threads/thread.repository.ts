/**
 * ThreadRepository – Data Abstraction Layer
 *
 * Stable storage: PostgreSQL via pg Pool.
 *
 * Abstraction function:
 *   DB row → Thread domain object
 *
 * Rep invariant:
 *   Every thread row has a non-null id and title.
 *   comment_count is derived from a LEFT JOIN and is always ≥ 0.
 */

import { pool } from "../../config/database";
import type { Thread, ThreadRow } from "./thread.types";

function rowToThread(row: ThreadRow): Thread {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
    commentCount: parseInt(row.comment_count ?? "0", 10),
  };
}


export class ThreadRepository {
  /** Return all threads ordered newest-first, with comment counts. */
  async findAll(): Promise<Thread[]> {
    const { rows } = await pool.query<ThreadRow>(
      `SELECT t.id, t.title, t.created_at,
              COUNT(c.id)::text AS comment_count
         FROM threads t
         LEFT JOIN comments c ON c.thread_id = t.id
        GROUP BY t.id, t.title, t.created_at
        ORDER BY t.created_at DESC`
    );
    return rows.map(rowToThread);
  }

  /** Check whether a thread already exists. */
  async exists(id: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM threads WHERE id = $1`,
      [id]
    );
    return rows.length > 0;
  }

  /**
   * Create a thread. Idempotent – does nothing if the thread already exists.
   * Pass isSeeded=true for auto-seeded Reddit threads so they can be refreshed later.
   * Externally visible.
   */
  async create(id: string, title: string, isSeeded = false): Promise<void> {
    await pool.query(
      `INSERT INTO threads (id, title, is_seeded)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET is_seeded = EXCLUDED.is_seeded`,
      [id, title, isSeeded]
    );
  }

  /**
   * Delete all auto-seeded threads (and their comments/summaries via CASCADE).
   * Called before re-seeding so users always see fresh Reddit posts.
   * Externally visible.
   */
  async deleteAllSeeded(): Promise<void> {
    await pool.query(`DELETE FROM threads WHERE is_seeded = TRUE`);
  }

  /** Delete a thread and all its comments/summaries (CASCADE). */
  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM threads WHERE id = $1`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Insert a single comment. Idempotent – does nothing if id already exists.
   * Externally visible.
   */
  async insertComment(
    threadId: string,
    id: string,
    author: string,
    content: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO comments (id, thread_id, author, content)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [id, threadId, author, content]
    );
  }
}
