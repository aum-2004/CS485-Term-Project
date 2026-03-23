import type { Thread } from "../types/Thread";

interface WelcomeModalProps {
  threads: Thread[];
  isLoading?: boolean;
  onSelect: (threadId: string) => void;
  onClose: () => void;
}

const WelcomeModal = ({ threads, isLoading = false, onSelect, onClose }: WelcomeModalProps) => {
  const handleSelect = (threadId: string) => {
    onSelect(threadId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-800 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Welcome back</h2>
            <p className="text-sm text-gray-400 mt-1">
              {isLoading
                ? "Fetching today's hot threads from Reddit…"
                : "Pick a thread to analyze, or close to start fresh."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition text-xl leading-none mt-0.5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Thread list */}
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading fresh threads…</p>
            </div>
          ) : threads.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No threads yet — add one using the URL bar below.
            </p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className="w-full text-left px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-gray-700 hover:border-blue-500 transition group"
              >
                <p className="text-sm font-medium text-white group-hover:text-blue-400 transition line-clamp-2 leading-snug">
                  {t.title}
                </p>
                <p className="text-xs text-gray-500 mt-1.5">
                  {t.commentCount} comment{t.commentCount !== 1 ? "s" : ""}
                  {" · "}
                  {new Date(t.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm text-gray-300 hover:text-white transition"
          >
            Browse without selecting
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
