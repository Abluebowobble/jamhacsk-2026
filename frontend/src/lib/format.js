// Formatting helpers — durations, countdowns, relative time.

/** "5m", "5m 30s", "30s" — human duration from seconds. */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m && rem) return `${m}m ${rem}s`
  if (m) return `${m}m`
  return `${rem}s`
}

/** "M:SS" — fixed-width countdown for mono/tabular display. */
export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${String(rem).padStart(2, '0')}`
}

/** "just now", "2m ago", "3h ago", "2d ago" */
export function relativeTime(date, now = new Date()) {
  const diff = Math.max(0, (now.getTime() - new Date(date).getTime()) / 1000)
  if (diff < 45) return 'just now'
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

/** "14:30" — wall clock, 24h. */
export function formatClock(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
