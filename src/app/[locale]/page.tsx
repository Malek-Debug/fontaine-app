import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { setRequestLocale } from 'next-intl/server';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();

  if (session) {
    redirect(`/${locale}/teacher`);
  }

  redirect(`/${locale}/auth/login`);
}
