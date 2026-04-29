import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useYandexMaps } from '../lib/useYandexMaps'

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423]
const DEFAULT_ZOOM = 4
const PENDING_LIMIT = 10

function TempleApplicationPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const { ymaps, loading: mapsLoading, error: mapsError } = useYandexMaps()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placemarkRef = useRef<any>(null)

  // Поля формы
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [rector, setRector] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [scheduleUrl, setScheduleUrl] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [coords, setCoords] = useState<[number, number] | null>(null)

  // Состояния
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Считаем сколько pending заявок у пользователя — спам-защита на UI
  useEffect(() => {
    if (!user) return
    async function loadPending() {
      const { count } = await supabase
        .from('temple_applications')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', user!.id)
        .eq('status', 'pending')
      setPendingCount(count ?? 0)
    }
    loadPending()
  }, [user])

  // Инициализация карты
  useEffect(() => {
    if (!ymaps || !mapContainerRef.current || mapInstanceRef.current) return

    const map = new ymaps.Map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      controls: ['zoomControl', 'geolocationControl', 'fullscreenControl'],
    })

    // Клик по карте — ставим/перемещаем точку
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.events.add('click', (e: any) => {
      const newCoords = e.get('coords') as [number, number]
      setCoords(newCoords)
    })

    mapInstanceRef.current = map

    return () => {
      map.destroy()
      mapInstanceRef.current = null
      placemarkRef.current = null
    }
  }, [ymaps])

  // При смене координат — обновляем маркер на карте
  useEffect(() => {
    if (!ymaps || !mapInstanceRef.current) return
    const map = mapInstanceRef.current

    // Убираем старый маркер
    if (placemarkRef.current) {
      map.geoObjects.remove(placemarkRef.current)
      placemarkRef.current = null
    }

    if (coords) {
      const placemark = new ymaps.Placemark(coords, {
        hintContent: 'Местоположение храма',
      }, {
        preset: 'islands#blueChurchIcon',
        draggable: true,
      })
      placemark.events.add('dragend', () => {
        const newCoords = placemark.geometry.getCoordinates()
        setCoords(newCoords as [number, number])
      })
      map.geoObjects.add(placemark)
      placemarkRef.current = placemark
    }
  }, [ymaps, coords])

  // «Найти по адресу» — только смещаем карту, ничего не сохраняем
  async function handleFindOnMap() {
    if (!ymaps) return
    const query = [city, address].filter(Boolean).join(', ').trim()
    if (!query) {
      setError('Заполните город и адрес для поиска на карте')
      return
    }
    setError(null)
    try {
      // ymaps.geocode используется ТОЛЬКО для смещения карты, результат не сохраняется
      const result = await ymaps.geocode(query, { results: 1 })
      const firstObject = result.geoObjects.get(0)
      if (firstObject) {
        const foundCoords = firstObject.geometry.getCoordinates()
        mapInstanceRef.current.setCenter(foundCoords, 16)
      } else {
        setError('Адрес не найден на карте, попробуйте уточнить')
      }
    } catch {
      setError('Не удалось выполнить поиск')
    }
  }

  if (authLoading) return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  if (!user) return <Navigate to="/login" replace />

  const limitReached = pendingCount !== null && pendingCount >= PENDING_LIMIT

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Укажите название храма')
      return
    }
    if (!coords) {
      setError('Поставьте точку на карте — это обязательно')
      return
    }
    if (limitReached) {
      setError(`Достигнут лимит: одновременно может быть не более ${PENDING_LIMIT} заявок на рассмотрении.`)
      return
    }

    setSubmitting(true)
    const { error: insertErr } = await supabase
      .from('temple_applications')
      .insert({
        profile_id: user!.id,
        name: name.trim(),
        city: city.trim() || null,
        address: address.trim() || null,
        latitude: coords[0],
        longitude: coords[1],
        rector: rector.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website_url: websiteUrl.trim() || null,
        schedule_url: scheduleUrl.trim() || null,
        description: description.trim() || null,
        photo_url: photoUrl.trim() || null,
      })

    if (insertErr) {
      setError(insertErr.message)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
    setTimeout(() => navigate('/profile'), 1500)
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="font-display text-3xl mb-4" style={{ color: 'var(--color-deep)' }}>
            Заявка отправлена
          </h1>
          <p className="text-stone-700">
            Мы рассмотрим её в ближайшее время.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/temples" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
          ← К карте храмов
        </Link>

        <h1 className="font-display text-4xl mb-3 leading-tight" style={{ color: 'var(--color-deep)' }}>
          Предложить храм
        </h1>
        <p className="text-stone-700 mb-8">
          Заполните что знаете — модератор проверит и добавит храм на карту. Точка на карте обязательна, остальные поля — по возможности.
        </p>

        {limitReached && (
          <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
            У вас уже {PENDING_LIMIT} заявок на рассмотрении. Дождитесь решения по ним, прежде чем подавать новые.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основное */}
          <section className="bg-white border border-stone-200 rounded-lg p-6 space-y-5">
            <h2 className="font-display text-xl" style={{ color: 'var(--color-deep)' }}>
              О храме
            </h2>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Название храма *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={150}
                required
                placeholder="Например, Храм Святой Троицы"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-700 mb-1.5">Город</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  maxLength={80}
                  placeholder="Москва"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm text-stone-700 mb-1.5">Настоятель</label>
                <input
                  type="text"
                  value={rector}
                  onChange={e => setRector(e.target.value)}
                  maxLength={120}
                  placeholder="прот. Иоанн Иванов"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Адрес</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                maxLength={200}
                placeholder="ул. Большая Никитская, 36"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Описание</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Особенности храма, история, святыни"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white resize-none"
              />
              <p className="text-xs text-stone-500 mt-1">{description.length} / 500</p>
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Фото храма (ссылка на изображение)</label>
              <input
                type="url"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
              <p className="text-xs text-stone-500 mt-1">
                Дайте ссылку на фото с сайта храма или Яндекс.Карт. Это будет аватар храма на странице.
              </p>
            </div>
          </section>

          {/* Контакты и ссылки */}
          <section className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
            <h2 className="font-display text-xl" style={{ color: 'var(--color-deep)' }}>
              Контакты и ссылки
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-700 mb-1.5">Телефон</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  maxLength={40}
                  placeholder="+7 (495) 000-00-00"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm text-stone-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  maxLength={120}
                  placeholder="info@example.ru"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Сайт храма</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Расписание богослужений (ссылка)</label>
              <input
                type="url"
                value={scheduleUrl}
                onChange={e => setScheduleUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
              <p className="text-xs text-stone-500 mt-1">
                Прямая ссылка на страницу с расписанием — чтобы прихожанам не приходилось искать.
              </p>
            </div>
          </section>

          {/* Карта */}
          <section className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="font-display text-xl" style={{ color: 'var(--color-deep)' }}>
                Местоположение *
              </h2>
              <button
                type="button"
                onClick={handleFindOnMap}
                disabled={!ymaps}
                className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                Найти по адресу
              </button>
            </div>

            <p className="text-sm text-stone-600">
              Кликните на карте, чтобы поставить точку. Если уже поставили — можно перетаскивать.
            </p>

            {mapsError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                Ошибка карт: {mapsError}
              </div>
            )}

            <div
              ref={mapContainerRef}
              className="w-full rounded-lg border border-stone-200 overflow-hidden bg-stone-100"
              style={{ height: '400px' }}
            >
              {mapsLoading && (
                <div className="w-full h-full flex items-center justify-center text-stone-500">
                  Загрузка карты…
                </div>
              )}
            </div>

            {coords && (
              <p className="text-xs text-stone-500">
                Координаты: {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
              </p>
            )}
          </section>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || limitReached}
              className="px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
            >
              {submitting ? 'Отправляем…' : 'Отправить заявку'}
            </button>
            <Link
              to="/temples"
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

export default TempleApplicationPage