'use client'

import { useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { signOut } from 'next-auth/react'
import { TeacherSidebar } from '@/components/layout/teacher-sidebar'
import { TeacherHeader } from '@/components/layout/teacher-header'
import { LocaleSwitcher } from '@/components/layout/locale-switcher'

interface TeacherShellProps {
  children: React.ReactNode
  userName: string
}

function TeacherShell({ children, userName }: TeacherShellProps) {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const tAi = useTranslations('ai')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href)
    },
    [router]
  )

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: `/${locale}/auth/login` })
  }, [locale])

  return (
    <div className="flex min-h-screen">
      <TeacherSidebar
        locale={locale}
        translations={{
          dashboard: t('dashboard'),
          classes: t('classes'),
          curriculum: t('curriculum'),
          activities: t('activities'),
          sessions: t('sessions'),
          analytics: t('analytics'),
          students: t('students'),
          aiGenerate: t('aiGenerate'),
          aiChat: tAi('teacherChat'),
          comingSoon: tCommon('comingSoon'),
          appName: 'Fontaine',
        }}
        currentPath={pathname}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
      />

      <div className="flex flex-1 flex-col lg:ps-[272px]">
        <TeacherHeader
          userName={userName}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          onLogout={handleLogout}
          translations={{
            logout: tCommon('logout'),
          }}
          localeSwitcher={<LocaleSwitcher />}
        />

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export { TeacherShell }
