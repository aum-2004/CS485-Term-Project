import { useEffect, useState } from "react";
import ThreadView from "./components/ThreadView";
import DebateSummaryModal from "./components/DebateSummaryModal";
import ThreadSelector from "./components/ThreadSelector";
import { getThreads } from "./services/threadService";
import type { Thread } from "./types/Thread";

function App() {
  const [sortByScore, setSortByScore] = useState(false);
  const [mode, setMode] = useState<"success" | "loading" | "empty" | "error">("success");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");

  const modes: ("success" | "loading" | "empty" | "error")[] = [
    "success", "loading", "empty", "error",
  ];

  useEffect(() => {
    getThreads()
      .then((data) => {
        setThreads(data);
        if (data.length > 0) setSelectedThreadId(data[0].id);
      })
      .catch(() => {/* backend not yet ready */});
  }, []);

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
        <div className="flex gap-6 text-sm">
          {modes.map((state) => (
            <button
              key={state}
              onClick={() => setMode(state)}
              className={`transition ${
                mode === state
                  ? "text-white border-b-2 border-blue-500 pb-1"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </button>
          ))}
        </div>
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
          mode={mode}
        />
      </div>

      <DebateSummaryModal
        threadId={selectedThreadId}
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
      />
    </div>
  );
}

export default App;
