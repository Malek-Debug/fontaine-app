'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  GraduationCap,
  Users,
  PlusCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SkeletonCard } from '@/components/ui/skeleton';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ClassesListPage() {
  const t = useTranslations('classes');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();

  const { data: classes, error, isLoading } = useSWR('/api/classes', fetcher);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-4 w-48" />
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-9 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-danger-500">{tCommon('error')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        locale={locale}
        items={[
          { label: tNav('dashboard'), href: '/teacher' },
          { label: t('myClasses') },
        ]}
        onNavigate={(href) => router.push(href)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('myClasses')}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {classes?.length || 0} {tNav('classes').toLowerCase()}
          </p>
        </div>
        <Link href="/teacher/classes/new">
          <Button size="sm">
            <PlusCircle className="h-4 w-4" />
            {t('createClass')}
          </Button>
        </Link>
      </div>

      {!classes || classes.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-8 w-8" />}
          title={t('myClasses')}
          description={tCommon('noData')}
          action={
            <Link href="/teacher/classes/new">
              <Button>
                <PlusCircle className="h-4 w-4" />
                {t('createClass')}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls: any, i: number) => (
            <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
              <Card hover className={`h-full group animate-fadeIn animate-stagger-${Math.min(i + 1, 5)}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
                      {cls.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-neutral-500 truncate">
                      {cls.grade?.nameAr || cls.gradeName}
                    </p>
                  </div>
                  <Badge variant="info" size="sm">
                    <Users className="me-1 h-3 w-3" />
                    {cls.studentCount ?? cls._count?.students ?? 0}
                  </Badge>
                </div>

                {cls.joinCode && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2.5">
                    <span className="text-xs text-neutral-400">{t('joinCode')}:</span>
                    <code className="text-sm font-mono font-bold tracking-widest text-primary-600">
                      {cls.joinCode}
                    </code>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCopyCode(cls.joinCode);
                      }}
                      className="ms-auto inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 transition-colors"
                      aria-label="Copy"
                    >
                      {copiedCode === cls.joinCode ? (
                        <Check className="h-3.5 w-3.5 text-success-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
