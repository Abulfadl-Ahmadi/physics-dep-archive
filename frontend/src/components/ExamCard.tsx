import { Exam } from '@/types/exam'
import { cn } from '@/lib/utils'
import { User, Calendar, GraduationCap, FileStack } from 'lucide-react'

interface ExamCardProps {
  exam: Exam
}

export function ExamCard({ exam }: ExamCardProps) {
  return (
    <div className="group rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight truncate">
              {exam.course || 'Unknown Course'}
            </h3>
            {exam.professor && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{exam.professor}</span>
              </div>
            )}
          </div>
          {exam.exam_type && (
            <span className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
              exam.exam_type === 'Final' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              exam.exam_type === 'Midterm' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              exam.exam_type === 'Quiz' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            )}>
              {exam.exam_type}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {exam.year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {exam.year}
            </span>
          )}
          {exam.semester && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              {exam.semester}
            </span>
          )}
        </div>

        {exam.file_url && (
          <a
            href={exam.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <FileStack className="h-4 w-4" />
            View Paper
          </a>
        )}
      </div>
    </div>
  )
}
