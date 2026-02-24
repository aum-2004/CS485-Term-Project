import { useState } from "react";
import ThreadView from "./components/ThreadView";
import DebateSummaryModal from "./components/DebateSummaryModal";

function App() {
  const [sortByScore, setSortByScore] = useState(false);
  const [mode, setMode] = useState<
    "success" | "loading" | "empty" | "error"
  >("success");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const modes: ("success" | "loading" | "empty" | "error")[] = [
    "success",
    "loading",
    "empty",
    "error"
  ];

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
            {sortByScore
              ? "Default Order"
              : "Sort by Reasoning Score ↓"}
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

      <div className="max-w-4xl mx-auto px-4 pb-20">
        <ThreadView sortByScore={sortByScore} mode={mode} />
      </div>

      <DebateSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
      />
    </div>
  );
}

export default App;