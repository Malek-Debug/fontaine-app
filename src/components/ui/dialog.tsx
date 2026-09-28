'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  actions?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    const isInDialog =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    if (!isInDialog) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        'w-[calc(100%-2rem)] rounded-2xl bg-white p-0 shadow-xl',
        'backdrop:bg-neutral-900/40 backdrop:backdrop-blur-[2px]',
        sizeStyles[size],
        className
      )}
    >
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          {title && (
            <h2 className="text-lg font-semibold text-neutral-900 pe-4">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ms-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="text-sm text-neutral-600">{children}</div>

        {/* Actions */}
        {actions && (
          <div className="mt-6 flex items-center justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </dialog>
  )
}

export { Dialog, type DialogProps }
