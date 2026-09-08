import { resolveSupportedLocale, type AppLocale } from '../../i18n/locales'
import { formatKinshipLabel as formatDe } from './kinship-labels-de-AT'
import { formatKinshipLabel as formatEn } from './kinship-labels-en'
import { formatKinshipLabel as formatEs } from './kinship-labels-es-ES'
import type { Gender } from '../../types'
import type { KinshipDescriptor } from './types'
import type { KinshipLabelPerspective } from './kinship-labels-en'

export type { KinshipLabelPerspective } from './kinship-labels-en'
export { formatKinshipPairSummary } from './kinship-labels-en'

export function getKinshipLocale(locale: string | undefined): AppLocale {
  return resolveSupportedLocale(locale)
}

export function formatKinshipLabel(
  descriptor: KinshipDescriptor,
  targetGender: Gender,
  locale?: string,
  perspective: KinshipLabelPerspective = 'fromTo',
): string {
  const resolved = getKinshipLocale(locale)
  switch (resolved) {
    case 'es-ES':
      return formatEs(descriptor, targetGender, perspective)
    case 'de-AT':
      return formatDe(descriptor, targetGender, perspective)
    default:
      return formatEn(descriptor, targetGender, perspective)
  }
}
