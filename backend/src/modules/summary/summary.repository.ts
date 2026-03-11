/**
 * SummaryRepository – Data Abstraction Layer
 *
 * Stable storage: PostgreSQL via pg Pool.
 *
 * Abstraction function:
 *   DB row  →  DebateSummary domain object
 *
 * Rep invariant:
 *   Each thread_id maps to at most one row (UNIQUE constraint in schema).
 *   Arrays main_positions, supporting_evidence, areas_of_disagreement are never null.
 */

import { v4 as uuidv4 } from "uuid";
import { pool } from "../../config/database";
import type { DebateSummary, DebateSummaryRow } from "./summary.types";

function rowToSummary(row: DebateSummaryRow): DebateSummary {
  return {
    id: row.id,
    threadId: row.thread_id,
    mainPositions: row.main_positions,
    supportingEvidence: row.supporting_evidence,
    areasOfDisagreement: row.areas_of_disagreement,
    generatedAt: row.generated_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class SummaryRepository {
  /** Return the existing summary for a thread, or null if not yet generated. */
  async findByThreadId(threadId: string): Promise<DebateSummary | null> {
    const { rows } = await pool.query<DebateSummaryRow>(
      `SELECT id, thread_id, main_positions, supporting_evidence,
              areas_of_disagreement, generated_at, updated_at
         FROM debate_summaries
        WHERE thread_id = $1`,
      [threadId]
    );
    return rows.length > 0 ? rowToSummary(rows[0]) : null;
  }

  /**
   * Upsert a debate summary.
   * Creates the row on first call; updates in-place on regeneration.
   * Externally visible.
   */
  async upsert(
    threadId: string,
    mainPositions: string[],
    supportingEvidence: string[],
    areasOfDisagreement: string[]
  ): Promise<DebateSummary> {
    const id = uuidv4();
    const { rows } = await pool.query<DebateSummaryRow>(
      `INSERT INTO debate_summaries
         (id, thread_id, main_positions, supporting_evidence, areas_of_disagreement,
          generated_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (thread_id) DO UPDATE
          SET main_positions        = EXCLUDED.main_positions,
              supporting_evidence   = EXCLUDED.supporting_evidence,
              areas_of_disagreement = EXCLUDED.areas_of_disagreement,
              updated_at            = NOW()
       RETURNING *`,
      [id, threadId, mainPositions, supportingEvidence, areasOfDisagreement]
    );
    return rowToSummary(rows[0]);
  }
}
