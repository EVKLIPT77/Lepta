import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import SubscribeButton from '../components/SubscribeButton'

interface Author {
  id: number
  name: string
  slug: string
  bio: string | null
  photo_url: string | null
  blessing_info: string | null
}

interface Category {
  id: number
  name: string
  slug: string
}

interface Post {
  id: number
  title: string
  excerpt: string | null
  body: string
  published_at: string
  categories: Category | null
}

function AuthorPage() {
  const { slug } = useParams<{ slug: string }>()
  const [author, setAuthor] = useState<Author | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      // Сначала автор
      const { data: authorData, error: authorErr } = await supabase
        .from('authors')
        .select('*')
        .eq('slug', slug)
        .single()

      if (authorErr || !authorData) {
        setError(authorErr?.message || 'автор не найден')
        setLoading(false)
        return
      }

      // Затем его посты
      const { data: postsData, error: postsErr } = await supabase
        .from('posts')
        .select('*, categories(*)')
        .eq('author_id', authorData.id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (postsErr) {
        setError(postsErr.message)
      } else {
        setAuthor(authorData)
        setPosts(postsData || [])
      }
      setLoading(false)
    }
    if (slug) loadData()
  }, [slug])

  function getPreview(post: Post): string {
    if (post.excerpt) return post.excerpt
    if (!post.body) return ''
    return post.body.length > 150 ? post.body.slice(0, 150).trim() + '…' : post.body
  }

  if (loading) {
    return <div className="min-h-screen bg-stone-50 p-10 text-stone-500">Загрузка...</div>
  }

  if (error || !author) {
    return (
      <div className="min-h-screen bg-stone-50 p-10">
        <p className="text-red-600 mb-4">Ошибка: {error}</p>
        <Link to="/feed" className="text-stone-700 underline">К ленте</Link>
      </div>
    )
  }

  return (
    <Layout>
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Профиль автора */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-5">
            {author.photo_url ? (
              <img
                src={author.photo_url}
                alt={author.name}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-3xl font-display flex-shrink-0">
                {author.name[0]}
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--color-deep)' }}>{author.name}</h1>
              {author.bio && <p className="text-stone-700 mb-3">{author.bio}</p>}
              <SubscribeButton authorId={author.id} />
              {author.blessing_info && (
                <p className="text-xs text-stone-500 italic mt-3">{author.blessing_info}</p>
              )}
              </div>
          </div>
        </div>

        {/* Посты автора */}
        <h2 className="font-display text-xl mb-4" style={{ color: 'var(--color-deep)' }}>Публикации</h2>

        {posts.length === 0 ? (
          <p className="text-stone-500 py-10 text-center">Пока нет публикаций</p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <Link
                key={post.id}
                to={`/post/${post.id}`}
                className="block bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm hover:border-stone-300 transition-all"
              >
                {post.categories && (
                  <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">
                    {post.categories.name}
                  </div>
                )}
                <h3 className="font-display text-lg mb-2" style={{ color: 'var(--color-deep)' }}>{post.title}</h3>
                <p className="text-stone-700 text-sm">{getPreview(post)}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </Layout>
  )
}

export default AuthorPage