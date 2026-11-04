import { useState, useEffect, useMemo } from 'react'
import { Search, FileText, Moon, Sun, Filter, X, LayoutGrid, Table, ArrowLeft, Calendar, GraduationCap, User, FileStack, Send, Bug, Clock } from 'lucide-react'
import { matchSorter } from 'match-sorter'
import { cn } from '@/lib/utils'
import { ExamCard } from '@/components/ExamCard'
import { ExamTable } from '@/components/ExamTable'
import { FilterBar } from '@/components/FilterBar'
import { getExams } from '@/data/exams'
import type { Exam } from '@/types/exam'
import { translations, type Language } from '@/i18n'
import { localized } from '@/lib/localize'

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

interface FooterProps {
  lastUpdated: string
  t: (typeof translations)[Language]
}

function Footer({ lastUpdated, t }: FooterProps) {
  return (
    <footer className="border-t bg-muted/20 py-8 text-sm text-muted-foreground mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Contribute section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Send className="h-4 w-4 text-primary" />
              <h4>{t.contribute}</h4>
            </div>
            <p className="leading-relaxed">
              {t.contributeText}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <a
                href="https://t.me/ZZAA1383"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-background hover:bg-accent text-xs px-3 py-1.5 text-foreground transition-colors border font-medium"
              >
                @ZZAA1383
              </a>
              <a
                href="https://t.me/Asra_Rezafadaei"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-background hover:bg-accent text-xs px-3 py-1.5 text-foreground transition-colors border font-medium"
              >
                @Asra_Rezafadaei
              </a>
              <a
                href="https://t.me/abul_ah"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-background hover:bg-accent text-xs px-3 py-1.5 text-foreground transition-colors border font-medium"
              >
                @abul_ah
              </a>
            </div>
          </div>

          {/* Bug report section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Bug className="h-4 w-4 text-primary" />
              <h4>{t.report}</h4>
            </div>
            <p className="leading-relaxed">
              {t.reportText}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <a
                href="https://t.me/abul_ah"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-background hover:bg-accent text-xs px-3 py-1.5 text-foreground transition-colors border font-medium"
              >
                @abul_ah
              </a>
            </div>
          </div>

          {/* Last update section */}
          <div className="flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <h4>{t.physicsArchive}</h4>
              </div>
              <p className="leading-relaxed">
                {t.archiveDescription}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs pt-4 border-t border-border/40 md:border-t-0 md:pt-0">
              <Clock className="h-3.5 w-3.5" />
              <span>{t.lastUpdated} <span className="font-semibold text-foreground">{lastUpdated}</span></span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
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
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sortOrder') : null
    return stored === 'oldest' ? 'oldest' : 'newest'
  })
  const [language, setLanguage] = useState<Language>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('language') : null
    return stored === 'fa' ? 'fa' : 'en'
  })
  const t = translations[language]

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

  // Persist selected order
  useEffect(() => {
    localStorage.setItem('sortOrder', sortOrder)
  }, [sortOrder])

  // Persist language and synchronize document locale/direction
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr'
    document.documentElement.dataset.language = language
    localStorage.setItem('language', language)
  }, [language])

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
    const seasonOrder: Record<string, number> = { Fall: 3, Summer: 2, Spring: 1, Winter: 0 }
    return [...results].sort((a, b) => {
      const direction = sortOrder === 'newest' ? 1 : -1
      const yearDiff = (Number(b.year) || 0) - (Number(a.year) || 0)
      if (yearDiff) return direction * yearDiff
      const seasonDiff = (seasonOrder[b.semester || ''] || 0) - (seasonOrder[a.semester || ''] || 0)
      if (seasonDiff) return direction * seasonDiff
      const dateDiff = (Date.parse(b.uploaded_at || '') || 0) - (Date.parse(a.uploaded_at || '') || 0)
      return direction * dateDiff
    })
  }, [exams, searchQuery, selectedCourse, selectedProfessor, selectedYear, selectedSemester, selectedExamType, sortOrder])

  const activeFilterCount = [selectedCourse, selectedProfessor, selectedYear, selectedSemester, selectedExamType].filter(Boolean).length

  const lastUpdatedDate = useMemo(() => {
    if (exams.length === 0) return 'July 17, 2026'
    const dates = exams
      .map((e) => e.uploaded_at)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t))
    if (dates.length === 0) return 'July 17, 2026'
    const maxTime = Math.max(...dates)
    return new Date(maxTime).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [exams, language])

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
      <div lang={language} dir={language === 'fa' ? 'rtl' : 'ltr'} className={cn(dark && 'dark')}>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <button
                onClick={() => { window.location.hash = '' }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.backToArchive}
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

          <main className="container mx-auto px-4 py-12 max-w-3xl flex-grow">
            <div className="rounded-lg border bg-card p-8">
              <h1 className="text-2xl font-bold mb-2">
                {localized(activeExam.course, language) || t.unknownCourse}
              </h1>

              <div className="flex flex-wrap gap-4 mt-6 text-sm text-muted-foreground">
                {activeExam.professor && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{localized(activeExam.professor, language)}</span>
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
                    <span>{localized(activeExam.semester, language)}</span>
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
                    {localized(activeExam.exam_type, language)}
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
                    {t.downloadPaper}
                  </a>
                </div>
              )}

              {activeExam.uploaded_at && (
                <p className="mt-6 text-xs text-muted-foreground">
                  {t.uploaded}: {new Date(activeExam.uploaded_at).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </main>

          <Footer lastUpdated={lastUpdatedDate} t={t} />
        </div>
      </div>
    )
  }

  // ---- Main List Page ----
  return (
    <div lang={language} dir={language === 'fa' ? 'rtl' : 'ltr'} className={cn(dark && 'dark')}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">{t.archive}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
                className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                aria-label={language === 'en' ? 'Switch to Persian' : 'Switch to English'}
                title={language === 'en' ? 'Switch to Persian' : 'Switch to English'}
              >
                {t.language}
              </button>
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
              {t.departmentPapers}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              {t.browseDescription}
            </p>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="container mx-auto px-4 py-6">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className={cn('absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground', language === 'fa' ? 'right-3' : 'left-3')} />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn('w-full rounded-md border bg-background py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring', language === 'fa' ? 'pl-4 pr-10' : 'pl-10 pr-4')}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <span className="hidden sm:inline">{t.sortBy}</span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
                aria-label={t.sortBy}
                className="rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="newest">{t.newest}</option>
                <option value="oldest">{t.oldest}</option>
              </select>
            </label>
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
              {t.filters}
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary-foreground text-primary text-xs px-1.5 py-0.5 font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <FilterBar
              t={t}
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
        <main className="container mx-auto px-4 pb-12 flex-grow">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredExams.length} {language === 'fa' ? t.results : (filteredExams.length === 1 ? t.result : t.results)}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                    {t.clearAll}
                  </button>
                )}
              </div>

              {filteredExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t.noExams}</p>
                  <p className="text-sm">{t.adjustSearch}</p>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredExams.map((exam, idx) => (
                    <div key={idx} className="min-w-0">  {/* اضافه کردن کلاس به آیتم */}
                      <ExamCard exam={exam} language={language} t={t} />
                    </div>
                  ))}
                </div>
              ) : (
                <ExamTable exams={filteredExams} language={language} t={t} />
              )}
            </>
          )}
        </main>

        <Footer lastUpdated={lastUpdatedDate} t={t} />
      </div>
    </div>
  )
}
