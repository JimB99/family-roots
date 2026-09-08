import { useTranslation } from 'react-i18next'
import { LOCALE_OPTIONS, LOCALE_STORAGE_KEY, type AppLocale } from '../../i18n/locales'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common')

  const current = i18n.resolvedLanguage ?? i18n.language

  const change = (locale: AppLocale) => {
    void i18n.changeLanguage(locale)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="language-select">{t('language.label')}</label>
      <select
        id="language-select"
        value={current}
        onChange={(e) => change(e.target.value as AppLocale)}
        className="rounded-lg border border-transparent bg-transparent py-1.5 pl-1 pr-6 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        aria-label={t('language.label')}
      >
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.locale} value={option.locale}>
            {option.flag} {option.nativeName}
          </option>
        ))}
      </select>
    </div>
  )
}
