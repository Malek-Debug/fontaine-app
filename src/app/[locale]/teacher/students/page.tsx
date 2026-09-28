'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Users, ArrowRight, GraduationCap } from 'lucide-react';

interface StudentEntry {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  className: string;
  classId: string;
}

export default function StudentsListPage() {
  const locale = useLocale();
  const router = useRouter();
  const tNav = useTranslations('nav');
  const [loading, setLoading] = useState(true);
  const [classGroups, setClassGroups] = useState<Array<{ id: string; name: string; students: StudentEntry[] }>>([]);

  useEffect(() => {
    async function load() {
      try {
        const classRes = await fetch('/api/classes');
        const classes = await classRes.json();
        if (!Array.isArray(classes)) {
          setLoading(false);
          return;
        }

        const groups = await Promise.all(
          classes.map(async (cls: any) => {
            const detailRes = await fetch(`/api/classes/${cls.id}`);
            const detail = await detailRes.json();
            return {
              id: cls.id,
              name: cls.name,
              students: (detail.students || []).map((s: any) => ({
                ...s,
                className: cls.name,
                classId: cls.id,
              })),
            };
          })
        );
        setClassGroups(groups);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-4 w-48" />
        <div className="skeleton h-8 w-32" />
        <div className="space-y-6">
          <div>
            <div className="skeleton h-6 w-40 mb-3" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
          <div>
            <div className="skeleton h-6 w-40 mb-3" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const allStudents = classGroups.flatMap((g) => g.students);

  return (
    <div className="space-y-6">
      <Breadcrumb
        locale={locale}
        items={[
          { label: tNav('dashboard'), href: '/teacher' },
          { label: tNav('students') },
        ]}
        onNavigate={(href) => router.push(href)}
      />

      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">التلاميذ</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {allStudents.length} تلميذ في {classGroups.filter(g => g.students.length > 0).length} قسم
        </p>
      </div>

      {allStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="لا يوجد تلاميذ بعد"
          description="أضف تلاميذ إلى أقسامك لمتابعة تقدمهم"
        />
      ) : (
        <div className="space-y-8">
          {classGroups.map((cls) => {
            if (cls.students.length === 0) return null;
            return (
              <div key={cls.id} className="animate-fadeIn">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-semibold text-neutral-900">{cls.name}</h2>
                  <Badge variant="neutral" size="sm">{cls.students.length}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cls.students.map((student, i) => (
                    <Link
                      key={student.id}
                      href={`/teacher/students/${student.id}`}
                    >
                      <Card hover className={`group animate-fadeIn animate-stagger-${Math.min(i + 1, 5)}`}>
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={`${student.firstName} ${student.lastName}`}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
                              {student.displayName}
                            </p>
                            <p className="text-sm text-neutral-500 truncate">
                              {student.firstName} {student.lastName}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-neutral-300 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
