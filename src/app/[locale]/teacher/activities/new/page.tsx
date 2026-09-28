'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  CircleDot,
  BookOpen,
  Settings,
  FileText,
  Eye,
  CheckCircle,
  Link,
  Type,
  ListOrdered,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { GAME_TYPE_CONFIGS } from '@/types/game';
import type { GameType } from '@/types/index';
import { cn } from '@/lib/cn';
import { useLocale } from 'next-intl';

const GAME_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CircleDot,
  CheckCircle,
  Link,
  Type,
  ListOrdered,
  Search,
  AlertTriangle,
  BookOpen,
};

interface CurriculumGrade {
  id: string;
  nameAr: string;
  subjects: CurriculumSubject[];
}

interface CurriculumSubject {
  id: string;
  nameAr: string;
  units: CurriculumUnit[];
}

interface CurriculumUnit {
  id: string;
  nameAr: string;
  domains?: CurriculumDomain[];
}

interface CurriculumDomain {
  id: string;
  nameAr: string;
  lessons: CurriculumLesson[];
}

interface CurriculumLesson {
  id: string;
  nameAr: string;
  skills: CurriculumSkill[];
}

interface CurriculumSkill {
  id: string;
  nameAr: string;
}

interface QuizOption {
  id: string;
  text: string;
}

interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

interface OrderStoryItem {
  id: string;
  text: string;
}

interface GrammarTarget {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  label: string;
}

interface WizardQuestion {
  questionText: string;
  explanation: string;
  points: number;
  quizOptions: QuizOption[];
  quizCorrectOptionId: string;
  tfCorrectAnswer: boolean;
  matchingPairs: MatchingPair[];
  sbCorrectSentence: string;
  sbHint: string;
  osItems: OrderStoryItem[];
  gdSentence: string;
  gdAvailableLabels: string[];
  gdTargets: GrammarTarget[];
  fmSentenceWithMistake: string;
  fmMistakeText: string;
  fmCorrectionText: string;
  fmCorrectedSentence: string;
  vocWord: string;
  vocDefinition: string;
  vocFormat: 'definition' | 'fill_blank' | 'image_match';
  vocDistractors: string[];
  vocContextSentence: string;
  vocImageUrl: string;
}

const STEPS = [
  { key: 'skill', icon: BookOpen },
  { key: 'settings', icon: Settings },
  { key: 'questions', icon: FileText },
  { key: 'preview', icon: Eye },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 'easy', labelAr: 'سهل' },
  { value: 'medium', labelAr: 'متوسط' },
  { value: 'hard', labelAr: 'صعب' },
];

let optionCounter = 0;
function newId() {
  return `id_${++optionCounter}_${Date.now()}`;
}

function createEmptyQuestion(): WizardQuestion {
  const id1 = newId();
  const id2 = newId();
  return {
    questionText: '',
    explanation: '',
    points: 10,
    quizOptions: [
      { id: id1, text: '' },
      { id: id2, text: '' },
    ],
    quizCorrectOptionId: '',
    tfCorrectAnswer: true,
    matchingPairs: [
      { id: newId(), left: '', right: '' },
      { id: newId(), left: '', right: '' },
    ],
    sbCorrectSentence: '',
    sbHint: '',
    osItems: [
      { id: newId(), text: '' },
      { id: newId(), text: '' },
    ],
    gdSentence: '',
    gdAvailableLabels: [],
    gdTargets: [],
    fmSentenceWithMistake: '',
    fmMistakeText: '',
    fmCorrectionText: '',
    fmCorrectedSentence: '',
    vocWord: '',
    vocDefinition: '',
    vocFormat: 'definition',
    vocDistractors: [''],
    vocContextSentence: '',
    vocImageUrl: '',
  };
}

function buildQuestionData(gameType: string, q: WizardQuestion) {
  switch (gameType) {
    case 'quiz':
      return {
        type: 'quiz' as const,
        options: q.quizOptions.map((o) => ({ id: o.id, text: o.text })),
        correctOptionId: q.quizCorrectOptionId,
      };
    case 'true_false':
      return {
        type: 'true_false' as const,
        statement: q.questionText,
        correctAnswer: q.tfCorrectAnswer,
      };
    case 'matching':
      return {
        type: 'matching' as const,
        pairs: q.matchingPairs.map((p) => ({ id: p.id, left: p.left, right: p.right })),
      };
    case 'sentence_builder': {
      const words = q.sbCorrectSentence.trim().split(/\s+/).filter(Boolean);
      return {
        type: 'sentence_builder' as const,
        words,
        correctOrder: words,
        hint: q.sbHint || undefined,
      };
    }
    case 'order_story':
      return {
        type: 'order_story' as const,
        items: q.osItems.map((item) => ({ id: item.id, text: item.text })),
        correctOrder: q.osItems.map((item) => item.id),
      };
    case 'grammar_detective':
      return {
        type: 'grammar_detective' as const,
        sentence: q.gdSentence,
        targets: q.gdTargets.map((t) => ({
          id: t.id,
          text: t.text,
          startIndex: t.startIndex,
          endIndex: t.endIndex,
          label: t.label,
        })),
        availableLabels: q.gdAvailableLabels,
      };
    case 'find_mistake': {
      const startIdx = q.fmSentenceWithMistake.indexOf(q.fmMistakeText);
      return {
        type: 'find_mistake' as const,
        sentenceWithMistake: q.fmSentenceWithMistake,
        correctedSentence: q.fmCorrectedSentence,
        mistakeText: q.fmMistakeText,
        correctionText: q.fmCorrectionText,
        mistakeStartIndex: startIdx >= 0 ? startIdx : 0,
        mistakeEndIndex: startIdx >= 0 ? startIdx + q.fmMistakeText.length : 0,
      };
    }
    case 'vocabulary':
      return {
        type: 'vocabulary' as const,
        word: q.vocWord,
        definition: q.vocDefinition,
        imageUrl: q.vocImageUrl || undefined,
        distractors: q.vocDistractors.filter((d) => d.trim().length > 0),
        format: q.vocFormat,
        contextSentence: q.vocContextSentence || undefined,
      };
    default:
      return { type: 'quiz' as const, options: [], correctOptionId: '' };
  }
}

function validateQuestion(gameType: string, q: WizardQuestion): boolean {
  if (gameType === 'true_false') {
    return q.questionText.trim().length > 0;
  }

  if (q.questionText.trim().length === 0) return false;

  switch (gameType) {
    case 'quiz':
      return (
        q.quizOptions.length >= 2 &&
        q.quizOptions.every((o) => o.text.trim().length > 0) &&
        q.quizCorrectOptionId !== '' &&
        q.quizOptions.some((o) => o.id === q.quizCorrectOptionId)
      );
    case 'matching':
      return (
        q.matchingPairs.length >= 2 &&
        q.matchingPairs.every((p) => p.left.trim().length > 0 && p.right.trim().length > 0)
      );
    case 'sentence_builder':
      return q.sbCorrectSentence.trim().split(/\s+/).filter(Boolean).length >= 2;
    case 'order_story':
      return (
        q.osItems.length >= 2 &&
        q.osItems.every((item) => item.text.trim().length > 0)
      );
    case 'grammar_detective':
      return (
        q.gdSentence.trim().length > 0 &&
        q.gdAvailableLabels.length >= 1 &&
        q.gdTargets.length >= 1 &&
        q.gdTargets.every((t) => t.text.trim().length > 0 && t.label.trim().length > 0)
      );
    case 'find_mistake':
      return (
        q.fmSentenceWithMistake.trim().length > 0 &&
        q.fmMistakeText.trim().length > 0 &&
        q.fmCorrectionText.trim().length > 0 &&
        q.fmCorrectedSentence.trim().length > 0
      );
    case 'vocabulary':
      return (
        q.vocWord.trim().length > 0 &&
        q.vocDefinition.trim().length > 0 &&
        q.vocDistractors.filter((d) => d.trim().length > 0).length >= 1
      );
    default:
      return false;
  }
}

export default function CreateActivityWizardPage() {
  const t = useTranslations('activities');
  const tCommon = useTranslations('common');
  const tCurriculum = useTranslations('curriculum');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [curriculum, setCurriculum] = useState<CurriculumGrade[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [unitDetail, setUnitDetail] = useState<CurriculumUnit | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [selectedSkillName, setSelectedSkillName] = useState('');

  const [gameType, setGameType] = useState<GameType>('quiz');
  const [difficulty, setDifficulty] = useState('medium');
  const [timeLimit, setTimeLimit] = useState(30);
  const [titleAr, setTitleAr] = useState('');

  const [questions, setQuestions] = useState<WizardQuestion[]>([createEmptyQuestion()]);

  useEffect(() => {
    fetch('/api/curriculum')
      .then((res) => res.json())
      .then((data) => {
        setCurriculum(Array.isArray(data) ? data : []);
        setLoadingCurriculum(false);
      })
      .catch(() => setLoadingCurriculum(false));
  }, []);

  useEffect(() => {
    if (!selectedUnitId) {
      setUnitDetail(null);
      return;
    }
    fetch(`/api/curriculum/units/${selectedUnitId}`)
      .then((res) => res.json())
      .then((data) => setUnitDetail(data))
      .catch(() => setUnitDetail(null));
  }, [selectedUnitId]);

  const selectedGrade = curriculum.find((g) => g.id === selectedGradeId);
  const selectedSubject = selectedGrade?.subjects.find((s) => s.id === selectedSubjectId);
  const selectedDomain = unitDetail?.domains?.find((d) => d.id === selectedDomainId);
  const selectedLesson = selectedDomain?.lessons?.find((l) => l.id === selectedLessonId);

  const handleGradeChange = useCallback((id: string) => {
    setSelectedGradeId(id);
    setSelectedSubjectId('');
    setSelectedUnitId('');
    setSelectedDomainId('');
    setSelectedLessonId('');
    setSelectedSkillId('');
    setSelectedSkillName('');
  }, []);

  const handleSubjectChange = useCallback((id: string) => {
    setSelectedSubjectId(id);
    setSelectedUnitId('');
    setSelectedDomainId('');
    setSelectedLessonId('');
    setSelectedSkillId('');
    setSelectedSkillName('');
  }, []);

  const handleUnitChange = useCallback((id: string) => {
    setSelectedUnitId(id);
    setSelectedDomainId('');
    setSelectedLessonId('');
    setSelectedSkillId('');
    setSelectedSkillName('');
  }, []);

  const handleDomainChange = useCallback((id: string) => {
    setSelectedDomainId(id);
    setSelectedLessonId('');
    setSelectedSkillId('');
    setSelectedSkillName('');
  }, []);

  const handleLessonChange = useCallback((id: string) => {
    setSelectedLessonId(id);
    setSelectedSkillId('');
    setSelectedSkillName('');
  }, []);

  const handleSkillChange = useCallback((id: string, name: string) => {
    setSelectedSkillId(id);
    setSelectedSkillName(name);
  }, []);

  const handleGameTypeChange = useCallback((gt: GameType) => {
    setGameType(gt);
    setQuestions([createEmptyQuestion()]);
    setTimeLimit(GAME_TYPE_CONFIGS[gt].defaultTimeLimit);
  }, []);

  const isStep1Valid = selectedSkillId !== '';
  const isStep2Valid = titleAr.trim().length > 0 && timeLimit >= 5 && timeLimit <= 300;
  const isStep3Valid =
    questions.length > 0 && questions.every((q) => validateQuestion(gameType, q));

  const canProceed = [isStep1Valid, isStep2Valid, isStep3Valid, true][step];

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<WizardQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const payload = {
      title: titleAr,
      titleAr,
      description: '',
      descriptionAr: '',
      gameType,
      difficulty,
      skillId: selectedSkillId,
      timeLimit,
      questions: questions.map((q) => ({
        questionText: q.questionText,
        explanation: q.explanation,
        points: q.points,
        data: buildQuestionData(gameType, q),
      })),
    };

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      router.push('/teacher/activities');
    } catch (err: any) {
      setError(err.message || tCommon('error'));
    } finally {
      setSaving(false);
    }
  };

  const gameConfig = GAME_TYPE_CONFIGS[gameType];
  const maxQuestions = gameConfig.maxQuestions;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Breadcrumb
        locale={locale}
        items={[
          { label: tNav('dashboard'), href: '/teacher' },
          { label: tNav('activities'), href: '/teacher/activities' },
          { label: t('create') },
        ]}
        onNavigate={(href) => router.push(href)}
      />

      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{t('create')}</h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          {gameConfig.labelAr} — {tCurriculum('skill')}: {selectedSkillName || '...'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={cn(
                    'h-px w-6 sm:w-10 transition-colors',
                    isComplete || isActive ? 'bg-primary-400' : 'bg-neutral-200'
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (i < step) setStep(i);
                }}
                disabled={i > step}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all',
                  isActive && 'bg-primary-600 text-white shadow-sm shadow-primary-600/20',
                  isComplete && 'bg-primary-100 text-primary-700 hover:bg-primary-200',
                  !isActive && !isComplete && 'bg-neutral-100 text-neutral-400'
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
        <span className="ms-3 text-sm font-medium text-neutral-400">
          {step + 1} / {STEPS.length}
        </span>
      </div>

      <Card>
        <CardBody>
          {step === 0 && (
            <StepSelectSkill
              curriculum={curriculum}
              loading={loadingCurriculum}
              selectedGradeId={selectedGradeId}
              selectedSubjectId={selectedSubjectId}
              selectedUnitId={selectedUnitId}
              selectedDomainId={selectedDomainId}
              selectedLessonId={selectedLessonId}
              selectedSkillId={selectedSkillId}
              selectedGrade={selectedGrade}
              selectedSubject={selectedSubject}
              selectedUnit={unitDetail ?? undefined}
              selectedDomain={selectedDomain}
              selectedLesson={selectedLesson}
              onGradeChange={handleGradeChange}
              onSubjectChange={handleSubjectChange}
              onUnitChange={handleUnitChange}
              onDomainChange={handleDomainChange}
              onLessonChange={handleLessonChange}
              onSkillChange={handleSkillChange}
              tCurriculum={tCurriculum}
            />
          )}

          {step === 1 && (
            <StepSettings
              titleAr={titleAr}
              onTitleArChange={setTitleAr}
              gameType={gameType}
              onGameTypeChange={handleGameTypeChange}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              timeLimit={timeLimit}
              onTimeLimitChange={setTimeLimit}
              t={t}
              tCurriculum={tCurriculum}
            />
          )}

          {step === 2 && (
            <StepQuestions
              gameType={gameType}
              questions={questions}
              maxQuestions={maxQuestions}
              onUpdate={updateQuestion}
              onAdd={addQuestion}
              onRemove={removeQuestion}
            />
          )}

          {step === 3 && (
            <StepPreview
              titleAr={titleAr}
              skillName={selectedSkillName}
              gameType={gameType}
              difficulty={difficulty}
              timeLimit={timeLimit}
              questions={questions}
              t={t}
              tCurriculum={tCurriculum}
            />
          )}
        </CardBody>
      </Card>

      {error && (
        <p className="text-sm text-danger-500 text-center">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          {tCommon('previous')}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed}
          >
            {tCommon('next')}
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
        ) : (
          <Button onClick={handleSave} loading={saving} disabled={!isStep3Valid}>
            {tCommon('save')}
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== Step 1: Select Skill ====================

interface StepSelectSkillProps {
  curriculum: CurriculumGrade[];
  loading: boolean;
  selectedGradeId: string;
  selectedSubjectId: string;
  selectedUnitId: string;
  selectedDomainId: string;
  selectedLessonId: string;
  selectedSkillId: string;
  selectedGrade?: CurriculumGrade;
  selectedSubject?: CurriculumSubject;
  selectedUnit?: CurriculumUnit;
  selectedDomain?: CurriculumDomain;
  selectedLesson?: CurriculumLesson;
  onGradeChange: (id: string) => void;
  onSubjectChange: (id: string) => void;
  onUnitChange: (id: string) => void;
  onDomainChange: (id: string) => void;
  onLessonChange: (id: string) => void;
  onSkillChange: (id: string, name: string) => void;
  tCurriculum: (key: string) => string;
}

function StepSelectSkill({
  curriculum,
  loading,
  selectedGradeId,
  selectedSubjectId,
  selectedUnitId,
  selectedDomainId,
  selectedLessonId,
  selectedSkillId,
  selectedGrade,
  selectedSubject,
  selectedUnit,
  selectedDomain,
  selectedLesson,
  onGradeChange,
  onSubjectChange,
  onUnitChange,
  onDomainChange,
  onLessonChange,
  onSkillChange,
  tCurriculum,
}: StepSelectSkillProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CascadeSelector
        label={tCurriculum('browse')}
        items={curriculum.map((g) => ({ id: g.id, label: g.nameAr }))}
        selectedId={selectedGradeId}
        onSelect={onGradeChange}
      />
      {selectedGrade && (
        <CascadeSelector
          label={tCurriculum('subject')}
          items={selectedGrade.subjects.map((s) => ({ id: s.id, label: s.nameAr }))}
          selectedId={selectedSubjectId}
          onSelect={onSubjectChange}
        />
      )}
      {selectedSubject && (
        <CascadeSelector
          label={tCurriculum('unit')}
          items={selectedSubject.units.map((u) => ({ id: u.id, label: u.nameAr }))}
          selectedId={selectedUnitId}
          onSelect={onUnitChange}
        />
      )}
      {selectedUnit?.domains && selectedUnit.domains.length > 0 && (
        <CascadeSelector
          label={tCurriculum('domain')}
          items={selectedUnit.domains.map((d) => ({ id: d.id, label: d.nameAr }))}
          selectedId={selectedDomainId}
          onSelect={onDomainChange}
        />
      )}
      {selectedDomain?.lessons && selectedDomain.lessons.length > 0 && (
        <CascadeSelector
          label={tCurriculum('lesson')}
          items={selectedDomain.lessons.map((l) => ({ id: l.id, label: l.nameAr }))}
          selectedId={selectedLessonId}
          onSelect={onLessonChange}
        />
      )}
      {selectedLesson?.skills && selectedLesson.skills.length > 0 && (
        <CascadeSelector
          label={tCurriculum('skill')}
          items={selectedLesson.skills.map((s) => ({ id: s.id, label: s.nameAr }))}
          selectedId={selectedSkillId}
          onSelect={(id) => {
            const skill = selectedLesson.skills.find((s) => s.id === id);
            onSkillChange(id, skill?.nameAr || '');
          }}
        />
      )}
    </div>
  );
}

interface CascadeSelectorProps {
  label: string;
  items: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function CascadeSelector({ label, items, selectedId, onSelect }: CascadeSelectorProps) {
  return (
    <div className="animate-fadeIn">
      <p className="mb-2.5 text-sm font-medium text-neutral-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'min-h-[44px] rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
              item.id === selectedId
                ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10'
                : 'border-neutral-200/80 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== Step 2: Settings ====================

interface StepSettingsProps {
  titleAr: string;
  onTitleArChange: (v: string) => void;
  gameType: GameType;
  onGameTypeChange: (v: GameType) => void;
  difficulty: string;
  onDifficultyChange: (v: string) => void;
  timeLimit: number;
  onTimeLimitChange: (v: number) => void;
  t: (key: string) => string;
  tCurriculum: (key: string) => string;
}

function StepSettings({
  titleAr,
  onTitleArChange,
  gameType,
  onGameTypeChange,
  difficulty,
  onDifficultyChange,
  timeLimit,
  onTimeLimitChange,
  t,
  tCurriculum,
}: StepSettingsProps) {
  const allTypes = Object.values(GAME_TYPE_CONFIGS);

  return (
    <div className="space-y-6">
      <Input
        label="عنوان النشاط"
        value={titleAr}
        onChange={(e) => onTitleArChange(e.target.value)}
        placeholder="اختبار في القراءة..."
        dir="rtl"
      />

      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700">{t('gameType')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {allTypes.map((config) => {
            const IconComp = GAME_TYPE_ICONS[config.icon];
            const isSelected = gameType === config.type;
            return (
              <button
                key={config.type}
                type="button"
                onClick={() => onGameTypeChange(config.type)}
                className={cn(
                  'min-h-[44px] flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10'
                    : 'border-neutral-200/80 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300'
                )}
              >
                {IconComp && <IconComp className="h-5 w-5" />}
                <span className="text-center leading-tight">{config.labelAr}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700">{tCurriculum('difficulty')}</p>
        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => onDifficultyChange(d.value)}
              className={cn(
                'min-h-[44px] rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
                d.value === difficulty
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10'
                  : 'border-neutral-200/80 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
              )}
            >
              {d.labelAr}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="الوقت لكل سؤال (ثانية)"
        type="number"
        min={5}
        max={300}
        value={timeLimit}
        onChange={(e) => onTimeLimitChange(Number(e.target.value))}
        dir="ltr"
      />
    </div>
  );
}

// ==================== Step 3: Questions ====================

interface StepQuestionsProps {
  gameType: string;
  questions: WizardQuestion[];
  maxQuestions: number;
  onUpdate: (index: number, updates: Partial<WizardQuestion>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function StepQuestions({
  gameType,
  questions,
  maxQuestions,
  onUpdate,
  onAdd,
  onRemove,
}: StepQuestionsProps) {
  return (
    <div className="space-y-6">
      {questions.map((q, qi) => (
        <div
          key={qi}
          className="rounded-2xl border border-neutral-200/80 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-900">
              {'السؤال'} {qi + 1}
            </span>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(qi)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-danger-500 hover:bg-danger-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <Input
            label={gameType === 'true_false' ? 'العبارة' : 'نص السؤال'}
            value={q.questionText}
            onChange={(e) => onUpdate(qi, { questionText: e.target.value })}
            placeholder={gameType === 'true_false' ? 'اكتب العبارة هنا...' : 'اكتب السؤال هنا...'}
            dir="rtl"
          />

          {gameType === 'quiz' && (
            <QuizEditor q={q} qi={qi} onUpdate={onUpdate} />
          )}
          {gameType === 'true_false' && (
            <TrueFalseEditor q={q} qi={qi} onUpdate={onUpdate} />
          )}
          {gameType === 'matching' && (
            <MatchingEditor q={q} qi={qi} onUpdate={onUpdate} />
          )}
          {gameType === 'sentence_builder' && (
            <SentenceBuilderEditor q={q} qi={qi} onUpdate={onUpdate} />
          )}
          {gameType === 'order_story' && (
            <OrderStoryEditor q={q} qi={qi} onUpdate={onUpdate} />
          )}
          {gameType === 'grammar_detective' && (
            <GrammarDetectiveEditor q={q} qi={qi} onUpdate={onUpdate} />
          )}
          {gameType === 'find_mistake' && (
            <FindMistakeEditor q={q} qi={qi} onUpdate={onUpdate} />
          )}
          {gameType === 'vocabulary' && (
            <VocabularyEditor q={q} qi={qi} onUpdate={onUpdate} />
          )}

          <Input
            label={'الشرح (اختياري)'}
            value={q.explanation}
            onChange={(e) => onUpdate(qi, { explanation: e.target.value })}
            placeholder={'اشرح الإجابة الصحيحة...'}
            dir="rtl"
          />
        </div>
      ))}

      {questions.length < maxQuestions && (
        <Button variant="outline" onClick={onAdd} className="w-full">
          <Plus className="h-4 w-4" />
          {'إضافة سؤال'}
        </Button>
      )}
    </div>
  );
}

// ==================== Quiz Editor ====================

function QuizEditor({
  q,
  qi,
  onUpdate,
}: {
  q: WizardQuestion;
  qi: number;
  onUpdate: (i: number, u: Partial<WizardQuestion>) => void;
}) {
  const addOption = () => {
    if (q.quizOptions.length >= 6) return;
    onUpdate(qi, { quizOptions: [...q.quizOptions, { id: newId(), text: '' }] });
  };

  const removeOption = (optionId: string) => {
    if (q.quizOptions.length <= 2) return;
    const newOptions = q.quizOptions.filter((o) => o.id !== optionId);
    onUpdate(qi, {
      quizOptions: newOptions,
      quizCorrectOptionId: q.quizCorrectOptionId === optionId ? '' : q.quizCorrectOptionId,
    });
  };

  const updateOptionText = (optionId: string, text: string) => {
    onUpdate(qi, {
      quizOptions: q.quizOptions.map((o) => (o.id === optionId ? { ...o, text } : o)),
    });
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">{'الخيارات'}</p>
      <div className="space-y-2">
        {q.quizOptions.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdate(qi, { quizCorrectOptionId: opt.id })}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                opt.id === q.quizCorrectOptionId
                  ? 'border-success-500 bg-success-50 text-success-600'
                  : 'border-neutral-300 text-neutral-400 hover:border-neutral-400'
              )}
            >
              <Check className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={opt.text}
              onChange={(e) => updateOptionText(opt.id, e.target.value)}
              placeholder={'نص الخيار...'}
              dir="auto"
              className="flex-1 min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
            />
            {q.quizOptions.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(opt.id)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-danger-500 hover:bg-danger-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {q.quizOptions.length < 6 && (
        <button
          type="button"
          onClick={addOption}
          className="mt-2 min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {'إضافة خيار'}
        </button>
      )}
    </div>
  );
}

// ==================== True/False Editor ====================

function TrueFalseEditor({
  q,
  qi,
  onUpdate,
}: {
  q: WizardQuestion;
  qi: number;
  onUpdate: (i: number, u: Partial<WizardQuestion>) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">{'الإجابة الصحيحة'}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onUpdate(qi, { tfCorrectAnswer: true })}
          className={cn(
            'min-h-[44px] flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors',
            q.tfCorrectAnswer
              ? 'border-success-500 bg-success-50 text-success-700'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
          )}
        >
          {'صحيح'} ✓
        </button>
        <button
          type="button"
          onClick={() => onUpdate(qi, { tfCorrectAnswer: false })}
          className={cn(
            'min-h-[44px] flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors',
            !q.tfCorrectAnswer
              ? 'border-danger-500 bg-danger-50 text-danger-700'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
          )}
        >
          {'خطأ'} ✗
        </button>
      </div>
    </div>
  );
}

// ==================== Matching Editor ====================

function MatchingEditor({
  q,
  qi,
  onUpdate,
}: {
  q: WizardQuestion;
  qi: number;
  onUpdate: (i: number, u: Partial<WizardQuestion>) => void;
}) {
  const addPair = () => {
    if (q.matchingPairs.length >= 10) return;
    onUpdate(qi, {
      matchingPairs: [...q.matchingPairs, { id: newId(), left: '', right: '' }],
    });
  };

  const removePair = (pairId: string) => {
    if (q.matchingPairs.length <= 2) return;
    onUpdate(qi, {
      matchingPairs: q.matchingPairs.filter((p) => p.id !== pairId),
    });
  };

  const updatePair = (pairId: string, field: 'left' | 'right', value: string) => {
    onUpdate(qi, {
      matchingPairs: q.matchingPairs.map((p) =>
        p.id === pairId ? { ...p, [field]: value } : p
      ),
    });
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">{'الأزواج'}</p>
      <div className="space-y-2">
        {q.matchingPairs.map((pair, pi) => (
          <div key={pair.id} className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-neutral-400 w-5 text-center">{pi + 1}</span>
            <input
              type="text"
              value={pair.left}
              onChange={(e) => updatePair(pair.id, 'left', e.target.value)}
              placeholder={'العنصر الأيسر'}
              dir="auto"
              className="flex-1 min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
            />
            <span className="text-neutral-400">{'↔'}</span>
            <input
              type="text"
              value={pair.right}
              onChange={(e) => updatePair(pair.id, 'right', e.target.value)}
              placeholder={'العنصر الأيمن'}
              dir="auto"
              className="flex-1 min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
            />
            {q.matchingPairs.length > 2 && (
              <button
                type="button"
                onClick={() => removePair(pair.id)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-danger-500 hover:bg-danger-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {q.matchingPairs.length < 10 && (
        <button
          type="button"
          onClick={addPair}
          className="mt-2 min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {'إضافة زوج'}
        </button>
      )}
    </div>
  );
}

// ==================== Sentence Builder Editor ====================

function SentenceBuilderEditor({
  q,
  qi,
  onUpdate,
}: {
  q: WizardQuestion;
  qi: number;
  onUpdate: (i: number, u: Partial<WizardQuestion>) => void;
}) {
  const words = q.sbCorrectSentence.trim().split(/\s+/).filter(Boolean);

  return (
    <div className="space-y-4">
      <Input
        label={'الجملة الصحيحة'}
        value={q.sbCorrectSentence}
        onChange={(e) => onUpdate(qi, { sbCorrectSentence: e.target.value })}
        placeholder={'اكتب الجملة بالترتيب الصحيح...'}
        dir="rtl"
      />
      {words.length >= 2 && (
        <div>
          <p className="mb-1.5 text-xs text-neutral-500">{'الكلمات (ستُخلط للتلميذ):'}</p>
          <div className="flex flex-wrap gap-1.5">
            {words.map((w, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-primary-50 px-2.5 py-1 text-sm font-medium text-primary-700"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
      <Input
        label={'تلميح (اختياري)'}
        value={q.sbHint}
        onChange={(e) => onUpdate(qi, { sbHint: e.target.value })}
        placeholder={'تلميح للتلميذ...'}
        dir="rtl"
      />
    </div>
  );
}

// ==================== Order Story Editor ====================

function OrderStoryEditor({
  q,
  qi,
  onUpdate,
}: {
  q: WizardQuestion;
  qi: number;
  onUpdate: (i: number, u: Partial<WizardQuestion>) => void;
}) {
  const addItem = () => {
    if (q.osItems.length >= 10) return;
    onUpdate(qi, {
      osItems: [...q.osItems, { id: newId(), text: '' }],
    });
  };

  const removeItem = (itemId: string) => {
    if (q.osItems.length <= 2) return;
    onUpdate(qi, {
      osItems: q.osItems.filter((item) => item.id !== itemId),
    });
  };

  const updateItemText = (itemId: string, text: string) => {
    onUpdate(qi, {
      osItems: q.osItems.map((item) =>
        item.id === itemId ? { ...item, text } : item
      ),
    });
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">{'العناصر (بالترتيب الصحيح)'}</p>
      <div className="space-y-2">
        {q.osItems.map((item, ii) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
              {ii + 1}
            </span>
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateItemText(item.id, e.target.value)}
              placeholder={`العنصر ${ii + 1}...`}
              dir="auto"
              className="flex-1 min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
            />
            {q.osItems.length > 2 && (
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-danger-500 hover:bg-danger-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {q.osItems.length < 10 && (
        <button
          type="button"
          onClick={addItem}
          className="mt-2 min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {'إضافة عنصر'}
        </button>
      )}
    </div>
  );
}

// ==================== Grammar Detective Editor ====================

function GrammarDetectiveEditor({
  q,
  qi,
  onUpdate,
}: {
  q: WizardQuestion;
  qi: number;
  onUpdate: (i: number, u: Partial<WizardQuestion>) => void;
}) {
  const [newLabel, setNewLabel] = useState('');
  const [targetText, setTargetText] = useState('');
  const [targetLabel, setTargetLabel] = useState('');

  const addLabel = () => {
    const label = newLabel.trim();
    if (!label || q.gdAvailableLabels.includes(label)) return;
    onUpdate(qi, { gdAvailableLabels: [...q.gdAvailableLabels, label] });
    setNewLabel('');
  };

  const removeLabel = (label: string) => {
    onUpdate(qi, {
      gdAvailableLabels: q.gdAvailableLabels.filter((l) => l !== label),
      gdTargets: q.gdTargets.filter((t) => t.label !== label),
    });
  };

  const addTarget = () => {
    const text = targetText.trim();
    const label = targetLabel.trim();
    if (!text || !label) return;

    const startIndex = q.gdSentence.indexOf(text);
    const endIndex = startIndex >= 0 ? startIndex + text.length : 0;

    onUpdate(qi, {
      gdTargets: [
        ...q.gdTargets,
        { id: newId(), text, startIndex: startIndex >= 0 ? startIndex : 0, endIndex, label },
      ],
    });
    setTargetText('');
    setTargetLabel('');
  };

  const removeTarget = (targetId: string) => {
    onUpdate(qi, {
      gdTargets: q.gdTargets.filter((t) => t.id !== targetId),
    });
  };

  return (
    <div className="space-y-4">
      <Input
        label={'الجملة'}
        value={q.gdSentence}
        onChange={(e) => onUpdate(qi, { gdSentence: e.target.value })}
        placeholder={'اكتب الجملة هنا...'}
        dir="rtl"
      />

      <div>
        <p className="mb-1.5 text-sm font-medium text-neutral-700">{'التسميات المتاحة'}</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {q.gdAvailableLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
            >
              {label}
              <button
                type="button"
                onClick={() => removeLabel(label)}
                className="hover:text-danger-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
            placeholder={'فاعل، فعل، مفعول...'}
            dir="auto"
            className="flex-1 min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
          />
          <button
            type="button"
            onClick={addLabel}
            className="min-h-[44px] rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-neutral-700">{'الأهداف'}</p>
        {q.gdTargets.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {q.gdTargets.map((target) => (
              <div
                key={target.id}
                className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-neutral-900">&quot;{target.text}&quot;</span>
                <span className="text-neutral-400">{'→'}</span>
                <Badge variant="info" size="sm">{target.label}</Badge>
                <button
                  type="button"
                  onClick={() => removeTarget(target.id)}
                  className="ms-auto text-neutral-400 hover:text-danger-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            placeholder={'الكلمة أو العبارة'}
            dir="auto"
            className="flex-1 min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
          />
          <select
            value={targetLabel}
            onChange={(e) => setTargetLabel(e.target.value)}
            className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
          >
            <option value="">{'التسمية...'}</option>
            {q.gdAvailableLabels.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={addTarget}
            disabled={!targetText.trim() || !targetLabel}
            className="min-h-[44px] rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Find Mistake Editor ====================

function FindMistakeEditor({
  q,
  qi,
  onUpdate,
}: {
  q: WizardQuestion;
  qi: number;
  onUpdate: (i: number, u: Partial<WizardQuestion>) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label={'الجملة (بالخطأ)'}
        value={q.fmSentenceWithMistake}
        onChange={(e) => onUpdate(qi, { fmSentenceWithMistake: e.target.value })}
        placeholder={'اكتب الجملة التي تحتوي على خطأ...'}
        dir="rtl"
      />
      <Input
        label={'الكلمة الخاطئة'}
        value={q.fmMistakeText}
        onChange={(e) => onUpdate(qi, { fmMistakeText: e.target.value })}
        placeholder={'الكلمة الخاطئة...'}
        dir="rtl"
      />
      <Input
        label={'التصحيح'}
        value={q.fmCorrectionText}
        onChange={(e) => onUpdate(qi, { fmCorrectionText: e.target.value })}
        placeholder={'الكلمة الصحيحة...'}
        dir="rtl"
      />
      <Input
        label={'الجملة الصحيحة'}
        value={q.fmCorrectedSentence}
        onChange={(e) => onUpdate(qi, { fmCorrectedSentence: e.target.value })}
        placeholder={'الجملة بعد التصحيح...'}
        dir="rtl"
      />
    </div>
  );
}

// ==================== Vocabulary Editor ====================

function VocabularyEditor({
  q,
  qi,
  onUpdate,
}: {
  q: WizardQuestion;
  qi: number;
  onUpdate: (i: number, u: Partial<WizardQuestion>) => void;
}) {
  const addDistractor = () => {
    if (q.vocDistractors.length >= 5) return;
    onUpdate(qi, { vocDistractors: [...q.vocDistractors, ''] });
  };

  const removeDistractor = (index: number) => {
    if (q.vocDistractors.length <= 1) return;
    onUpdate(qi, {
      vocDistractors: q.vocDistractors.filter((_, i) => i !== index),
    });
  };

  const updateDistractor = (index: number, value: string) => {
    onUpdate(qi, {
      vocDistractors: q.vocDistractors.map((d, i) => (i === index ? value : d)),
    });
  };

  const formats = [
    { value: 'definition', label: 'تعريف' },
    { value: 'fill_blank', label: 'ملء الفراغ' },
    { value: 'image_match', label: 'مطابقة صورة' },
  ] as const;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700">{'نوع التمرين'}</p>
        <div className="flex gap-2">
          {formats.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onUpdate(qi, { vocFormat: f.value })}
              className={cn(
                'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                q.vocFormat === f.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label={'الكلمة'}
        value={q.vocWord}
        onChange={(e) => onUpdate(qi, { vocWord: e.target.value })}
        placeholder={'الكلمة المستهدفة...'}
        dir="rtl"
      />

      <Input
        label={'التعريف'}
        value={q.vocDefinition}
        onChange={(e) => onUpdate(qi, { vocDefinition: e.target.value })}
        placeholder={'معنى الكلمة...'}
        dir="rtl"
      />

      {q.vocFormat === 'fill_blank' && (
        <Input
          label={'جملة السياق'}
          value={q.vocContextSentence}
          onChange={(e) => onUpdate(qi, { vocContextSentence: e.target.value })}
          placeholder={'الجملة مع فراغ (____)...'}
          dir="rtl"
        />
      )}

      {q.vocFormat === 'image_match' && (
        <Input
          label={'رابط الصورة (اختياري)'}
          value={q.vocImageUrl}
          onChange={(e) => onUpdate(qi, { vocImageUrl: e.target.value })}
          placeholder="https://..."
          dir="ltr"
        />
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700">{'الكلمات المشتتة'}</p>
        <div className="space-y-2">
          {q.vocDistractors.map((d, di) => (
            <div key={di} className="flex items-center gap-2">
              <input
                type="text"
                value={d}
                onChange={(e) => updateDistractor(di, e.target.value)}
                placeholder={`كلمة مشتتة ${di + 1}...`}
                dir="auto"
                className="flex-1 min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
              />
              {q.vocDistractors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDistractor(di)}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-danger-500 hover:bg-danger-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {q.vocDistractors.length < 5 && (
          <button
            type="button"
            onClick={addDistractor}
            className="mt-2 min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {'إضافة كلمة'}
          </button>
        )}
      </div>
    </div>
  );
}

// ==================== Step 4: Preview ====================

interface StepPreviewProps {
  titleAr: string;
  skillName: string;
  gameType: string;
  difficulty: string;
  timeLimit: number;
  questions: WizardQuestion[];
  t: (key: string) => string;
  tCurriculum: (key: string) => string;
}

function StepPreview({
  titleAr,
  skillName,
  gameType,
  difficulty,
  timeLimit,
  questions,
  t: _t,
  tCurriculum,
}: StepPreviewProps) {
  const diffLabel = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.labelAr || difficulty;
  const diffVariant = { easy: 'success', medium: 'warning', hard: 'danger' }[difficulty] as
    | 'success'
    | 'warning'
    | 'danger';
  const config = GAME_TYPE_CONFIGS[gameType as GameType];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-neutral-900">{titleAr}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{config?.labelAr || gameType}</Badge>
          <Badge variant={diffVariant}>{diffLabel}</Badge>
          <Badge variant="neutral">{timeLimit} {'ثانية'}</Badge>
          <Badge variant="neutral">{questions.length} {'أسئلة'}</Badge>
        </div>
        <p className="text-sm text-neutral-500">
          {tCurriculum('skill')}: {skillName}
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div
            key={qi}
            className="rounded-2xl border border-neutral-200/80 p-5 space-y-3"
          >
            <p className="font-medium text-neutral-900">
              {qi + 1}. {q.questionText}
            </p>

            {gameType === 'quiz' && (
              <div className="space-y-1.5 ps-4">
                {q.quizOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                      opt.id === q.quizCorrectOptionId
                        ? 'bg-success-50 text-success-700 font-medium'
                        : 'bg-neutral-50 text-neutral-700'
                    )}
                  >
                    {opt.id === q.quizCorrectOptionId && (
                      <Check className="h-4 w-4 shrink-0 text-success-500" />
                    )}
                    <span>{opt.text}</span>
                  </div>
                ))}
              </div>
            )}

            {gameType === 'true_false' && (
              <div className="ps-4">
                <span
                  className={cn(
                    'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium',
                    q.tfCorrectAnswer
                      ? 'bg-success-50 text-success-700'
                      : 'bg-danger-50 text-danger-700'
                  )}
                >
                  {q.tfCorrectAnswer ? 'صحيح ✓' : 'خطأ ✗'}
                </span>
              </div>
            )}

            {gameType === 'matching' && (
              <div className="space-y-1.5 ps-4">
                {q.matchingPairs.map((pair) => (
                  <div
                    key={pair.id}
                    className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
                  >
                    <span className="font-medium">{pair.left}</span>
                    <span className="text-neutral-400">{'↔'}</span>
                    <span className="font-medium">{pair.right}</span>
                  </div>
                ))}
              </div>
            )}

            {gameType === 'sentence_builder' && (
              <div className="ps-4">
                <p className="text-sm text-neutral-600">
                  {'الترتيب الصحيح: '}{q.sbCorrectSentence}
                </p>
                {q.sbHint && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {'تلميح: '}{q.sbHint}
                  </p>
                )}
              </div>
            )}

            {gameType === 'order_story' && (
              <div className="space-y-1 ps-4">
                {q.osItems.map((item, ii) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {ii + 1}
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            )}

            {gameType === 'grammar_detective' && (
              <div className="ps-4 space-y-2">
                <p className="text-sm text-neutral-600">{q.gdSentence}</p>
                <div className="flex flex-wrap gap-1.5">
                  {q.gdAvailableLabels.map((l) => (
                    <Badge key={l} variant="neutral" size="sm">{l}</Badge>
                  ))}
                </div>
                {q.gdTargets.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 text-sm text-neutral-700"
                  >
                    <span className="font-medium">&quot;{t.text}&quot;</span>
                    <span className="text-neutral-400">{'→'}</span>
                    <Badge variant="info" size="sm">{t.label}</Badge>
                  </div>
                ))}
              </div>
            )}

            {gameType === 'find_mistake' && (
              <div className="ps-4 space-y-1.5">
                <p className="text-sm text-neutral-600">
                  <span className="text-danger-500 line-through">{q.fmMistakeText}</span>
                  {' → '}
                  <span className="text-success-600 font-medium">{q.fmCorrectionText}</span>
                </p>
                <p className="text-xs text-neutral-500">
                  {'الجملة الصحيحة: '}{q.fmCorrectedSentence}
                </p>
              </div>
            )}

            {gameType === 'vocabulary' && (
              <div className="ps-4 space-y-1.5">
                <p className="text-sm text-neutral-600">
                  <span className="font-medium">{q.vocWord}</span>
                  {' — '}{q.vocDefinition}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="success" size="sm">{q.vocWord}</Badge>
                  {q.vocDistractors.filter(Boolean).map((d, i) => (
                    <Badge key={i} variant="neutral" size="sm">{d}</Badge>
                  ))}
                </div>
                {q.vocContextSentence && (
                  <p className="text-xs text-neutral-500">{q.vocContextSentence}</p>
                )}
              </div>
            )}

            {q.explanation && (
              <p className="text-xs text-neutral-500 ps-4">
                {'الشرح: '}{q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
