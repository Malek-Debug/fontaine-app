'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import {
  Gamepad2,
  PlusCircle,
  Target,
  ToggleLeft,
  Puzzle,
  Type,
  ListOrdered,
  Search,
  AlertTriangle,
  BookA,
  Copy,
  Sparkles,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const GAME_TYPE_LABELS: Record<string, string> = {
  quiz: 'اختبار',
  true_false: 'صح أو خطأ',
  matching: 'مطابقة',
  sentence_builder: 'بناء الجمل',
  order_story: 'ترتيب القصة',
  grammar_detective: 'محقق القواعد',
  find_mistake: 'اكتشف الخطأ',
  vocabulary: 'مفردات',
};

const GAME_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  quiz: Target,
  true_false: ToggleLeft,
  matching: Puzzle,
  sentence_builder: Type,
  order_story: ListOrdered,
  grammar_detective: Search,
  find_mistake: AlertTriangle,
  vocabulary: BookA,
};

const GAME_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  quiz: { bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-200' },
  true_false: { bg: 'bg-success-50', text: 'text-success-600', border: 'border-success-200' },
  matching: { bg: 'bg-accent-50', text: 'text-accent-600', border: 'border-accent-200' },
  sentence_builder: { bg: 'bg-info-50', text: 'text-info-600', border: 'border-info-200' },
  order_story: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  grammar_detective: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  find_mistake: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  vocabulary: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
};

const DIFFICULTY_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  easy: { label: 'سهل', variant: 'success' },
  medium: { label: 'متوسط', variant: 'warning' },
  hard: { label: 'صعب', variant: 'danger' },
};

export default function ActivitiesListPage() {
  const t = useTranslations('activities');
  const tCommon = useTranslations('common');
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const { data: activities, error, isLoading, mutate } = useSWR('/api/activities', fetcher);

  const handleDuplicate = async (activityId: string) => {
    setDuplicating(activityId);
    try {
      const res = await fetch(`/api/activities/${activityId}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
        mutate();
      }
    } catch {
      // silently fail
    } finally {
      setDuplicating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-10 w-32 rounded-xl" />
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
        <EmptyState
          icon={<Gamepad2 className="h-8 w-8" />}
          title={tCommon('error')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('myActivities')}</h1>
        <Link href="/teacher/activities/new">
          <Button size="sm">
            <PlusCircle className="h-4 w-4" />
            {t('createNew')}
          </Button>
        </Link>
      </div>

      {!activities || activities.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 className="h-8 w-8" />}
          title={t('noActivities')}
          description={t('noActivitiesDesc') || undefined}
          action={
            <Link href="/teacher/activities/new">
              <Button>
                <PlusCircle className="h-4 w-4" />
                {t('createNew')}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity: any, index: number) => {
            const Icon = GAME_TYPE_ICONS[activity.gameType] || Target;
            const colors = GAME_TYPE_COLORS[activity.gameType] || GAME_TYPE_COLORS.quiz;
            return (
              <div
                key={activity.id}
                className="animate-slideUp"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <Link href={`/teacher/activities/${activity.id}`} className="block h-full">
                <Card className="h-full group" hover>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                        colors.bg, colors.text,
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-neutral-900 truncate">
                          {activity.titleAr || activity.title}
                        </h3>
                        {activity.skill && (
                          <p className="mt-0.5 text-sm text-neutral-500 truncate">
                            {activity.skill.nameAr || activity.skill.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDuplicate(activity.id); }}
                      disabled={duplicating === activity.id}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors disabled:opacity-50"
                      title="نسخ النشاط"
                    >
                      {duplicating === activity.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <Badge variant="info">
                      {GAME_TYPE_LABELS[activity.gameType] || activity.gameType}
                    </Badge>
                    {DIFFICULTY_LABELS[activity.difficulty] && (
                      <Badge variant={DIFFICULTY_LABELS[activity.difficulty].variant}>
                        {DIFFICULTY_LABELS[activity.difficulty].label}
                      </Badge>
                    )}
                    <Badge variant="neutral">
                      {activity._count?.questions ?? 0} أسئلة
                    </Badge>
                    {activity.isAiGenerated && (
                      <Badge variant="info">
                        <Sparkles className="me-1 h-3 w-3" />
                        AI
                      </Badge>
                    )}
                  </div>
                </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
