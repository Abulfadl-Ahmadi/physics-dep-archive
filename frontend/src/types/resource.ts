export type ResourceType =
  | 'book'
  | 'solution_manual'
  | 'lecture_note'
  | 'exam'
  | 'assignment'
  | 'lab'
  | 'schedule'
  | 'manual'
  | 'educational_other'

/** Public catalog entries are derived only from filename/caption metadata, not file contents. */
export interface Resource {
  id: number
  title: string
  type: ResourceType
  kind: ResourceType
  course: string | null
  teacher: string | null
  professor: string | null
  author: string | null
  edition: string | null
  language: string | null
  sizeBytes: number | null
  format: string | null
  summary: string
  sourceUrl: string
  sourceMessageId: number
  access: { kind: 'telegram_post'; url: string }
  reviewStatus: 'needs_review' | 'auto_published'
  evidence: {
    fileName: string | null
    captionExcerpt: string | null
    scope: 'filename_and_caption_only'
    fileAvailability: 'omitted_from_export'
  }
  relations: { duplicateOf: number | null; solutionFor: number | null }
}
