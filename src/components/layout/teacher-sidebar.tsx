'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/cn'
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Gamepad2,
  Radio,
  BarChart3,
  Users,
  Sparkles,
  MessageCircle,
  X,
  Droplets,
} from 'lucide-react'

interface NavItem {
  key: string
  icon: typeof LayoutDashboard
  labelKey: string
  href: string
  section: 'main' | 'classroom' | 'teach' | 'insights' | 'ai'
}

interface SidebarTranslations {
  dashboard: string
  classes: string
  curriculum: string
  activities: string
  sessions: string
  analytics: string
  students: string
  aiGenerate: string
  aiChat: string
  comingSoon: string
  appName?: string
}

interface TeacherSidebarProps {
  locale: string
  translations: SidebarTranslations
  currentPath: string
  open: boolean
  onClose: () => void
  onNavigate: (href: string) => void
}

const navItems: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard', href: '/teacher', section: 'main' },
  { key: 'classes', icon: GraduationCap, labelKey: 'classes', href: '/teacher/classes', section: 'classroom' },
  { key: 'students', icon: Users, labelKey: 'students', href: '/teacher/students', section: 'classroom' },
  { key: 'curriculum', icon: BookOpen, labelKey: 'curriculum', href: '/teacher/curriculum', section: 'teach' },
  { key: 'activities', icon: Gamepad2, labelKey: 'activities', href: '/teacher/activities', section: 'teach' },
  { key: 'sessions', icon: Radio, labelKey: 'sessions', href: '/teacher/sessions', section: 'teach' },
  { key: 'analytics', icon: BarChart3, labelKey: 'analytics', href: '/teacher/analytics', section: 'insights' },
  { key: 'aiGenerate', icon: Sparkles, labelKey: 'aiGenerate', href: '/teacher/ai/generate', section: 'ai' },
  { key: 'aiChat', icon: MessageCircle, labelKey: 'aiChat', href: '/teacher/ai/chat', section: 'ai' },
]

function TeacherSidebar({
  locale,
  translations: t,
  currentPath,
  open,
  onClose,
  onNavigate,
}: TeacherSidebarProps) {
  const translationMap: Record<string, string> = {
    dashboard: t.dashboard,
    classes: t.classes,
    curriculum: t.curriculum,
    activities: t.activities,
    sessions: t.sessions,
    analytics: t.analytics,
    students: t.students,
    aiGenerate: t.aiGenerate,
    aiChat: t.aiChat,
  }

  const isActive = useCallback(
    (href: string) => {
      if (href === '/teacher') return currentPath === '/teacher' || currentPath === `/${locale}/teacher`
      return currentPath.startsWith(href) || currentPath.startsWith(`/${locale}${href}`)
    },
    [currentPath, locale],
  )

  let lastSection = ''

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm">
            <Droplets className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-neutral-900">
            {t.appName || 'Fontaine'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const label = translationMap[item.labelKey] || item.labelKey
          const showDivider = item.section !== lastSection && lastSection !== ''
          lastSection = item.section

          return (
            <div key={item.key}>
              {showDivider && (
                <div className="my-2 mx-2 border-t border-neutral-100" />
              )}
              <button
                type="button"
                onClick={() => {
                  onNavigate(item.href)
                  onClose()
                }}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    active
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-neutral-100/80 text-neutral-500 group-hover:bg-neutral-200/80 group-hover:text-neutral-600',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-start truncate">{label}</span>
                {active && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                )}
              </button>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-neutral-100 px-4 py-3">
        <p className="text-[11px] text-neutral-400 text-center">
          Fontaine &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/30 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-out drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 w-[272px] bg-white shadow-xl transition-transform duration-300 ease-out lg:hidden',
          open ? 'translate-x-0 rtl:-translate-x-0' : '-translate-x-full rtl:translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:start-0 lg:z-30 lg:flex lg:w-[272px] lg:flex-col lg:border-e lg:border-neutral-200 lg:bg-white">
        {sidebarContent}
      </aside>
    </>
  )
}

export { TeacherSidebar, type TeacherSidebarProps, type SidebarTranslations }
