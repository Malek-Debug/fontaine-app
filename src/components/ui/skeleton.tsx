import { cn } from '@/lib/cn'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

function Skeleton({ className, variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  const baseStyle: React.CSSProperties = {}
  if (width) baseStyle.width = typeof width === 'number' ? `${width}px` : width
  if (height) baseStyle.height = typeof height === 'number' ? `${height}px` : height

  if (lines > 1) {
    return (
      <div className={cn('space-y-2.5', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton h-4',
              i === lines - 1 && 'w-3/4',
            )}
            style={i === 0 ? baseStyle : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'skeleton',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-4 rounded',
        variant === 'rectangular' && 'rounded-lg',
        className,
      )}
      style={baseStyle}
    />
  )
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-white p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton variant="circular" className="h-10 w-10" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  )
}

function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-white p-5', className)}>
      <Skeleton variant="rectangular" className="h-10 w-10 mb-4" />
      <Skeleton className="h-7 w-16 mb-1" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-white overflow-hidden', className)}>
      <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-neutral-100 px-5 py-3.5 flex gap-4 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonStatCard, SkeletonTable, type SkeletonProps }
