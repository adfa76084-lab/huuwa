import { Timestamp } from 'firebase/firestore';

export function formatRelativeTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '';

  const now = Date.now();
  const date = timestamp.toDate();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatChatTimestamp(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '';
  const d = timestamp.toDate();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${day}, ${h}:${m}`;
}

/**
 * Feed-style timestamp:
 * - Same calendar day → "HH:mm" (e.g. 20:44)
 * - Different day → "YYYY/MM/DD, HH:mm" (e.g. 2026/04/13, 19:05)
 */
export function formatFeedTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '';
  const d = timestamp.toDate();
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `${h}:${m}`;

  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${mo}/${day}, ${h}:${m}`;
}

export function formatFullDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '';
  return timestamp.toDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
