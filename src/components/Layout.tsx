import { Link, useLocation } from 'react-router-dom'
import { type ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { to: '/', label: 'Лента' },
    { to: '/authors', label: 'Авторы' },
    { to: '/calendar', label: 'Календарь' },
  ]

  function isActive(path: string): boolean {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-cream)' }}>
      {/* Навигация */}
      <header
        className="border-b sticky top-0 z-10 backdrop-blur-sm"
        style={{
          backgroundColor: 'rgba(250, 247, 242, 0.85)',
          borderColor: 'rgba(139, 111, 71, 0.2)'
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-3xl tracking-wide transition-colors"
            style={{ color: 'var(--color-deep)' }}
          >
            Лѣпта
          </Link>
          <nav className="flex gap-6">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm transition-colors"
                style={{
                  color: isActive(item.to) ? 'var(--color-accent-dark)' : '#78716c',
                  fontWeight: isActive(item.to) ? 500 : 400,
                  borderBottom: isActive(item.to) ? '2px solid var(--color-accent)' : '2px solid transparent',
                  paddingBottom: '2px'
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Контент */}
      <main className="flex-1">{children}</main>

      {/* Футер */}
      <footer
        className="border-t mt-16"
        style={{
          backgroundColor: 'white',
          borderColor: 'rgba(139, 111, 71, 0.2)'
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-8 text-sm text-stone-500">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <span className="font-display text-lg" style={{ color: 'var(--color-deep)' }}>Лѣпта</span>
              <span className="mx-2">·</span>
              <span>православная лента</span>
            </div>
            <div className="text-xs">
              © {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout