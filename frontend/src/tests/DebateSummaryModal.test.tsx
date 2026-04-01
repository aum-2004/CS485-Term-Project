/**
 * Unit tests for src/components/DebateSummaryModal.tsx
 *
 * Network calls are intercepted with vi.stubGlobal('fetch', ...).
 * The component is rendered with React Testing Library in a jsdom environment.
 *
 * Behaviors under test:
 *   1. Modal hidden when isOpen=false
 *   2. Loading state shown while fetch is pending
 *   3. Summary sections rendered on success
 *   4. Error state shown on server error
 *   5. Error state shown on network failure
 *   6. Close button calls onClose
 *   7. "Try Again" button re-fetches
 *   8. Fetch triggered again when threadId changes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DebateSummaryModal from '../components/DebateSummaryModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockSummary = {
  mainPositions: ['Position A', 'Position B'],
  supportingEvidence: ['Evidence 1', 'Evidence 2'],
  areasOfDisagreement: ['Disagreement 1'],
};

function makeFetch(body: unknown, status = 200) {
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

describe('DebateSummaryModal', () => {
  // 1. Not rendered when isOpen=false
  it('renders nothing when isOpen is false', () => {
    vi.stubGlobal('fetch', makeFetch(mockSummary));

    const { container } = render(
      <DebateSummaryModal threadId="t1" isOpen={false} onClose={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  // 2. Loading state
  it('shows loading text while fetch is in progress', async () => {
    // fetch never resolves during this test
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

    render(
      <DebateSummaryModal threadId="t1" isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByText(/generating summary/i)).toBeInTheDocument();
  });

  // 3. Success — all three sections rendered
  it('renders all three summary sections on success', async () => {
    vi.stubGlobal('fetch', makeFetch(mockSummary));

    render(
      <DebateSummaryModal threadId="t1" isOpen={true} onClose={vi.fn()} />
    );

    await waitFor(() =>
      expect(screen.getByText('Position A')).toBeInTheDocument()
    );

    expect(screen.getByText('Position B')).toBeInTheDocument();
    expect(screen.getByText('Evidence 1')).toBeInTheDocument();
    expect(screen.getByText('Disagreement 1')).toBeInTheDocument();
  });

  // 4. Section headings present
  it('displays the three section headings', async () => {
    vi.stubGlobal('fetch', makeFetch(mockSummary));

    render(
      <DebateSummaryModal threadId="t1" isOpen={true} onClose={vi.fn()} />
    );

    await waitFor(() =>
      expect(screen.getByText(/main positions/i)).toBeInTheDocument()
    );

    expect(screen.getByText(/supporting evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/areas of disagreement/i)).toBeInTheDocument();
  });

  // 5. Error state on server-level error
  it('shows an error message when server returns non-OK', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({ error: 'AI quota exceeded' }, 503)
    );

    render(
      <DebateSummaryModal threadId="t1" isOpen={true} onClose={vi.fn()} />
    );

    await waitFor(() =>
      expect(screen.getByText(/AI quota exceeded/i)).toBeInTheDocument()
    );
  });

  // 6. Error state on network failure
  it('shows an error message when fetch rejects (network error)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network failure'))
    );

    render(
      <DebateSummaryModal threadId="t1" isOpen={true} onClose={vi.fn()} />
    );

    await waitFor(() =>
      expect(screen.getByText(/could not reach the server/i)).toBeInTheDocument()
    );
  });

  // 7. Close button calls onClose
  it('calls onClose when the close button is clicked', async () => {
    vi.stubGlobal('fetch', makeFetch(mockSummary));
    const onClose = vi.fn();

    render(
      <DebateSummaryModal threadId="t1" isOpen={true} onClose={onClose} />
    );

    // Wait for render to settle
    await waitFor(() => screen.getByLabelText(/close summary/i));

    fireEvent.click(screen.getByLabelText(/close summary/i));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 8. "Try Again" button re-fetches
  it('"Try Again" button triggers a second fetch', async () => {
    const fetchMock = makeFetch({ error: 'Unavailable' }, 503);
    vi.stubGlobal('fetch', fetchMock);

    render(
      <DebateSummaryModal threadId="t1" isOpen={true} onClose={vi.fn()} />
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // fetch should have been called twice: once on mount, once on retry
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  // 9. Summary is NOT shown while loading
  it('does not render summary content while loading', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

    render(
      <DebateSummaryModal threadId="t1" isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.queryByText('Position A')).not.toBeInTheDocument();
  });

  // 10. Re-fetches when threadId changes
  it('fetches again when threadId prop changes', async () => {
    const fetchMock = makeFetch(mockSummary);
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(
      <DebateSummaryModal threadId="t1" isOpen={true} onClose={vi.fn()} />
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(
      <DebateSummaryModal threadId="t2" isOpen={true} onClose={vi.fn()} />
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
