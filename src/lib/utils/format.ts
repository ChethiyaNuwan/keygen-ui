/**
 * Shared date formatting. Consolidates ~17 near-identical `formatDate`
 * redeclarations (a mix of short/long month, with/without time) into two
 * variants — callers that genuinely need something different should have
 * a documented reason, not just drift.
 */

export function formatDate(dateString?: string | null, fallback = '—'): string {
  if (!dateString) return fallback;
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString?: string | null, fallback = '—'): string {
  if (!dateString) return fallback;
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
