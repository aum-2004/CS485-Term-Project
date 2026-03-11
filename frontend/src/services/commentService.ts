import type { Comment } from "../types/Comment";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const shuffleComments = (comments: Comment[]): Comment[] => {
  const shuffled = [...comments];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const getComments = async (threadId: string): Promise<Comment[]> => {
  const response = await fetch(`${API_BASE}/api/threads/${threadId}/comments`);
  if (!response.ok) throw new Error(`Failed to fetch comments: ${response.status}`);
  const data: Comment[] = await response.json();
  return shuffleComments(data);
};

export const sortCommentsByScore = (comments: Comment[]): Comment[] => {
  return [...comments].sort((a, b) => b.reasoningScore - a.reasoningScore);
};
