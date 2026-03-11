import { useState } from "react";
import type { Thread } from "../types/Thread";
import { addThread, createCustomThread, deleteThread } from "../services/threadService";

interface ThreadSelectorProps {
  threads: Thread[];
  selectedId: string;
  onSelect: (threadId: string) => void;
  onThreadAdded: (thread: Thread) => void;
  onThreadDeleted: (threadId: string) => void;
}

interface CommentRow {
  author: string;
  content: string;
}

const ThreadSelector = ({
  threads,
  selectedId,
  onSelect,
  onThreadAdded,
  onThreadDeleted,
}: ThreadSelectorProps) => {
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [commentRows, setCommentRows] = useState<CommentRow[]>([{ author: "", content: "" }]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setAdding(true);
    setUrlError(null);
    try {
      const thread = await addThread(trimmed);
      onThreadAdded(thread);
      onSelect(thread.id);
      setUrl("");
    } catch (err) {
      setUrlError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    try {
      await deleteThread(threadId);
      onThreadDeleted(threadId);
    } catch {
      onThreadDeleted(threadId);
    }
  };

  const addCommentRow = () =>
    setCommentRows((prev) => [...prev, { author: "", content: "" }]);

  const removeCommentRow = (i: number) =>
    setCommentRows((prev) => prev.filter((_, idx) => idx !== i));

  const updateRow = (i: number, field: keyof CommentRow, value: string) =>
    setCommentRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );

  const handleCreate = async () => {
    const title = customTitle.trim();
    if (!title) { setFormError("Title is required"); return; }
    const validComments = commentRows.filter((r) => r.author.trim() && r.content.trim());
    if (validComments.length === 0) {
      setFormError("Add at least one comment with author and content");
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      const thread = await createCustomThread(title, validComments);
      onThreadAdded(thread);
      onSelect(thread.id);
      setShowForm(false);
      setCustomTitle("");
      setCommentRows([{ author: "", content: "" }]);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mb-8 flex flex-col gap-4">

      {/* Thread list with delete buttons */}
      <div className="flex gap-2 flex-wrap">
        {threads.map((t) => (
          <div key={t.id} className="relative flex items-center">
            <button
              onClick={() => onSelect(t.id)}
              title={t.title}
              className={`pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium transition max-w-[200px] truncate ${
                selectedId === t.id
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-800 text-gray-300 hover:bg-neutral-700"
              }`}
            >
              {t.title}
            </button>
            <button
              onClick={(e) => handleDelete(e, t.id)}
              title="Remove thread"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 text-[10px] font-bold leading-none"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Reddit URL + Create Thread buttons */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Paste a Reddit thread URL to add it…"
          disabled={adding}
          className="flex-1 px-4 py-2 bg-neutral-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !url.trim()}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition whitespace-nowrap"
        >
          {adding ? "Adding…" : "Add Thread"}
        </button>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(null); }}
          className="px-5 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-medium transition whitespace-nowrap"
        >
          {showForm ? "Cancel" : "+ Create Thread"}
        </button>
      </div>

      {urlError && <p className="text-red-400 text-sm">{urlError}</p>}

      {/* Custom thread creation form */}
      {showForm && (
        <div className="flex flex-col gap-3 bg-neutral-900 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-200">Create a Custom Thread</h3>

          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Thread title…"
            className="px-4 py-2 bg-neutral-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />

          <div className="flex flex-col gap-2">
            {commentRows.map((row, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={row.author}
                  onChange={(e) => updateRow(i, "author", e.target.value)}
                  placeholder="Author"
                  className="w-32 px-3 py-2 bg-neutral-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 shrink-0"
                />
                <textarea
                  value={row.content}
                  onChange={(e) => updateRow(i, "content", e.target.value)}
                  placeholder="Comment text…"
                  rows={2}
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
                {commentRows.length > 1 && (
                  <button
                    onClick={() => removeCommentRow(i)}
                    className="text-gray-500 hover:text-red-400 text-sm mt-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addCommentRow}
            className="self-start text-sm text-blue-400 hover:text-blue-300 transition"
          >
            + Add comment
          </button>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition"
            >
              {creating ? "Publishing…" : "Publish Thread"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="px-5 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreadSelector;
