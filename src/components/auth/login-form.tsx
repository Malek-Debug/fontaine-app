'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { loginSchema, type LoginInput } from '@/lib/validators'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

function LoginForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setError(null)

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError(t('loginError'))
      return
    }

    router.push(`/${locale}/teacher`)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-8 animate-slideUp">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          {t('loginTitle')}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {t('loginSubtitle')}
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700 animate-slideDown" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label={t('email')}
          type="email"
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label={t('password')}
          type="password"
          placeholder="********"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full"
          size="lg"
        >
          {t('login')}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-neutral-500">
        {t('noAccount')}{' '}
        <Link
          href="/auth/register"
          className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          {t('register')}
        </Link>
      </p>
    </div>
  )
}

export { LoginForm }
