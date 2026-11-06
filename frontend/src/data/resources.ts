import type { Resource, ResourceType } from '@/types/resource'

const resourceTypes = new Set<ResourceType>([
  'book', 'solution_manual', 'lecture_note', 'exam', 'assignment',
  'lab', 'schedule', 'manual', 'educational_other',
])

let cachedResources: Resource[] | null = null
let pendingRequest: Promise<{ resources: Resource[]; error: string | null }> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Only a real HTTPS Telegram post is ever exposed as an external resource link. */
export function telegramPostUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 't.me' || url.hostname === 'telegram.me')
      && !url.username && !url.password && /^\/[A-Za-z0-9_]+\/\d+\/?$/.test(url.pathname)
      ? url.href : null
  } catch {
    return null
  }
}

function parseResource(value: unknown): Resource | null {
  if (!isRecord(value) || !Number.isSafeInteger(value.id) || (value.id as number) < 1 ||
    typeof value.title !== 'string' || !value.title.trim() ||
    typeof value.type !== 'string' || !resourceTypes.has(value.type as ResourceType) ||
    !isRecord(value.access) || value.access.kind !== 'telegram_post' ||
    !telegramPostUrl(value.access.url)) return null

  const nullableText = (text: unknown): string | null =>
    typeof text === 'string' && text.trim() ? text.trim() : null
  const nullableId = (id: unknown): number | null =>
    typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : null
  const relations = isRecord(value.relations) ? value.relations : {}
  const evidence = isRecord(value.evidence) ? value.evidence : {}
  const type = value.type as ResourceType
  return {
    id: value.id as number,
    title: value.title.trim(),
    type,
    kind: type,
    course: nullableText(value.course),
    teacher: nullableText(value.teacher),
    professor: nullableText(value.professor),
    author: nullableText(value.author),
    edition: nullableText(value.edition),
    language: nullableText(value.language),
    sizeBytes: typeof value.sizeBytes === 'number' && Number.isFinite(value.sizeBytes) && value.sizeBytes >= 0
      ? value.sizeBytes : null,
    format: nullableText(value.format),
    summary: typeof value.summary === 'string' ? value.summary.trim() : '',
    sourceUrl: telegramPostUrl(value.sourceUrl) ?? telegramPostUrl(value.access.url)!,
    sourceMessageId: nullableId(value.sourceMessageId) ?? (value.id as number),
    access: { kind: 'telegram_post', url: telegramPostUrl(value.access.url)! },
    // Anything lacking an explicit, human-verifiable approval remains flagged.
    reviewStatus: value.reviewStatus === 'auto_published' ? 'auto_published' : 'needs_review',
    evidence: {
      fileName: nullableText(evidence.fileName),
      captionExcerpt: nullableText(evidence.captionExcerpt),
      scope: 'filename_and_caption_only',
      fileAvailability: 'omitted_from_export',
    },
    relations: {
      duplicateOf: nullableId(relations.duplicateOf),
      solutionFor: nullableId(relations.solutionFor),
    },
  }
}

/** Fetch the public catalog; never substitute invented/sample resources on failure. */
export function getResources(): Promise<{ resources: Resource[]; error: string | null }> {
  if (cachedResources !== null) return Promise.resolve({ resources: cachedResources, error: null })
  if (pendingRequest) return pendingRequest
  pendingRequest = (async () => {
    try {
      const response = await fetch('./resources.json')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload: unknown = await response.json()
      if (!Array.isArray(payload)) throw new Error('Invalid catalog')
      const resources = payload.map(parseResource)
      if (resources.some((item) => item === null)) throw new Error('Invalid catalog entry')
      const parsed = resources as Resource[]
      if (new Set(parsed.map((item) => item.id)).size !== parsed.length) throw new Error('Duplicate resource id')
      cachedResources = parsed
      return { resources: parsed, error: null }
    } catch {
      return { resources: [], error: 'بارگذاری کتابخانه انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.' }
    } finally {
      pendingRequest = null
    }
  })()
  return pendingRequest
}
