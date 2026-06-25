import { Exam } from '@/types/exam'

let cachedExams: Exam[] | undefined = undefined
let loadError: string | null = null

export async function getExams(): Promise<{ exams: Exam[]; error: string | null }> {
  if (cachedExams) {
    return { exams: cachedExams, error: loadError }
  }

  let exams: Exam[]
  try {
    const resp = await fetch('./exams.json')
    if (resp.ok) {
      exams = await resp.json()
    } else {
      exams = sampleExams
      loadError = 'exams.json not found — showing sample data'
    }
  } catch {
    exams = sampleExams
    loadError = 'Failed to load — showing sample data'
  }

  cachedExams = exams
  return { exams, error: loadError }
}

// Fallback sample data
const sampleExams: Exam[] = [
  {
    course: 'Mathematical Physics',
    professor: 'Dr. Ahmad Rezaei',
    year: '2023',
    semester: 'Fall',
    exam_type: 'Final',
    file_url: 'https://quanta-bucket-001.s3.ir-thr-at1.arvanstorage.ir/exams/math-physics-final-2023.pdf',
    uploaded_at: '2024-01-15T10:30:00Z',
  },
]
