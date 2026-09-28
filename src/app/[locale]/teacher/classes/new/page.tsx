'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { GraduationCap } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Breadcrumb } from '@/components/ui/breadcrumb';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CreateClassPage() {
  const t = useTranslations('classes');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();

  const { data: curriculum, isLoading: loadingCurriculum } = useSWR('/api/curriculum', fetcher);

  const [name, setName] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const grades = curriculum?.grades || curriculum || [];
  const gradeOptions = Array.isArray(grades)
    ? grades.map((g: any) => ({
        value: g.id,
        label: g.nameAr || g.name,
      }))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !gradeId) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), gradeId }),
      });

      if (!res.ok) {
        throw new Error('Failed to create class');
      }

      const created = await res.json();
      router.push(`/teacher/classes/${created.id}`);
    } catch {
      setError(tCommon('error'));
      setSubmitting(false);
    }
  };

  if (loadingCurriculum) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        locale={locale}
        items={[
          { label: tNav('dashboard'), href: '/teacher' },
          { label: t('myClasses'), href: '/teacher/classes' },
          { label: t('createClass') },
        ]}
        onNavigate={(href) => router.push(href)}
      />

      <div className="mx-auto max-w-xl animate-fadeIn">
        <Card className="overflow-hidden" padding={false}>
          <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">{t('createClass')}</h1>
          </div>
          <CardBody className="p-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={t('className')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('className')}
                required
              />

              <Select
                label={t('grade')}
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                placeholder={t('grade')}
                options={gradeOptions}
                required
              />

              {error && (
                <div className="rounded-xl bg-danger-50 px-4 py-3">
                  <p className="text-sm text-danger-600">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Link href="/teacher/classes">
                  <Button type="button" variant="ghost">
                    {tCommon('cancel')}
                  </Button>
                </Link>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={!name.trim() || !gradeId}
                >
                  {tCommon('create')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
