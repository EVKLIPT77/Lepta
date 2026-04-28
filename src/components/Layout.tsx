import { Link, useLocation } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, profile, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
  { to: '/feed', label: 'Лента' },
  { to: '/authors', label: 'Авторы' },
  { to: '/temples', label: 'Храмы' },
  { to: '/calendar', label: 'Календарь' },
  { to: '/lepta', label: 'Лѣпта' },
]

  function isActive(path: string): boolean {
  if (path === '/feed') return location.pathname === '/feed' || location.pathname === '/'
  return location.pathname.startsWith(path)
}

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-cream)' }}>
      <header
        className="border-b sticky top-0 z-10 backdrop-blur-sm"
        style={{
          backgroundColor: 'rgba(250, 247, 242, 0.95)',
          borderColor: 'rgba(139, 111, 71, 0.2)'
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link
            to="/"
            onClick={closeMenu}
            className="font-display text-2xl sm:text-3xl tracking-wide transition-colors"
            style={{ color: 'var(--color-deep)' }}
          >
            Эммаусъ
          </Link>

          {/* Десктопная навигация */}
          <nav className="hidden md:flex gap-5 items-center">
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

            {!loading && (
              user ? (
                <>
                  {(profile?.role === 'editor' || profile?.role === 'admin') && (
                    <>
                      <Link
                        to="/admin/applications"
                        className="text-sm transition-colors"
                        style={{
                          color: isActive('/admin/applications') ? 'var(--color-accent-dark)' : '#78716c',
                          fontWeight: isActive('/admin/applications') ? 500 : 400,
                          borderBottom: isActive('/admin/applications') ? '2px solid var(--color-accent)' : '2px solid transparent',
                          paddingBottom: '2px'
                        }}
                      >
                        Заявки авторов
                      </Link>
                      <Link
                        to="/admin/temple-applications"
                        className="text-sm transition-colors"
                        style={{
                          color: isActive('/admin/temple-applications') ? 'var(--color-accent-dark)' : '#78716c',
                          fontWeight: isActive('/admin/temple-applications') ? 500 : 400,
                          borderBottom: isActive('/admin/temple-applications') ? '2px solid var(--color-accent)' : '2px solid transparent',
                          paddingBottom: '2px'
                        }}
                      >
                        Заявки храмов
                      </Link>
                    </>
                  )}
                  <Link
                    to="/profile"
                    className="text-sm transition-colors ml-2"
                    style={{
                      color: isActive('/profile') ? 'var(--color-accent-dark)' : '#78716c',
                      fontWeight: isActive('/profile') ? 500 : 400,
                      borderBottom: isActive('/profile') ? '2px solid var(--color-accent)' : '2px solid transparent',
                      paddingBottom: '2px'
                    }}
                  >
                    {profile?.username ?? 'ЛК'}
                  </Link>
                </>
              ) : (
                <Link
                  to="/login"
                  className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 ml-2"
                  style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
                >
                  Войти
                </Link>
              )
            )}
          </nav>

          {/* Мобильная кнопка-гамбургер */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 -mr-2 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Меню"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-deep)' }}>
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Мобильное выпадающее меню */}
        {menuOpen && (
          <nav
            className="md:hidden border-t flex flex-col"
            style={{
              borderColor: 'rgba(139, 111, 71, 0.2)',
              backgroundColor: 'rgba(250, 247, 242, 0.98)'
            }}
          >
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeMenu}
                className="px-6 py-3 border-b text-base transition-colors"
                style={{
                  color: isActive(item.to) ? 'var(--color-accent-dark)' : 'var(--color-deep)',
                  fontWeight: isActive(item.to) ? 600 : 400,
                  borderColor: 'rgba(139, 111, 71, 0.15)',
                  backgroundColor: isActive(item.to) ? 'rgba(139, 111, 71, 0.08)' : 'transparent'
                }}
              >
                {item.label}
              </Link>
            ))}

            {!loading && user && (profile?.role === 'editor' || profile?.role === 'admin') && (
              <>
                <Link
                  to="/admin/applications"
                  onClick={closeMenu}
                  className="px-6 py-3 border-b text-base transition-colors"
                  style={{
                    color: isActive('/admin/applications') ? 'var(--color-accent-dark)' : 'var(--color-deep)',
                    fontWeight: isActive('/admin/applications') ? 600 : 400,
                    borderColor: 'rgba(139, 111, 71, 0.15)',
                    backgroundColor: isActive('/admin/applications') ? 'rgba(139, 111, 71, 0.08)' : 'transparent'
                  }}
                >
                  Заявки авторов
                </Link>
                <Link
                  to="/admin/temple-applications"
                  onClick={closeMenu}
                  className="px-6 py-3 border-b text-base transition-colors"
                  style={{
                    color: isActive('/admin/temple-applications') ? 'var(--color-accent-dark)' : 'var(--color-deep)',
                    fontWeight: isActive('/admin/temple-applications') ? 600 : 400,
                    borderColor: 'rgba(139, 111, 71, 0.15)',
                    backgroundColor: isActive('/admin/temple-applications') ? 'rgba(139, 111, 71, 0.08)' : 'transparent'
                  }}
                >
                  Заявки храмов
                </Link>
              </>
            )}

            {!loading && (
              user ? (
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="px-6 py-3 text-base transition-colors flex items-center justify-between"
                  style={{
                    color: isActive('/profile') ? 'var(--color-accent-dark)' : 'var(--color-deep)',
                    fontWeight: isActive('/profile') ? 600 : 400,
                    backgroundColor: isActive('/profile') ? 'rgba(139, 111, 71, 0.08)' : 'transparent'
                  }}
                >
                  <span>{profile?.display_name || profile?.username}</span>
                  <span className="text-xs text-stone-500">@{profile?.username}</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="px-6 py-3 text-base font-medium text-center transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
                >
                  Войти
                </Link>
              )
            )}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

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
              <span className="font-display text-lg" style={{ color: 'var(--color-deep)' }}>Эммаусъ</span>
              <span className="mx-2">·</span>
              <span>беседа на пути</span>
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