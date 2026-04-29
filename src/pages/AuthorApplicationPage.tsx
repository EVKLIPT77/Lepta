import { useState, useEffect } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface Application {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  motivation: string
  blessing_doc_url: string | null
  reviewer_comment: string | null
  created_at: string
  reviewed_at: string | null
}

function AuthorApplicationPage() {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()

  const [existing, setExisting] = useState<Application | null>(null)
  const [loadingApp, setLoadingApp] = useState(true)
  const [motivation, setMotivation] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загружаем существующую заявку, если есть
  useEffect(() => {
    if (!user) {
      setLoadingApp(false)
      return
    }
    async function load() {
      const { data } = await supabase
        .from('author_applications')
        .select('*')
        .eq('profile_id', user!.id)
        .maybeSingle()
      if (data) {
        setExisting(normalizeApplication(data))
        setMotivation(data.motivation)
      }
      setLoadingApp(false)
    }
    load()
  }, [user])

  if (authLoading || loadingApp) {
    return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  }

  if (!user) return <Navigate to="/login" replace />

  // Если уже автор — некуда подавать заявку
  if (profile?.role === 'author' || profile?.role === 'editor' || profile?.role === 'admin') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <h1 className="font-display text-3xl mb-4 leading-tight" style={{ color: 'var(--color-deep)' }}>
            Вы уже автор
          </h1>
          <p className="text-stone-700 mb-6">У вас уже есть права на публикацию.</p>
          <Link to="/profile" className="text-stone-600 hover:text-stone-900 underline text-sm">
            ← К профилю
          </Link>
        </div>
      </Layout>
    )
  }

  // Если заявка в pending — показываем статус, не даём редактировать
  if (existing?.status === 'pending') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <Link to="/profile" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
            ← К профилю
          </Link>
          <h1 className="font-display text-3xl mb-2 leading-tight" style={{ color: 'var(--color-deep)' }}>
            Заявка на рассмотрении
          </h1>
          <p className="text-stone-700 mb-6">
            Мы получили вашу заявку и рассмотрим её в ближайшее время. Вы получите уведомление по email когда статус изменится.
          </p>
          <div className="bg-white border border-stone-200 rounded-lg p-5 text-sm space-y-2">
            <div>
              <span className="text-stone-500">Подана: </span>
              <span>{new Date(existing.created_at).toLocaleDateString('ru-RU')}</span>
            </div>
            <div>
              <span className="text-stone-500">Ваша мотивация:</span>
              <p className="mt-1 whitespace-pre-wrap">{existing.motivation}</p>
            </div>
            {existing.blessing_doc_url && (
              <div className="text-emerald-700">✓ Документ-благословение прикреплён</div>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // Если одобрена — показываем сообщение
  if (existing?.status === 'approved') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <h1 className="font-display text-3xl mb-4 leading-tight" style={{ color: 'var(--color-deep)' }}>
            Заявка одобрена
          </h1>
          <p className="text-stone-700">Поздравляем! Можете публиковать материалы из ЛК.</p>
        </div>
      </Layout>
    )
  }

  // Если отклонена — показываем причину и даём подать заново
  // (форма ниже та же что для новой заявки)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return

    setError(null)

    if (motivation.trim().length < 50) {
      setError('Расскажите подробнее, минимум 50 символов')
      return
    }

    if (!existing && !docFile) {
      setError('Прикрепите скан документа с благословением')
      return
    }

    setSubmitting(true)

    let docUrl: string | null = existing?.blessing_doc_url ?? null

    // Загружаем документ если выбран новый
    if (docFile) {
      if (docFile.size > 5 * 1024 * 1024) {
        setError('Файл слишком большой, максимум 5 МБ')
        setSubmitting(false)
        return
      }

      // Удаляем старые файлы благословения (любого расширения) перед загрузкой
      const { data: oldFiles } = await supabase.storage
        .from('applications')
        .list(user.id)
      if (oldFiles && oldFiles.length > 0) {
        const toRemove = oldFiles.map(f => `${user.id}/${f.name}`)
        await supabase.storage.from('applications').remove(toRemove)
      }

      const ext = docFile.name.split('.').pop()
      const filePath = `${user.id}/blessing.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('applications')
        .upload(filePath, docFile)

      if (uploadError) {
        setError('Не удалось загрузить документ: ' + uploadError.message)
        setSubmitting(false)
        return
      }

      docUrl = filePath // храним путь к файлу, не публичный URL
    }

    if (existing) {
      // Повторная подача после отклонения — обновляем
      const { error: updateError } = await supabase
        .from('author_applications')
        .update({
          motivation: motivation.trim(),
          blessing_doc_url: docUrl,
          status: 'pending',
          reviewer_comment: null,
          reviewed_at: null
        })
        .eq('id', existing.id)

      if (updateError) {
        setError('Не удалось отправить: ' + updateError.message)
        setSubmitting(false)
        return
      }
    } else {
      // Новая заявка
      const { error: insertError } = await supabase
        .from('author_applications')
        .insert({
          profile_id: user.id,
          motivation: motivation.trim(),
          blessing_doc_url: docUrl,
          status: 'pending'
        })

      if (insertError) {
        setError('Не удалось отправить: ' + insertError.message)
        setSubmitting(false)
        return
      }
    }

    navigate('/profile')
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/profile" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
          ← К профилю
        </Link>

        <h1 className="font-display text-4xl mb-2 leading-tight" style={{ color: 'var(--color-deep)' }}>
          Стать автором
        </h1>
        <p className="text-stone-600 mb-6">
          Подайте заявку, чтобы публиковать материалы в Эммаусѣ
        </p>

        {/* Если предыдущая заявка была отклонена — показываем причину */}
        {existing?.status === 'rejected' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="font-medium text-amber-900 mb-1">Предыдущая заявка отклонена</div>
            {existing.reviewer_comment && (
              <p className="text-sm text-amber-800">{existing.reviewer_comment}</p>
            )}
            <p className="text-xs text-amber-700 mt-2">Вы можете подать заявку заново, учтя замечания.</p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">
          <strong className="block mb-1">Важно</strong>
          Для публикации духовных материалов мирянам необходимо письменное благословение священника. Без приложенного документа заявка не будет рассмотрена.
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              О чём планируете писать?
            </label>
            <textarea
              value={motivation}
              onChange={e => setMotivation(e.target.value)}
              maxLength={1000}
              rows={6}
              placeholder="Темы, опыт, чем хотите поделиться с читателями"
              required
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white resize-none"
            />
            <p className="text-xs text-stone-500 mt-1">{motivation.length} / 1000 (минимум 50)</p>
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">
              Скан документа с благословением {!existing && <span className="text-red-600">*</span>}
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={e => setDocFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-stone-700
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0
                         file:text-sm file:font-medium
                         file:bg-stone-100 file:text-stone-700
                         hover:file:bg-stone-200 cursor-pointer"
            />
            <p className="text-xs text-stone-500 mt-1">JPG, PNG или PDF, до 5 МБ</p>
            {existing?.blessing_doc_url && !docFile && (
              <p className="text-xs text-emerald-700 mt-1">
                ✓ Документ из предыдущей заявки сохранён. Загрузите новый, если хотите заменить.
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
            >
              {submitting ? 'Отправляем…' : existing ? 'Подать заново' : 'Подать заявку'}
            </button>
            <Link
              to="/profile"
              className="px-5 py-2.5 rounded-lg text-sm border border-stone-300 hover:bg-stone-100 transition-colors flex items-center"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default AuthorApplicationPage

// Сужаем status из string в union
function normalizeApplication(data: { id: string; status: string; motivation: string; blessing_doc_url: string | null; reviewer_comment: string | null; created_at: string; reviewed_at: string | null }): Application {
  const validStatuses = ['pending', 'approved', 'rejected'] as const
  const status = (validStatuses as readonly string[]).includes(data.status) ? (data.status as Application['status']) : 'pending'
  return { ...data, status }
}