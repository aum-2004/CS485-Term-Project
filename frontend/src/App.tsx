import { useEffect, useState } from "react";
import ThreadView from "./components/ThreadView";
import DebateSummaryModal from "./components/DebateSummaryModal";
import ThreadSelector from "./components/ThreadSelector";
import WelcomeModal from "./components/WelcomeModal";
import { refreshAndGetThreads } from "./services/threadService";
import type { Thread } from "./types/Thread";

function App() {
  const [sortByScore, setSortByScore] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // On load: fetch fresh Reddit threads via Cloudflare Worker proxy
  useEffect(() => {
    setShowWelcome(true);
    setThreadsLoading(true);
    refreshAndGetThreads()
      .then((data) => {
        setThreads(data);
        if (data.length > 0) setSelectedThreadId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setThreadsLoading(false));
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    refreshAndGetThreads()
      .then((data) => {
        setThreads(data);
        if (data.length > 0) setSelectedThreadId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  const handleThreadAdded = (thread: Thread) => {
    setThreads((prev) =>
      prev.some((t) => t.id === thread.id) ? prev : [thread, ...prev]
    );
  };

  const handleThreadDeleted = (threadId: string) => {
    setThreads((prev) => {
      const remaining = prev.filter((t) => t.id !== threadId);
      if (selectedThreadId === threadId) {
        setSelectedThreadId(remaining.length > 0 ? remaining[0].id : "");
      }
      return remaining;
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Header */}
      <nav className="border-b border-gray-800 px-6 sm:px-10 py-4 flex justify-between items-center">
        <h1 className="text-lg sm:text-xl font-semibold tracking-wide">
          Reddit AI Debate Analyzer
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition"
        >
          {refreshing ? "Refreshing…" : "⟳ Refresh Threads"}
        </button>
      </nav>

      {/* Hero */}
      <section className="text-center py-16 md:py-20 px-4">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent leading-tight">
          AI-Powered Discussion Analysis
        </h2>
        <p className="text-gray-400 mt-4 md:mt-6 text-base md:text-lg max-w-2xl mx-auto">
          Analyzing debate quality with advanced reasoning metrics
        </p>
        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <button
            onClick={() => setSortByScore(!sortByScore)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition shadow-lg"
          >
            {sortByScore ? "Default Order" : "Sort by Reasoning Score ↓"}
          </button>
          <button
            onClick={() => setIsSummaryOpen(true)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition shadow-lg"
            aria-label="View moderator summary"
          >
            View Debate Summary
          </button>
        </div>
      </section>

      {/* Thread selector */}
      <ThreadSelector
        threads={threads}
        selectedId={selectedThreadId}
        onSelect={setSelectedThreadId}
        onThreadAdded={handleThreadAdded}
        onThreadDeleted={handleThreadDeleted}
      />

      {/* Comments */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <ThreadView
          threadId={selectedThreadId}
          sortByScore={sortByScore}
        />
      </div>

      <DebateSummaryModal
        threadId={selectedThreadId}
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
      />

      {showWelcome && (
        <WelcomeModal
          threads={threads}
          isLoading={threadsLoading}
          onSelect={setSelectedThreadId}
          onClose={() => setShowWelcome(false)}
        />
      )}
    </div>
  );
}

export default App;
