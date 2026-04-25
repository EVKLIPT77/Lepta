import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface Category {
  id: number
  name: string
  slug: string
  sort_order: number
}

interface Author {
  id: number
  name: string
  slug: string
  photo_url: string | null
}

interface Post {
  id: number
  title: string
  body: string
  excerpt: string | null
  published_at: string
  categories: Category | null
  authors: Author | null
}

function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string>('all')

  useEffect(() => {
    async function loadData() {
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (catErr) {
        setError(catErr.message)
        setLoading(false)
        return
      }

      const { data: postsData, error: postsErr } = await supabase
        .from('posts')
        .select('*, categories(*), authors(*)')
        .order('published_at', { ascending: false })

      if (postsErr) {
        setError(postsErr.message)
      } else {
        setPosts(postsData || [])
        setCategories(cats || [])
      }
      setLoading(false)
    }
    loadData()
  }, [])

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
  onClick={() => setSelectedSlug(cat.slug)}
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
                      onClick={() => setSelectedSlug(post.categories!.slug)}
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
  {post.title}
</h2>
                <p className="text-stone-700 leading-relaxed">
                  {getPreview(post)}
                </p>
              </Link>
            </article>
          ))}
        </div>

        {!loading && filteredPosts.length === 0 && (
          <p className="text-stone-500 text-center py-10">
            В этой категории пока нет постов
          </p>
        )}
      </div>
    </Layout>
  )
}

export default FeedPage