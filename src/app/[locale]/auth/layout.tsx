import { setRequestLocale } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Droplets } from 'lucide-react';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm">
            <Droplets className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900">Fontaine</span>
        </div>
        <LocaleSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-neutral-400">
        Fontaine &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
