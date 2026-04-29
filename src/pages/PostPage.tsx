import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import SubscribeButton from '../components/SubscribeButton'

interface Category {
  id: number
  name: string | null
  slug: string | null
}

interface Author {
  id: number
  name: string | null
  slug: string | null
  bio: string | null
  photo_url: string | null
  profiles: { bio: string | null } | null
}

interface Post {
  id: number
  title: string | null
  body: string | null
  published_at: string | null
  cover_image_url: string | null
  categories: Category | null
  authors: Author | null
}

function PostPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPost() {
      if (!id) return
      const { data, error } = await supabase
        .from('posts')
        .select('*, categories(*), authors(*, profiles!profile_id(bio))')
        .eq('id', Number(id))
        .eq('status', 'published')
        .single()

      if (error) setError(error.message)
      else setPost(data as unknown as Post)
      setLoading(false)
    }
    if (id) loadPost()
  }, [id])

  if (loading) {
    return <div className="min-h-screen bg-stone-50 p-10 text-stone-500">Загрузка...</div>
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-stone-50 p-10">
        <p className="text-red-600 mb-4">Ошибка: {error || 'пост не найден'}</p>
        <Link to="/feed" className="text-stone-700 underline">Вернуться к ленте</Link>
      </div>
    )
  }

  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : ''

 return (
    <Layout>
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <Link to="/feed" className="text-sm text-stone-600 hover:text-stone-900">
            ← К ленте
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 text-xs text-stone-500 mb-4">
          {post.categories && (
            <>
              <span className="uppercase tracking-wider">{post.categories.name}</span>
              <span>·</span>
            </>
          )}
          <span>{dateStr}</span>
        </div>

        <h1 className="font-display text-4xl md:text-5xl mb-8 leading-tight" style={{ color: 'var(--color-deep)' }}>
          {post.title || 'Без названия'}
        </h1>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt=""
            className="w-full rounded-lg object-cover mb-8"
            style={{ maxHeight: '480px' }}
          />
        )}

       <div
          className="prose prose-stone prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: post.body || '' }}
        />

        {post.authors && (
          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <div className="flex items-start gap-4">
              <Link to={`/author/${post.authors.slug}`} className="flex-shrink-0">
                {post.authors.photo_url ? (
                  <img
                    src={post.authors.photo_url}
                    alt={post.authors.name || ''}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-xl font-display">
                    {post.authors.name?.[0] || '?'}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-stone-500 mb-0.5">Автор</div>
                <Link to={`/author/${post.authors.slug}`} className="hover:underline">
                  <span className="font-display text-lg" style={{ color: 'var(--color-deep)' }}>
                    {post.authors.name}
                  </span>
                </Link>
                {post.authors.slug && (
                  <div className="text-xs text-stone-500">@{post.authors.slug}</div>
                )}
                {post.authors.bio && (
                  <div className="text-sm text-stone-600 mt-2 line-clamp-2">{post.authors.bio}</div>
                )}

              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-100">
              <SubscribeButton authorId={post.authors.id} />
              <Link
                to={`/author/${post.authors.slug}`}
                className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                Все публикации →
              </Link>
            </div>
          </div>
        )}
      </article>
    </Layout>
  )
}

export default PostPage