'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/cn'

const locales = [
  { code: 'ar', label: 'العربية', flag: '\u{1F1F9}\u{1F1F3}' },
  { code: 'fr', label: 'Français', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
] as const

function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = locales.find((l) => l.code === locale) || locales[0]

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function switchLocale(nextLocale: string) {
    setOpen(false)
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isPending}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors',
          isPending && 'opacity-50 cursor-wait'
        )}
        aria-label="Switch language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{current.flag} {current.label}</span>
        <span className="sm:hidden">{current.flag}</span>
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1.5 w-44 rounded-xl border border-neutral-200/80 bg-white py-1.5 shadow-lg z-50 animate-slideDown">
          {locales.map((loc) => (
            <button
              key={loc.code}
              type="button"
              onClick={() => switchLocale(loc.code)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                loc.code === locale
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-neutral-700 hover:bg-neutral-50'
              )}
            >
              <span>{loc.flag}</span>
              <span>{loc.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { LocaleSwitcher }
