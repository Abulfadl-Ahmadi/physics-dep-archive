import { translations, type Language } from '@/i18n'

export function localized(value: string | null | undefined, language: Language): string {
  if (!value || language === 'en') return value || ''
  return translations.fa.courses[value as keyof typeof translations.fa.courses]
    || translations.fa.professors[value as keyof typeof translations.fa.professors]
    || translations.fa.semesters[value as keyof typeof translations.fa.semesters]
    || translations.fa.examTypes[value as keyof typeof translations.fa.examTypes]
    || value
}
