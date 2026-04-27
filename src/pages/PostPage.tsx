import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface Category {
  id: number
  name: string
  slug: string
}

interface Author {
  id: number
  name: string
  slug: string
  bio: string | null
  photo_url: string | null
}

interface Post {
  id: number
  title: string
  body: string
  published_at: string
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
      const { data, error } = await supabase
        .from('posts')
        .select('*, categories(*), authors(*)')
        .eq('id', id)
        .eq('status', 'published')
        .single()

      if (error) setError(error.message)
      else setPost(data)
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

  const dateStr = new Date(post.published_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

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
          {post.title}
        </h1>

       <div
          className="prose prose-stone prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {post.authors && (
          <Link
            to={`/author/${post.authors.slug}`}
            className="block bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm hover:border-stone-300 transition-all"
          >
            <div className="flex items-center gap-4">
              {post.authors.photo_url ? (
                <img
                  src={post.authors.photo_url}
                  alt={post.authors.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-xl font-display">
                  {post.authors.name[0]}
                </div>
              )}
              <div className="flex-1">
                <div className="text-xs text-stone-500 mb-1">Автор</div>
                <div className="font-display text-lg" style={{ color: 'var(--color-deep)' }}>{post.authors.name}</div>
                {post.authors.bio && (
                  <div className="text-sm text-stone-600 mt-1 line-clamp-2">{post.authors.bio}</div>
                )}
              </div>
            </div>
          </Link>
        )}
      </article>
    </Layout>
  )
}

export default PostPage