import { useEffect, useState } from "react";

interface DebateSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DebateSummaryModal = ({ isOpen, onClose }: DebateSummaryModalProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const generateSummary = () => {
    setLoading(true);
    setError(false);
    setSummary(null);

    setTimeout(() => {
      // Simulate 80% success rate
      if (Math.random() > 0.2) {
        setSummary(`
Main Positions:
• One side argues the study establishes causal inference using longitudinal design and statistical controls.
• The opposing side argues the sample bias and publication bias weaken the conclusions.

Strongest Supporting Evidence:
• Multivariate regression with p < 0.01
• 5-year longitudinal temporal precedence

Areas of Disagreement:
• Generalizability of findings
• Representativeness of sample population
• Impact of publication bias
        `);
      } else {
        setError(true);
      }
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    if (isOpen) {
      generateSummary();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0f172a] border border-gray-700 rounded-2xl w-full max-w-2xl p-8 relative">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Close summary"
        >
          ✕
        </button>

        <h3 className="text-2xl font-semibold mb-6 text-white">
          Moderator Debate Summary
        </h3>

        {loading && (
          <p className="text-gray-400 animate-pulse">
            Generating summary...
          </p>
        )}

        {error && (
          <div className="flex flex-col gap-4">
            <p className="text-red-500">
              Failed to generate summary.
            </p>
            <button
              onClick={generateSummary}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium w-fit"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && summary && (
          <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
            {summary}
          </pre>
        )}
      </div>
    </div>
  );
};

export default DebateSummaryModal;