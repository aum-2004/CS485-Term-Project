import { useEffect, useState } from "react";
import CommentCard from "./CommentCard";
import {
  getComments,
  sortCommentsByScore
} from "../services/commentService";
import type { Comment } from "../types/Comment";

interface ThreadViewProps {
  sortByScore: boolean;
  mode: "success" | "loading" | "empty" | "error";
}

const ThreadView = ({ sortByScore, mode }: ThreadViewProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const data = await getComments();
        setComments(data);
        setError(null);
      } catch {
        setError("Failed to load comments.");
      } finally {
        setLoading(false);
      }
    };

    if (mode === "success") {
      fetchComments();
    } else {
      setLoading(false);
      setComments([]);
      setError(null);
    }
  }, [mode]);

  if (mode === "loading") {
    return (
      <p className="text-center py-10 text-gray-400 animate-pulse">
        Loading comments...
      </p>
    );
  }

  if (mode === "error") {
    return (
      <p className="text-center py-10 text-red-500">
        Failed to load comments.
      </p>
    );
  }

  if (mode === "empty") {
    return (
      <p className="text-center py-10 text-gray-400">
        No comments available.
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

  const maxScore =
    comments.length > 0
      ? Math.max(...comments.map((c) => c.reasoningScore))
      : 0;

  return (
    <div className="space-y-10">
      {displayedComments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          isTopReasoning={comment.reasoningScore === maxScore}
        />
      ))}
    </div>
  );
};

export default ThreadView;