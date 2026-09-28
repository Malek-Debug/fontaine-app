'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonStatCard, SkeletonCard } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import {
  BarChart3,
  Users,
  Radio,
  AlertTriangle,
  GraduationCap,
  Target,
  Sparkles,
  Filter,
  X,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MASTERY_COLORS: Record<string, { label: string; bg: string; text: string }> = {
  mastered: { label: 'متقن', bg: 'bg-success-500', text: 'text-success-700' },
  proficient: { label: 'متمكّن', bg: 'bg-primary-500', text: 'text-primary-700' },
  developing: { label: 'في طور التعلّم', bg: 'bg-warning-500', text: 'text-warning-700' },
  not_started: { label: 'لم يبدأ', bg: 'bg-neutral-300', text: 'text-neutral-500' },
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

const SESSION_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'neutral' }> = {
  completed: { label: 'مكتملة', variant: 'success' },
  active: { label: 'نشطة', variant: 'warning' },
  waiting: { label: 'في الانتظار', variant: 'neutral' },
};

const CATEGORY_LABELS: Record<string, string> = {
  reading: 'قراءة',
  writing: 'كتابة',
  grammar: 'قواعد',
  vocabulary: 'مفردات',
  expression: 'تعبير',
  dictation: 'إملاء',
};

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return 'bg-success-500';
  if (accuracy >= 60) return 'bg-primary-500';
  if (accuracy >= 40) return 'bg-warning-500';
  return 'bg-danger-500';
}

function getAccuracyTextColor(accuracy: number): string {
  if (accuracy >= 80) return 'text-success-600';
  if (accuracy >= 60) return 'text-primary-600';
  if (accuracy >= 40) return 'text-warning-600';
  return 'text-danger-600';
}

export default function AnalyticsPage() {
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const params = new URLSearchParams();
  if (selectedClassId) params.set('classId', selectedClassId);
  if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);

  const url = `/api/analytics${params.toString() ? `?${params.toString()}` : ''}`;

  const { data, error, isLoading } = useSWR(url, fetcher);

  const hasFilters = selectedClassId || selectedSubjectId || dateFrom || dateTo;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="space-y-1">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-5 w-64 mt-2" />
        </div>
        <SkeletonCard />
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

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="حدث خطأ"
          description="لم نتمكن من تحميل التحليلات. حاول مجددًا."
        />
      </div>
    );
  }

  const classes: any[] = data.classes || [];

  if (classes.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            التحليلات
          </h1>
        </div>
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="لا توجد بيانات بعد"
          description="أنشئ أقسامًا وابدأ حصصًا لتظهر التحليلات هنا"
          action={
            <Link href="/teacher/classes/new">
              <Button>
                <GraduationCap className="h-4 w-4" />
                إنشاء قسم
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const selectedClass = selectedClassId
    ? classes.find((c: any) => c.classId === selectedClassId)
    : null;
  const allClasses = data.classes || [];
  const subjects = selectedClass?.subjects || (allClasses.length === 1 ? allClasses[0].subjects : []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2.5 lg:text-3xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          التحليلات
        </h1>
        <p className="mt-1 text-sm text-neutral-500 ps-[46px]">
          تابع أداء التلاميذ وتقدّمهم في المهارات
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
              <Filter className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-neutral-900">تصفية النتائج</span>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSelectedClassId('');
                setSelectedSubjectId('');
                setDateFrom('');
                setDateTo('');
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              مسح الفلاتر
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">القسم</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSubjectId('');
              }}
              className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-colors"
            >
              <option value="">كل الأقسام</option>
              {allClasses.map((cls: any) => (
                <option key={cls.classId} value={cls.classId}>
                  {cls.className}
                </option>
              ))}
            </select>
          </div>

          {subjects.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">المادة</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-colors"
              >
                <option value="">كل المواد</option>
                {subjects.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr || s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
      </Card>

      {classes.map((cls: any) => (
        <div key={cls.classId} className="space-y-5">
          {classes.length > 1 && !selectedClassId && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-neutral-900">{cls.className}</h2>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="عدد التلاميذ"
              value={cls.totalStudents}
              color="info"
            />
            <StatCard
              icon={<Radio className="h-5 w-5" />}
              label="عدد الحصص"
              value={cls.totalSessions}
              color="accent"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="متوسط النتائج"
              value={`${cls.averageScore}%`}
              color="success"
            />
          </div>

          {/* Mastery Distribution */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-neutral-900">توزيع مستوى الإتقان</h3>
            </div>
            <MasteryDistribution distribution={cls.masteryDistribution} />
          </Card>

          {/* Skill Performance */}
          {cls.skillPerformance && cls.skillPerformance.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <Target className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-neutral-900">أداء التمارين حسب المهارة</h3>
              </div>
              <div className="space-y-3">
                {cls.skillPerformance.map((sp: any) => (
                  <div key={sp.skillId} className="rounded-xl border border-neutral-200/80 p-4 transition-all hover:border-neutral-300 hover:shadow-sm">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-neutral-900 text-sm truncate">
                          {sp.skillNameAr}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {CATEGORY_LABELS[sp.category] || sp.category}
                        </Badge>
                      </div>
                      <span className={cn('text-sm font-bold tabular-nums', getAccuracyTextColor(sp.accuracy))}>
                        {sp.accuracy}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', getAccuracyColor(sp.accuracy))}
                        style={{ width: `${sp.accuracy}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-neutral-400">
                        {sp.studentCount} تلاميذ تمرّنوا
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Weak Skills */}
          {cls.weakSkills && cls.weakSkills.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-neutral-900">مهارات تحتاج اهتمامًا</h3>
              </div>
              <div className="space-y-2.5">
                {cls.weakSkills.map((ws: any) => (
                  <div
                    key={ws.skillId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-warning-200/60 bg-warning-50/50 px-4 py-3.5 transition-all hover:border-warning-300 hover:bg-warning-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-neutral-900 text-sm truncate">
                          {ws.skillNameAr}
                        </span>
                        <Badge variant="danger" size="sm">
                          {ws.accuracy}%
                        </Badge>
                      </div>
                      <span className="text-xs text-neutral-500">
                        {ws.studentCount} تلاميذ — {ws.existingActivityCount} أنشطة موجودة
                      </span>
                    </div>
                    <Link href={`/teacher/ai/generate?skillId=${ws.skillId}`}>
                      <Button size="sm" variant="primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        إنشاء تمرين AI
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Sessions */}
          {(cls.recentSessions || []).length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <Radio className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-neutral-900">آخر الحصص</h3>
              </div>
              <div className="space-y-2">
                {(cls.recentSessions || []).map((s: any) => {
                  const statusCfg = SESSION_STATUS[s.status] || SESSION_STATUS.waiting;
                  return (
                    <Link
                      key={s.sessionId}
                      href={`/teacher/sessions/${s.sessionId}/results`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3.5 transition-all hover:border-neutral-300 hover:shadow-sm min-h-[44px]"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-neutral-900 text-sm group-hover:text-primary-700 transition-colors">
                          {s.activityTitle}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="neutral" size="sm">
                            {GAME_TYPE_LABELS[s.gameType] || s.gameType}
                          </Badge>
                          <Badge variant={statusCfg.variant} size="sm">
                            {statusCfg.label}
                          </Badge>
                          <span className="text-xs text-neutral-400">
                            {new Date(s.date).toLocaleDateString(locale === 'ar' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : 'en-US')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-neutral-500 tabular-nums">
                          {s.participantCount} تلاميذ
                        </span>
                        <ChevronIcon className="h-4 w-4 text-neutral-300 transition-colors group-hover:text-primary-500" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Students Needing Support */}
          {(cls.studentsNeedingSupport || []).length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-neutral-900">تلاميذ يحتاجون إلى دعم</h3>
              </div>
              <div className="space-y-2">
                {(cls.studentsNeedingSupport || []).map((s: any) => (
                  <Link
                    key={s.studentId}
                    href={`/teacher/students/${s.studentId}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-warning-200/60 bg-warning-50/30 px-4 py-3.5 transition-all hover:border-warning-300 hover:bg-warning-50 min-h-[44px]"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-neutral-900 group-hover:text-warning-800 transition-colors">
                        {s.displayName}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(s.weakSkills || []).slice(0, 3).map((skill: string, i: number) => (
                          <Badge key={i} variant="warning" size="sm">
                            {skill}
                          </Badge>
                        ))}
                        {(s.weakSkills || []).length > 3 && (
                          <Badge variant="neutral" size="sm">
                            +{(s.weakSkills || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronIcon className="h-4 w-4 text-neutral-300 shrink-0 transition-colors group-hover:text-warning-500" />
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}

function MasteryDistribution({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return <p className="text-sm text-neutral-500">لا توجد بيانات بعد</p>;
  }

  const levels = ['mastered', 'proficient', 'developing', 'not_started'] as const;

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        {levels.map((level) => {
          const count = distribution[level] || 0;
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={level}
              className={cn(MASTERY_COLORS[level].bg, 'transition-all duration-500')}
              style={{ width: `${pct}%` }}
              title={`${MASTERY_COLORS[level].label}: ${count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {levels.map((level) => {
          const count = distribution[level] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={level} className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-full', MASTERY_COLORS[level].bg)} />
              <span className="text-sm text-neutral-600">
                {MASTERY_COLORS[level].label}
              </span>
              <span className="text-sm font-bold text-neutral-900 tabular-nums">{count}</span>
              <span className="text-xs text-neutral-400 tabular-nums">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
