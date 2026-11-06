import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, FileText, LayoutGrid, Search, Table2, X } from 'lucide-react'
import type { Language } from '@/i18n'
import { getResources } from '@/data/resources'
import type { Resource, ResourceType } from '@/types/resource'

export interface ResourceLibraryProps {
  language: Language
  dark?: boolean
  onBack?: () => void
}

type ViewMode = 'grid' | 'table'
const typeNames: Record<ResourceType, string> = {
  book: 'کتاب', solution_manual: 'حل‌المسائل', lecture_note: 'جزوه', exam: 'آزمون',
  assignment: 'تمرین', lab: 'آزمایشگاه', schedule: 'برنامه', manual: 'راهنما',
  educational_other: 'منبع آموزشی',
}
const inputClass = 'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm'
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
const digitMap: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' }

/** Equalizes Arabic/Persian Yeh and Kaf, joiners and all three digit systems for searching. */
export function normalizeResourceSearch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('fa-IR')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[٠-٩۰-۹]/g, (digit) => digitMap[digit])
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[\u200c\u200d_\-]+/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

const faNumber = (value: number): string => new Intl.NumberFormat('fa-IR').format(value)
const languageName = (value: string): string => ({ fa: 'فارسی', en: 'انگلیسی' }[value] ?? value)
const routeId = (): string | null => {
  const match = /^#\/resources\/([^/?#]+)\/?$/.exec(window.location.hash)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return '' }
}
const resourceHref = (id: number): string => `#/resources/${encodeURIComponent(String(id))}`
const hasReviewFlag = (resource: Resource): boolean => resource.reviewStatus !== 'auto_published'

function ReviewBadge({ resource }: { resource: Resource }) {
  return hasReviewFlag(resource) ? (
    <span className="inline-flex shrink-0 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground">نیازمند بررسی</span>
  ) : null
}

function TypeBadge({ resource }: { resource: Resource }) {
  return <span className="inline-flex shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground">{typeNames[resource.type]}</span>
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm transition-shadow hover:shadow-md motion-reduce:transition-none">
      <div className="mb-4 flex flex-wrap items-center gap-2"><TypeBadge resource={resource} /><ReviewBadge resource={resource} /></div>
      <h3 className="text-lg font-semibold leading-snug break-words">
        <a href={resourceHref(resource.id)} dir="auto" className={`block rounded-sm hover:underline ${focusClass}`}>{resource.title}</a>
      </h3>
      {resource.summary && <p dir="auto" className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground">{resource.summary}</p>}
      <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {resource.course && <div className="flex gap-1"><dt>درس:</dt><dd dir="auto">{resource.course}</dd></div>}
        {(resource.teacher || resource.professor) && <div className="flex gap-1"><dt>استاد:</dt><dd dir="auto">{resource.teacher || resource.professor}</dd></div>}
        {resource.language && <div className="flex gap-1"><dt>زبان:</dt><dd dir="auto">{languageName(resource.language)}</dd></div>}
      </dl>
      <a href={resourceHref(resource.id)} className={`mt-auto inline-flex min-h-11 items-center gap-2 self-start rounded-md pt-5 text-sm font-medium hover:underline ${focusClass}`}>
        جزئیات منبع <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      </a>
    </article>
  )
}

function ResourceDetail({ resource, resources, headingRef }: { resource: Resource; resources: Resource[]; headingRef: Ref<HTMLHeadingElement> }) {
  const solutionFor = resource.relations.solutionFor == null ? null : resources.find((item) => item.id === resource.relations.solutionFor)
  const duplicateOf = resource.relations.duplicateOf == null ? null : resources.find((item) => item.id === resource.relations.duplicateOf)
  const relatedSolutions = resources.filter((item) => item.type === 'solution_manual' && item.relations.solutionFor === resource.id)
  return (
    <article className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-8">
      <div className="flex flex-wrap gap-2"><TypeBadge resource={resource} /><ReviewBadge resource={resource} /></div>
      <h1 ref={headingRef} tabIndex={-1} dir="auto" className="mt-5 break-words rounded-sm text-2xl font-bold leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-3xl">{resource.title}</h1>
      {resource.summary && <p dir="auto" className="mt-5 leading-loose text-foreground">{resource.summary}</p>}
      {hasReviewFlag(resource) && <p className="mt-5 rounded-md border border-border bg-muted p-3 text-sm leading-relaxed text-foreground">عنوان و اطلاعات این منبع از فرادادهٔ پست به‌دست آمده‌اند و هنوز بررسی انسانی نشده‌اند. برای اطمینان، خود پست را ببینید.</p>}
      <dl className="mt-6 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2">
        {([
          ['نوع', typeNames[resource.type]], ['درس', resource.course], ['استاد', resource.teacher || resource.professor],
          ['نویسنده', resource.author], ['ویرایش', resource.edition ? (/^\d+$/.test(resource.edition) ? faNumber(Number(resource.edition)) : resource.edition) : null], ['زبان', resource.language ? languageName(resource.language) : null],
          ['قالب', resource.format?.toUpperCase() ?? null], ['حجم اعلام‌شده در پست', resource.sizeBytes == null ? null : `${faNumber(Math.round(resource.sizeBytes / 1024))} کیلوبایت`],
        ] as [string, string | null][]).filter(([, value]) => value).map(([label, value]) => (
          <div className="min-w-0" key={label}><dt className="mb-1 text-muted-foreground">{label}</dt><dd dir="auto" className="break-words font-medium">{value}</dd></div>
        ))}
      </dl>
      <section className="mt-6 border-t border-border pt-5 text-sm" aria-label="منشأ فراداده">
        <h2 className="font-semibold">منشأ اطلاعات</h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">شمارهٔ پست: {faNumber(resource.sourceMessageId)}. اطلاعات از نام فایل و کپشن پست استخراج شده‌اند؛ خود فایل در خروجی تلگرام موجود نبود و محتوای آن بررسی نشده است.</p>
        {resource.evidence.fileName && <p className="mt-2 break-all leading-relaxed text-muted-foreground">نام فایل اعلام‌شده: <bdi dir="auto" className="font-medium text-foreground">{resource.evidence.fileName}</bdi></p>}
        {resource.evidence.captionExcerpt && <p className="mt-2 leading-relaxed text-muted-foreground">برچسب‌های کپشن: <bdi dir="auto" className="text-foreground">{resource.evidence.captionExcerpt}</bdi></p>}
      </section>
      {resource.type === 'exam' && <p className="mt-6 border-t border-border pt-5 text-sm leading-relaxed">برای دیدن برگه‌های آزمون دانشگاه، <a href="#" className={`rounded-sm font-medium underline ${focusClass}`}>آرشیو امتحانات</a> را ببینید. این مورد تنها پیوند پست تلگرام است و لزوماً با رکوردی در آرشیو امتحانات یکی نیست.</p>}
      {resource.type === 'solution_manual' && <section className="mt-6 border-t border-border pt-5">
        <h2 className="font-semibold">ارتباط احتمالی حل‌المسائل</h2>
        {solutionFor ? <p className="mt-2 text-sm leading-relaxed">احتمالاً مرتبط با <a dir="auto" href={resourceHref(solutionFor.id)} className={`rounded-sm font-medium underline ${focusClass}`}>{solutionFor.title}</a></p>
          : <p className="mt-2 text-sm leading-relaxed text-muted-foreground">کتاب مرتبط در کتابخانه مشخص نشده است.</p>}
      </section>}
      {relatedSolutions.length > 0 && <section className="mt-6 border-t border-border pt-5"><h2 className="font-semibold">حل‌المسائل مرتبط</h2><ul className="mt-2 space-y-2">{relatedSolutions.map((item) => <li key={item.id}><a dir="auto" href={resourceHref(item.id)} className={`inline-block rounded-sm text-sm underline ${focusClass}`}>{item.title}</a></li>)}</ul></section>}
      {resource.relations.duplicateOf !== null && <section className="mt-6 border-t border-border pt-5"><h2 className="font-semibold">تکرار احتمالی</h2><p className="mt-2 text-sm leading-relaxed">{duplicateOf ? <>منبع مشابه: <a dir="auto" href={resourceHref(duplicateOf.id)} className={`rounded-sm underline ${focusClass}`}>{duplicateOf.title}</a></> : `ممکن است تکراریِ منبع شمارهٔ ${faNumber(resource.relations.duplicateOf)} باشد.`}</p></section>}
      <p className="mt-7 text-sm leading-relaxed text-muted-foreground">فایل این منبع در سایت نگهداری نمی‌شود؛ پیوند زیر پست منبع را در تلگرام باز می‌کند.</p>
      <a href={resource.access.url} target="_blank" rel="noopener noreferrer" className={`mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 ${focusClass}`}>
        <ExternalLink aria-hidden="true" className="h-4 w-4" /> مشاهدهٔ پست در تلگرام
      </a>
    </article>
  )
}

export default function ResourceLibrary({ language: _language, dark, onBack }: ResourceLibraryProps) {
  // The catalog currently has verified Persian interface copy only. Keep it RTL even when the exam archive is English.
  void _language
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(() => routeId())
  const detailHeadingRef = useRef<HTMLHeadingElement>(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [course, setCourse] = useState('')
  const [teacher, setTeacher] = useState('')
  const [resourceLanguage, setResourceLanguage] = useState('')
  const [view, setView] = useState<ViewMode>('grid')

  useEffect(() => {
    const handleRoute = () => setActiveId(routeId())
    window.addEventListener('hashchange', handleRoute)
    return () => window.removeEventListener('hashchange', handleRoute)
  }, [])
  useEffect(() => {
    if (activeId !== null && !loading && !error) detailHeadingRef.current?.focus()
  }, [activeId, loading, error])
  useEffect(() => {
    let cancelled = false
    getResources().then(({ resources: result, error: loadError }) => {
      if (!cancelled) { setResources(result); setError(loadError); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [attempt])

  const courses = useMemo(() => [...new Set(resources.map((item) => item.course).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b, 'fa')), [resources])
  const teachers = useMemo(() => [...new Set(resources.map((item) => item.teacher || item.professor).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b, 'fa')), [resources])
  const languages = useMemo(() => [...new Set(resources.map((item) => item.language).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b, 'fa')), [resources])
  const types = useMemo(() => [...new Set(resources.map((item) => item.type))], [resources])
  const filtered = useMemo(() => {
    const terms = normalizeResourceSearch(query).split(' ').filter(Boolean)
    return resources.filter((item) => {
      if (type && item.type !== type || course && item.course !== course || teacher && (item.teacher || item.professor) !== teacher || resourceLanguage && item.language !== resourceLanguage) return false
      const searchable = normalizeResourceSearch([item.title, item.summary, item.course, item.teacher, item.professor, item.author, item.language ? languageName(item.language) : null, typeNames[item.type], String(item.id)].filter(Boolean).join(' '))
      return terms.every((term) => searchable.includes(term))
    })
  }, [resources, query, type, course, teacher, resourceLanguage])
  const clearFilters = () => { setQuery(''); setType(''); setCourse(''); setTeacher(''); setResourceLanguage('') }
  const backToList = () => { window.location.hash = '/resources' }
  const goBack = () => { if (onBack) onBack(); else window.location.hash = '' }
  const selected = activeId === null ? null : resources.find((item) => String(item.id) === activeId)

  return (
    <section lang="fa" dir="rtl" className={`${dark ? 'dark ' : ''}min-h-screen bg-background font-persian text-foreground`}>
      <header className="border-b border-border bg-background"><div className="container mx-auto flex min-h-16 items-center gap-3 px-4 py-3 sm:gap-5">
        <button type="button" onClick={activeId === null ? goBack : backToList} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-accent ${focusClass}`}>
          <ArrowRight aria-hidden="true" className="h-4 w-4" /> {activeId === null ? 'بازگشت به آرشیو' : 'بازگشت به کتابخانه'}
        </button>
        <span className="ms-auto flex items-center gap-2 text-sm font-semibold sm:text-lg"><BookOpen aria-hidden="true" className="h-5 w-5" /> کتابخانهٔ منابع</span>
      </div></header>
      <main className="container mx-auto px-4 py-8 sm:py-10">
        {loading ? <div role="status" aria-live="polite"><span className="sr-only">در حال بارگذاری کتابخانه…</span><div className="mb-5 h-10 w-48 animate-pulse rounded-md bg-muted motion-reduce:animate-none" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-lg border border-border bg-muted motion-reduce:animate-none" />)}</div></div>
          : error ? <div role="alert" className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 text-center"><p className="leading-relaxed">{error}</p><button type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }} className={`mt-5 min-h-11 rounded-md bg-primary px-5 text-sm text-primary-foreground ${focusClass}`}>تلاش دوباره</button></div>
            : activeId !== null ? selected ? <ResourceDetail resource={selected} resources={resources} headingRef={detailHeadingRef} /> : <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 text-center"><p>این منبع در کتابخانه پیدا نشد.</p><a href="#/resources" className={`mt-4 inline-flex min-h-11 items-center rounded-md px-3 text-sm underline ${focusClass}`}>بازگشت به کتابخانه</a></div>
              : <>
                <div className="mb-7"><h1 className="text-2xl font-bold leading-snug sm:text-3xl">منابع آموزشی فیزیک</h1><p className="mt-2 leading-relaxed text-foreground">کتاب‌ها، جزوه‌ها و دیگر منابع را جست‌وجو کنید. برای دسترسی به هر مورد، پست آن را در تلگرام ببینید.</p></div>
                <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
                  <label htmlFor="resource-search" className="mb-2 block text-sm font-medium">جست‌وجوی منابع</label>
                  <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" /><input id="resource-search" type="search" enterKeyHint="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setQuery('') }} placeholder="عنوان، درس، استاد یا شمارهٔ پست" className={`${inputClass} !ps-10 !pe-11 [&::-webkit-search-cancel-button]:hidden`} />{query && <button type="button" onClick={() => setQuery('')} aria-label="پاک کردن جست‌وجو" className={`absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground ${focusClass}`}><X aria-hidden="true" className="h-4 w-4" /></button>}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div><label htmlFor="resource-type" className="mb-2 block text-sm font-medium">نوع منبع</label><select id="resource-type" className={inputClass} value={type} onChange={(event) => setType(event.target.value)}><option value="">همهٔ نوع‌ها</option>{types.map((value) => <option key={value} value={value}>{typeNames[value]}</option>)}</select></div>
                    <div><label htmlFor="resource-course" className="mb-2 block text-sm font-medium">درس</label><select id="resource-course" className={inputClass} value={course} onChange={(event) => setCourse(event.target.value)}><option value="">همهٔ درس‌ها</option>{courses.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
                    <div><label htmlFor="resource-teacher" className="mb-2 block text-sm font-medium">استاد</label><select id="resource-teacher" className={inputClass} value={teacher} onChange={(event) => setTeacher(event.target.value)}><option value="">همهٔ استادها</option>{teachers.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
                    <div><label htmlFor="resource-language" className="mb-2 block text-sm font-medium">زبان منبع</label><select id="resource-language" className={inputClass} value={resourceLanguage} onChange={(event) => setResourceLanguage(event.target.value)}><option value="">همهٔ زبان‌ها</option>{languages.map((value) => <option key={value} value={value}>{languageName(value)}</option>)}</select></div>
                  </div>
                </div>
                <div className="my-5 flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm text-muted-foreground">{faNumber(filtered.length)} منبع پیدا شد</p><div className="flex items-center gap-2">{(query || type || course || teacher || resourceLanguage) && <button type="button" onClick={clearFilters} className={`min-h-11 rounded-md px-3 text-sm underline ${focusClass}`}>پاک‌کردن فیلترها</button>}<div className="flex items-center rounded-md border border-border"><button type="button" aria-label="نمای شبکه‌ای" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={`flex h-11 w-11 items-center justify-center rounded-md ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'} ${focusClass}`}><LayoutGrid aria-hidden="true" className="h-4 w-4" /></button><button type="button" aria-label="نمای جدولی" aria-pressed={view === 'table'} onClick={() => setView('table')} className={`flex h-11 w-11 items-center justify-center rounded-md ${view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'} ${focusClass}`}><Table2 aria-hidden="true" className="h-4 w-4" /></button></div></div></div>
                {filtered.length === 0 ? <div className="rounded-lg border border-border bg-card px-5 py-12 text-center"><FileText aria-hidden="true" className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><h2 className="font-semibold">{resources.length ? 'منبعی با این جست‌وجو پیدا نشد' : 'هنوز منبعی در کتابخانه نیست'}</h2><p className="mt-2 text-sm text-muted-foreground">{resources.length ? 'عبارت جست‌وجو یا فیلترها را تغییر دهید.' : 'بعداً دوباره به کتابخانه سر بزنید.'}</p></div>
                  : view === 'grid' ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <ResourceCard key={item.id} resource={item} />)}</div>
                    : <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[640px] border-collapse text-sm"><caption className="sr-only">فهرست منابع آموزشی</caption><thead className="bg-muted"><tr><th scope="col" className="px-4 py-3 text-start">عنوان منبع</th><th scope="col" className="px-4 py-3 text-start">نوع</th><th scope="col" className="px-4 py-3 text-start">درس</th><th scope="col" className="px-4 py-3 text-start">استاد</th><th scope="col" className="px-4 py-3 text-start">وضعیت</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t border-border hover:bg-accent/40"><th scope="row" className="px-4 py-3 text-start font-medium"><a dir="auto" href={resourceHref(item.id)} className={`inline-block rounded-sm hover:underline ${focusClass}`}>{item.title}</a></th><td className="px-4 py-3">{typeNames[item.type]}</td><td dir="auto" className="px-4 py-3">{item.course || '—'}</td><td dir="auto" className="px-4 py-3">{item.teacher || item.professor || '—'}</td><td className="px-4 py-3"><ReviewBadge resource={item} /></td></tr>)}</tbody></table></div>}
              </>}
      </main>
    </section>
  )
}
