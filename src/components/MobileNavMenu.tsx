import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { LanguageSwitcher } from './ui/LanguageSwitcher'
import { Sheet } from './ui/Sheet'
import { ThemeToggle } from './ui/ThemeToggle'

interface MobileNavMenuProps {
  familyName?: string
  slug?: string
  isEditor?: boolean
  adminHref?: string
}

function navItemClass(active: boolean): string {
  return `flex min-h-11 items-center rounded-lg px-3 text-sm transition ${
    active
      ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)]'
      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]'
  }`
}

export function MobileNavMenu({ familyName, slug, isEditor, adminHref = '/admin' }: MobileNavMenuProps) {
  const { t } = useTranslation('common')
  const { user, loading, signOut } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (!slug || !familyName) return null

  const treePath = `/families/${slug}`
  const peoplePath = `/families/${slug}/people`
  const healthPath = `/families/${slug}/health`

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] md:hidden"
        aria-label={t('nav.openMenu')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <Sheet open={open} title={familyName} onClose={close}>
        <nav className="space-y-1" aria-label={t('nav.main')}>
          <NavLink to={treePath} end className={navItemClass(location.pathname === treePath)} onClick={close}>
            {t('nav.tree')}
          </NavLink>
          <NavLink
            to={peoplePath}
            className={navItemClass(location.pathname === peoplePath)}
            onClick={close}
          >
            {t('nav.people')}
          </NavLink>
          <NavLink
            to={healthPath}
            className={navItemClass(location.pathname === healthPath)}
            onClick={close}
          >
            {t('nav.health')}
          </NavLink>
          {isEditor && (
            <Link
              to={adminHref}
              className={navItemClass(location.pathname === adminHref)}
              onClick={close}
            >
              {t('nav.manage')}
            </Link>
          )}
        </nav>

        <div className="mt-6 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          {loading ? (
            <span className="text-sm text-[var(--text-muted)]" aria-hidden />
          ) : user ? (
            <button
              type="button"
              onClick={() => {
                close()
                void signOut()
              }}
              className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
            >
              {t('auth.signOut')}
            </button>
          ) : (
            <Link
              to="/login"
              className="flex min-h-11 items-center rounded-lg px-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
              onClick={close}
            >
              {t('auth.signIn')}
            </Link>
          )}
        </div>
      </Sheet>
    </>
  )
}
