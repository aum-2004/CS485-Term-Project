import { useEffect, useState } from "react";
import CommentCard from "./CommentCard";
import {
  getComments,
  sortCommentsByScore
} from "../services/commentService";
import type { Comment } from "../types/Comment";

interface ThreadViewProps {
  threadId: string;
  sortByScore: boolean;
}

const ThreadView = ({ threadId, sortByScore }: ThreadViewProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const data = await getComments(threadId);
        setComments(data);
        setError(null);
      } catch {
        setError("Failed to load comments.");
      } finally {
        setLoading(false);
      }
    };

    if (threadId) {
      fetchComments();
    } else {
      setLoading(false);
      setComments([]);
      setError(null);
    }
  }, [threadId]);

  if (error) {
    return (
      <p className="text-center py-10 text-red-500">
        Failed to load comments.
      </p>
    );
  }

  if (!threadId) {
    return (
      <p className="text-center py-10 text-gray-500">
        Paste a Reddit thread URL above to get started.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-center py-10 text-gray-400">
        Loading comments...
      </p>
    );
  }

  const displayedComments = sortByScore
    ? sortCommentsByScore(comments)
    : comments;

  // Only consider analysed comments for the "Top Reasoning" badge
  const analysedComments = comments.filter((c) => !!c.analyzedAt);
  const maxScore =
    analysedComments.length > 0
      ? Math.max(...analysedComments.map((c) => c.reasoningScore))
      : -1;

  return (
    <div className="space-y-10">
      {displayedComments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          isTopReasoning={!!comment.analyzedAt && comment.reasoningScore === maxScore}
        />
      ))}
    </div>
  );
};

export default ThreadView;