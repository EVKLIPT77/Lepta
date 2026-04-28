import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useYandexMaps } from '../lib/useYandexMaps'

type Status = 'pending' | 'approved' | 'rejected'

interface ApplicationFull {
  id: number
  profile_id: string
  name: string
  city: string | null
  address: string | null
  latitude: number
  longitude: number
  rector: string | null
  phone: string | null
  email: string | null
  website_url: string | null
  schedule_url: string | null
  description: string | null
  photo_url: string | null
  status: Status
  reviewer_comment: string | null
  reviewed_at: string | null
  resulting_temple_id: number | null
  created_at: string | null
  profile: {
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

function AdminTempleApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()
  const isEditor = profile?.role === 'editor' || profile?.role === 'admin'

  const { ymaps } = useYandexMaps()
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [app, setApp] = useState<ApplicationFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Поля, которые редактор может уточнить перед апрувом
  const [editName, setEditName] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)

  useEffect(() => {
    if (!isEditor || !id) return

    async function load() {
      const { data, error: loadErr } = await supabase
        .from('temple_applications')
        .select('*, profiles!profile_id(username, display_name, avatar_url)')
        .eq('id', Number(id))
        .single()

      if (loadErr || !data) {
        setError(loadErr?.message || 'Заявка не найдена')
        setLoading(false)
        return
      }

      const validStatuses = ['pending', 'approved', 'rejected'] as const
      const status = (validStatuses as readonly string[]).includes(data.status)
        ? (data.status as Status)
        : 'pending'

      const full: ApplicationFull = {
        ...data,
        status,
        profile: data.profiles as ApplicationFull['profile'],
      }
      setApp(full)
      setEditName(full.name)
      setEditCity(full.city ?? '')
      setEditAddress(full.address ?? '')
      setLoading(false)
    }
    load()
  }, [isEditor, id])

  // Карта с одной точкой — координаты заявки
  useEffect(() => {
    if (!ymaps || !mapContainerRef.current || !app) return

    const map = new ymaps.Map(mapContainerRef.current, {
      center: [app.latitude, app.longitude],
      zoom: 16,
      controls: ['zoomControl', 'fullscreenControl'],
    })

    const placemark = new ymaps.Placemark(
      [app.latitude, app.longitude],
      { hintContent: app.name },
      { preset: 'islands#blueChurchIcon' }
    )
    map.geoObjects.add(placemark)

    return () => {
      map.destroy()
    }
  }, [ymaps, app])

  if (authLoading) return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  if (!isEditor) return <Navigate to="/" replace />
  if (loading) return <Layout><div className="p-10 text-stone-500">Загрузка заявки…</div></Layout>
  if (error || !app) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/admin/temple-applications" className="text-stone-700 underline">
            ← К списку заявок
          </Link>
        </div>
      </Layout>
    )
  }

  // Генерация slug из name. Простой транслит для русского + sanitize.
  function generateSlug(name: string): string {
    const map: Record<string, string> = {
      а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
      к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
      х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
    }
    return name
      .toLowerCase()
      .split('').map(c => map[c] ?? c).join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'temple'
  }

  // Подбираем уникальный slug — если такой уже есть, добавляем суффикс
  async function findUniqueSlug(base: string): Promise<string> {
    let candidate = base
    let suffix = 1
    while (true) {
      const { data } = await supabase
        .from('temples')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()
      if (!data) return candidate
      suffix++
      candidate = `${base}-${suffix}`
      if (suffix > 50) return `${base}-${Date.now()}` // на всякий
    }
  }

  async function handleApprove() {
    if (!app || !profile) return
    if (!editName.trim()) {
      setError('Название не может быть пустым')
      return
    }

    setError(null)
    setActing(true)

    try {
      // Шаг 1. Уникальный slug
      const baseSlug = generateSlug(editName.trim())
      const slug = await findUniqueSlug(baseSlug)

      // Шаг 2. Создаём temple
      const { data: createdTemple, error: insertErr } = await supabase
        .from('temples')
        .insert({
          slug,
          name: editName.trim(),
          city: editCity.trim() || null,
          address: editAddress.trim() || null,
          latitude: app.latitude,
          longitude: app.longitude,
          rector: app.rector,
          phone: app.phone,
          email: app.email,
          website_url: app.website_url,
          schedule_url: app.schedule_url,
          description: app.description,
          photo_url: app.photo_url,
          submitted_by: app.profile_id,
        })
        .select('id, slug')
        .single()

      if (insertErr || !createdTemple) {
        throw new Error(insertErr?.message || 'Не удалось создать храм')
      }

      // Шаг 3. Обновляем заявку — статус, ссылка на храм, кто модерировал
      const { error: updateErr } = await supabase
        .from('temple_applications')
        .update({
          status: 'approved',
          reviewer_comment: comment.trim() || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          resulting_temple_id: createdTemple.id,
        })
        .eq('id', app.id)

      if (updateErr) {
        // Заявка не обновилась, но храм создан. Покажем ошибку, но не катастрофа.
        throw new Error(updateErr.message)
      }

      navigate('/admin/temple-applications')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Произошла ошибка'
      setError(msg)
    } finally {
      setActing(false)
    }
  }

  async function handleReject() {
    if (!app || !profile) return
    if (!comment.trim()) {
      setError('Для отказа нужен комментарий — заявителю важно понять причину')
      return
    }

    setError(null)
    setActing(true)

    const { error: updateErr } = await supabase
      .from('temple_applications')
      .update({
        status: 'rejected',
        reviewer_comment: comment.trim(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile.id,
      })
      .eq('id', app.id)

    setActing(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    navigate('/admin/temple-applications')
  }

  const isPending = app.status === 'pending'

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/admin/temple-applications" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
          ← К списку заявок
        </Link>

        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-8">
          <h1 className="font-display text-4xl leading-tight" style={{ color: 'var(--color-deep)' }}>
            Заявка #{app.id}
          </h1>
          <StatusPill status={app.status} />
        </div>

        {/* Заявитель */}
        {app.profile && (
          <div className="bg-white border border-stone-200 rounded-lg p-5 mb-6">
            <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">Отправитель</div>
            <div className="flex items-center gap-3">
              {app.profile.avatar_url ? (
                <img src={app.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-display">
                  {app.profile.username[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-stone-900">
                  {app.profile.display_name || app.profile.username}
                </div>
                <Link to={`/u/${app.profile.username}`} className="text-xs text-stone-500 hover:text-stone-900 underline">
                  @{app.profile.username}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Контент заявки */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6 space-y-5">
          {isPending ? (
            <>
              <div className="text-xs text-stone-500 uppercase tracking-wider">Можно уточнить перед апрувом</div>
              <div>
                <label className="block text-sm text-stone-700 mb-1.5">Название</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-700 mb-1.5">Город</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={e => setEditCity(e.target.value)}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-700 mb-1.5">Адрес</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <Field label="Название" value={app.name} />
              <Field label="Город" value={app.city} />
              <Field label="Адрес" value={app.address} />
            </>
          )}

          <Field label="Настоятель" value={app.rector} />
          <Field label="Телефон" value={app.phone} />
          <Field label="Email" value={app.email} />
          <FieldLink label="Сайт" url={app.website_url} />
          <FieldLink label="Расписание" url={app.schedule_url} />
          <Field label="Описание" value={app.description} multiline />
          {app.photo_url && (
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1.5">Фото</div>
              <a href={app.photo_url} target="_blank" rel="noopener noreferrer">
                <img src={app.photo_url} alt="" className="max-w-xs rounded border border-stone-200" />
              </a>
            </div>
          )}
        </div>

        {/* Карта */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 mb-6">
          <div className="text-xs text-stone-500 uppercase tracking-wider mb-3">Местоположение</div>
          <div ref={mapContainerRef} className="w-full rounded-lg border border-stone-200 overflow-hidden bg-stone-100" style={{ height: '350px' }} />
          <p className="text-xs text-stone-500 mt-2">
            Координаты: {app.latitude.toFixed(5)}, {app.longitude.toFixed(5)}
          </p>
        </div>

        {/* Уже модерирована */}
        {!isPending && app.reviewer_comment && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-5 mb-6">
            <div className="text-xs text-stone-500 uppercase tracking-wider mb-1.5">Комментарий модератора</div>
            <div className="text-sm text-stone-800">{app.reviewer_comment}</div>
          </div>
        )}

        {!isPending && app.status === 'approved' && app.resulting_temple_id && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 mb-6">
            <p className="text-sm text-emerald-900 mb-2">Храм создан и опубликован.</p>
            <Link to={`/admin/temples/${app.resulting_temple_id}/edit`} className="text-sm underline" style={{ color: 'var(--color-accent-dark)' }}>
              Открыть для редактирования →
            </Link>
          </div>
        )}

        {/* Действия — только для pending */}
        {isPending && (
          <div className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
            <h2 className="font-display text-xl" style={{ color: 'var(--color-deep)' }}>
              Решение
            </h2>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">
                Комментарий <span className="text-stone-400">(обязателен при отклонении)</span>
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Например: «Не нашли подтверждения, что такой храм существует» или «Перепроверьте координаты»"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white resize-none"
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleApprove}
                disabled={acting}
                className="px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#065f46', color: 'white' }}
              >
                {acting ? 'Создаём…' : 'Одобрить и опубликовать'}
              </button>
              <button
                onClick={handleReject}
                disabled={acting}
                className="px-5 py-2.5 rounded-lg font-medium border transition-colors hover:bg-red-50 disabled:opacity-50"
                style={{ borderColor: '#fca5a5', color: '#991b1b' }}
              >
                Отклонить
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function Field({ label, value, multiline }: { label: string; value: string | null; multiline?: boolean }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm text-stone-900 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</div>
    </div>
  )
}

function FieldLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null
  return (
    <div>
      <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">{label}</div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm break-all hover:underline" style={{ color: 'var(--color-accent-dark)' }}>
        {url}
      </a>
    </div>
  )
}

function StatusPill({ status }: { status: Status }) {
  if (status === 'pending') return (
    <span className="text-sm px-3 py-1 rounded-full whitespace-nowrap"
          style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#92400e' }}>
      На рассмотрении
    </span>
  )
  if (status === 'approved') return (
    <span className="text-sm px-3 py-1 rounded-full whitespace-nowrap"
          style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#065f46' }}>
      Одобрена
    </span>
  )
  return (
    <span className="text-sm px-3 py-1 rounded-full whitespace-nowrap"
          style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#991b1b' }}>
      Отклонена
    </span>
  )
}

export default AdminTempleApplicationDetailPage