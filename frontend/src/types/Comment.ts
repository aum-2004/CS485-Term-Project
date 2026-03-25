export interface Comment {
  id: string;
  threadId: string;
  author: string;
  content: string;
  reasoningScore: number;
  summary: string;
  analyzedAt: string; // empty string "" means not yet analysed
  createdAt: string;
}
