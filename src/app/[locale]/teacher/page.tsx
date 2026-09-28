'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import {
  GraduationCap,
  Users,
  Gamepad2,
  Radio,
  BookOpen,
  PlusCircle,
  Copy,
  Check,
  BarChart3,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
} from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonStatCard, SkeletonCard } from '@/components/ui/skeleton';
import { useLocale } from 'next-intl';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TeacherDashboardPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const tClasses = useTranslations('classes');
  const locale = useLocale();
  const isRtl = locale === 'ar';

  const { data, error, isLoading } = useSWR('/api/dashboard', fetcher);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-5 w-48 mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title={tCommon('error')}
          description={tCommon('tryAgain')}
        />
      </div>
    );
  }

  const { classes = [], totalStudents = 0, totalActivities = 0, recentSessions = [] } = data || {};

  const today = new Date().toLocaleDateString(locale === 'ar' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight lg:text-3xl">
          {t('welcome', { name: data?.teacherName || '' })}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<GraduationCap className="h-5 w-5" />}
          label={tNav('classes')}
          value={classes.length}
          color="primary"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label={tNav('students')}
          value={totalStudents}
          color="info"
        />
        <StatCard
          icon={<Gamepad2 className="h-5 w-5" />}
          label={tNav('activities')}
          value={totalActivities}
          color="accent"
        />
        <StatCard
          icon={<Radio className="h-5 w-5" />}
          label={tNav('sessions')}
          value={recentSessions.length}
          color="success"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/teacher/activities/new" className="group">
          <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-neutral-200/80 bg-white px-4 py-5 text-center transition-all hover:border-primary-200 hover:shadow-md hover:shadow-primary-500/5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
              <PlusCircle className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-neutral-700 group-hover:text-primary-700">{t('createActivity')}</span>
          </div>
        </Link>
        <Link href="/teacher/sessions" className="group">
          <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-neutral-200/80 bg-white px-4 py-5 text-center transition-all hover:border-accent-200 hover:shadow-md hover:shadow-accent-500/5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-colors group-hover:bg-accent-100">
              <Radio className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-neutral-700 group-hover:text-accent-700">{tNav('sessions')}</span>
          </div>
        </Link>
        <Link href="/teacher/curriculum" className="group">
          <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-neutral-200/80 bg-white px-4 py-5 text-center transition-all hover:border-info-200 hover:shadow-md hover:shadow-info-500/5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-50 text-info-600 transition-colors group-hover:bg-info-100">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-neutral-700 group-hover:text-info-700">{tNav('curriculum')}</span>
          </div>
        </Link>
        <Link href="/teacher/ai/generate" className="group">
          <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-neutral-200/80 bg-white px-4 py-5 text-center transition-all hover:border-success-200 hover:shadow-md hover:shadow-success-500/5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-50 text-success-600 transition-colors group-hover:bg-success-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-neutral-700 group-hover:text-success-700">{tNav('aiGenerate')}</span>
          </div>
        </Link>
      </div>

      {/* Classes */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">{t('yourClasses')}</h2>
          <Link href="/teacher/classes/new">
            <Button size="sm" variant="outline">
              <PlusCircle className="h-4 w-4" />
              {tClasses('createClass')}
            </Button>
          </Link>
        </div>

        {classes.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="h-8 w-8" />}
            title={t('noClasses')}
            action={
              <Link href="/teacher/classes/new">
                <Button>
                  <PlusCircle className="h-4 w-4" />
                  {tClasses('createClass')}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls: any) => (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                <Card hover className="h-full group">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
                        {cls.name}
                      </h3>
                      <p className="mt-1 text-sm text-neutral-500 truncate">
                        {cls.grade?.nameAr || cls.gradeName}
                      </p>
                    </div>
                    <Badge variant="info">
                      <Users className="me-1 h-3 w-3" />
                      {cls.studentCount ?? cls._count?.students ?? 0}
                    </Badge>
                  </div>
                  {cls.joinCode && (
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs text-neutral-400">{tClasses('joinCode')}:</span>
                      <code className="rounded-md bg-neutral-100 px-2 py-0.5 text-sm font-mono font-semibold text-primary-600">
                        {cls.joinCode}
                      </code>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopyCode(cls.joinCode);
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
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

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">{tNav('sessions')}</h2>
            <Link href="/teacher/sessions">
              <Button size="sm" variant="ghost">
                {t('viewResults')}
                <ArrowIcon className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {recentSessions.slice(0, 5).map((session: any) => (
              <Link key={session.id} href={`/teacher/sessions/${session.id}/results`}>
                <div className="flex items-center gap-4 rounded-xl border border-neutral-200/80 bg-white px-4 py-3 transition-all hover:border-neutral-300 hover:shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {session.activity?.titleAr || session.activity?.title}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {session.class?.name} &middot; {session._count?.participants || 0} {tNav('students')}
                    </p>
                  </div>
                  <Badge
                    variant={session.status === 'completed' ? 'success' : session.status === 'active' ? 'info' : 'neutral'}
                    size="sm"
                  >
                    {session.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Analytics CTA */}
      <Link href="/teacher/analytics">
        <div className="group flex items-center gap-4 rounded-2xl border border-primary-200/60 bg-gradient-to-r rtl:bg-gradient-to-l from-primary-50 to-primary-100/50 px-6 py-5 transition-all hover:border-primary-300 hover:shadow-md hover:shadow-primary-500/5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-200">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-primary-900">{tNav('analytics')}</h3>
            <p className="text-sm text-primary-700/70">{t('viewResults')}</p>
          </div>
          <ArrowIcon className="h-5 w-5 text-primary-400 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </div>
      </Link>
    </div>
  );
}
