'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Menu, LogOut, ChevronDown, Droplets } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

interface HeaderTranslations {
  logout: string
  profile?: string
}

interface TeacherHeaderProps {
  userName: string
  breadcrumb?: ReactNode
  onMenuToggle: () => void
  onLogout: () => void
  translations: HeaderTranslations
  localeSwitcher?: ReactNode
}

function TeacherHeader({
  userName,
  breadcrumb,
  onMenuToggle,
  onLogout,
  translations,
  localeSwitcher,
}: TeacherHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-neutral-200/80 bg-white/80 backdrop-blur-sm px-4 lg:px-6">
      {/* Hamburger */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="me-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile brand */}
      <div className="flex items-center gap-2 lg:hidden me-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary-500 to-primary-700">
          <Droplets className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight text-neutral-900">Fontaine</span>
      </div>

      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="hidden text-sm text-neutral-500 sm:block">{breadcrumb}</div>
      )}

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {localeSwitcher}

        <div className="mx-1.5 hidden h-5 w-px bg-neutral-200 sm:block" />

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors',
              userMenuOpen ? 'bg-neutral-100' : 'hover:bg-neutral-50',
            )}
          >
            <Avatar name={userName} size="sm" />
            <span className="hidden text-sm font-medium text-neutral-700 sm:block max-w-[120px] truncate">
              {userName}
            </span>
            <ChevronDown
              className={cn(
                'hidden h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 sm:block',
                userMenuOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute end-0 top-full mt-1.5 w-48 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg animate-slideDown">
              <div className="px-3 py-2 border-b border-neutral-100 sm:hidden">
                <p className="text-sm font-medium text-neutral-900 truncate">{userName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false)
                  onLogout()
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {translations.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export { TeacherHeader, type TeacherHeaderProps, type HeaderTranslations }
