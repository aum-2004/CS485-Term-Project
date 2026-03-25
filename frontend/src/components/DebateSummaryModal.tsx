import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface SummaryData {
  mainPositions: string[];
  supportingEvidence: string[];
  areasOfDisagreement: string[];
}

interface DebateSummaryModalProps {
  threadId: string;
  isOpen: boolean;
  onClose: () => void;
}

const DebateSummaryModal = ({ threadId, isOpen, onClose }: DebateSummaryModalProps) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSummary(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/threads/${threadId}/summary`
      );
      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error ?? `Request failed (HTTP ${response.status})`);
        return;
      }
      setSummary(data as SummaryData);
    } catch {
      setErrorMsg("Could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen, threadId]);

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

        {errorMsg && (
          <div className="flex flex-col gap-4">
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4">
              <p className="text-yellow-400 font-semibold text-sm mb-1">⚠ Summary Unavailable</p>
              <p className="text-gray-400 text-sm leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={fetchSummary}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium w-fit"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !errorMsg && summary && (
          <div className="flex flex-col gap-6 text-sm text-gray-300">
            <section>
              <h4 className="text-blue-400 font-semibold mb-2">Main Positions</h4>
              <ul className="list-disc list-inside space-y-1">
                {summary.mainPositions.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
            <section>
              <h4 className="text-green-400 font-semibold mb-2">Strongest Supporting Evidence</h4>
              <ul className="list-disc list-inside space-y-1">
                {summary.supportingEvidence.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </section>
            <section>
              <h4 className="text-red-400 font-semibold mb-2">Areas of Disagreement</h4>
              <ul className="list-disc list-inside space-y-1">
                {summary.areasOfDisagreement.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebateSummaryModal;
