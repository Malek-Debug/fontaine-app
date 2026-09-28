/**
 * Merge CSS class names, filtering out falsy values.
 * A lightweight alternative to clsx/classnames -- no external dependency needed.
 */
export function cn(
  ...inputs: (string | undefined | null | false)[]
): string {
  return inputs.filter(Boolean).join(" ")
}

/**
 * Format a date for display.
 * Supports both French and Arabic locale formatting.
 */
export function formatDate(
  date: Date | string,
  options?: {
    locale?: string
    includeTime?: boolean
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date
  const locale = options?.locale ?? "fr-FR"

  if (options?.includeTime) {
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Format a date as a relative time string (e.g., "2 hours ago").
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = "fr-FR"
): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  if (diffDays > 0) return rtf.format(-diffDays, "day")
  if (diffHours > 0) return rtf.format(-diffHours, "hour")
  if (diffMinutes > 0) return rtf.format(-diffMinutes, "minute")
  return rtf.format(-diffSeconds, "second")
}

/**
 * Get initials from a name for avatar display.
 * Handles both Latin and Arabic names.
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name || name.trim().length === 0) return "?"

  const parts = name.trim().split(/\s+/)

  if (parts.length === 1) {
    // Single name: take first character(s)
    // Use Array.from to handle multi-byte characters (Arabic, etc.)
    const chars = Array.from(parts[0])
    return chars.slice(0, maxLength).join("").toUpperCase()
  }

  // Multiple words: take first character of each word
  return parts
    .slice(0, maxLength)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase()
}

/**
 * Format a number as a percentage string.
 */
export function formatPercentage(
  value: number,
  decimals: number = 0
): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Calculate a percentage from a numerator and denominator.
 * Returns 0 if the denominator is 0.
 */
export function calcPercentage(
  numerator: number,
  denominator: number,
  decimals: number = 1
): number {
  if (denominator === 0) return 0
  return Number(((numerator / denominator) * 100).toFixed(decimals))
}

/**
 * Truncate a string to a maximum length, adding an ellipsis if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + "…"
}

/**
 * Sleep for a given number of milliseconds.
 * Useful in async flows for intentional delays.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format a duration in seconds to a human-readable string.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) return `${minutes}min`
  return `${minutes}min ${remainingSeconds}s`
}

/**
 * Generate a deterministic color from a string (for avatar backgrounds, etc.).
 * Returns an HSL color string.
 */
export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 55%)`
}
