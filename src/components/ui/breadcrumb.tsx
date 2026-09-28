import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  locale?: string
  className?: string
  onNavigate?: (href: string) => void
}

function Breadcrumb({ items, locale, className, onNavigate }: BreadcrumbProps) {
  const isRtl = locale === 'ar'
  const Separator = isRtl ? ChevronLeft : ChevronRight

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1

        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <Separator className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            )}
            {isLast || !item.href ? (
              <span
                className={cn(
                  'truncate max-w-[200px]',
                  isLast ? 'font-medium text-neutral-900' : 'text-neutral-500',
                )}
              >
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate?.(item.href!)}
                className="truncate max-w-[200px] text-neutral-500 hover:text-primary-600 transition-colors"
              >
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export { Breadcrumb, type BreadcrumbItem, type BreadcrumbProps }
