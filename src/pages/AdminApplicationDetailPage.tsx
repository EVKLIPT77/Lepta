import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface ApplicationFull {
  id: string
  profile_id: string
  motivation: string
  blessing_doc_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewer_comment: string | null
  created_at: string
  reviewed_at: string | null
  profiles: {
    username: string
    display_name: string | null
    avatar_url: string | null
    bio: string | null
    role: string
  } | null
}

function AdminApplicationDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { profile, loading: authLoading } = useAuth()

  const [application, setApplication] = useState<ApplicationFull | null>(null)
  const [signedDocUrl, setSignedDocUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)

  const isEditor = profile?.role === 'editor' || profile?.role === 'admin'

  useEffect(() => {
    if (!isEditor || !id) return

    async function load() {
      const { data, error } = await supabase
        .from('author_applications')
        .select('*, profiles(username, display_name, avatar_url, bio, role)')
        .eq('id', id!)
        .single()

      if (error || !data) {
        setError(error?.message || 'Заявка не найдена')
        setLoading(false)
        return
      }

      const validStatuses = ['pending', 'approved', 'rejected'] as const
      const status = (validStatuses as readonly string[]).includes(data.status) ? (data.status as ApplicationFull['status']) : 'pending'
      setApplication({ ...data, status })

      // Получаем signed URL для документа
      if (data.blessing_doc_url) {
        const { data: signed } = await supabase.storage
          .from('applications')
          .createSignedUrl(data.blessing_doc_url, 600) // 10 минут
        setSignedDocUrl(signed?.signedUrl ?? null)
      }

      setLoading(false)
    }
    load()
  }, [isEditor, id])

  if (authLoading || loading) {
    return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  }

  if (!isEditor) return <Navigate to="/" replace />

  if (error || !application) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <p className="text-red-600 mb-4">{error || 'Не найдено'}</p>
          <Link to="/admin/applications" className="underline text-stone-700">← К списку</Link>
        </div>
      </Layout>
    )
  }

  async function handleApprove() {
    if (!application) return
    setActing(true)
    setError(null)

    // 1. Меняем статус заявки
    const { error: appError } = await supabase
      .from('author_applications')
      .update({
        status: 'approved',
        reviewer_comment: comment.trim() || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', application.id)

    if (appError) {
      setError('Ошибка при одобрении: ' + appError.message)
      setActing(false)
      return
    }

    // 2. Обновляем роль пользователя на 'author'
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: 'author' })
      .eq('id', application.profile_id)

    if (roleError) {
      setError('Заявка одобрена, но не удалось сменить роль: ' + roleError.message)
      setActing(false)
      return
    }

    navigate('/admin/applications')
  }

  async function handleReject() {
    if (!application) return
    if (comment.trim().length < 10) {
      setError('Укажите причину отклонения, минимум 10 символов')
      return
    }

    setActing(true)
    setError(null)

    const { error: appError } = await supabase
      .from('author_applications')
      .update({
        status: 'rejected',
        reviewer_comment: comment.trim(),
        reviewed_at: new Date().toISOString()
      })
      .eq('id', application.id)

    if (appError) {
      setError('Ошибка: ' + appError.message)
      setActing(false)
      return
    }

    navigate('/admin/applications')
  }

  const isPending = application.status === 'pending'
  const profileData = application.profiles

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/admin/applications" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
          ← К списку заявок
        </Link>

        <h1 className="font-display text-3xl mb-6 leading-tight" style={{ color: 'var(--color-deep)' }}>
          Заявка на авторство
        </h1>

        {/* Статус */}
        <div className="mb-6">
          {application.status === 'approved' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
              ✓ Одобрена {application.reviewed_at && `· ${new Date(application.reviewed_at).toLocaleDateString('ru-RU')}`}
            </div>
          )}
          {application.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
              ✕ Отклонена {application.reviewed_at && `· ${new Date(application.reviewed_at).toLocaleDateString('ru-RU')}`}
              {application.reviewer_comment && (
                <p className="mt-1 italic">«{application.reviewer_comment}»</p>
              )}
            </div>
          )}
        </div>

        {/* Профиль заявителя */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-stone-500 mb-3">Заявитель</h2>
          <div className="flex items-start gap-4">
            {profileData?.avatar_url ? (
              <img src={profileData.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-xl font-display flex-shrink-0">
                {profileData?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg mb-0.5" style={{ color: 'var(--color-deep)' }}>
                {profileData?.display_name || profileData?.username}
              </div>
              <div className="text-sm text-stone-500 mb-2">@{profileData?.username}</div>
              {profileData?.bio && (
                <p className="text-sm text-stone-700">{profileData.bio}</p>
              )}
              {profileData?.role !== 'reader' && (
                <p className="text-xs text-amber-700 mt-2">
                  ⚠️ Текущая роль: <strong>{profileData?.role}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Мотивация */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-stone-500 mb-3">О чём хочет писать</h2>
          <p className="text-stone-800 whitespace-pre-wrap">{application.motivation}</p>
        </div>

        {/* Документ */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 mb-6">
          <h2 className="text-xs uppercase tracking-wider text-stone-500 mb-3">Документ-благословение</h2>
          {signedDocUrl ? (<a
            
              href={signedDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg text-sm hover:bg-stone-50 transition-colors"
            >
              📎 Открыть документ
            </a>
          ) : (
            <p className="text-sm text-amber-700">Документ не приложен</p>
          )}
          <p className="text-xs text-stone-500 mt-2">Ссылка действительна 10 минут</p>
        </div>
        {/* Форма решения — только если pending */}
        {isPending && (
          <div className="bg-white border border-stone-200 rounded-lg p-5">
            <h2 className="font-display text-lg mb-3" style={{ color: 'var(--color-deep)' }}>
              Решение
            </h2>

            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Комментарий (для отклонения — обязательно с указанием причины)"
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white resize-none mb-2"
            />
            <p className="text-xs text-stone-500 mb-4">{comment.length} / 500</p>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleApprove}
                disabled={acting}
                className="px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#065F46', color: 'white' }}
              >
                {acting ? 'Сохраняем…' : '✓ Одобрить'}
              </button>
              <button
                onClick={handleReject}
                disabled={acting}
                className="px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#991B1B', color: 'white' }}
              >
                ✕ Отклонить
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AdminApplicationDetailPage