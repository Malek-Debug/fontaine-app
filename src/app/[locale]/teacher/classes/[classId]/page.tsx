'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import {
  Users,
  Copy,
  Check,
  PlusCircle,
  Trash2,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SkeletonTable, Skeleton } from '@/components/ui/skeleton';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ClassDetailPage() {
  const params = useParams();
  const classId = params.classId as string;
  const locale = useLocale();
  const router = useRouter();

  const t = useTranslations('classes');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');

  const { data: classData, error, isLoading } = useSWR(
    `/api/classes/${classId}`,
    fetcher
  );

  const [copiedCode, setCopiedCode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<any>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [removingStudent, setRemovingStudent] = useState(false);

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setAddingStudent(true);
    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: displayName.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to add student');

      setFirstName('');
      setLastName('');
      setDisplayName('');
      setAddDialogOpen(false);

      mutate(`/api/classes/${classId}`);
    } catch {
      // Error is handled by the UI state
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove) return;

    setRemovingStudent(true);
    try {
      const res = await fetch(
        `/api/classes/${classId}/students/${studentToRemove.id}`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error('Failed to remove student');

      setRemoveDialogOpen(false);
      setStudentToRemove(null);

      mutate(`/api/classes/${classId}`);
    } catch {
      // Error is handled by the UI state
    } finally {
      setRemovingStudent(false);
    }
  };

  const openRemoveDialog = (student: any) => {
    setStudentToRemove(student);
    setRemoveDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-4 w-64" />
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5">
          <div className="flex items-center gap-4">
            <Skeleton variant="rectangular" className="h-14 w-14 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <SkeletonTable rows={5} cols={3} />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-danger-500">{tCommon('error')}</p>
      </div>
    );
  }

  const students = classData.students || [];

  return (
    <div className="space-y-6">
      <Breadcrumb
        locale={locale}
        items={[
          { label: tNav('dashboard'), href: '/teacher' },
          { label: t('myClasses'), href: '/teacher/classes' },
          { label: classData.name },
        ]}
        onNavigate={(href) => router.push(href)}
      />

      {/* Class Info Header */}
      <Card className="animate-fadeIn">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{classData.name}</h1>
              <p className="mt-0.5 text-sm text-neutral-500">
                {classData.grade?.nameAr || classData.gradeName}
              </p>
              {classData.academicYear && (
                <p className="mt-0.5 text-xs text-neutral-400">
                  {t('academicYear')}: {classData.academicYear}
                </p>
              )}
            </div>
          </div>

          {classData.joinCode && (
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{t('joinCode')}</span>
              <div className="flex items-center gap-2">
                <code className="rounded-xl bg-primary-50 px-5 py-2.5 text-xl font-mono font-bold tracking-widest text-primary-700">
                  {classData.joinCode}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyCode(classData.joinCode)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                  aria-label="Copy"
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 text-success-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Students Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-neutral-900">{t('students')}</h2>
            <Badge variant="neutral">{students.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            {t('addStudent')}
          </Button>
        </div>

        {students.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={t('noStudents')}
            action={
              <Button onClick={() => setAddDialogOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                {t('addStudent')}
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <Card padding={false} className="overflow-hidden animate-fadeIn">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      <th className="px-5 py-3 text-start text-xs font-medium uppercase tracking-wider text-neutral-400">
                        {t('studentName')}
                      </th>
                      <th className="px-5 py-3 text-start text-xs font-medium uppercase tracking-wider text-neutral-400">
                        {t('displayName')}
                      </th>
                      <th className="px-5 py-3 text-end text-xs font-medium uppercase tracking-wider text-neutral-400">
                        {/* Actions */}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {students.map((student: any) => (
                      <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={`${student.firstName} ${student.lastName}`}
                              size="sm"
                            />
                            <span className="font-medium text-neutral-900">
                              {student.firstName} {student.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-neutral-500">
                          {student.displayName || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-end">
                          <button
                            type="button"
                            onClick={() => openRemoveDialog(student)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-danger-50 hover:text-danger-500 transition-colors"
                            aria-label={t('removeStudent')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 sm:hidden">
              {students.map((student: any, i: number) => (
                <Card key={student.id} className={`animate-fadeIn animate-stagger-${Math.min(i + 1, 5)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={`${student.firstName} ${student.lastName}`}
                        size="md"
                      />
                      <div>
                        <p className="font-medium text-neutral-900">
                          {student.firstName} {student.lastName}
                        </p>
                        {student.displayName && (
                          <p className="text-sm text-neutral-500">{student.displayName}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openRemoveDialog(student)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-danger-50 hover:text-danger-500 transition-colors"
                      aria-label={t('removeStudent')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Student Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        title={t('addStudent')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleAddStudent}
              loading={addingStudent}
              disabled={!firstName.trim() || !lastName.trim()}
            >
              {tCommon('create')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          <Input
            label={t('firstName')}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('firstName')}
            required
          />
          <Input
            label={t('lastName')}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t('lastName')}
            required
          />
          <Input
            label={t('displayName')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('displayName')}
            helperText={tCommon('optional')}
          />
        </form>
      </Dialog>

      {/* Remove Student Confirm Dialog */}
      <Dialog
        open={removeDialogOpen}
        onClose={() => {
          setRemoveDialogOpen(false);
          setStudentToRemove(null);
        }}
        title={t('removeStudent')}
        size="sm"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRemoveDialogOpen(false);
                setStudentToRemove(null);
              }}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleRemoveStudent}
              loading={removingStudent}
            >
              {tCommon('delete')}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="text-sm text-neutral-600">
            {t('confirmRemoveStudent')}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
