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
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SkeletonStatCard, SkeletonCard, Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  Users,
  BarChart3,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

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

export default function SessionResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const locale = useLocale();
  const router = useRouter();
  const tNav = useTranslations('nav');

  const { data, error, isLoading } = useSWR(
    `/api/sessions/results/${sessionId}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="skeleton h-4 w-64" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
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

  const avgColor = data.classAverage >= 70 ? 'success' : data.classAverage >= 40 ? 'warning' : 'danger';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumb
        locale={locale}
        items={[
          { label: tNav('dashboard'), href: '/teacher' },
          { label: tNav('sessions'), href: '/teacher/sessions' },
          { label: data.activity.titleAr || data.activity.title },
        ]}
        onNavigate={(href) => router.push(href)}
      />

      {/* Activity Header */}
      <div className="animate-fadeIn">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          {data.activity.titleAr || data.activity.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="info">
            {GAME_TYPE_LABELS[data.activity.gameType] || data.activity.gameType}
          </Badge>
          <Badge variant="neutral">{data.className}</Badge>
          {data.activity.skillNameAr && (
            <Badge variant="neutral">{data.activity.skillNameAr}</Badge>
          )}
          {data.session.completedAt && (
            <span className="text-sm text-neutral-500">
              {new Date(data.session.completedAt).toLocaleDateString('ar-TN')}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fadeIn animate-stagger-1">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="معدل القسم"
          value={`${data.classAverage}%`}
          color={avgColor === 'success' ? 'success' : avgColor === 'warning' ? 'accent' : 'danger'}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="نسبة المشاركة"
          value={`${data.participationRate}%`}
          color="primary"
        />
        <StatCard
          icon={<HelpCircle className="h-5 w-5" />}
          label="عدد الأسئلة"
          value={data.totalQuestions}
          color="info"
        />
      </div>

      {/* Leaderboard */}
      <Card className="animate-fadeIn animate-stagger-2">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
            <Trophy className="h-4 w-4" />
          </div>
          لوحة المتصدرين
        </h2>
        <div className="space-y-2">
          {(data.leaderboard || []).map((entry: any, i: number) => {
            const pct =
              entry.totalQuestions > 0
                ? Math.round((entry.correctCount / entry.totalQuestions) * 100)
                : 0;
            const pctColor = pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger';
            return (
              <div
                key={entry.studentId}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                  i === 0
                    ? 'bg-gradient-to-r rtl:bg-gradient-to-l from-accent-50 to-accent-100/50 border border-accent-200/50'
                    : 'bg-neutral-50 hover:bg-neutral-100'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    i === 0
                      ? 'bg-accent-100 text-accent-700'
                      : i === 1
                        ? 'bg-neutral-200 text-neutral-700'
                        : i === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {i + 1}
                </span>
                <Link
                  href={`/teacher/students/${entry.studentId}`}
                  className="flex-1 font-medium text-neutral-900 hover:text-primary-600 transition-colors truncate"
                >
                  {entry.displayName}
                </Link>
                <ProgressRing
                  value={pct}
                  size={40}
                  strokeWidth={3}
                  color={pctColor}
                  className="hidden sm:flex"
                />
                <span className="text-sm font-semibold text-primary-600 min-w-[48px] text-end">
                  {entry.correctCount}/{entry.totalQuestions}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Question Analysis */}
      <Card className="animate-fadeIn animate-stagger-3">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          تحليل الأسئلة
        </h2>
        <div className="space-y-4">
          {(data.questionResults || []).map((qr: any, i: number) => {
            const pct = Math.round(qr.accuracy * 100);
            const color = pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger';
            return (
              <div key={qr.questionId} className="rounded-xl border border-neutral-200/80 p-4 transition-all hover:border-neutral-200 hover:shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700 truncate pe-2">
                    س{i + 1}: {qr.questionText}
                  </span>
                  <Badge
                    variant={pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger'}
                    size="sm"
                  >
                    {qr.correctCount}/{qr.totalAnswers}
                  </Badge>
                </div>
                <Progress value={pct} color={color} size="sm" showPercentage={false} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Low Performers */}
      {data.lowPerformers && data.lowPerformers.length > 0 && (
        <Card className="animate-fadeIn animate-stagger-4">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            تلاميذ يحتاجون إلى دعم
          </h2>
          <div className="space-y-2">
            {data.lowPerformers.map((lp: any) => (
              <Link
                key={lp.studentId}
                href={`/teacher/students/${lp.studentId}`}
                className="flex items-center justify-between rounded-xl bg-warning-50/50 border border-warning-100 px-4 py-3 hover:bg-warning-50 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-neutral-900 group-hover:text-primary-700 transition-colors">
                    {lp.displayName}
                  </span>
                  <p className="text-sm text-neutral-500 truncate">{lp.suggestion}</p>
                </div>
                <div className="flex items-center gap-2 ms-3 shrink-0">
                  <Badge variant="danger">{lp.score}%</Badge>
                  <ArrowRight className="h-4 w-4 text-neutral-400 rtl:rotate-180" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
