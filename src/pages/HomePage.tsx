import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface PostPreview {
  id: number
  title: string | null
  excerpt: string | null
  cover_image_url: string | null
  authors: { name: string | null; slug: string | null } | null
  categories: { name: string | null } | null
}

interface AuthorPreview {
  id: number
  name: string | null
  slug: string | null
  photo_url: string | null
  bio: string | null
}

function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const [recentPosts, setRecentPosts] = useState<PostPreview[]>([])
  const [topAuthors, setTopAuthors] = useState<AuthorPreview[]>([])
  const [stats, setStats] = useState<{ posts: number; authors: number }>({ posts: 0, authors: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Последние 3 опубликованных поста
      const { data: posts } = await supabase
        .from('posts')
        .select('id, title, excerpt, cover_image_url, authors(name, slug), categories(name)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3)

      // Топ-3 автора по подписчикам
      const { data: authors } = await supabase
        .from('authors')
        .select('id, name, slug, photo_url, bio, subscriptions(count)')

      const topThree = (authors || [])
        .map(a => ({ ...a, subCount: (a.subscriptions as { count: number }[] | null)?.[0]?.count ?? 0 }))
        .sort((a, b) => b.subCount - a.subCount)
        .slice(0, 3)

      // Общая статистика
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')

      const { count: authorCount } = await supabase
        .from('authors')
        .select('*', { count: 'exact', head: true })

      setRecentPosts((posts as unknown as PostPreview[]) || [])
      setTopAuthors(topThree)
      setStats({ posts: postCount ?? 0, authors: authorCount ?? 0 })
      setLoading(false)
    }
    load()
  }, [])

  // Залогиненных сразу отправляем в ленту
  if (!authLoading && user) {
    return <Navigate to="/feed" replace />
  }

  return (
    <Layout>
      {/* HERO */}
      {/* HERO с фоновой иллюстрацией */}
      <section className="relative border-b border-stone-200 overflow-hidden">
        {/* Фоновая иллюстрация — разные изображения для мобилки и десктопа */}
        <picture>
          <source media="(min-width: 768px)" srcSet="/hero-emmaus-wide.webp" />
          <img
            src="/hero-emmaus.webp"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          />
        </picture>

        {/* Кремовый оверлей для читаемости текста (плотнее снизу) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(250, 247, 242, 0.5) 0%, rgba(250, 247, 242, 0.92) 100%)'
          }}
        />

        {/* Контент */}
        <div className="relative max-w-3xl mx-auto px-6 py-20 sm:py-28 md:py-36 text-center">
          <p className="text-lg sm:text-xl md:text-2xl text-stone-800 italic max-w-2xl mx-auto mb-3 leading-relaxed">
            «Не горело ли в нас сердце наше, когда Он говорил нам на пути?»
          </p>
          <p className="text-sm text-stone-600 mb-10">Лк 24:32</p>

          <p className="text-base sm:text-lg text-stone-800 max-w-xl mx-auto mb-8 leading-relaxed">
            Место беседы на пути для православной молодёжи. Слово пастырей, размышления авторов, общение и совместное движение к свету.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/feed"
              className="px-6 py-3 rounded-lg font-medium text-base transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
            >
              Читать ленту
            </Link>
            <Link
              to="/signup"
              className="px-6 py-3 rounded-lg font-medium text-base border transition-colors hover:bg-stone-100/80 backdrop-blur-sm"
              style={{ borderColor: 'rgba(139, 111, 71, 0.4)', color: 'var(--color-accent-dark)', backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
            >
              Присоединиться
            </Link>
          </div>
        </div>
      </section>

      {/* О ПЛАТФОРМЕ */}
      <section className="border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
          <h2 className="font-display text-3xl sm:text-4xl mb-8 text-center" style={{ color: 'var(--color-deep)' }}>
            Что вы найдёте здесь
          </h2>

          <div className="grid sm:grid-cols-3 gap-5">
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <h3 className="font-display text-xl mb-2" style={{ color: 'var(--color-deep)' }}>
                Лента
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed">
                Материалы от пастырей и мирян о вере, духовной жизни, событиях Церкви и современности.
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <h3 className="font-display text-xl mb-2" style={{ color: 'var(--color-deep)' }}>
                Авторы
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed">
                Священники, богословы, публицисты. Подписывайтесь и читайте тех, кто говорит важное.
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <h3 className="font-display text-xl mb-2" style={{ color: 'var(--color-deep)' }}>
                Календарь
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed">
                Память святых, праздники, посты — на каждый день, по календарю Русской Православной Церкви.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ПОСЛЕДНИЕ ПОСТЫ */}
      {!loading && recentPosts.length > 0 && (
        <section className="border-b border-stone-200" style={{ backgroundColor: 'white' }}>
          <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h2 className="font-display text-2xl sm:text-3xl" style={{ color: 'var(--color-deep)' }}>
                Свежие материалы
              </h2>
              <Link to="/feed" className="text-sm hover:underline" style={{ color: 'var(--color-accent-dark)' }}>
                Вся лента →
              </Link>
            </div>

            <div className="space-y-4">
              {recentPosts.map(post => (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="block bg-stone-50 border border-stone-200 rounded-lg p-5 hover:shadow-sm hover:border-stone-300 transition-all"
                >
                  <div className="flex items-center gap-3 text-xs text-stone-500 mb-2">
                    {post.categories && (
                      <>
                        <span className="uppercase tracking-wider">{post.categories.name}</span>
                        <span>·</span>
                      </>
                    )}
                    {post.authors && <span>{post.authors.name}</span>}
                  </div>
                  <h3 className="font-display text-xl mb-2" style={{ color: 'var(--color-deep)' }}>
                    {post.title || 'Без названия'}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-stone-700 line-clamp-2">{post.excerpt}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ТОП АВТОРЫ */}
      {!loading && topAuthors.length > 0 && (
        <section className="border-b border-stone-200">
          <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h2 className="font-display text-2xl sm:text-3xl" style={{ color: 'var(--color-deep)' }}>
                Авторы
              </h2>
              <Link to="/authors" className="text-sm hover:underline" style={{ color: 'var(--color-accent-dark)' }}>
                Все авторы →
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {topAuthors.map(author => (
                <Link
                  key={author.id}
                  to={`/author/${author.slug}`}
                  className="bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm hover:border-stone-300 transition-all text-center"
                >
                  {author.photo_url ? (
                    <img
                      src={author.photo_url}
                      alt={author.name || ''}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-2xl font-display mx-auto mb-3">
                      {author.name?.[0] || '?'}
                    </div>
                  )}
                  <div className="font-display text-base mb-1" style={{ color: 'var(--color-deep)' }}>
                    {author.name}
                  </div>
                  {author.bio && (
                    <p className="text-xs text-stone-600 line-clamp-2">{author.bio}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA — присоединиться */}
      <section style={{ backgroundColor: 'var(--color-deep)' }}>
        <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16 text-center text-white">
          <h2 className="font-display text-3xl sm:text-4xl mb-4 leading-tight">
            Идите дорогой в Эммаус
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 opacity-90 leading-relaxed">
            Подписывайтесь на авторов, сохраняйте материалы, обсуждайте важное. А если есть что сказать самим — становитесь автором.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/signup"
              className="px-6 py-3 rounded-lg font-medium text-base bg-white transition-opacity hover:opacity-90"
              style={{ color: 'var(--color-deep)' }}
            >
              Зарегистрироваться
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-lg font-medium text-base border border-white/30 hover:bg-white/10 transition-colors text-white"
            >
              Войти
            </Link>
          </div>

          {(stats.posts > 0 || stats.authors > 0) && (
            <div className="mt-10 pt-8 border-t border-white/20 text-sm opacity-75 flex justify-center gap-6 flex-wrap">
              {stats.authors > 0 && (
                <span>{stats.authors} {pluralize(stats.authors, ['автор', 'автора', 'авторов'])}</span>
              )}
              {stats.posts > 0 && (
                <span>{stats.posts} {pluralize(stats.posts, ['публикация', 'публикации', 'публикаций'])}</span>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  )
}

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

export default HomePage