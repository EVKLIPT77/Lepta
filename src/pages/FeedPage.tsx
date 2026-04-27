import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

interface Category {
  id: number
  name: string | null
  slug: string | null
  sort_order: number | null
}

interface Author {
  id: number
  name: string | null
  slug: string | null
  photo_url: string | null
}

interface Post {
  id: number
  title: string | null
  body: string | null
  excerpt: string | null
  published_at: string | null
  categories: Category | null
  authors: Author | null
}

type Tab = 'all' | 'subscriptions'

function FeedPage() {
  const { user, loading: authLoading } = useAuth()

  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string>('all')
  const [tab, setTab] = useState<Tab>('all')
  const [subscribedAuthorIds, setSubscribedAuthorIds] = useState<number[] | null>(null)

  // Категории грузим один раз
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
      setCategories(data || [])
    }
    loadCategories()
  }, [])

  // Загрузка постов: меняется при смене вкладки и при логине/выходе
  useEffect(() => {
    // Ждём пока разрешится авторизация — иначе при F5 успеем загрузить «Все»
    // ещё до появления user, и при переключении на «Мои подписки» придётся
    // догружать дважды
    if (authLoading) return

    async function loadPosts() {
      setLoading(true)
      setError(null)

      // Вкладка «Мои подписки» — для незалогиненных просто чистим список
      if (tab === 'subscriptions' && !user) {
        setPosts([])
        setLoading(false)
        return
      }

      // Если вкладка «Мои подписки» — сначала достаём ID авторов
      let authorIds: number[] | null = null
      if (tab === 'subscriptions' && user) {
        const { data: subs, error: subsErr } = await supabase
          .from('subscriptions')
          .select('author_id')
          .eq('subscriber_id', user.id)

        if (subsErr) {
          setError(subsErr.message)
          setLoading(false)
          return
        }

        authorIds = (subs || []).map(s => s.author_id)
        setSubscribedAuthorIds(authorIds)

        // Если подписок нет — показываем пустое состояние без запроса постов
        if (authorIds.length === 0) {
          setPosts([])
          setLoading(false)
          return
        }
      }

      // Грузим посты — общий запрос, при необходимости сужаем по author_id
      let query = supabase
        .from('posts')
        .select('*, categories(*), authors(*)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (authorIds) {
        query = query.in('author_id', authorIds)
      }

      const { data, error: postsErr } = await query

      if (postsErr) {
        setError(postsErr.message)
      } else {
        setPosts(data || [])
      }
      setLoading(false)
    }

    loadPosts()
  }, [tab, user, authLoading])

  const filteredPosts = selectedSlug === 'all'
    ? posts
    : posts.filter(p => p.categories?.slug === selectedSlug)

  function getPreview(post: Post): string {
    if (post.excerpt) return post.excerpt
    if (!post.body) return ''
    return post.body.length > 150 ? post.body.slice(0, 150).trim() + '…' : post.body
  }

  return (
    <Layout>
      {/* Hero-блок */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-10 md:py-16 text-center">
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-wide mb-4 leading-tight" style={{ color: 'var(--color-deep)' }}>
            Эммаусъ
          </h1>
          <p className="text-lg text-stone-700 max-w-xl mx-auto mb-2 italic">
            «Не горело ли в нас сердце наше, когда Он говорил нам на пути?»
          </p>
          <p className="text-sm text-stone-500 max-w-xl mx-auto">
            Лк 24:32
          </p>
        </div>
      </section>

      {/* Вкладки: Все / Мои подписки */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 flex gap-1">
          <TabButton
            active={tab === 'all'}
            onClick={() => setTab('all')}
            label="Все"
          />
          <TabButton
            active={tab === 'subscriptions'}
            onClick={() => setTab('subscriptions')}
            label="Мои подписки"
          />
        </div>
      </div>

      {/* Фильтр по категориям */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedSlug('all')}
            className="px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
            style={{
              backgroundColor: selectedSlug === 'all' ? 'var(--color-deep)' : 'rgba(139, 111, 71, 0.1)',
              color: selectedSlug === 'all' ? 'white' : 'var(--color-accent-dark)'
            }}
          >
            Все
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => cat.slug && setSelectedSlug(cat.slug)}
              className="px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
              style={{
                backgroundColor: selectedSlug === cat.slug ? 'var(--color-deep)' : 'rgba(139, 111, 71, 0.1)',
                color: selectedSlug === cat.slug ? 'white' : 'var(--color-accent-dark)'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {loading && <p className="text-stone-500">Загрузка...</p>}
        {error && <p className="text-red-600">Ошибка: {error}</p>}

        {/* Гость на вкладке «Мои подписки» */}
        {!loading && tab === 'subscriptions' && !user && (
          <EmptyState
            title="Войдите, чтобы видеть свои подписки"
            description="Подписывайтесь на авторов, чтобы здесь собирались материалы только от них."
            actionLabel="Войти"
            actionTo="/login"
          />
        )}

        {/* Залогинен, но нет подписок */}
        {!loading && tab === 'subscriptions' && user && subscribedAuthorIds?.length === 0 && (
          <EmptyState
            title="Вы пока ни на кого не подписаны"
            description="Откройте список авторов и выберите тех, чьи материалы хотите читать."
            actionLabel="К авторам"
            actionTo="/authors"
          />
        )}

        {/* Подписки есть, но в выбранной категории пусто */}
        {!loading && filteredPosts.length === 0 && tab === 'subscriptions' && user && subscribedAuthorIds && subscribedAuthorIds.length > 0 && (
          <p className="text-stone-500 text-center py-10">
            В этой категории нет публикаций от авторов, на которых вы подписаны
          </p>
        )}

        {/* Вкладка «Все» — пусто в категории */}
        {!loading && filteredPosts.length === 0 && tab === 'all' && (
          <p className="text-stone-500 text-center py-10">
            В этой категории пока нет постов
          </p>
        )}

        <div className="space-y-6">
          {filteredPosts.map(post => (
            <article
              key={post.id}
              className="bg-white border border-stone-200 rounded-lg p-6 hover:shadow-md hover:border-stone-300 transition-all"
            >
              <div className="flex items-center gap-3 text-xs text-stone-500 mb-3">
                {post.categories && (
                  <>
                    <button
                      onClick={() => post.categories?.slug && setSelectedSlug(post.categories.slug)}
                      className="uppercase tracking-wider hover:text-stone-900"
                    >
                      {post.categories.name}
                    </button>
                    <span>·</span>
                  </>
                )}
                {post.authors && (
                  <Link
                    to={`/author/${post.authors.slug}`}
                    className="hover:text-stone-900"
                  >
                    {post.authors.name}
                  </Link>
                )}
              </div>
              <Link to={`/post/${post.id}`} className="block">
                <h2 className="font-display text-2xl mb-3 transition-colors" style={{ color: 'var(--color-deep)' }}>
                  {post.title || 'Без названия'}
                </h2>
                <p className="text-stone-700 leading-relaxed">
                  {getPreview(post)}
                </p>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 text-sm transition-colors relative"
      style={{
        color: active ? 'var(--color-accent-dark)' : '#78716c',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
      {active && (
        <span
          className="absolute left-0 right-0 bottom-0 h-0.5"
          style={{ backgroundColor: 'var(--color-accent)' }}
        />
      )}
    </button>
  )
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionTo
}: {
  title: string
  description: string
  actionLabel: string
  actionTo: string
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-10 text-center">
      <h2 className="font-display text-xl mb-2" style={{ color: 'var(--color-deep)' }}>
        {title}
      </h2>
      <p className="text-sm text-stone-600 mb-6 max-w-md mx-auto">
        {description}
      </p>
      <Link
        to={actionTo}
        className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
      >
        {actionLabel}
      </Link>
    </div>
  )
}

export default FeedPage
