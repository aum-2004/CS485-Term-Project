import { useEffect, useState } from "react";
import CommentCard from "./CommentCard";
import type { Comment } from "../types/Comment";
import { fetchThreadComments } from "../services/commentService";

const ThreadView = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [sortByScore, setSortByScore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComments = async () => {
      const data = await fetchThreadComments("thread-123");
      setComments(data);
      setLoading(false);
    };

    loadComments();
  }, []);

  const sortedComments = sortByScore
    ? [...comments].sort((a, b) => b.reasoningScore - a.reasoningScore)
    : comments;

  if (loading) {
    return <p>Loading comments...</p>;
  }

  return (
    <div>
      <button
        onClick={() => setSortByScore(!sortByScore)}
        style={{
          padding: "0.6rem 1rem",
          backgroundColor: "#3a3a3a",
          color: "#ffffff",
          border: "1px solid #555",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        {sortByScore ? "Default Order" : "Sort by Reasoning Score"}
      </button>

      <div style={{ marginTop: "1.5rem" }}>
        {sortedComments.map((comment) => (
          <CommentCard key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
};

export default ThreadView;
