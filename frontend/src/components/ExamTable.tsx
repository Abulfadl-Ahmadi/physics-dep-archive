import { Exam } from '@/types/exam'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translations, type Language } from '@/i18n'
import { localized } from '@/lib/localize'

interface ExamTableProps {
  exams: Exam[]
  language: Language
  t: (typeof translations)[Language]
}

function examSlug(exam: Exam): string {
  const parts = [
    exam.course?.replace(/\s+/g, '-').toLowerCase() || 'unknown',
    exam.exam_type?.toLowerCase() || 'unknown',
    exam.year || '0000',
    exam.semester?.toLowerCase() || 'unknown',
  ]
  return parts.join('-')
}

export function ExamTable({ exams, language, t }: ExamTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t.courseLabel}</th>
              <th className="px-4 py-3 text-left font-medium">{t.professorLabel}</th>
              <th className="px-4 py-3 text-left font-medium">{t.yearLabel}</th>
              <th className="px-4 py-3 text-left font-medium">{t.semesterLabel}</th>
              <th className="px-4 py-3 text-left font-medium">{t.typeLabel}</th>
              <th className="px-4 py-3 text-right font-medium">{t.linkLabel}</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam, idx) => (
              <tr
                key={idx}
                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium">
                  <a
                    href={`#${examSlug(exam)}`}
                    className="hover:text-primary hover:underline transition-colors"
                  >
                    {localized(exam.course, language) || '—'}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {localized(exam.professor, language) || '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {exam.year || '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {localized(exam.semester, language) || '—'}
                </td>
                <td className="px-4 py-3">
                  {exam.exam_type && (
                    <span
                      className={cn(
                        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                        exam.exam_type === 'Final' &&
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        exam.exam_type === 'Midterm' &&
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        exam.exam_type === 'Quiz' &&
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      )}
                    >
                      {localized(exam.exam_type, language)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {exam.file_url ? (
                    <a
                      href={exam.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t.view}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
