import type { Thread } from "../types/Thread";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const getThreads = async (): Promise<Thread[]> => {
  const response = await fetch(`${API_BASE}/api/threads`);
  if (!response.ok) throw new Error(`Failed to fetch threads: ${response.status}`);
  return response.json();
};

export const addThread = async (redditUrl: string): Promise<Thread> => {
  const response = await fetch(`${API_BASE}/api/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redditUrl }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Failed to add thread");
  return data as Thread;
};

export const createCustomThread = async (
  title: string,
  comments: { author: string; content: string }[]
): Promise<Thread> => {
  const response = await fetch(`${API_BASE}/api/threads/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, comments }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Failed to create thread");
  return data as Thread;
};

export const deleteThread = async (threadId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/threads/${threadId}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete thread");
  }
};
