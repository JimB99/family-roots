import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function DocumentLocale() {
  const { i18n, t } = useTranslation('app')

  useEffect(() => {
    const lng = i18n.resolvedLanguage ?? i18n.language
    document.documentElement.lang = lng
    document.title = t('title')
  }, [i18n.language, i18n.resolvedLanguage, t])

  return null
}
