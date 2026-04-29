import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useYandexMaps } from '../lib/useYandexMaps'

interface Temple {
  id: number
  slug: string
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
}

interface Parishioner {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

function TemplePage() {
  const { slug } = useParams<{ slug: string }>()
  const { ymaps } = useYandexMaps()
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [temple, setTemple] = useState<Temple | null>(null)
  const [parishioners, setParishioners] = useState<Parishioner[]>([])
  const [parishionersCount, setParishionersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    async function load() {
      setLoading(true)
      const { data: templeData, error: templeErr } = await supabase
        .from('temples')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle()

      if (templeErr) {
        setError(templeErr.message)
        setLoading(false)
        return
      }
      if (!templeData) {
        setError('Храм не найден')
        setLoading(false)
        return
      }

      // Прихожане — отдельным запросом, после получения id храма
      const [{ data: parishData }, { count }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('temple_id', templeData.id)
          .order('display_name', { ascending: true, nullsFirst: false })
          .limit(60),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('temple_id', templeData.id),
      ])

      // Все setState вместе — один ре-рендер. Иначе setTemple вызывает рендер
      // с loading=true (карта не в DOM), а эффект карты не перезапускается при
      // следующем рендере (ymaps и temple не менялись).
      setTemple(templeData as Temple)
      setParishioners((parishData || []) as Parishioner[])
      setParishionersCount(count ?? 0)
      setLoading(false)
    }

    load()
  }, [slug])

  // Карта — одиночный маркер на координатах храма
  useEffect(() => {
    if (!ymaps || !mapContainerRef.current || !temple) return

    const map = new ymaps.Map(mapContainerRef.current, {
      center: [temple.latitude, temple.longitude],
      zoom: 15,
      controls: ['zoomControl', 'fullscreenControl'],
    })

    const placemark = new ymaps.Placemark(
      [temple.latitude, temple.longitude],
      { hintContent: temple.name },
      { preset: 'islands#blueChurchIcon' }
    )
    map.geoObjects.add(placemark)

    return () => {
      map.destroy()
    }
  }, [ymaps, temple])

  if (loading) {
    return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  }

  if (error || !temple) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <p className="text-red-600 mb-4">{error || 'Храм не найден'}</p>
          <Link to="/temples" className="text-stone-700 underline">← К карте храмов</Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/temples" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
          ← К карте храмов
        </Link>

        {/* Шапка с фото и основным */}
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden mb-6">
          {temple.photo_url && (
            <img
              src={temple.photo_url}
              alt={temple.name}
              className="w-full h-64 sm:h-80 object-cover"
            />
          )}
          <div className="p-6">
            <h1 className="font-display text-3xl sm:text-4xl mb-2 leading-tight" style={{ color: 'var(--color-deep)' }}>
              {temple.name}
            </h1>
            {temple.city && (
              <p className="text-stone-600">{temple.city}</p>
            )}
            {temple.description && (
              <p className="text-stone-700 mt-4 whitespace-pre-wrap">{temple.description}</p>
            )}
          </div>
        </div>

        {/* Контакты + расписание */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6 space-y-3">
          {temple.address && (
            <Detail label="Адрес" value={temple.address} />
          )}
          {temple.rector && (
            <Detail label="Настоятель" value={temple.rector} />
          )}
          {temple.phone && (
            <Detail label="Телефон" value={
              <a href={`tel:${temple.phone}`} className="hover:underline" style={{ color: 'var(--color-accent-dark)' }}>
                {temple.phone}
              </a>
            } />
          )}
          {temple.email && (
            <Detail label="Email" value={
              <a href={`mailto:${temple.email}`} className="hover:underline" style={{ color: 'var(--color-accent-dark)' }}>
                {temple.email}
              </a>
            } />
          )}
          {temple.website_url && (
            <Detail label="Сайт" value={
              <a href={temple.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all" style={{ color: 'var(--color-accent-dark)' }}>
                {temple.website_url.replace(/^https?:\/\//, '')}
              </a>
            } />
          )}
          {temple.schedule_url && (
            <Detail label="Расписание богослужений" value={
              <a href={temple.schedule_url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all" style={{ color: 'var(--color-accent-dark)' }}>
                Открыть расписание →
              </a>
            } />
          )}
        </div>

        {/* Карта */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 mb-6">
          <div ref={mapContainerRef} className="w-full rounded-lg border border-stone-200 overflow-hidden bg-stone-100" style={{ height: '300px' }} />
        </div>

        {/* Прихожане */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
          <h2 className="font-display text-xl mb-4" style={{ color: 'var(--color-deep)' }}>
            Здесь молятся
            {parishionersCount > 0 && (
              <span className="text-stone-500 text-base ml-2 font-normal">
                {parishionersCount} {pluralize(parishionersCount, ['человек', 'человека', 'человек'])}
              </span>
            )}
          </h2>

          {parishioners.length === 0 ? (
            <p className="text-stone-500 text-sm">
              Пока никто не отметил этот храм как свой приходской. Если вы прихожанин — отметьте в <Link to="/profile/edit" className="underline">настройках профиля</Link>.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {parishioners.map(p => (
                <Link
                  key={p.id}
                  to={`/u/${p.username}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors min-w-0"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-display flex-shrink-0">
                      {p.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-stone-900 truncate">
                      {p.display_name || p.username}
                    </div>
                    <div className="text-xs text-stone-500 truncate">@{p.username}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {parishionersCount > parishioners.length && (
            <p className="text-xs text-stone-500 mt-4 text-center">
              Показаны первые {parishioners.length} из {parishionersCount}
            </p>
          )}
        </div>
      </div>
    </Layout>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
      <div className="text-stone-500 text-xs uppercase tracking-wider pt-0.5">{label}</div>
      <div className="text-stone-900">{value}</div>
    </div>
  )
}

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

export default TemplePage