'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Avatar } from '@/components/ui/avatar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SkeletonStatCard, SkeletonCard, Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Gamepad2,
  AlertTriangle,
  CheckCircle,
  Trophy,
  XCircle,
  Sparkles,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MASTERY_CONFIG: Record<string, { label: string; color: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  mastered: { label: 'متقن', color: 'bg-success-100 text-success-700', variant: 'success' },
  proficient: { label: 'متمكّن', color: 'bg-primary-100 text-primary-700', variant: 'info' as any },
  developing: { label: 'في طور التعلّم', color: 'bg-warning-100 text-warning-700', variant: 'warning' },
  not_started: { label: 'لم يبدأ', color: 'bg-neutral-100 text-neutral-500', variant: 'neutral' },
};

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

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const locale = useLocale();
  const router = useRouter();
  const tNav = useTranslations('nav');

  const { data, error, isLoading } = useSWR(
    `/api/students/${studentId}/progress`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="skeleton h-4 w-64" />
        <div className="flex items-center gap-4">
          <Skeleton variant="circular" className="h-16 w-16" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !data || data.error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-danger-500">{data?.error || 'حدث خطأ'}</p>
      </div>
    );
  }

  const scoreColor = data.overallScore >= 70 ? 'success' : data.overallScore >= 40 ? 'warning' : 'danger';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumb
        locale={locale}
        items={[
          { label: tNav('dashboard'), href: '/teacher' },
          { label: tNav('students'), href: '/teacher/students' },
          { label: data.student.displayName },
        ]}
        onNavigate={(href) => router.push(href)}
      />

      {/* Student Header */}
      <Card className="animate-fadeIn">
        <div className="flex items-center gap-4">
          <Avatar
            name={`${data.student.firstName} ${data.student.lastName}`}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight truncate">
              {data.student.displayName}
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {data.student.firstName} {data.student.lastName} — {data.student.className}
            </p>
          </div>
          <div className="hidden sm:block">
            <ProgressRing
              value={data.overallScore}
              size={72}
              strokeWidth={5}
              color={scoreColor}
            />
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fadeIn animate-stagger-1">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="النتيجة العامة"
          value={`${data.overallScore}%`}
          color={scoreColor === 'success' ? 'success' : scoreColor === 'warning' ? 'accent' : 'danger'}
        />
        <StatCard
          icon={<Gamepad2 className="h-5 w-5" />}
          label="إجمالي الأنشطة"
          value={data.totalActivities}
          color="primary"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="عدد المهارات"
          value={(data.skillResults || []).length}
          color="info"
        />
      </div>

      {/* Skills Mastery */}
      {data.skillResults.length > 0 && (
        <Card className="animate-fadeIn animate-stagger-2">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">
            مستوى إتقان المهارات
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(data.skillResults || []).map((sr: any) => {
              const mastery = MASTERY_CONFIG[sr.masteryLevel] || MASTERY_CONFIG.not_started;
              const pct =
                sr.totalAttempts > 0
                  ? Math.round((sr.correctCount / sr.totalAttempts) * 100)
                  : 0;
              const color = pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger';
              return (
                <div
                  key={sr.skillId}
                  className="rounded-xl border border-neutral-200/80 p-4 transition-all hover:border-neutral-200 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-neutral-900 text-sm truncate pe-2">
                      {sr.skillNameAr || sr.skillName}
                    </span>
                    <Badge variant={mastery.variant} size="sm">
                      {mastery.label}
                    </Badge>
                  </div>
                  <Progress value={pct} color={color} size="sm" />
                  <p className="mt-1.5 text-xs text-neutral-500">
                    {sr.correctCount}/{sr.totalAttempts} إجابات صحيحة
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Frequently Missed Questions */}
      {data.frequentlyMissedQuestions && data.frequentlyMissedQuestions.length > 0 && (
        <Card className="animate-fadeIn animate-stagger-3">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-50 text-danger-500">
              <XCircle className="h-4 w-4" />
            </div>
            الأسئلة الأكثر خطأً
          </h2>
          <div className="space-y-2">
            {data.frequentlyMissedQuestions.map((q: any) => (
              <div
                key={q.questionId}
                className="rounded-xl bg-danger-50/50 border border-danger-100 px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-neutral-900 text-sm">
                    {q.questionText}
                  </span>
                  <Badge variant="danger" size="sm">
                    {q.timesWrong} مرات
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{q.activityTitle}</span>
                  <Badge variant="neutral" size="sm">
                    {GAME_TYPE_LABELS[q.gameType] || q.gameType}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activities */}
      {(data.recentAnswers || []).length > 0 && (
        <Card className="animate-fadeIn animate-stagger-4">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Trophy className="h-4 w-4" />
            </div>
            آخر الأنشطة
          </h2>
          <div className="space-y-2">
            {(data.recentAnswers || []).map((ra: any, i: number) => {
              const pct =
                ra.totalQuestions > 0
                  ? Math.round((ra.correctCount / ra.totalQuestions) * 100)
                  : 0;
              return (
                <Link
                  key={`${ra.sessionId}-${i}`}
                  href={`/teacher/sessions/${ra.sessionId}/results`}
                  className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 hover:bg-neutral-100 transition-colors min-h-[44px] group"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-neutral-900 text-sm group-hover:text-primary-700 transition-colors">
                      {ra.activityTitle}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="neutral" size="sm">
                        {GAME_TYPE_LABELS[ra.gameType] || ra.gameType}
                      </Badge>
                      {ra.date && (
                        <span className="text-xs text-neutral-400">
                          {new Date(ra.date).toLocaleDateString('ar-TN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-end ms-3">
                    <span className="font-semibold text-primary-600">
                      {ra.correctCount}/{ra.totalQuestions}
                    </span>
                    <p className="text-xs text-neutral-500">{pct}%</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Remediation Suggestions */}
      {(data.remediation || []).length > 0 && (
        <Card className="animate-fadeIn animate-stagger-5">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            توصيات للتحسين
          </h2>
          <div className="space-y-2">
            {(data.remediation || []).map((r: any) => (
              <div
                key={r.skillId}
                className="rounded-xl bg-warning-50/50 border border-warning-100 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-neutral-900 text-sm">
                      {r.skillNameAr}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="warning" size="sm">
                        {MASTERY_CONFIG[r.masteryLevel]?.label || r.masteryLevel}
                      </Badge>
                      {r.totalAttempts > 0 && (
                        <span className="text-xs text-neutral-500">
                          {r.correctCount}/{r.totalAttempts} إجابات صحيحة ({r.accuracy}%)
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-neutral-600">{r.suggestion}</p>
                  </div>
                  {r.accuracy !== undefined && r.accuracy < 60 && (
                    <Link
                      href={`/teacher/ai/generate?skillId=${r.skillId}`}
                      className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors min-h-[44px] shrink-0 ms-3 shadow-sm shadow-primary-600/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">إنشاء تمرين بالذكاء الاصطناعي</span>
                      <span className="sm:hidden">تمرين AI</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
