'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Tag,
  Gamepad2,
  PlusCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const DIFFICULTY_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

const GAME_TYPE_LABELS: Record<string, string> = {
  quiz: 'اختبار قصير',
  trueFalse: 'صحيح أو خطأ',
  matching: 'مطابقة',
  sentenceBuilder: 'بناء الجمل',
  orderStory: 'ترتيب القصة',
  grammarDetective: 'محقق القواعد',
  findMistake: 'اكتشف الخطأ',
  vocabulary: 'المفردات',
};

const GAME_TYPE_COLORS: Record<string, string> = {
  quiz: 'bg-primary-50 text-primary-600',
  trueFalse: 'bg-success-50 text-success-600',
  matching: 'bg-accent-50 text-accent-600',
  sentenceBuilder: 'bg-info-50 text-info-600',
  orderStory: 'bg-warning-50 text-warning-600',
  grammarDetective: 'bg-danger-50 text-danger-600',
  findMistake: 'bg-neutral-100 text-neutral-600',
  vocabulary: 'bg-primary-50 text-primary-600',
};

export default function SkillDetailPage() {
  const params = useParams();
  const unitId = params.unitId as string;
  const skillId = params.skillId as string;

  const t = useTranslations('curriculum');
  const tActivities = useTranslations('activities');
  const tCommon = useTranslations('common');

  const { data: skill, error, isLoading } = useSWR(
    `/api/curriculum/skills/${skillId}`,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-56" />
        <div className="flex items-center gap-4">
          <Skeleton variant="rectangular" className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton variant="rectangular" className="h-28 w-full rounded-2xl" />
          <Skeleton variant="rectangular" className="h-28 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={<Tag className="h-8 w-8" />}
          title={tCommon('error')}
        />
      </div>
    );
  }

  const category = (skill.category || '').toLowerCase();
  const categoryVariant = SKILL_CATEGORY_VARIANTS[category] || 'neutral';
  const categoryLabel = SKILL_CATEGORY_LABELS[category] || skill.category || '';
  const activities = skill.activities || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
        <Link
          href="/teacher/curriculum"
          className="hover:text-primary-600 transition-colors"
        >
          {t('browse')}
        </Link>
        <span className="text-neutral-300">/</span>
        <Link
          href={`/teacher/curriculum/${unitId}`}
          className="hover:text-primary-600 transition-colors"
        >
          {t('unit')} {skill.lesson?.domain?.unit?.orderIndex || ''}
        </Link>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900 font-medium truncate">
          {skill.nameAr || skill.name}
        </span>
      </nav>

      {/* Skill Header */}
      <div className="flex items-start gap-4">
        <Link
          href={`/teacher/curriculum/${unitId}`}
          className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors"
        >
          <ArrowRight className="h-4 w-4 rotate-180 rtl:rotate-0" />
        </Link>
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 mb-3">
            <Tag className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {skill.nameAr || skill.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {categoryLabel && (
              <Badge variant={categoryVariant}>{categoryLabel}</Badge>
            )}
            {skill.lesson && (
              <span className="flex items-center gap-1 text-sm text-neutral-500">
                <BookOpen className="h-3.5 w-3.5" />
                {skill.lesson.nameAr || skill.lesson.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Activities Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">{t('activities')}</h2>
          <div className="relative group">
            <Button size="sm" variant="outline" disabled>
              <PlusCircle className="h-4 w-4" />
              {tActivities('create')}
            </Button>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-800 px-2.5 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {tCommon('comingSoon')}
            </span>
          </div>
        </div>

        {activities.length === 0 ? (
          <EmptyState
            icon={<Gamepad2 className="h-8 w-8" />}
            title={tActivities('noActivities')}
            description={t('skill') + ' — ' + (skill.nameAr || skill.name)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activities.map((activity: any, idx: number) => {
              const difficulty = (activity.difficulty || '').toLowerCase();
              const difficultyVariant = DIFFICULTY_VARIANTS[difficulty] || 'neutral' as any;
              const difficultyLabel = DIFFICULTY_LABELS[difficulty] || activity.difficulty || '';
              const gameTypeLabel = GAME_TYPE_LABELS[activity.gameType] || activity.gameType || '';
              const gameColor = GAME_TYPE_COLORS[activity.gameType] || 'bg-neutral-100 text-neutral-600';

              return (
                <div
                  key={activity.id}
                  className="group rounded-2xl border border-neutral-200/80 bg-white p-5 transition-all duration-200 hover:shadow-md hover:border-neutral-200 animate-slideUp"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', gameColor)}>
                      <Gamepad2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-neutral-900 truncate">
                        {activity.titleAr || activity.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {gameTypeLabel && (
                          <Badge variant="info" size="sm">{gameTypeLabel}</Badge>
                        )}
                        {difficultyLabel && (
                          <Badge variant={difficultyVariant} size="sm">{difficultyLabel}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
                    {activity.questionCount != null && (
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {activity.questionCount} {activity.questionCount > 1 ? 'questions' : 'question'}
                      </span>
                    )}
                    {activity.status && (
                      <Badge
                        variant={activity.status === 'published' ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {activity.status === 'published'
                          ? tActivities('published')
                          : activity.status === 'draft'
                            ? tActivities('draft')
                            : tActivities('archived')}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
