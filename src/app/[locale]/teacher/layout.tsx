import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { setRequestLocale } from 'next-intl/server';
import { TeacherShell } from '@/components/layout/teacher-shell';

export default async function TeacherLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <TeacherShell userName={session.user.name || session.user.email || 'Teacher'}>
      {children}
    </TeacherShell>
  );
}
