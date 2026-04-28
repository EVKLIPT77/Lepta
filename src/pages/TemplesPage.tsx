import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
}

// Центр карты по умолчанию — географический центр европейской России
const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423] // Москва
const DEFAULT_ZOOM = 4

function TemplesPage() {
  const { ymaps, loading: mapsLoading, error: mapsError } = useYandexMaps()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clustererRef = useRef<any>(null)

  const [temples, setTemples] = useState<Temple[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingData, setLoadingData] = useState(true)

  // Загружаем храмы из БД
  useEffect(() => {
    async function loadTemples() {
      const { data, error } = await supabase
        .from('temples')
        .select('id, slug, name, city, address, latitude, longitude')
        .order('name')

      if (error) {
        console.error('Ошибка загрузки храмов:', error)
        setLoadingData(false)
        return
      }

      setTemples((data || []) as Temple[])
      setLoadingData(false)
    }
    loadTemples()
  }, [])

  // Инициализация карты — один раз после загрузки ymaps
  useEffect(() => {
    if (!ymaps || !mapContainerRef.current || mapInstanceRef.current) return

    const map = new ymaps.Map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      controls: ['zoomControl', 'geolocationControl', 'fullscreenControl'],
    })

    mapInstanceRef.current = map

    // Cleanup при размонтировании страницы
    return () => {
      map.destroy()
      mapInstanceRef.current = null
      clustererRef.current = null
    }
  }, [ymaps])

  // Обновляем маркеры когда меняется список храмов или поиск
  // Обновляем кластер с маркерами при изменении списка храмов или поиска
  useEffect(() => {
    if (!ymaps || !mapInstanceRef.current) return

    const map = mapInstanceRef.current

    // Удаляем старый кластер
    if (clustererRef.current) {
      map.geoObjects.remove(clustererRef.current)
      clustererRef.current = null
    }

    // Фильтрация по поиску
    const query = searchQuery.trim().toLowerCase()
    const filtered = query
      ? temples.filter(t =>
          t.name.toLowerCase().includes(query) ||
          (t.city || '').toLowerCase().includes(query)
        )
      : temples

    if (filtered.length === 0) return

    // Создаём кластер — он будет сам группировать близкие маркеры
    const clusterer = new ymaps.Clusterer({
      preset: 'islands#blueClusterIcons',
      groupByCoordinates: false,
      clusterDisableClickZoom: false,
      clusterHideIconOnBalloonOpen: false,
      geoObjectHideIconOnBalloonOpen: false,
    })

    const placemarks = filtered.map(temple =>
      new ymaps.Placemark(
        [temple.latitude, temple.longitude],
        {
          balloonContentHeader: temple.name,
          balloonContentBody: `
            ${temple.city ? `<div style="color:#78716c;font-size:13px;margin-bottom:6px">${temple.city}</div>` : ''}
            ${temple.address ? `<div style="font-size:13px;margin-bottom:8px">${temple.address}</div>` : ''}
            <a href="/temple/${temple.slug}" style="color:#6B5437;text-decoration:underline;font-size:13px">Подробнее →</a>
          `,
          hintContent: temple.name,
        },
        {
          preset: 'islands#blueChurchIcon',
        }
      )
    )

    clusterer.add(placemarks)
    map.geoObjects.add(clusterer)
    clustererRef.current = clusterer

    // Если поиск нашёл один храм — центрируем на нём
    if (query && filtered.length === 1) {
      map.setCenter([filtered[0].latitude, filtered[0].longitude], 14)
    }
  }, [ymaps, temples, searchQuery])

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-display text-4xl leading-tight" style={{ color: 'var(--color-deep)' }}>
            Храмы
          </h1>
          <Link
            to="/temples/new"
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(139, 111, 71, 0.15)', color: 'var(--color-accent-dark)' }}
          >
            Предложить храм
          </Link>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск по названию или городу"
          className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white mb-4"
        />

        {mapsError && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            Ошибка карт: {mapsError}
          </div>
        )}

        {/* Контейнер карты */}
        <div
          ref={mapContainerRef}
          className="w-full rounded-lg border border-stone-200 overflow-hidden bg-stone-100"
          style={{ height: '600px' }}
        >
          {mapsLoading && (
            <div className="w-full h-full flex items-center justify-center text-stone-500">
              Загрузка карты…
            </div>
          )}
        </div>

        {/* Стат / пустое состояние */}
        {!loadingData && temples.length === 0 && (
          <div className="mt-6 bg-white border border-stone-200 rounded-lg p-8 text-center">
            <h2 className="font-display text-xl mb-2" style={{ color: 'var(--color-deep)' }}>
              Пока нет ни одного храма
            </h2>
            <p className="text-sm text-stone-600 mb-5">
              Предложите свой приходской храм — модераторы его проверят и добавят на карту.
            </p>
            <Link
              to="/temples/new"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
            >
              Предложить храм
            </Link>
          </div>
        )}

        {!loadingData && temples.length > 0 && (
          <p className="text-xs text-stone-500 mt-3 text-center">
            {temples.length} {pluralize(temples.length, ['храм', 'храма', 'храмов'])} на карте
          </p>
        )}
      </div>
    </Layout>
  )
}

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

export default TemplesPage