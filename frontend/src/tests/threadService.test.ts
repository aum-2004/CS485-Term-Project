/**
 * Unit tests for src/services/threadService.ts
 *
 * All HTTP calls are intercepted with vi.stubGlobal('fetch', ...) so no
 * real network is ever used.
 *
 * Functions under test:
 *   getThreads            – GET /api/threads
 *   refreshAndGetThreads  – POST /api/threads/seed/refresh
 *   addThread             – POST /api/threads
 *   createCustomThread    – POST /api/threads/custom
 *   deleteThread          – DELETE /api/threads/:id
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getThreads,
  refreshAndGetThreads,
  addThread,
  createCustomThread,
  deleteThread,
} from '../services/threadService';
import type { Thread } from '../types/Thread';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockThread: Thread = {
  id: 'reddit_abc123',
  title: 'Test Reddit Thread',
  createdAt: new Date().toISOString(),
  commentCount: 10,
};

/** Build a mock fetch that returns the given body with the given status. */
function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────────────────────────────────────
// getThreads
// ─────────────────────────────────────────────────────────────────────────────

describe('getThreads', () => {
  it('returns an array of threads on success', async () => {
    vi.stubGlobal('fetch', mockFetch([mockThread]));

    const threads = await getThreads();

    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe('reddit_abc123');
  });

  it('calls the correct endpoint GET /api/threads', async () => {
    const fetchMock = mockFetch([mockThread]);
    vi.stubGlobal('fetch', fetchMock);

    await getThreads();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/threads')
    );
  });

  it('throws when the server responds with a non-OK status', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Server error' }, 500));

    await expect(getThreads()).rejects.toThrow();
  });

  it('returns an empty array when the server returns []', async () => {
    vi.stubGlobal('fetch', mockFetch([]));

    const threads = await getThreads();

    expect(threads).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshAndGetThreads
// ─────────────────────────────────────────────────────────────────────────────

describe('refreshAndGetThreads', () => {
  it('returns a fresh list of threads', async () => {
    vi.stubGlobal('fetch', mockFetch([mockThread]));

    const threads = await refreshAndGetThreads();

    expect(threads).toHaveLength(1);
    expect(threads[0].title).toBe('Test Reddit Thread');
  });

  it('uses POST method', async () => {
    const fetchMock = mockFetch([mockThread]);
    vi.stubGlobal('fetch', fetchMock);

    await refreshAndGetThreads();

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('POST');
  });

  it('calls the seed/refresh endpoint', async () => {
    const fetchMock = mockFetch([mockThread]);
    vi.stubGlobal('fetch', fetchMock);

    await refreshAndGetThreads();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/api/threads/seed/refresh');
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', mockFetch({}, 502));

    await expect(refreshAndGetThreads()).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// addThread
// ─────────────────────────────────────────────────────────────────────────────

describe('addThread', () => {
  it('returns the created Thread object on success', async () => {
    vi.stubGlobal('fetch', mockFetch(mockThread, 201));

    const thread = await addThread('https://reddit.com/r/tech/comments/abc123');

    expect(thread.id).toBe('reddit_abc123');
    expect(thread.title).toBe('Test Reddit Thread');
  });

  it('sends the redditUrl in the JSON body', async () => {
    const fetchMock = mockFetch(mockThread, 201);
    vi.stubGlobal('fetch', fetchMock);

    const url = 'https://reddit.com/r/tech/comments/abc123';
    await addThread(url);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.redditUrl).toBe(url);
  });

  it('uses POST method', async () => {
    const fetchMock = mockFetch(mockThread, 201);
    vi.stubGlobal('fetch', fetchMock);

    await addThread('https://reddit.com/r/tech/comments/abc123');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('POST');
  });

  it('throws with the server error message on 400', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'Invalid Reddit URL' }, 400));

    await expect(
      addThread('not-a-valid-url')
    ).rejects.toThrow('Invalid Reddit URL');
  });

  it('throws a fallback message when server returns no error field', async () => {
    vi.stubGlobal('fetch', mockFetch({}, 500));

    await expect(addThread('https://reddit.com/r/t/comments/x')).rejects.toThrow(
      'Failed to add thread'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createCustomThread
// ─────────────────────────────────────────────────────────────────────────────

describe('createCustomThread', () => {
  const comments = [{ author: 'Alice', content: 'Great point!' }];

  it('returns the created Thread on success', async () => {
    vi.stubGlobal('fetch', mockFetch(mockThread, 201));

    const thread = await createCustomThread('My debate', comments);

    expect(thread.id).toBe('reddit_abc123');
  });

  it('sends title and comments in the JSON body', async () => {
    const fetchMock = mockFetch(mockThread, 201);
    vi.stubGlobal('fetch', fetchMock);

    await createCustomThread('My debate', comments);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.title).toBe('My debate');
    expect(body.comments).toEqual(comments);
  });

  it('calls the /api/threads/custom endpoint', async () => {
    const fetchMock = mockFetch(mockThread, 201);
    vi.stubGlobal('fetch', fetchMock);

    await createCustomThread('My debate', comments);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/api/threads/custom');
  });

  it('throws with server error message on failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'title is required' }, 400));

    await expect(createCustomThread('', comments)).rejects.toThrow(
      'title is required'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteThread
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteThread', () => {
  it('resolves without throwing on 204', async () => {
    vi.stubGlobal('fetch', mockFetch(null, 204));

    await expect(deleteThread('reddit_abc123')).resolves.toBeUndefined();
  });

  it('calls the correct DELETE endpoint with the threadId', async () => {
    const fetchMock = mockFetch(null, 204);
    vi.stubGlobal('fetch', fetchMock);

    await deleteThread('reddit_abc123');

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/threads/reddit_abc123');
    expect(options.method).toBe('DELETE');
  });

  it('resolves silently when server returns 404 (already deleted)', async () => {
    vi.stubGlobal('fetch', mockFetch(null, 404));

    await expect(deleteThread('nonexistent')).resolves.toBeUndefined();
  });

  it('throws when server returns 500', async () => {
    vi.stubGlobal('fetch', mockFetch(null, 500));

    await expect(deleteThread('reddit_abc123')).rejects.toThrow(
      'Failed to delete thread'
    );
  });
});
