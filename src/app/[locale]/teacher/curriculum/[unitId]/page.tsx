'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Tag,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SKILL_CATEGORY_VARIANTS: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  reading: 'info',
  writing: 'success',
  grammar: 'warning',
  vocabulary: 'danger',
  expression: 'neutral',
};

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  reading: 'قراءة',
  writing: 'كتابة',
  grammar: 'قواعد',
  vocabulary: 'مفردات',
  expression: 'تعبير',
};

export default function UnitDetailPage() {
  const params = useParams();
  const unitId = params.unitId as string;

  const t = useTranslations('curriculum');
  const tCommon = useTranslations('common');

  const { data: unit, error, isLoading } = useSWR(
    `/api/curriculum/units/${unitId}`,
    fetcher,
  );

  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  const toggleDomain = (domainId: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-4">
          <Skeleton variant="rectangular" className="h-20 w-full rounded-2xl" />
          <Skeleton variant="rectangular" className="h-20 w-full rounded-2xl" />
          <Skeleton variant="rectangular" className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title={tCommon('error')}
        />
      </div>
    );
  }

  const domains = unit.domains || [];
  const totalSkills = domains.reduce(
    (sum: number, d: any) => sum + (d.lessons || []).reduce(
      (s: number, l: any) => s + (l.skills?.length || 0), 0,
    ), 0,
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500">
        <Link
          href="/teacher/curriculum"
          className="hover:text-primary-600 transition-colors"
        >
          {t('browse')}
        </Link>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900 font-medium truncate">
          {unit.nameAr || unit.name}
        </span>
      </nav>

      {/* Unit Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/teacher/curriculum"
          className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors"
        >
          <ArrowRight className="h-4 w-4 rotate-180 rtl:rotate-0" />
        </Link>
        <div>
          <Badge variant="info" className="mb-2">
            {t('unit')} {unit.orderIndex ?? unit.number}
          </Badge>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {unit.nameAr || unit.name}
          </h1>
          <div className="mt-1.5 flex items-center gap-3 text-sm text-neutral-500">
            {unit.theme && <span>{unit.theme}</span>}
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {domains.length} {t('domain')}
            </span>
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              {totalSkills} {t('skill')}
            </span>
          </div>
        </div>
      </div>

      {/* Domains */}
      {domains.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title={t('noLessons')}
        />
      ) : (
        <div className="space-y-3">
          {domains.map((domain: any, domainIdx: number) => {
            const isExpanded = expandedDomains.has(domain.id);
            const lessons = domain.lessons || [];
            const domainSkillCount = lessons.reduce(
              (s: number, l: any) => s + (l.skills?.length || 0), 0,
            );

            return (
              <div
                key={domain.id}
                className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden transition-all animate-slideUp"
                style={{ animationDelay: `${domainIdx * 50}ms` }}
              >
                {/* Domain Header */}
                <button
                  type="button"
                  onClick={() => toggleDomain(domain.id)}
                  className={cn(
                    'flex w-full items-center justify-between px-5 py-4 text-start transition-colors',
                    isExpanded ? 'bg-neutral-50/50' : 'hover:bg-neutral-50/50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {domain.nameAr || domain.name}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {lessons.length} {t('lesson')} &middot; {domainSkillCount} {t('skill')}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                    isExpanded ? 'bg-primary-50 text-primary-600' : 'text-neutral-400',
                  )}>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Domain Content */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 px-5 pb-5 animate-slideDown">
                    {lessons.length === 0 ? (
                      <p className="py-6 text-center text-sm text-neutral-400">
                        {t('noLessons')}
                      </p>
                    ) : (
                      <div className="mt-4 space-y-5">
                        {lessons.map((lesson: any) => {
                          const skills = lesson.skills || [];
                          return (
                            <div key={lesson.id}>
                              <h4 className="mb-2.5 text-sm font-semibold text-neutral-700 flex items-center gap-2">
                                <BookOpen className="h-3.5 w-3.5 text-neutral-400" />
                                {lesson.nameAr || lesson.name}
                              </h4>

                              {skills.length === 0 ? (
                                <p className="text-xs text-neutral-400 ps-5">
                                  {t('noSkills')}
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {skills.map((skill: any) => {
                                    const category = (skill.category || '').toLowerCase();
                                    const variant = SKILL_CATEGORY_VARIANTS[category] || 'neutral';
                                    const categoryLabel = SKILL_CATEGORY_LABELS[category] || skill.category || '';

                                    return (
                                      <Link
                                        key={skill.id}
                                        href={`/teacher/curriculum/${unitId}/skills/${skill.id}`}
                                      >
                                        <div className="group flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-sm transition-all hover:border-primary-200 hover:shadow-sm hover:shadow-primary-500/5">
                                          <Tag className="h-3.5 w-3.5 text-neutral-400 group-hover:text-primary-500 transition-colors" />
                                          <span className="text-neutral-700 group-hover:text-primary-700 transition-colors">
                                            {skill.nameAr || skill.name}
                                          </span>
                                          {categoryLabel && (
                                            <Badge variant={variant} size="sm">
                                              {categoryLabel}
                                            </Badge>
                                          )}
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
