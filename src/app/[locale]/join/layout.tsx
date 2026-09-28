import { setRequestLocale } from 'next-intl/server'

export default async function JoinLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white">
      {children}
    </div>
  )
}
