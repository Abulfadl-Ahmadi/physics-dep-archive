import { useState, useEffect, useMemo } from 'react'
import { Search, FileText, Moon, Sun, Filter, X, LayoutGrid, Table, ArrowLeft, Calendar, GraduationCap, User, FileStack } from 'lucide-react'
import { matchSorter } from 'match-sorter'
import { cn } from '@/lib/utils'
import { ExamCard } from '@/components/ExamCard'
import { ExamTable } from '@/components/ExamTable'
import { FilterBar } from '@/components/FilterBar'
import { getExams } from '@/data/exams'
import type { Exam } from '@/types/exam'

type ViewMode = 'card' | 'table'

function examSlug(exam: Exam): string {
  const parts = [
    exam.course?.replace(/\s+/g, '-').toLowerCase() || 'unknown',
    exam.exam_type?.toLowerCase() || 'unknown',
    exam.year || '0000',
    exam.semester?.toLowerCase() || 'unknown',
  ]
  return parts.join('-')
}

export default function App() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [selectedProfessor, setSelectedProfessor] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null)
  const [selectedExamType, setSelectedExamType] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [activeExam, setActiveExam] = useState<Exam | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Auto theme
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setDark(e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Persist theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Load exams
  useEffect(() => {
    getExams().then(({ exams }) => {
      setExams(exams)
      setLoading(false)
    })
  }, [])

  // Hash-based routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1)
      if (!hash) {
        setActiveExam(null)
        return
      }
      const found = exams.find((e) => examSlug(e) === hash)
      setActiveExam(found || null)
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [exams])

  // Derive unique filter options
  const courses = useMemo(
    () => [...new Set(exams.map((e) => e.course).filter((x): x is string => x !== null))].sort(),
    [exams]
  )
  const professors = useMemo(
    () => [...new Set(exams.map((e) => e.professor).filter((x): x is string => x !== null))].sort(),
    [exams]
  )
  const years = useMemo(
    () => [...new Set(exams.map((e) => e.year).filter((x): x is string => x !== null))].sort(),
    [exams]
  )
  const semesters = useMemo(
    () => [...new Set(exams.map((e) => e.semester).filter((x): x is string => x !== null))].sort(),
    [exams]
  )
  const examTypes = useMemo(
    () => [...new Set(exams.map((e) => e.exam_type).filter((x): x is string => x !== null))].sort(),
    [exams]
  )

  // Combined filtering
  const filteredExams = useMemo(() => {
    let results = exams
    if (searchQuery) {
      results = matchSorter(results, searchQuery, {
        keys: ['course', 'professor', 'year', 'semester', 'exam_type'],
        threshold: matchSorter.rankings.CONTAINS,
      })
    }
    if (selectedCourse) results = results.filter((e) => e.course === selectedCourse)
    if (selectedProfessor) results = results.filter((e) => e.professor === selectedProfessor)
    if (selectedYear) results = results.filter((e) => e.year === selectedYear)
    if (selectedSemester) results = results.filter((e) => e.semester === selectedSemester)
    if (selectedExamType) results = results.filter((e) => e.exam_type === selectedExamType)
    return results
  }, [exams, searchQuery, selectedCourse, selectedProfessor, selectedYear, selectedSemester, selectedExamType])

  const activeFilterCount = [selectedCourse, selectedProfessor, selectedYear, selectedSemester, selectedExamType].filter(Boolean).length

  const clearAllFilters = () => {
    setSelectedCourse(null)
    setSelectedProfessor(null)
    setSelectedYear(null)
    setSelectedSemester(null)
    setSelectedExamType(null)
    setSearchQuery('')
  }

  // ---- Individual Exam Page ----
  if (activeExam) {
    return (
      <div className={cn(dark && 'dark')}>
        <div className="min-h-screen bg-background text-foreground">
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <button
                onClick={() => { window.location.hash = '' }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Archive
              </button>
              <button
                onClick={() => setDark(!dark)}
                className="rounded-md p-2 hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </header>

          <main className="container mx-auto px-4 py-12 max-w-3xl">
            <div className="rounded-lg border bg-card p-8">
              <h1 className="text-2xl font-bold mb-2">
                {activeExam.course || 'Unknown Course'}
              </h1>

              <div className="flex flex-wrap gap-4 mt-6 text-sm text-muted-foreground">
                {activeExam.professor && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{activeExam.professor}</span>
                  </div>
                )}
                {activeExam.year && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{activeExam.year}</span>
                  </div>
                )}
                {activeExam.semester && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>{activeExam.semester}</span>
                  </div>
                )}
                {activeExam.exam_type && (
                  <span
                    className={cn(
                      'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                      activeExam.exam_type === 'Final' &&
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      activeExam.exam_type === 'Midterm' &&
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                      activeExam.exam_type === 'Quiz' &&
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    )}
                  >
                    {activeExam.exam_type}
                  </span>
                )}
              </div>

              {activeExam.file_url && (
                <div className="mt-8">
                  <a
                    href={activeExam.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <FileStack className="h-4 w-4" />
                    Download Exam Paper
                  </a>
                </div>
              )}

              {activeExam.uploaded_at && (
                <p className="mt-6 text-xs text-muted-foreground">
                  Uploaded: {new Date(activeExam.uploaded_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </main>
        </div>
      </div>
    )
  }

  // ---- Main List Page ----
  return (
    <div className={cn(dark && 'dark')}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Exam Archive</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center rounded-md border">
                <button
                  onClick={() => setViewMode('card')}
                  className={cn(
                    'p-2 rounded-l-md transition-colors',
                    viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  )}
                  aria-label="Card view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'p-2 rounded-r-md transition-colors',
                    viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  )}
                  aria-label="Table view"
                >
                  <Table className="h-4 w-4" />
                </button>
              </div>
              {/* Theme Toggle */}
              <button
                onClick={() => setDark(!dark)}
                className="rounded-md p-2 hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Physics Department Exam Papers
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Browse and download past exam papers. Search by course, professor, year, or semester.
            </p>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="container mx-auto px-4 py-6">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search exams by course, professor, year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                showFilters || activeFilterCount > 0
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent'
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary-foreground text-primary text-xs px-1.5 py-0.5 font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <FilterBar
              courses={courses}
              professors={professors}
              years={years}
              semesters={semesters}
              examTypes={examTypes}
              selectedCourse={selectedCourse}
              selectedProfessor={selectedProfessor}
              selectedYear={selectedYear}
              selectedSemester={selectedSemester}
              selectedExamType={selectedExamType}
              onCourseChange={setSelectedCourse}
              onProfessorChange={setSelectedProfessor}
              onYearChange={setSelectedYear}
              onSemesterChange={setSelectedSemester}
              onExamTypeChange={setSelectedExamType}
            />
          )}
        </section>

        {/* Results */}
        <main className="container mx-auto px-4 pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''} found
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Clear all
                  </button>
                )}
              </div>

              {filteredExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No exams found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredExams.map((exam, idx) => (
                    <ExamCard key={idx} exam={exam} />
                  ))}
                </div>
              ) : (
                <ExamTable exams={filteredExams} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
