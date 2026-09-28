import { cn } from '@/lib/cn'

interface ProgressRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'accent'
  label?: string
  showValue?: boolean
  className?: string
}

const colorMap = {
  primary: 'stroke-primary-500',
  success: 'stroke-success-500',
  warning: 'stroke-warning-500',
  danger: 'stroke-danger-500',
  accent: 'stroke-accent-500',
}

function ProgressRing({
  value,
  max = 100,
  size = 64,
  strokeWidth = 4,
  color = 'primary',
  label,
  showValue = true,
  className,
}: ProgressRingProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-label={label || `${Math.round(percentage)}%`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-neutral-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out', colorMap[color])}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {showValue && (
        <span className="absolute text-xs font-semibold text-neutral-700">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

export { ProgressRing, type ProgressRingProps }
