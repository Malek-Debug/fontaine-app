import { useState, useEffect } from "react"

/**
 * Debounce a value by a given delay.
 *
 * Returns the debounced value that only updates after the specified
 * delay has elapsed since the last change. Useful for search inputs
 * to avoid firing API requests on every keystroke.
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("")
 * const debouncedSearch = useDebounce(search, 300)
 *
 * useEffect(() => {
 *   // This only fires 300ms after the user stops typing
 *   fetchResults(debouncedSearch)
 * }, [debouncedSearch])
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
