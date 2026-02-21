import type { Comment } from "../types/Comment";

interface Props {
  comment: Comment;
}

const CommentCard = ({ comment }: Props) => {
  return (
    <div
      style={{
        backgroundColor: "#1e1e1e",
        border: "1px solid #333",
        padding: "1.2rem",
        marginBottom: "1rem",
        borderRadius: "10px"
      }}
    >
      <strong>{comment.author}</strong>
      <p style={{ marginTop: "0.5rem" }}>{comment.content}</p>

      <div
        style={{
          backgroundColor: "#2a2a2a",
          padding: "0.6rem",
          marginTop: "0.7rem",
          borderRadius: "6px",
          fontSize: "0.9rem"
        }}
      >
        <strong>AI Summary:</strong> {comment.summary}
      </div>

      <div style={{ marginTop: "0.6rem" }}>
        <strong>Reasoning Score:</strong> {comment.reasoningScore}
      </div>
    </div>
  );
};

export default CommentCard;
