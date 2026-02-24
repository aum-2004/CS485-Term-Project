import { mockComments } from "../mock/mockComments";
import type { Comment } from "../types/Comment";

/**
 * Fisher-Yates shuffle
 * Ensures proper random distribution.
 */
const shuffleComments = (comments: Comment[]): Comment[] => {
  const shuffled = [...comments];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

export const getComments = async (): Promise<Comment[]> => {
  // simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // return shuffled comments (default order)
  return shuffleComments(mockComments);
};

export const sortCommentsByScore = (comments: Comment[]): Comment[] => {
  return [...comments].sort(
    (a, b) => b.reasoningScore - a.reasoningScore
  );
};