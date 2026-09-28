'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { registerSchema, type RegisterInput } from '@/lib/validators'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function RegisterForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterInput) {
    setError(null)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        if (res.status === 400 && body.error === 'Email already exists') {
          setError(t('emailExists'))
        } else {
          setError(t('registerError'))
        }
        return
      }

      // Success - redirect to login
      router.push(`/${locale}/auth/login`)
    } catch {
      setError(t('registerError'))
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-8 animate-slideUp">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          {t('registerTitle')}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {t('registerSubtitle')}
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700 animate-slideDown" role="alert">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label={t('name')}
          type="text"
          placeholder={t('namePlaceholder')}
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />

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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label={t('confirmPassword')}
          type="password"
          placeholder="********"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full"
          size="lg"
        >
          {t('register')}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-neutral-500">
        {t('hasAccount')}{' '}
        <Link
          href="/auth/login"
          className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          {t('login')}
        </Link>
      </p>
    </div>
  )
}

export { RegisterForm }
