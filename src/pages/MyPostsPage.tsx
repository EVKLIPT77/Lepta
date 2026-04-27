import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface Post {
  id: number
  title: string
  excerpt: string | null
  status: 'draft' | 'published'
  published_at: string
  cover_image_url: string | null
  categories: { name: string } | null
}

function MyPostsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [authorId, setAuthorId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthor = profile?.role === 'author' || profile?.role === 'editor' || profile?.role === 'admin'

  useEffect(() => {
    if (!user || !isAuthor) {
      setLoading(false)
      return
    }

    async function load() {
      // Сначала находим автора по profile_id
      const { data: authorData, error: authorErr } = await supabase
        .from('authors')
        .select('id')
        .eq('profile_id', user!.id)
        .maybeSingle()

      if (authorErr) {
        setError(authorErr.message)
        setLoading(false)
        return
      }

      if (!authorData) {
        // Автора в таблице нет — заявка одобрена, но триггер не сработал (старый случай)
        setError('Профиль автора не найден. Обратитесь к редактору.')
        setLoading(false)
        return
      }

      setAuthorId(authorData.id)

      // Загружаем все его посты включая черновики
      const { data: postsData, error: postsErr } = await supabase
        .from('posts')
        .select('id, title, excerpt, status, published_at, cover_image_url, categories(name)')
        .eq('author_id', authorData.id)
        .order('published_at', { ascending: false })

      if (postsErr) {
        setError(postsErr.message)
      } else {
        setPosts((postsData as unknown as Post[]) || [])
      }
      setLoading(false)
    }
    load()
  }, [user, isAuthor])

  if (authLoading) return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  if (!user) return <Navigate to="/login" replace />
  if (!isAuthor) return <Navigate to="/profile" replace />

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/profile" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
          ← К профилю
        </Link>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-display text-4xl leading-tight" style={{ color: 'var(--color-deep)' }}>
            Мои публикации
          </h1>
          {authorId && (
            <Link
              to="/profile/posts/new"
              className="px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
            >
              + Новый пост
            </Link>
          )}
        </div>

        {loading && <p className="text-stone-500">Загрузка…</p>}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-lg p-10 text-center">
            <p className="text-stone-500 mb-4">У вас пока нет публикаций</p>
            <Link
              to="/profile/posts/new"
              className="inline-block px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
            >
              Написать первый пост
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {posts.map(post => (
            <Link
              key={post.id}
              to={`/profile/posts/${post.id}/edit`}
              className="block bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm hover:border-stone-300 transition-all"
            >
              <div className="flex items-center gap-3 text-xs text-stone-500 mb-2">
                <StatusBadge status={post.status} />
                {post.categories && (
                  <span className="uppercase tracking-wider">{post.categories.name}</span>
                )}
                <span>·</span>
                <span>{new Date(post.published_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <h2 className="font-display text-xl mb-1" style={{ color: 'var(--color-deep)' }}>
                {post.title || 'Без названия'}
              </h2>
              {post.excerpt && (
                <p className="text-sm text-stone-600 line-clamp-2">{post.excerpt}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  if (status === 'draft') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
        черновик
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
      опубликовано
    </span>
  )
}

export default MyPostsPage