import { cn } from '@/lib/cn'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

/**
 * Generates a consistent HSL color from a name string.
 * The hue is derived from the string hash, with fixed saturation and lightness
 * to ensure readable white text on the background.
 */
function getColorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 45%)`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  const bgColor = getColorFromName(name)

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0',
        sizeStyles[size],
        className
      )}
      style={{ backgroundColor: bgColor }}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  )
}

export { Avatar, type AvatarProps }
