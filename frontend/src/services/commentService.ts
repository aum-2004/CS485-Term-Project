import type { Comment } from "../types/Comment";
import { mockComments } from "../mock/mockComments";

export const fetchThreadComments = async (
  threadId: string
): Promise<Comment[]> => {
  console.log(`GET /api/v1/threads/${threadId}/comments`);

  await new Promise((resolve) => setTimeout(resolve, 500));

  return mockComments;
};
