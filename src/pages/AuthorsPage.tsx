import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface Author {
  id: number
  name: string | null
  slug: string | null
  bio: string | null
  photo_url: string | null
}

interface AuthorWithStats extends Author {
  postCount: number
  subscriberCount: number
}

const TOP_LIMIT = 20

function AuthorsPage() {
  const [allAuthors, setAllAuthors] = useState<AuthorWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadAuthors() {
      // Загружаем авторов + посты + подписчики одним запросом
      const { data, error } = await supabase
        .from('authors')
        .select('*, posts(count), subscriptions(count)')

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const enriched = (data || []).map(a => ({
        ...a,
        postCount: (a.posts as { count: number }[] | null)?.[0]?.count ?? 0,
        subscriberCount: (a.subscriptions as { count: number }[] | null)?.[0]?.count ?? 0
      })) as AuthorWithStats[]

      // Сортируем по убыванию числа подписчиков, потом по алфавиту
      enriched.sort((a, b) => {
        if (b.subscriberCount !== a.subscriberCount) {
          return b.subscriberCount - a.subscriberCount
        }
        return (a.name || '').localeCompare(b.name || '', 'ru')
      })

      setAllAuthors(enriched)
      setLoading(false)
    }
    loadAuthors()
  }, [])

  // Фильтрация поиском
  const query = searchQuery.trim().toLowerCase()
  const filtered = query
    ? allAuthors.filter(a =>
        (a.name || '').toLowerCase().includes(query) ||
        (a.slug || '').toLowerCase().includes(query) ||
        (a.bio?.toLowerCase().includes(query) ?? false)
      )
    : allAuthors

  // Если идёт поиск — показываем все совпадения
  // Если поиска нет — показываем топ-20 либо всех
  const visible = query
    ? filtered
    : showAll
      ? filtered
      : filtered.slice(0, TOP_LIMIT)

  const hasMore = !query && !showAll && allAuthors.length > TOP_LIMIT

  return (
    <Layout>
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-10 md:py-14 text-center">
          <h1 className="font-display text-4xl sm:text-5xl mb-3 leading-tight" style={{ color: 'var(--color-deep)' }}>
            Авторы
          </h1>
          <p className="text-stone-600">
            Православные пастыри, богословы и публицисты
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Поиск */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или описанию"
              className="w-full px-4 py-3 pl-11 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
            />
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xl leading-none"
              >
                ×
              </button>
            )}
          </div>
          {query && (
            <p className="text-sm text-stone-500 mt-2">
              Найдено: {filtered.length}
            </p>
          )}
        </div>

        {loading && <p className="text-stone-500">Загрузка…</p>}
        {error && <p className="text-red-600">Ошибка: {error}</p>}

        {!loading && !query && allAuthors.length > TOP_LIMIT && !showAll && (
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-4">
            Самые популярные
          </p>
        )}

        {!loading && filtered.length === 0 && query && (
          <p className="text-stone-500 text-center py-12">
            По запросу «{searchQuery}» никого не найдено
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {visible.map(author => (
            <Link
              key={author.id}
              to={`/author/${author.slug}`}
              className="bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm hover:border-stone-300 transition-all flex gap-4"
            >
              {author.photo_url ? (
                <img
                  src={author.photo_url}
                  alt={author.name || ''}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-2xl font-display flex-shrink-0">
                  {author.name?.[0] || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg mb-1" style={{ color: 'var(--color-deep)' }}>
                  {author.name}
                </div>
                {author.bio && (
                  <div className="text-sm text-stone-600 line-clamp-2 mb-2">
                    {author.bio}
                  </div>
                )}
                <div className="text-xs text-stone-500 flex gap-3">
                  <span>
                    {author.postCount} {pluralize(author.postCount, ['публикация', 'публикации', 'публикаций'])}
                  </span>
                  {author.subscriberCount > 0 && (
                    <span>
                      {author.subscriberCount} {pluralize(author.subscriberCount, ['подписчик', 'подписчика', 'подписчиков'])}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {hasMore && (
          <div className="text-center mt-6">
            <button
              onClick={() => setShowAll(true)}
              className="px-6 py-2.5 rounded-lg text-sm border border-stone-300 hover:bg-stone-100 transition-colors"
            >
              Показать всех ({allAuthors.length})
            </button>
          </div>
        )}
      </div>
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

export default AuthorsPage