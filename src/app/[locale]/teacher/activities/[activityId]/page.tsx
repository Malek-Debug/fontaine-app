'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  Target,
  ToggleLeft,
  Puzzle,
  Type,
  ListOrdered,
  Search,
  AlertTriangle,
  BookA,
  Clock,
  Star,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  GripVertical,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const GAME_TYPE_LABELS: Record<string, { ar: string; fr: string }> = {
  quiz: { ar: 'اختبار', fr: 'Quiz' },
  true_false: { ar: 'صح أو خطأ', fr: 'Vrai ou faux' },
  matching: { ar: 'مطابقة', fr: 'Association' },
  sentence_builder: { ar: 'بناء الجمل', fr: 'Construction de phrases' },
  order_story: { ar: 'ترتيب القصة', fr: 'Ordonner l\'histoire' },
  grammar_detective: { ar: 'محقق القواعد', fr: 'Détective de grammaire' },
  find_mistake: { ar: 'اكتشف الخطأ', fr: 'Trouver l\'erreur' },
  vocabulary: { ar: 'مفردات', fr: 'Vocabulaire' },
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

const GAME_TYPE_COLORS: Record<string, { bg: string; text: string; iconBg: string }> = {
  quiz: { bg: 'bg-primary-50', text: 'text-primary-600', iconBg: 'bg-primary-100' },
  true_false: { bg: 'bg-success-50', text: 'text-success-600', iconBg: 'bg-success-100' },
  matching: { bg: 'bg-accent-50', text: 'text-accent-600', iconBg: 'bg-accent-100' },
  sentence_builder: { bg: 'bg-info-50', text: 'text-info-600', iconBg: 'bg-info-100' },
  order_story: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-violet-100' },
  grammar_detective: { bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-rose-100' },
  find_mistake: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
  vocabulary: { bg: 'bg-cyan-50', text: 'text-cyan-600', iconBg: 'bg-cyan-100' },
};

const DIFFICULTY_LABELS: Record<string, { ar: string; fr: string; variant: 'success' | 'warning' | 'danger' }> = {
  easy: { ar: 'سهل', fr: 'Facile', variant: 'success' },
  medium: { ar: 'متوسط', fr: 'Moyen', variant: 'warning' },
  hard: { ar: 'صعب', fr: 'Difficile', variant: 'danger' },
};

function QuestionPreview({ question, index }: { question: any; index: number }) {
  const data = typeof question.data === 'string' ? JSON.parse(question.data) : question.data;

  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-4 transition-colors hover:border-neutral-300">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-sm font-semibold text-neutral-600">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-medium text-neutral-900">{question.questionText}</p>

          {data.type === 'quiz' && data.options && (
            <div className="space-y-1.5">
              {data.options.map((opt: any) => (
                <div
                  key={opt.id}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                    opt.id === data.correctOptionId
                      ? 'bg-success-50 text-success-700 font-medium'
                      : 'bg-neutral-50 text-neutral-600',
                  )}
                >
                  {opt.id === data.correctOptionId ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-neutral-300" />
                  )}
                  {opt.text}
                </div>
              ))}
            </div>
          )}

          {data.type === 'true_false' && (
            <div className="flex gap-2">
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                data.correctAnswer === true ? 'bg-success-50 text-success-700 font-medium' : 'bg-neutral-50 text-neutral-600',
              )}>
                {data.correctAnswer === true && <CheckCircle2 className="h-4 w-4 text-success-500" />}
                صح
              </div>
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                data.correctAnswer === false ? 'bg-success-50 text-success-700 font-medium' : 'bg-neutral-50 text-neutral-600',
              )}>
                {data.correctAnswer === false && <CheckCircle2 className="h-4 w-4 text-success-500" />}
                خطأ
              </div>
            </div>
          )}

          {data.type === 'matching' && data.pairs && (
            <div className="space-y-1.5">
              {data.pairs.map((pair: any) => (
                <div key={pair.id} className="flex items-center gap-2 text-sm">
                  <span className="rounded-lg bg-primary-50 px-3 py-1.5 text-primary-700">{pair.left}</span>
                  <span className="text-neutral-400">←→</span>
                  <span className="rounded-lg bg-accent-50 px-3 py-1.5 text-accent-700">{pair.right}</span>
                </div>
              ))}
            </div>
          )}

          {data.type === 'sentence_builder' && data.correctOrder && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {data.words.map((word: string, i: number) => (
                  <span key={i} className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-600">{word}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
                <span className="text-sm text-success-700">{data.correctOrder.join(' ')}</span>
              </div>
            </div>
          )}

          {data.type === 'order_story' && data.items && (
            <div className="space-y-1.5">
              {data.correctOrder.map((id: string, i: number) => {
                const item = data.items.find((it: any) => it.id === id);
                return (
                  <div key={id} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">{i + 1}</span>
                    {item?.text}
                  </div>
                );
              })}
            </div>
          )}

          {data.type === 'grammar_detective' && (
            <div className="space-y-2">
              <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{data.sentence}</p>
              <div className="flex flex-wrap gap-1.5">
                {data.targets?.map((target: any) => (
                  <span key={target.id} className="rounded-lg bg-primary-50 px-2 py-1 text-xs">
                    <span className="font-medium text-primary-700">{target.text}</span>
                    <span className="mx-1 text-neutral-400">→</span>
                    <span className="text-primary-600">{target.label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.type === 'find_mistake' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm">
                <XCircle className="h-4 w-4 shrink-0 text-danger-500" />
                <span className="text-danger-700 line-through">{data.sentenceWithMistake}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" />
                <span className="text-success-700">{data.correctedSentence}</span>
              </div>
            </div>
          )}

          {data.type === 'vocabulary' && (
            <div className="space-y-2">
              <div className="rounded-lg bg-cyan-50 px-3 py-2 text-sm">
                <span className="font-semibold text-cyan-700">{data.word}</span>
                <span className="mx-2 text-cyan-400">—</span>
                <span className="text-cyan-600">{data.definition}</span>
              </div>
              {data.distractors && (
                <div className="flex flex-wrap gap-1.5">
                  {data.distractors.map((d: string, i: number) => (
                    <span key={i} className="rounded-lg bg-neutral-100 px-2 py-1 text-xs text-neutral-500">{d}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {question.explanation && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              {question.explanation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivityDetailPage() {
  const params = useParams();
  const activityId = params.activityId as string;
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('activities');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: activity, error, isLoading } = useSWR(
    `/api/activities/${activityId}`,
    fetcher,
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/activities/${activityId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/teacher/activities');
      }
    } catch {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !activity || activity.error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={<Target className="h-8 w-8" />}
          title={tCommon('error')}
          description={activity?.error || undefined}
        />
      </div>
    );
  }

  const Icon = GAME_TYPE_ICONS[activity.gameType] || Target;
  const colors = GAME_TYPE_COLORS[activity.gameType] || GAME_TYPE_COLORS.quiz;
  const difficulty = DIFFICULTY_LABELS[activity.difficulty];
  const gameLabel = GAME_TYPE_LABELS[activity.gameType];
  const questions = activity.questions || [];

  return (
    <div className="space-y-6">
      <Breadcrumb
        locale={locale}
        items={[
          { label: tNav('dashboard'), href: '/teacher' },
          { label: t('myActivities'), href: '/teacher/activities' },
          { label: activity.titleAr || activity.title },
        ]}
        onNavigate={(href) => router.push(href)}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
            colors.iconBg, colors.text,
          )}>
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              {activity.titleAr || activity.title}
            </h1>
            {activity.skill && (
              <p className="mt-1 text-sm text-neutral-500">
                {activity.skill.nameAr || activity.skill.name}
                {activity.skill.lesson?.domain?.unit && (
                  <> · {activity.skill.lesson.domain.unit.nameAr}</>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            {tCommon('delete')}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-neutral-900">{questions.length}</div>
          <div className="mt-1 text-sm text-neutral-500">{t('questions')}</div>
        </Card>
        <Card className="text-center">
          <Badge variant={difficulty?.variant || 'neutral'} className="mx-auto">
            {locale === 'ar' ? difficulty?.ar : difficulty?.fr || activity.difficulty}
          </Badge>
          <div className="mt-2 text-sm text-neutral-500">{t('difficulty')}</div>
        </Card>
        <Card className="text-center">
          <Badge variant="info" className="mx-auto">
            {locale === 'ar' ? gameLabel?.ar : gameLabel?.fr || activity.gameType}
          </Badge>
          <div className="mt-2 text-sm text-neutral-500">{t('gameType')}</div>
        </Card>
        <Card className="text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-neutral-900">
            <Clock className="h-5 w-5 text-neutral-400" />
            {activity.timeLimit || '—'}
          </div>
          <div className="mt-1 text-sm text-neutral-500">{t('seconds')}</div>
        </Card>
      </div>

      {/* Description */}
      {(activity.descriptionAr || activity.description) && (
        <Card>
          <p className="text-neutral-700">{activity.descriptionAr || activity.description}</p>
        </Card>
      )}

      {/* Questions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('questions')}</h2>
        {questions.length === 0 ? (
          <Card>
            <EmptyState
              icon={<HelpCircle className="h-6 w-6" />}
              title={t('noQuestions')}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {questions.map((q: any, i: number) => (
              <QuestionPreview key={q.id} question={q} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={tCommon('delete')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              {tCommon('delete')}
            </Button>
          </>
        }
      >
        <p className="text-neutral-600">
          {locale === 'ar'
            ? 'هل أنت متأكد من حذف هذا النشاط؟ لا يمكن التراجع عن هذا الإجراء.'
            : 'Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible.'}
        </p>
      </Dialog>
    </div>
  );
}
