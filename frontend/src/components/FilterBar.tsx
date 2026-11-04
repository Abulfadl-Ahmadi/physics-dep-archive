import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { translations, type Language } from '@/i18n'

interface FilterBarProps {
  t: (typeof translations)[Language]
  courses: string[]
  professors: string[]
  years: string[]
  semesters: string[]
  examTypes: string[]
  selectedCourse: string | null
  selectedProfessor: string | null
  selectedYear: string | null
  selectedSemester: string | null
  selectedExamType: string | null
  onCourseChange: (v: string | null) => void
  onProfessorChange: (v: string | null) => void
  onYearChange: (v: string | null) => void
  onSemesterChange: (v: string | null) => void
  onExamTypeChange: (v: string | null) => void
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: string[]
  onChange: (v: string | null) => void
}) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          'appearance-none w-full rounded-md border bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring',
          value ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export function FilterBar({
  t,
  courses,
  professors,
  years,
  semesters,
  examTypes,
  selectedCourse,
  selectedProfessor,
  selectedYear,
  selectedSemester,
  selectedExamType,
  onCourseChange,
  onProfessorChange,
  onYearChange,
  onSemesterChange,
  onExamTypeChange,
}: FilterBarProps) {
  return (
    <div className="mt-4 rounded-lg border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Select label={t.allCourses} value={selectedCourse} options={courses} onChange={onCourseChange} />
        <Select label={t.allProfessors} value={selectedProfessor} options={professors} onChange={onProfessorChange} />
        <Select label={t.allYears} value={selectedYear} options={years} onChange={onYearChange} />
        <Select label={t.allSemesters} value={selectedSemester} options={semesters} onChange={onSemesterChange} />
        <Select label={t.allExamTypes} value={selectedExamType} options={examTypes} onChange={onExamTypeChange} />
      </div>
    </div>
  )
}
