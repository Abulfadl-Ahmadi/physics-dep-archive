import { useState, useEffect, useMemo } from 'react'
import { Search, FileText, Moon, Sun, Filter, X } from 'lucide-react'
import { matchSorter } from 'match-sorter'
import { cn } from '@/lib/utils'
import { ExamCard } from '@/components/ExamCard'
import { FilterBar } from '@/components/FilterBar'
import { getExams } from '@/data/exams'
import type { Exam } from '@/types/exam'

export default function App() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [selectedProfessor, setSelectedProfessor] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null)
  const [selectedExamType, setSelectedExamType] = useState<string | null>(null)
  const [dark, setDark] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    getExams().then(({ exams }) => {
      setExams(exams)
      setLoading(false)
    })
  }, [])

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

    if (selectedCourse) {
      results = results.filter((e) => e.course === selectedCourse)
    }
    if (selectedProfessor) {
      results = results.filter((e) => e.professor === selectedProfessor)
    }
    if (selectedYear) {
      results = results.filter((e) => e.year === selectedYear)
    }
    if (selectedSemester) {
      results = results.filter((e) => e.semester === selectedSemester)
    }
    if (selectedExamType) {
      results = results.filter((e) => e.exam_type === selectedExamType)
    }

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
            <div className="flex items-center gap-3">
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
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredExams.map((exam, idx) => (
                    <ExamCard key={idx} exam={exam} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
