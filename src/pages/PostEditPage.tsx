import { useEffect, useState } from 'react'
import { Navigate, Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import PostEditor from '../components/PostEditor'

interface Category {
  id: number
  name: string
  slug: string
  sort_order: number
}

function PostEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isNew = !id
  const { user, profile, loading: authLoading } = useAuth()

  const [authorId, setAuthorId] = useState<number | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

  const isAuthor = profile?.role === 'author' || profile?.role === 'editor' || profile?.role === 'admin'

  // Загрузка автора, категорий и поста (если редактирование)
  useEffect(() => {
    if (!user || !isAuthor) {
      setLoading(false)
      return
    }

    async function load() {
      // Автор
      const { data: authorData } = await supabase
        .from('authors')
        .select('id')
        .eq('profile_id', user!.id)
        .maybeSingle()

      if (!authorData) {
        setError('Профиль автора не найден. Обратитесь к редактору.')
        setLoading(false)
        return
      }
      setAuthorId(authorData.id)

      // Категории
      const { data: catsData } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
      setCategories(catsData || [])

      // Если редактирование — грузим пост
      if (id) {
        const { data: postData, error: postErr } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single()

        if (postErr || !postData) {
          setError('Пост не найден или у вас нет к нему доступа')
          setLoading(false)
          return
        }

        if (postData.author_id !== authorData.id && profile?.role !== 'editor' && profile?.role !== 'admin') {
          setError('Вы не можете редактировать этот пост')
          setLoading(false)
          return
        }

        setTitle(postData.title || '')
        setExcerpt(postData.excerpt || '')
        setBody(postData.body || '')
        setCategoryId(postData.category_id)
        setCoverUrl(postData.cover_image_url)
        setStatus(postData.status || 'draft')
      }

      setLoading(false)
    }
    load()
  }, [user, isAuthor, id, profile])

  if (authLoading) return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  if (!user) return <Navigate to="/login" replace />
  if (!isAuthor) return <Navigate to="/profile" replace />

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 3 * 1024 * 1024) {
      setError('Обложка слишком большая, максимум 3 МБ')
      return
    }

    setUploadingCover(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('post-covers')
      .upload(filePath, file)

    if (uploadError) {
      setError('Ошибка загрузки: ' + uploadError.message)
      setUploadingCover(false)
      return
    }

    const { data } = supabase.storage.from('post-covers').getPublicUrl(filePath)
    setCoverUrl(data.publicUrl)
    setUploadingCover(false)
  }

  async function handleSave(targetStatus: 'draft' | 'published') {
    if (!authorId) return

    setError(null)

    if (!title.trim()) {
      setError('Укажите заголовок')
      return
    }

    if (targetStatus === 'published' && body.replace(/<[^>]+>/g, '').trim().length < 50) {
      setError('Текст слишком короткий для публикации (минимум 50 символов)')
      return
    }

    setSaving(true)

    const payload: any = {
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      body: body,
      category_id: categoryId,
      cover_image_url: coverUrl,
      status: targetStatus,
      author_id: authorId,
    }

    // Если впервые публикуем — обновляем published_at на сейчас
    if (targetStatus === 'published' && (isNew || status === 'draft')) {
      payload.published_at = new Date().toISOString()
    }

    if (isNew) {
      const { error: insertError } = await supabase
        .from('posts')
        .insert(payload)
      if (insertError) {
        setError('Не удалось сохранить: ' + insertError.message)
        setSaving(false)
        return
      }
    } else {
      const { error: updateError } = await supabase
        .from('posts')
        .update(payload)
        .eq('id', id!)
      if (updateError) {
        setError('Не удалось сохранить: ' + updateError.message)
        setSaving(false)
        return
      }
    }

    navigate('/profile/posts')
  }

  async function handleDelete() {
    if (!id) return
    if (!confirm('Удалить пост безвозвратно?')) return

    const { error: delError } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (delError) {
      setError('Не удалось удалить: ' + delError.message)
      return
    }

    navigate('/profile/posts')
  }

  if (loading) return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/profile/posts" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
          ← К моим публикациям
        </Link>

        <h1 className="font-display text-3xl mb-6 leading-tight" style={{ color: 'var(--color-deep)' }}>
          {isNew ? 'Новая публикация' : 'Редактирование'}
        </h1>

        <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-5">
          {/* Заголовок */}
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Заголовок</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              placeholder="О чём ваш пост"
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white text-lg"
            />
          </div>

          {/* Категория */}
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Категория</label>
            <select
              value={categoryId ?? ''}
              onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
            >
              <option value="">— без категории —</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Краткое описание */}
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Краткое описание (для ленты)</label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="1–2 предложения, которые увидят в ленте. Если оставить пустым, возьмётся начало текста."
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white resize-none"
            />
            <p className="text-xs text-stone-500 mt-1">{excerpt.length} / 300</p>
          </div>

          {/* Обложка */}
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Обложка (опционально)</label>
            {coverUrl && (
              <div className="mb-2 relative inline-block">
                <img src={coverUrl} alt="Обложка" className="rounded-lg max-h-48" />
                <button
                  onClick={() => setCoverUrl(null)}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full w-7 h-7 flex items-center justify-center text-stone-700 shadow-sm"
                  title="Убрать обложку"
                >
                  ×
                </button>
              </div>
            )}
            <label className="cursor-pointer inline-block">
              <span className="px-4 py-2 border border-stone-300 rounded-lg text-sm hover:bg-stone-100 inline-block">
                {uploadingCover ? 'Загрузка…' : coverUrl ? 'Заменить обложку' : 'Загрузить обложку'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
                className="hidden"
              />
            </label>
            <p className="text-xs text-stone-500 mt-2">JPG, PNG или WebP, до 3 МБ</p>
          </div>

          {/* Редактор */}
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Текст</label>
            <PostEditor
              initialContent={body}
              onChange={setBody}
              placeholder="Поделитесь тем, что важно…"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {/* Действия */}
          <div className="flex gap-3 flex-wrap pt-2 border-t border-stone-100">
            <button
              onClick={() => handleSave('published')}
              disabled={saving || uploadingCover}
              className="px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
            >
              {saving ? 'Сохраняем…' : status === 'published' ? 'Сохранить изменения' : 'Опубликовать'}
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving || uploadingCover}
              className="px-5 py-2.5 rounded-lg text-sm border border-stone-300 hover:bg-stone-100 transition-colors disabled:opacity-50"
            >
              {status === 'published' ? 'Снять с публикации' : 'Сохранить черновик'}
            </button>
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
              >
                Удалить
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default PostEditPage