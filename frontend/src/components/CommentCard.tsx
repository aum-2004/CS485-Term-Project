import type { Comment } from "../types/Comment";

interface CommentCardProps {
  comment: Comment;
  isTopReasoning?: boolean;
}

const CommentCard = ({ comment, isTopReasoning }: CommentCardProps) => {
  // A comment is pending if it has never been analysed yet
  const isPending = !comment.analyzedAt;

  const scoreStyles = isPending
    ? "bg-gray-700/40 text-gray-500"
    : comment.reasoningScore >= 80
    ? "bg-green-600/20 text-green-400"
    : comment.reasoningScore >= 55
    ? "bg-yellow-600/20 text-yellow-400"
    : "bg-red-600/20 text-red-400";

  return (
    <div
      className={`
        relative
        bg-[#0f172a]
        border
        ${isTopReasoning && !isPending ? "border-purple-500/40 shadow-purple-500/20 shadow-2xl" : "border-gray-800"}
        rounded-2xl
        p-6 sm:p-8
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-2xl hover:border-gray-600
        animate-[fadeIn_0.6s_ease-out]
      `}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-5 mb-6">

        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-semibold text-white shadow-md">
            {comment.author.charAt(0).toUpperCase()}
          </div>

          <div className="flex flex-col">
            <p className="text-blue-400 font-semibold text-lg tracking-wide">
              u/{comment.author}
            </p>

            {isTopReasoning && !isPending && (
              <span className="mt-2 bg-purple-600/20 text-purple-400 text-xs px-3 py-1 rounded-full w-fit backdrop-blur-sm">
                Top Reasoning
              </span>
            )}
          </div>
        </div>

        {/* Reasoning Score */}
        <div className="flex items-center gap-2 sm:justify-end">
          <span className="text-gray-500 text-sm">
            Reasoning Score:
          </span>
          <div
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${scoreStyles}`}
          >
            {isPending ? "—" : comment.reasoningScore}
          </div>
        </div>
      </div>

      {/* Comment Content */}
      <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6">
        {comment.content}
      </p>

      {/* AI Summary */}
      <div className={`bg-[#111827] border rounded-xl p-5 transition duration-300 ${isPending ? "border-gray-700/40" : "border-blue-500/20 hover:border-blue-400/40"}`}>
        <span className={`font-semibold tracking-wide ${isPending ? "text-gray-600" : "text-blue-400"}`}>
          AI Summary
        </span>
        {isPending ? (
          <p className="text-gray-600 mt-3 text-sm italic animate-pulse">
            AI analysis pending — will appear on next page load…
          </p>
        ) : (
          <p className="text-gray-400 mt-3 leading-relaxed text-sm sm:text-base">
            {comment.summary}
          </p>
        )}
      </div>
    </div>
  );
};

export default CommentCard;