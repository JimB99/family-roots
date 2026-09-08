import { useTranslation } from 'react-i18next'
import { useTheme } from '../../theme/useTheme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useTranslation('common')
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10 1.6v2M10 16.4v2M1.6 10h2M16.4 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M15.9 4.1l-1.4 1.4M5.5 14.5l-1.4 1.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M17 12.3A7.4 7.4 0 017.7 3a7.5 7.5 0 109.3 9.3z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
