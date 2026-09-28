'use client';

import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  ChevronLeft,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const UNIT_COLORS = [
  { bg: 'bg-primary-50', icon: 'text-primary-600', border: 'hover:border-primary-200', shadow: 'hover:shadow-primary-500/5' },
  { bg: 'bg-accent-50', icon: 'text-accent-600', border: 'hover:border-accent-200', shadow: 'hover:shadow-accent-500/5' },
  { bg: 'bg-info-50', icon: 'text-info-600', border: 'hover:border-info-200', shadow: 'hover:shadow-info-500/5' },
  { bg: 'bg-success-50', icon: 'text-success-600', border: 'hover:border-success-200', shadow: 'hover:shadow-success-500/5' },
];

export default function CurriculumBrowserPage() {
  const t = useTranslations('curriculum');
  const tCommon = useTranslations('common');

  const { data: curriculum, error, isLoading } = useSWR('/api/curriculum', fetcher);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-5 w-72" />
        </div>
        <div className="space-y-6">
          <div className="skeleton h-6 w-40" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title={tCommon('error')}
        />
      </div>
    );
  }

  const grades = curriculum?.grades || curriculum || [];

  const subjects: any[] = [];
  if (Array.isArray(grades)) {
    grades.forEach((grade: any) => {
      const gradeSubjects = grade.subjects || [];
      gradeSubjects.forEach((subject: any) => {
        subjects.push({
          ...subject,
          gradeName: grade.nameAr || grade.name,
          gradeId: grade.id,
        });
      });
    });
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight lg:text-3xl">
          {t('browse')}
        </h1>
      </div>

      {subjects.length === 0 && (!grades || grades.length === 0) ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title={t('noUnits')}
        />
      ) : (
        <div className="space-y-10">
          {subjects.map((subject: any) => (
            <div key={subject.id} className="animate-slideUp">
              {/* Subject Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {subject.nameAr || subject.name}
                  </h2>
                  <p className="text-sm text-neutral-500">{subject.gradeName}</p>
                </div>
              </div>

              {/* Units Grid */}
              {subject.units && subject.units.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {subject.units.map((unit: any, idx: number) => {
                    const colorSet = UNIT_COLORS[idx % UNIT_COLORS.length];
                    const domainCount = unit.domains?.length || unit._count?.domains || 0;
                    const skillCount = unit.domains?.reduce(
                      (sum: number, d: any) => sum + (d.lessons?.reduce(
                        (s: number, l: any) => s + (l.skills?.length || 0), 0
                      ) || 0), 0
                    ) || 0;

                    return (
                      <Link key={unit.id} href={`/teacher/curriculum/${unit.id}`}>
                        <div
                          className={cn(
                            'group h-full rounded-2xl border border-neutral-200/80 bg-white p-5 transition-all duration-200 cursor-pointer',
                            'hover:shadow-md',
                            colorSet.border,
                            colorSet.shadow,
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <Badge variant="info" size="sm">
                                {t('unit')} {unit.orderIndex ?? unit.number}
                              </Badge>
                              <h3 className="mt-2.5 font-semibold text-neutral-900 group-hover:text-primary-700 transition-colors">
                                {unit.nameAr || unit.name}
                              </h3>
                              {unit.theme && (
                                <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{unit.theme}</p>
                              )}
                            </div>
                            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ms-3', colorSet.bg)}>
                              <BookOpen className={cn('h-5 w-5', colorSet.icon)} />
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
                            <span className="flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5" />
                              {domainCount} {t('domain')}
                            </span>
                            {skillCount > 0 && (
                              <span>{skillCount} {t('skill')}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">{t('noUnits')}</p>
              )}
            </div>
          ))}

          {/* Flat unit fallback */}
          {subjects.length === 0 && Array.isArray(grades) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {grades.map((grade: any) => {
                const units = grade.units || [];
                return units.map((unit: any, idx: number) => {
                  const colorSet = UNIT_COLORS[idx % UNIT_COLORS.length];
                  return (
                    <Link key={unit.id} href={`/teacher/curriculum/${unit.id}`}>
                      <div
                        className={cn(
                          'group h-full rounded-2xl border border-neutral-200/80 bg-white p-5 transition-all duration-200 cursor-pointer',
                          'hover:shadow-md',
                          colorSet.border,
                          colorSet.shadow,
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Badge variant="info" size="sm">
                              {t('unit')} {unit.orderIndex ?? unit.number}
                            </Badge>
                            <h3 className="mt-2.5 font-semibold text-neutral-900 group-hover:text-primary-700 transition-colors">
                              {unit.nameAr || unit.name}
                            </h3>
                            {unit.theme && (
                              <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{unit.theme}</p>
                            )}
                          </div>
                          <ChevronLeft className="h-5 w-5 shrink-0 text-neutral-300 rtl:rotate-180 group-hover:text-primary-400 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                });
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
