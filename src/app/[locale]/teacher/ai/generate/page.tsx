'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import useSWR from 'swr';
import {
  Sparkles,
  Trash2,
  Check,
  RefreshCw,
  FileText,
  CircleDot,
  CheckCircle,
  Link as LinkIcon,
  Type,
  ListOrdered,
  Search,
  AlertTriangle,
  BookOpen,
  Wand2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { GAME_TYPE_CONFIGS } from '@/types/game';
import type { GameType } from '@/types/index';
import { cn } from '@/lib/cn';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const GAME_TYPE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CircleDot,
  CheckCircle,
  Link: LinkIcon,
  Type,
  ListOrdered,
  Search,
  AlertTriangle,
  BookOpen,
};

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'سهل' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'صعب' },
];

interface GeneratedActivity {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  gameType: string;
  difficulty: string;
  status: string;
  questions: GeneratedQuestion[];
}

interface GeneratedQuestion {
  id: string;
  questionText: string;
  questionType: string;
  data: string;
  explanation: string;
  orderIndex: number;
}

type Phase = 'select' | 'generating' | 'review';

export default function AiGeneratePage() {
  const t = useTranslations('ai');
  const tAct = useTranslations('activities');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledSkillId = searchParams.get('skillId');

  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');

  const [selectedGameType, setSelectedGameType] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(5);

  const [phase, setPhase] = useState<Phase>('select');
  const [error, setError] = useState('');
  const [generatedActivity, setGeneratedActivity] = useState<GeneratedActivity | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  const { data: aiStatus } = useSWR('/api/ai/status', fetcher);
  const { data: curriculum } = useSWR('/api/curriculum', fetcher);
  const { data: unitData } = useSWR(
    selectedUnitId ? `/api/curriculum/units/${selectedUnitId}` : null,
    fetcher
  );

  useEffect(() => {
    if (prefilledSkillId && curriculum) {
      fetch(`/api/curriculum/skills/${prefilledSkillId}`)
        .then((res) => res.json())
        .then((skill) => {
          if (skill && skill.lesson) {
            const lesson = skill.lesson;
            const domain = lesson.domain;
            const unit = domain.unit;

            const grades = curriculum?.grades || curriculum || [];
            for (const grade of grades) {
              for (const subject of grade.subjects || []) {
                for (const u of subject.units || []) {
                  if (u.id === unit.id) {
                    setSelectedGradeId(grade.id);
                    setSelectedSubjectId(subject.id);
                    setSelectedUnitId(unit.id);
                    setTimeout(() => {
                      setSelectedDomainId(domain.id);
                      setSelectedLessonId(lesson.id);
                      setSelectedSkillId(prefilledSkillId);
                    }, 500);
                    return;
                  }
                }
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [prefilledSkillId, curriculum]);

  const grades = curriculum?.grades || curriculum || [];
  const selectedGrade = grades.find((g: any) => g.id === selectedGradeId);
  const subjects = selectedGrade?.subjects || [];
  const selectedSubject = subjects.find((s: any) => s.id === selectedSubjectId);
  const units = selectedSubject?.units || [];

  const domains = unitData?.domains || [];
  const selectedDomain = domains.find((d: any) => d.id === selectedDomainId);
  const lessons = selectedDomain?.lessons || [];
  const selectedLesson = lessons.find((l: any) => l.id === selectedLessonId);
  const skills = selectedLesson?.skills || [];

  const handleGradeChange = useCallback((gradeId: string) => {
    setSelectedGradeId(gradeId);
    setSelectedSubjectId('');
    setSelectedUnitId('');
    setSelectedDomainId('');
    setSelectedLessonId('');
    setSelectedSkillId('');
  }, []);

  const handleSubjectChange = useCallback((subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedUnitId('');
    setSelectedDomainId('');
    setSelectedLessonId('');
    setSelectedSkillId('');
  }, []);

  const handleUnitChange = useCallback((unitId: string) => {
    setSelectedUnitId(unitId);
    setSelectedDomainId('');
    setSelectedLessonId('');
    setSelectedSkillId('');
  }, []);

  const handleDomainChange = useCallback((domainId: string) => {
    setSelectedDomainId(domainId);
    setSelectedLessonId('');
    setSelectedSkillId('');
  }, []);

  const handleLessonChange = useCallback((lessonId: string) => {
    setSelectedLessonId(lessonId);
    setSelectedSkillId('');
  }, []);

  const canGenerate =
    selectedSkillId && selectedGameType && selectedDifficulty && questionCount > 0;

  async function handleGenerate() {
    if (!canGenerate) return;
    setPhase('generating');
    setError('');

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: selectedSkillId,
          gameType: selectedGameType,
          difficulty: selectedDifficulty,
          questionCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorKey = data.errorType || 'generationFailed';
        setError(errorKey === 'timeout' ? t('timeout') :
                 errorKey === 'rate_limited' ? t('rateLimited') :
                 errorKey === 'invalid_response' ? t('invalidResponse') :
                 errorKey === 'no_api_key' ? t('noApiKey') :
                 data.error || t('generationFailed'));
        setPhase('select');
        return;
      }

      setGeneratedActivity(data.activity);
      setPhase('review');
    } catch {
      setError(t('generationFailed'));
      setPhase('select');
    }
  }

  async function handleApprove() {
    if (!generatedActivity) return;
    setActionLoading('approve');
    try {
      const res = await fetch(`/api/activities/${generatedActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      if (res.ok) {
        router.push('/teacher/activities');
      }
    } catch {
      setError(t('generationFailed'));
    } finally {
      setActionLoading('');
    }
  }

  async function handleKeepDraft() {
    router.push('/teacher/activities');
  }

  async function handleDelete() {
    if (!generatedActivity) return;
    setActionLoading('delete');
    try {
      await fetch(`/api/activities/${generatedActivity.id}`, {
        method: 'DELETE',
      });
      setGeneratedActivity(null);
      setPhase('select');
    } catch {
      setError(t('generationFailed'));
    } finally {
      setActionLoading('');
    }
  }

  async function handleRegenerate() {
    if (generatedActivity) {
      await fetch(`/api/activities/${generatedActivity.id}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    setGeneratedActivity(null);
    handleGenerate();
  }

  function handleDeleteQuestion(questionId: string) {
    if (!generatedActivity) return;
    setGeneratedActivity({
      ...generatedActivity,
      questions: generatedActivity.questions.filter((q) => q.id !== questionId),
    });
  }

  // Generating phase
  if (phase === 'generating') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 animate-fadeIn">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600">
            <Wand2 className="h-9 w-9 animate-pulse" />
          </div>
          <div className="absolute -top-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent-100 text-accent-600">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-neutral-900">{t('generating')}</p>
          <p className="text-sm text-neutral-500 max-w-xs">
            {skills.find((s: any) => s.id === selectedSkillId)?.nameAr || ''}
          </p>
        </div>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full animate-progress-bar rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-primary-400 to-primary-600" />
        </div>
      </div>
    );
  }

  // Review phase
  if (phase === 'review' && generatedActivity) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('reviewActivity')}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="warning" size="sm">{tAct('draft')}</Badge>
              <Badge variant="info" size="sm">
                <Sparkles className="h-3 w-3 me-1" />
                {t('aiGenerated')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Activity Info */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <FileText className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-neutral-900">معلومات النشاط</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {tAct('titleAr')}
              </label>
              <input
                type="text"
                value={generatedActivity.titleAr}
                onChange={(e) =>
                  setGeneratedActivity({ ...generatedActivity, titleAr: e.target.value })
                }
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {tAct('descriptionAr')}
              </label>
              <textarea
                value={generatedActivity.descriptionAr}
                onChange={(e) =>
                  setGeneratedActivity({ ...generatedActivity, descriptionAr: e.target.value })
                }
                rows={2}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 resize-none transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Questions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-neutral-900">
              {tAct('questions')}
            </h2>
            <Badge variant="neutral">{generatedActivity.questions.length}</Badge>
          </div>
          {generatedActivity.questions.map((q, idx) => {
            let dataObj: Record<string, unknown> = {};
            try {
              dataObj = typeof q.data === 'string' ? JSON.parse(q.data) : q.data;
            } catch { /* ignore */ }

            return (
              <Card key={q.id} className="group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-700">
                        {idx + 1}
                      </span>
                      <Badge variant="info" size="sm">
                        {GAME_TYPE_CONFIGS[q.questionType as GameType]?.labelAr || q.questionType}
                      </Badge>
                    </div>
                    <p className="font-medium text-neutral-900">{q.questionText}</p>
                    <QuestionDataPreview type={q.questionType} data={dataObj} />
                    {q.explanation && (
                      <div className="flex items-start gap-2 rounded-lg bg-info-50/50 px-3 py-2 text-sm text-info-700">
                        <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{q.explanation}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="shrink-0 rounded-xl p-2.5 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-danger-50 hover:text-danger-500 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title={t('deleteQuestion')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <Card className="bg-neutral-50/50 border-neutral-200/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={actionLoading === 'delete'}
              disabled={!!actionLoading}
            >
              <Trash2 className="h-4 w-4" />
              {tCommon('delete')}
            </Button>
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={!!actionLoading}
            >
              <RefreshCw className="h-4 w-4" />
              {t('regenerate')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleKeepDraft}
              disabled={!!actionLoading}
            >
              <FileText className="h-4 w-4" />
              {t('keepAsDraft')}
            </Button>
            <Button
              variant="success"
              onClick={handleApprove}
              loading={actionLoading === 'approve'}
              disabled={!!actionLoading || generatedActivity.questions.length === 0}
            >
              <Check className="h-4 w-4" />
              {t('approve')}
            </Button>
          </div>
        </Card>

        {error && (
          <div className="rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700 text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Select phase
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2.5 lg:text-3xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600">
            <Sparkles className="h-5 w-5" />
          </div>
          {t('generateActivity')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 ps-[46px]">
          اختر المهارة ونوع اللعبة وسيُنشئ الذكاء الاصطناعي النشاط تلقائيًا
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Curriculum Selectors */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <BookOpen className="h-4 w-4" />
          </div>
          <h2 className="font-semibold text-neutral-900">اختيار المهارة</h2>
        </div>
        <div className="space-y-4">
          <Select
            label={t('selectGrade')}
            placeholder={t('selectGrade')}
            value={selectedGradeId}
            onChange={(e) => handleGradeChange(e.target.value)}
            options={grades.map((g: any) => ({
              value: g.id,
              label: g.nameAr || g.name,
            }))}
          />

          <Select
            label={t('selectSubject')}
            placeholder={t('selectSubject')}
            value={selectedSubjectId}
            onChange={(e) => handleSubjectChange(e.target.value)}
            options={subjects.map((s: any) => ({
              value: s.id,
              label: s.nameAr || s.name,
            }))}
            disabled={!selectedGradeId}
          />

          <Select
            label={t('selectUnit')}
            placeholder={t('selectUnit')}
            value={selectedUnitId}
            onChange={(e) => handleUnitChange(e.target.value)}
            options={units.map((u: any) => ({
              value: u.id,
              label: u.nameAr || u.name,
            }))}
            disabled={!selectedSubjectId}
          />

          <Select
            label={t('selectDomain')}
            placeholder={t('selectDomain')}
            value={selectedDomainId}
            onChange={(e) => handleDomainChange(e.target.value)}
            options={domains.map((d: any) => ({
              value: d.id,
              label: d.nameAr || d.name,
            }))}
            disabled={!selectedUnitId}
          />

          <Select
            label={t('selectLesson')}
            placeholder={t('selectLesson')}
            value={selectedLessonId}
            onChange={(e) => handleLessonChange(e.target.value)}
            options={lessons.map((l: any) => ({
              value: l.id,
              label: l.nameAr || l.name,
            }))}
            disabled={!selectedDomainId}
          />

          <Select
            label={t('selectSkill')}
            placeholder={t('selectSkill')}
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
            options={skills.map((s: any) => ({
              value: s.id,
              label: s.nameAr || s.name,
            }))}
            disabled={!selectedLessonId}
          />
        </div>
      </Card>

      {/* Game Settings */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
            <Wand2 className="h-4 w-4" />
          </div>
          <h2 className="font-semibold text-neutral-900">إعدادات اللعبة</h2>
        </div>
        <div className="space-y-5">
          {/* Game Type Grid */}
          <div>
            <label className="mb-2.5 block text-sm font-medium text-neutral-700">
              {t('selectGameType')}
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(Object.entries(GAME_TYPE_CONFIGS) as [GameType, (typeof GAME_TYPE_CONFIGS)[GameType]][]).map(
                ([key, cfg]) => {
                  const IconComp = GAME_TYPE_ICON_MAP[cfg.icon] || CircleDot;
                  const isSelected = selectedGameType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedGameType(key)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border-2 p-3.5 text-center transition-all min-h-[88px]',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary-200 hover:bg-primary-50/30'
                      )}
                    >
                      <div className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                        isSelected ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-500'
                      )}>
                        <IconComp className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-xs font-medium leading-tight">{cfg.labelAr}</span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Difficulty */}
          <Select
            label={t('selectDifficulty')}
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            options={DIFFICULTY_OPTIONS}
          />

          {/* Question Count */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              {t('questionCount')}
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.min(15, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-colors tabular-nums"
            />
          </div>
        </div>
      </Card>

      {/* AI Provider Status */}
      {aiStatus && (
        <div className={cn(
          'rounded-xl border px-4 py-3.5 text-sm flex items-center gap-2.5',
          aiStatus.available
            ? 'bg-success-50/50 border-success-200/60 text-success-700'
            : 'bg-warning-50/50 border-warning-200/60 text-warning-700'
        )}>
          <span className={cn(
            'h-2.5 w-2.5 rounded-full shrink-0',
            aiStatus.available ? 'bg-success-500 animate-pulse' : 'bg-warning-500'
          )} />
          {aiStatus.available ? (
            <span>
              {aiStatus.providerType === 'ollama'
                ? `ذكاء اصطناعي محلي: ${aiStatus.model} (Ollama)`
                : aiStatus.providerType === 'mock'
                  ? 'وضع تجريبي (Mock AI)'
                  : `مزوّد: ${aiStatus.provider}`}
            </span>
          ) : (
            <span>الذكاء الاصطناعي غير متصل</span>
          )}
        </div>
      )}

      {/* Generate Button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full shadow-md shadow-primary-600/15"
        onClick={handleGenerate}
        disabled={!canGenerate || !aiStatus?.available}
      >
        <Sparkles className="h-5 w-5" />
        {t('generateActivity')}
      </Button>
    </div>
  );
}

function QuestionDataPreview({ type, data }: { type: string; data: Record<string, unknown> }) {
  switch (type) {
    case 'quiz': {
      const options = (data.options as any[]) || [];
      const correctId = data.correctOptionId as string;
      return (
        <div className="space-y-1.5">
          {options.map((opt: any) => (
            <div
              key={opt.id}
              className={cn(
                'rounded-lg px-3 py-2 text-sm transition-colors',
                opt.id === correctId
                  ? 'bg-success-50 text-success-700 border border-success-200/60 font-medium'
                  : 'bg-neutral-50 text-neutral-600 border border-transparent'
              )}
            >
              {opt.text}
              {opt.id === correctId && (
                <Check className="inline-block h-3.5 w-3.5 ms-1.5" />
              )}
            </div>
          ))}
        </div>
      );
    }
    case 'true_false':
      return (
        <div className="rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600 space-y-1">
          <p>{data.statement as string}</p>
          <p className="font-medium">
            {(data.correctAnswer as boolean) ? (
              <span className="text-success-600">صحيح</span>
            ) : (
              <span className="text-danger-600">خطأ</span>
            )}
          </p>
        </div>
      );
    case 'matching': {
      const pairs = (data.pairs as any[]) || [];
      return (
        <div className="space-y-1.5">
          {pairs.map((p: any) => (
            <div key={p.id} className="flex items-center gap-2 text-sm text-neutral-600">
              <span className="rounded-lg bg-primary-50 px-2.5 py-1 text-primary-700 font-medium">{p.left}</span>
              <span className="text-neutral-300">—</span>
              <span className="rounded-lg bg-success-50 px-2.5 py-1 text-success-700 font-medium">{p.right}</span>
            </div>
          ))}
        </div>
      );
    }
    case 'sentence_builder': {
      const correctOrder = (data.correctOrder as string[]) || [];
      return (
        <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600">
          {correctOrder.join(' ')}
        </p>
      );
    }
    case 'order_story': {
      const items = (data.items as any[]) || [];
      const order = (data.correctOrder as string[]) || [];
      const ordered = order.map((id) => items.find((it: any) => it.id === id)).filter(Boolean);
      return (
        <ol className="list-decimal list-inside text-sm text-neutral-600 space-y-1 rounded-lg bg-neutral-50 px-3 py-2.5">
          {ordered.map((it: any) => (
            <li key={it.id}>{it.text}</li>
          ))}
        </ol>
      );
    }
    case 'grammar_detective': {
      const sentence = data.sentence as string;
      const targets = (data.targets as any[]) || [];
      return (
        <div className="rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600 space-y-2">
          <p>{sentence}</p>
          <div className="flex flex-wrap gap-1.5">
            {targets.map((t: any) => (
              <Badge key={t.id} variant="info" size="sm">
                {t.text} → {t.label}
              </Badge>
            ))}
          </div>
        </div>
      );
    }
    case 'find_mistake':
      return (
        <div className="rounded-lg bg-neutral-50 px-3 py-2.5 text-sm space-y-1">
          <p className="text-danger-600 line-through">{data.sentenceWithMistake as string}</p>
          <p className="text-success-600 font-medium">{data.correctedSentence as string}</p>
        </div>
      );
    case 'vocabulary':
      return (
        <div className="rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600">
          <p className="font-semibold text-neutral-900">{data.word as string}</p>
          <p className="mt-0.5">{data.definition as string}</p>
        </div>
      );
    default:
      return null;
  }
}
