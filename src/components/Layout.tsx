import { Link, NavLink } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
  familyName?: string
  slug?: string
  isEditor?: boolean
  adminHref?: string
}

export function Layout({ children, familyName, slug, isEditor, adminHref = '/admin' }: LayoutProps) {
  return (
    <div className="min-h-svh flex flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold text-amber-900 tracking-tight">
              Roots Atlas
            </Link>
            {familyName && slug && (
              <nav className="flex items-center gap-3 text-sm">
                <NavLink
                  to={`/families/${slug}`}
                  className={({ isActive }) =>
                    isActive ? 'text-amber-800 font-medium' : 'text-stone-600 hover:text-stone-900'
                  }
                >
                  {familyName}
                </NavLink>
                <NavLink
                  to={`/families/${slug}/search`}
                  className={({ isActive }) =>
                    isActive ? 'text-amber-800 font-medium' : 'text-stone-600 hover:text-stone-900'
                  }
                >
                  Search
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
            <Link to="/login" className="text-stone-600 hover:text-stone-900">
              Sign in
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
