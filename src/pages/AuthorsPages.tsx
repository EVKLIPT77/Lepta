import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface Author {
  id: number
  name: string
  slug: string
  bio: string | null
  photo_url: string | null
}

interface AuthorWithCount extends Author {
  postCount: number
}

function AuthorsPage() {
  const [authors, setAuthors] = useState<AuthorWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAuthors() {
      // Загружаем авторов с количеством их постов
      const { data, error } = await supabase
        .from('authors')
        .select('*, posts(count)')
        .order('name', { ascending: true })

      if (error) {
        setError(error.message)
      } else {
        // Преобразуем вложенный count в число
        const withCounts = (data || []).map((a: any) => ({
          ...a,
          postCount: a.posts?.[0]?.count ?? 0
        }))
        setAuthors(withCounts)
      }
      setLoading(false)
    }
    loadAuthors()
  }, [])

  return (
    <Layout>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl mb-2" style={{ color: 'var(--color-deep)' }}>Авторы</h1>
        <p className="text-stone-600 mb-8">
          Православные пастыри, богословы и публицисты
        </p>

        {loading && <p className="text-stone-500">Загрузка...</p>}
        {error && <p className="text-red-600">Ошибка: {error}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          {authors.map(author => (
            <Link
              key={author.id}
              to={`/author/${author.slug}`}
              className="bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm hover:border-stone-300 transition-all flex gap-4"
            >
              {author.photo_url ? (
                <img
                  src={author.photo_url}
                  alt={author.name}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-2xl font-display flex-shrink-0">
                  {author.name[0]}
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
                <div className="text-xs text-stone-500">
                  {author.postCount} {pluralize(author.postCount, ['публикация', 'публикации', 'публикаций'])}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!loading && authors.length === 0 && (
          <p className="text-stone-500 text-center py-10">Пока нет авторов</p>
        )}
      </main>
    </Layout>
  )
}

// Правильное склонение для русского: 1 публикация, 2 публикации, 5 публикаций
function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

export default AuthorsPage