import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

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

export function Layout({ children, familyName, slug, isEditor, adminHref = '/admin' }: LayoutProps) {
  const { user, loading, signOut } = useAuth()

  return (
    <div className="min-h-svh flex flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur sticky top-0 z-20 shrink-0">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold text-amber-900 tracking-tight">
              Roots Atlas
            </Link>
            {familyName && slug && (
              <nav className="flex items-center gap-3 text-sm">
                <span className="text-stone-800 font-medium hidden sm:inline">{familyName}</span>
                <NavLink
                  to={`/families/${slug}`}
                  end
                  className={({ isActive }) =>
                    isActive ? 'text-amber-800 font-medium' : 'text-stone-600 hover:text-stone-900'
                  }
                >
                  Tree
                </NavLink>
                <NavLink
                  to={`/families/${slug}/people`}
                  className={({ isActive }) =>
                    isActive ? 'text-amber-800 font-medium' : 'text-stone-600 hover:text-stone-900'
                  }
                >
                  People
                </NavLink>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {isEditor && (
              <Link to={adminHref} className="text-amber-800 hover:underline">
                Manage
              </Link>
            )}
            {loading ? (
              <span className="text-stone-400 w-16" aria-hidden />
            ) : user ? (
              <>
                <span className="text-stone-500 hidden sm:inline" title={user.email ?? undefined}>
                  {user.email ? truncateEmail(user.email) : 'Signed in'}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="text-stone-600 hover:text-stone-900"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" className="text-stone-600 hover:text-stone-900">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </div>
  )
}
