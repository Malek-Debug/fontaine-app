import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { TrendingUp, TrendingDown } from 'lucide-react'

type StatColor = 'primary' | 'accent' | 'success' | 'danger' | 'info'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  color?: StatColor
  trend?: {
    value: number
    label?: string
  }
  className?: string
}

const iconBg: Record<StatColor, string> = {
  primary: 'bg-primary-50 text-primary-600',
  accent: 'bg-accent-50 text-accent-600',
  success: 'bg-success-50 text-success-600',
  danger: 'bg-danger-50 text-danger-600',
  info: 'bg-info-50 text-info-600',
}

function StatCard({ icon, label, value, color = 'primary', trend, className }: StatCardProps) {
  const isPositive = trend ? trend.value >= 0 : true

  return (
    <div
      className={cn(
        'group rounded-2xl border border-neutral-200/80 bg-white p-5 transition-all duration-200 hover:shadow-md hover:border-neutral-200',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconBg[color])}>
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              isPositive
                ? 'bg-success-50 text-success-700'
                : 'bg-danger-50 text-danger-700',
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {isPositive ? '+' : ''}
              {trend.value}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-neutral-900 tracking-tight">{value}</p>
        <p className="mt-0.5 text-sm text-neutral-500">{label}</p>
      </div>
      {trend?.label && (
        <p className="mt-2 text-xs text-neutral-400">{trend.label}</p>
      )}
    </div>
  )
}

export { StatCard, type StatCardProps }
