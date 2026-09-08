import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { LanguageSwitcher } from './ui/LanguageSwitcher'
import { ThemeToggle } from './ui/ThemeToggle'
import { TreeMark } from './ui/TreeMark'

interface LayoutProps {
  children: React.ReactNode
  familyName?: string
  slug?: string
  isEditor?: boolean
  adminHref?: string
}

function truncateEmail(email: string, max = 24): string {
  if (email.length <= max) return email
  return `${email.slice(0, max - 1)}…`
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-2.5 py-1.5 text-sm transition ${
    isActive
      ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)]'
      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]'
  }`

export function Layout({ children, familyName, slug, isEditor, adminHref = '/admin' }: LayoutProps) {
  const { user, loading, signOut } = useAuth()
  const { t } = useTranslation('common')

  return (
    <div className="flex min-h-svh flex-col bg-[var(--surface-page)] text-[var(--text-primary)]">
      <a
        href="#main-content"
        className="sr-only z-50 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-lg focus:border focus:border-[var(--border-strong)] focus:bg-[var(--surface-raised)] focus:px-3 focus:py-2"
      >
        {t('skipToContent')}
      </a>
      <header className="sticky top-0 z-20 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-[var(--text-primary)]"
            >
              <TreeMark className="h-7 w-7 text-[var(--accent)]" />
              <span className="hidden sm:inline">{t('appName')}</span>
            </Link>
            {familyName && slug && (
              <>
                <span aria-hidden="true" className="text-[var(--border-strong)]">
                  /
                </span>
                <nav className="flex min-w-0 items-center gap-1">
                  <span className="hidden max-w-[16ch] truncate font-medium text-[var(--text-primary)] md:inline">
                    {familyName}
                  </span>
                  <NavLink to={`/families/${slug}`} end className={navLinkClass}>
                    {t('nav.tree')}
                  </NavLink>
                  <NavLink to={`/families/${slug}/people`} className={navLinkClass}>
                    {t('nav.people')}
                  </NavLink>
                  <NavLink to={`/families/${slug}/health`} className={navLinkClass}>
                    {t('nav.health')}
                  </NavLink>
                </nav>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-sm">
            {isEditor && (
              <Link to={adminHref} className={navLinkClass({ isActive: false })}>
                {t('nav.manage')}
              </Link>
            )}
            <LanguageSwitcher />
            <ThemeToggle />
            {loading ? (
              <span className="w-16" aria-hidden />
            ) : user ? (
              <>
                <span
                  className="hidden text-[var(--text-muted)] sm:inline"
                  title={user.email ?? undefined}
                >
                  {user.email ? truncateEmail(user.email) : t('auth.signedIn')}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-lg px-2.5 py-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
                >
                  {t('auth.signOut')}
                </button>
              </>
            ) : (
              <Link to="/login" className={navLinkClass({ isActive: false })}>
                {t('auth.signIn')}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main-content" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  )
}
