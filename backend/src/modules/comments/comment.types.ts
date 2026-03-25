export interface Comment {
  id: string;
  threadId: string;
  author: string;
  content: string;
  reasoningScore: number;
  summary: string;
  analyzedAt: string;
  createdAt: string;
}

/** Shape returned by database rows (snake_case from pg) */
export interface CommentRow {
  id: string;
  thread_id: string;
  author: string;
  content: string;
  reasoning_score: string; // pg returns NUMERIC as string
  ai_summary: string;
  analyzed_at: Date;
  created_at: Date;
}
