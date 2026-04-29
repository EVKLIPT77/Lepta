import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import SubscribeButton from '../components/SubscribeButton'
import { getInterestIcon } from '../lib/interestIcons'
import type { PrivacySettings, SocialLinks } from '../contexts/AuthContext'

interface Author {
  id: number
  name: string | null
  slug: string | null
  bio: string | null
  photo_url: string | null
  blessing_info: string | null
  profile_id: string | null
}

interface ProfileExtras {
  bio: string | null
  christian_name: string | null
  baptism_date: string | null
  city: string | null
  social_links: SocialLinks
  privacy_settings: PrivacySettings
  temple_relation: 'parishioner' | 'occasional' | 'seeking' | null
  temple: { id: number; slug: string; name: string; city: string | null } | null
}

interface ProfileInterest {
  id: number
  name: string
  icon: string | null
}

interface Category {
  id: number
  name: string | null
  slug: string | null
}

interface Post {
  id: number
  title: string | null
  excerpt: string | null
  body: string | null
  published_at: string | null
  categories: Category | null
}

const DEFAULT_PRIVACY: PrivacySettings = {
  christian_name: true,
  baptism_date: false,
  city: false,
  interests: true,
  social_links: true,
}

function formatBaptismDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

function normalizeTelegram(value: string) {
  const v = value.trim()
  if (v.startsWith('http')) return { display: v, href: v }
  const u = v.replace(/^@/, '').replace(/^t\.me\//i, '')
  return { display: '@' + u, href: 'https://t.me/' + u }
}
function normalizeVk(value: string) {
  const v = value.trim()
  if (v.startsWith('http')) return { display: v, href: v }
  const u = v.replace(/^vk\.com\//i, '')
  return { display: u, href: 'https://vk.com/' + u }
}
function normalizeWebsite(value: string) {
  const v = value.trim()
  const href = v.startsWith('http') ? v : 'https://' + v
  return { display: v.replace(/^https?:\/\//, ''), href }
}

function AuthorPage() {
  const { slug } = useParams<{ slug: string }>()
  const [author, setAuthor] = useState<Author | null>(null)
  const [extras, setExtras] = useState<ProfileExtras | null>(null)
  const [interests, setInterests] = useState<ProfileInterest[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!slug) return
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

      // Параллельно — посты, профиль (для расширенных полей), интересы
      const [postsRes, profileRes, interestsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*, categories(*)')
          .eq('author_id', authorData.id)
          .eq('status', 'published')
          .order('published_at', { ascending: false }),
        authorData.profile_id
          ? supabase
              .from('profiles')
              .select('bio, christian_name, baptism_date, city, social_links, privacy_settings, temple_relation, temple:temple_id(id, slug, name, city)')
              .eq('id', authorData.profile_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        authorData.profile_id
          ? supabase
              .from('profile_interests')
              .select('tag_id, interest_tags(id, name, icon, sort_order)')
              .eq('profile_id', authorData.profile_id)
          : Promise.resolve({ data: null, error: null }),
      ])

      if (postsRes.error) {
        setError(postsRes.error.message)
        setLoading(false)
        return
      }

      setAuthor(authorData as Author)
      setPosts((postsRes.data || []) as Post[])

      if (profileRes.data) {
        const p = profileRes.data
        const validRelations = ['parishioner', 'occasional', 'seeking'] as const
        const temple_relation = p.temple_relation && (validRelations as readonly string[]).includes(p.temple_relation)
          ? (p.temple_relation as ProfileExtras['temple_relation'])
          : null
        setExtras({
          bio: p.bio,
          christian_name: p.christian_name,
          baptism_date: p.baptism_date,
          city: p.city,
          social_links: (p.social_links ?? {}) as SocialLinks,
          privacy_settings: { ...DEFAULT_PRIVACY, ...((p.privacy_settings ?? {}) as Partial<PrivacySettings>) },
          temple_relation,
          temple: p.temple as ProfileExtras['temple'],
        })
      }

      if (interestsRes.data) {
        const tags = interestsRes.data
          .map(row => row.interest_tags)
          .filter((t): t is { id: number; name: string; icon: string | null; sort_order: number | null } => Boolean(t))
          .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
          .map(t => ({ id: t.id, name: t.name, icon: t.icon }))
        setInterests(tags)
      }

      setLoading(false)
    }
    loadData()
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

  // Логика приватности (для extras)
  const p = extras?.privacy_settings ?? DEFAULT_PRIVACY
  const showChristianName  = extras?.christian_name && p.christian_name
  const showBaptismDate    = extras?.baptism_date && p.baptism_date
  const showCity           = extras?.city && p.city
  const showInterests      = interests.length > 0 && p.interests
  const showSocialLinks    = extras?.social_links && p.social_links && (
    extras.social_links.telegram || extras.social_links.vk || extras.social_links.website
  )
  const templePrivate      = (p as PrivacySettings & { temple?: boolean }).temple === false
  const showTemple         = extras?.temple_relation != null && !templePrivate
  const hasDetailsBlock    = showChristianName || showBaptismDate || showCity || showTemple

  return (
    <Layout>
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Профиль автора */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-5">
            {author.photo_url ? (
              <img
                src={author.photo_url}
                alt={author.name || ''}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-3xl font-display flex-shrink-0">
                {author.name?.[0] || '?'}
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-display text-3xl leading-tight" style={{ color: 'var(--color-deep)' }}>{author.name}</h1>
              {author.slug && (
                <p className="text-sm text-stone-500 mb-2">@{author.slug}</p>
              )}
              {author.bio && <p className="text-stone-700 mb-3">{author.bio}</p>}
              <SubscribeButton authorId={author.id} />
              {author.blessing_info && (
                <p className="text-xs text-stone-500 italic mt-3">{author.blessing_info}</p>
              )}
            </div>
          </div>

          {/* Расширенные поля профиля автора */}
          {hasDetailsBlock && (
            <dl className="border-t border-stone-100 mt-5 pt-4 space-y-3 text-sm">
              {showChristianName && (
                <div>
                  <dt className="text-stone-500 text-xs uppercase tracking-wider">Имя в крещении</dt>
                  <dd className="text-stone-900 mt-0.5">{extras!.christian_name}</dd>
                </div>
              )}
              {showBaptismDate && (
                <div>
                  <dt className="text-stone-500 text-xs uppercase tracking-wider">Дата крещения</dt>
                  <dd className="text-stone-900 mt-0.5">{formatBaptismDate(extras!.baptism_date)}</dd>
                </div>
              )}
              {showCity && (
                <div>
                  <dt className="text-stone-500 text-xs uppercase tracking-wider">Город</dt>
                  <dd className="text-stone-900 mt-0.5">{extras!.city}</dd>
                </div>
              )}
              {showTemple && extras && (
                <div>
                  <dt className="text-stone-500 text-xs uppercase tracking-wider">
                    {extras.temple_relation === 'parishioner' ? 'Прихожанин храма'
                      : extras.temple_relation === 'occasional' ? 'Иногда бывает в храме'
                      : 'О приходе'}
                  </dt>
                  <dd className="text-stone-900 mt-0.5">
                    {extras.temple_relation === 'seeking' ? (
                      <span className="text-stone-600 italic">Пока ищу свой храм</span>
                    ) : extras.temple ? (
                      <Link
                        to={`/temple/${extras.temple.slug}`}
                        className="hover:underline"
                        style={{ color: 'var(--color-accent-dark)' }}
                      >
                        {extras.temple.name}
                        {extras.temple.city && (
                          <span className="text-stone-500"> · {extras.temple.city}</span>
                        )}
                      </Link>
                    ) : (
                      <span className="text-stone-500">не указан</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {/* Интересы */}
          {showInterests && (
            <div className="border-t border-stone-100 mt-5 pt-4">
              <div className="text-stone-500 text-xs uppercase tracking-wider mb-2">Интересы</div>
              <div className="flex flex-wrap gap-2">
                {interests.map(tag => {
                  const Icon = getInterestIcon(tag.icon)
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: 'rgba(139, 111, 71, 0.1)',
                        color: 'var(--color-accent-dark)',
                      }}
                    >
                      <Icon size={12} />
                      {tag.name}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Контакты */}
          {showSocialLinks && extras && (
            <div className="border-t border-stone-100 mt-5 pt-4">
              <div className="text-stone-500 text-xs uppercase tracking-wider mb-2">Контакты</div>
              <div className="flex flex-wrap gap-3 text-sm">
                {extras.social_links.telegram && (() => {
                  const n = normalizeTelegram(extras.social_links.telegram!)
                  return (
                    <a href={n.href} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 hover:underline"
                       style={{ color: 'var(--color-accent-dark)' }}>
                      <span className="text-stone-500 text-xs">Telegram:</span>
                      <span>{n.display}</span>
                    </a>
                  )
                })()}
                {extras.social_links.vk && (() => {
                  const n = normalizeVk(extras.social_links.vk!)
                  return (
                    <a href={n.href} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 hover:underline"
                       style={{ color: 'var(--color-accent-dark)' }}>
                      <span className="text-stone-500 text-xs">VK:</span>
                      <span>{n.display}</span>
                    </a>
                  )
                })()}
                {extras.social_links.website && (() => {
                  const n = normalizeWebsite(extras.social_links.website!)
                  return (
                    <a href={n.href} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 hover:underline"
                       style={{ color: 'var(--color-accent-dark)' }}>
                      <span className="text-stone-500 text-xs">Сайт:</span>
                      <span>{n.display}</span>
                    </a>
                  )
                })()}
              </div>
            </div>
          )}
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
                <h3 className="font-display text-lg mb-2" style={{ color: 'var(--color-deep)' }}>{post.title || 'Без названия'}</h3>
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
