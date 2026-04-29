import { useState, useEffect } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth, type SocialLinks, type PrivacySettings } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { getInterestIcon } from '../lib/interestIcons'
import type { Json } from '../types/database'

interface InterestTag {
  id: number
  name: string
  slug: string
  icon: string | null
  sort_order: number | null
}

interface TempleOption {
  id: number
  name: string
  city: string | null
  address: string | null
}

function ProfileEditPage() {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()

  // Базовые поля
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Расширенные поля
  const [christianName, setChristianName] = useState('')
  const [baptismDate, setBaptismDate] = useState('')
  const [city, setCity] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({})
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    christian_name: true,
    baptism_date: false,
    city: false,
    interests: true,
    social_links: true,
  })

  // Интересы
  const [allTags, setAllTags] = useState<InterestTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set())
  const [initialTagIds, setInitialTagIds] = useState<Set<number>>(new Set())

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Приходской храм + отношение к нему
  const [templeRelation, setTempleRelation] = useState<'parishioner' | 'occasional' | 'seeking' | null>(null)
  const [templeId, setTempleId] = useState<number | null>(null)

  // Двухступенчатый поиск: сначала город, потом храм
  const [allCities, setAllCities] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [cityQuery, setCityQuery] = useState('')
  const [cityDropdown, setCityDropdown] = useState(false)

  const [templeQuery, setTempleQuery] = useState('')
  const [templeOptions, setTempleOptions] = useState<TempleOption[]>([])
  const [templeDropdown, setTempleDropdown] = useState(false)
  
  // Заполняем форму данными профиля
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setBio(profile.bio ?? '')
      setAvatarUrl(profile.avatar_url ?? null)
      setChristianName(profile.christian_name ?? '')
      setBaptismDate(profile.baptism_date ?? '')
      setCity(profile.city ?? '')
      setSocialLinks(profile.social_links ?? {})
      setPrivacy(profile.privacy_settings)
      setTempleId(profile.temple_id)
      setTempleRelation(profile.temple_relation ?? null)
    }
  }, [profile])
  // Если у пользователя уже есть приходской храм — показываем город и название в полях.
  // Зависим только от temple_id — при смене других полей profile перезапускать не надо.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profile?.temple_id) return
    async function loadCurrentTemple() {
      const { data } = await supabase
        .from('temples')
        .select('name, city, address')
        .eq('id', profile!.temple_id!)
        .maybeSingle()
      if (data) {
        if (data.city) {
          setSelectedCity(data.city)
          setCityQuery(data.city)
        }
        setTempleQuery(data.name)
      }
    }
    loadCurrentTemple()
  }, [profile?.temple_id])

  // Загружаем все теги и текущие интересы пользователя
  useEffect(() => {
    if (!user) return

    async function loadTagsData() {
      const [{ data: tags }, { data: myInterests }] = await Promise.all([
        supabase.from('interest_tags').select('*').order('sort_order', { ascending: true }),
        supabase.from('profile_interests').select('tag_id').eq('profile_id', user!.id),
      ])

      setAllTags((tags || []) as InterestTag[])
      const ids = new Set((myInterests || []).map(i => i.tag_id))
      setSelectedTagIds(ids)
      setInitialTagIds(new Set(ids))
    }

    loadTagsData()
  }, [user])
  // Загружаем уникальные города один раз. Для масштаба до пары тысяч храмов норм.
  useEffect(() => {
    async function loadCities() {
      const { data } = await supabase
        .from('temples')
        .select('city')
        .not('city', 'is', null)
        .order('city')
      const unique = Array.from(
        new Set((data || []).map(r => r.city).filter((c): c is string => Boolean(c)))
      )
      setAllCities(unique)
    }
    loadCities()
  }, [])

  useEffect(() => {
    if (!selectedCity) {
      setTempleOptions([])
      return
    }
    const q = templeQuery.trim()
    if (templeId !== null) return // уже выбран — не ищем

    const handle = setTimeout(async () => {
      let query = supabase
        .from('temples')
        .select('id, name, city, address')
        .eq('city', selectedCity)
        .order('name')
        .limit(20)

      if (q) {
        query = query.ilike('name', `%${q}%`)
      }

      const { data } = await query
      setTempleOptions((data || []) as TempleOption[])
    }, 250)

    return () => clearTimeout(handle)
  }, [templeQuery, templeId, selectedCity])
  if (authLoading) return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  if (!user) return <Navigate to="/login" replace />

  function toggleTag(tagId: number) {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  function updateSocialLink(key: keyof SocialLinks, value: string) {
    setSocialLinks(prev => {
      const next = { ...prev }
      const trimmed = value.trim()
      if (trimmed) next[key] = trimmed
      else delete next[key]
      return next
    })
  }

  function updatePrivacy(key: keyof PrivacySettings, value: boolean) {
    setPrivacy(prev => ({ ...prev, [key]: value }))
  }

  // Поиск храмов с дебаунсом (минимально, без библиотеки)
  // Поиск храма — только если выбран город. С дебаунсом.
  

  function selectCity(city: string) {
    setSelectedCity(city)
    setCityQuery(city)
    setCityDropdown(false)
    // Сбрасываем выбор храма при смене города
    setTempleId(null)
    setTempleQuery('')
    setTempleOptions([])
  }

  function clearCity() {
    setSelectedCity(null)
    setCityQuery('')
    setTempleId(null)
    setTempleQuery('')
    setTempleOptions([])
  }

  function selectTemple(t: TempleOption) {
    setTempleId(t.id)
    setTempleQuery(t.name)
    setTempleDropdown(false)
    setTempleOptions([])
  }

  function clearTemple() {
    setTempleId(null)
    setTempleQuery('')
    setTempleOptions([])
  }

  // Фильтрация городов для выпадашки
  const filteredCities = cityQuery.trim()
    ? allCities.filter(c => c.toLowerCase().includes(cityQuery.trim().toLowerCase())).slice(0, 10)
    : allCities.slice(0, 10)

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Файл слишком большой, максимум 2 МБ')
      return
    }

    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setError('Ошибка загрузки: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const newUrl = data.publicUrl + '?t=' + Date.now()
    setAvatarUrl(newUrl)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return

    setError(null)
    setSuccess(null)
    setSaving(true)

    // Обновляем основной профиль
   const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        christian_name: christianName.trim() || null,
        baptism_date: baptismDate || null,
        city: city.trim() || null,
        social_links: socialLinks as unknown as Json,
        privacy_settings: privacy as unknown as Json,
        temple_id: templeRelation === 'seeking' ? null : templeId,
        temple_relation: templeRelation,
      })
      .eq('id', user.id)

    if (updateError) {
      setError('Не удалось сохранить: ' + updateError.message)
      setSaving(false)
      return
    }

    // Синхронизируем интересы — вычисляем что добавить/удалить
    const toAdd: number[] = []
    const toRemove: number[] = []
    selectedTagIds.forEach(id => { if (!initialTagIds.has(id)) toAdd.push(id) })
    initialTagIds.forEach(id => { if (!selectedTagIds.has(id)) toRemove.push(id) })

    if (toRemove.length > 0) {
      const { error: rmErr } = await supabase
        .from('profile_interests')
        .delete()
        .eq('profile_id', user.id)
        .in('tag_id', toRemove)
      if (rmErr) {
        setError('Не удалось обновить интересы: ' + rmErr.message)
        setSaving(false)
        return
      }
    }

    if (toAdd.length > 0) {
      const rows = toAdd.map(tag_id => ({ profile_id: user.id, tag_id }))
      const { error: addErr } = await supabase.from('profile_interests').insert(rows)
      if (addErr) {
        setError('Не удалось обновить интересы: ' + addErr.message)
        setSaving(false)
        return
      }
    }

    await refreshProfile()
    setInitialTagIds(new Set(selectedTagIds)) // фиксируем новое начальное состояние
    setSuccess('Сохранено')
    setSaving(false)

    setTimeout(() => navigate('/profile'), 800)
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/profile" className="text-sm text-stone-600 hover:text-stone-900 mb-4 inline-block">
          ← К профилю
        </Link>

        <h1 className="font-display text-4xl mb-8 leading-tight" style={{ color: 'var(--color-deep)' }}>
          Редактирование профиля
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* === Блок 1. Основное === */}
          <section className="bg-white border border-stone-200 rounded-lg p-6 space-y-5">
            <h2 className="font-display text-xl" style={{ color: 'var(--color-deep)' }}>
              Основное
            </h2>

            {/* Аватар */}
            <div>
              <label className="block text-sm text-stone-700 mb-2">Фото профиля</label>
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Аватар" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-2xl font-display">
                    {profile?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className="px-4 py-2 border border-stone-300 rounded-lg text-sm hover:bg-stone-100 inline-block">
                    {uploading ? 'Загрузка…' : 'Выбрать фото'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-stone-500 mt-2">JPG, PNG или WebP, до 2 МБ</p>
            </div>

            {/* Username (read-only) */}
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Username</label>
              <input
                type="text"
                value={profile?.username ?? ''}
                readOnly
                className="w-full px-4 py-2 border border-stone-200 bg-stone-50 rounded-lg text-stone-500"
              />
              <p className="text-xs text-stone-500 mt-1">Username нельзя изменить</p>
            </div>

            {/* Display name */}
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Имя</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={60}
                placeholder="Как показывать ваше имя"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm text-stone-700 mb-1.5">О себе</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Несколько слов о себе"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white resize-none"
              />
              <p className="text-xs text-stone-500 mt-1">{bio.length} / 500</p>
            </div>
          </section>

          {/* === Блок 2. О духовной жизни === */}
          <section className="bg-white border border-stone-200 rounded-lg p-6 space-y-5">
            <h2 className="font-display text-xl" style={{ color: 'var(--color-deep)' }}>
              Духовная жизнь
            </h2>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Имя в крещении</label>
              <input
                type="text"
                value={christianName}
                onChange={e => setChristianName(e.target.value)}
                maxLength={40}
                placeholder="Например, Алексий"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Дата крещения</label>
              <input
                type="date"
                value={baptismDate}
                onChange={e => setBaptismDate(e.target.value)}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Город</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                maxLength={80}
                placeholder="Где живёте"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>
          </section>
          {/* === Блок 2.5. Приходской храм === */}
          <section className="bg-white border border-stone-200 rounded-lg p-6 space-y-5">
            <div>
              <h2 className="font-display text-xl mb-1" style={{ color: 'var(--color-deep)' }}>
                Приходской храм
              </h2>
              <p className="text-sm text-stone-500">
                Расскажите о вашем отношении к храму. Это помогает другим понять, на каком этапе пути вы находитесь.
              </p>
            </div>

            {/* Радио: тип отношения */}
            <div className="space-y-2">
              <RelationOption
                label="Я постоянный прихожанин"
                description="Хожу регулярно в один храм, считаю его своим"
                value="parishioner"
                checked={templeRelation === 'parishioner'}
                onChange={setTempleRelation}
              />
              <RelationOption
                label="Иногда бываю"
                description="Хожу в храм, но не считаю себя постоянным прихожанином"
                value="occasional"
                checked={templeRelation === 'occasional'}
                onChange={setTempleRelation}
              />
              <RelationOption
                label="Пока ищу свой храм"
                description="Только начинаю свой путь или ещё не нашёл постоянный храм"
                value="seeking"
                checked={templeRelation === 'seeking'}
                onChange={setTempleRelation}
              />
            </div>

            {/* Выбор города и храма — только если выбраны parishioner или occasional */}
            {(templeRelation === 'parishioner' || templeRelation === 'occasional') && (
              <div className="space-y-4 pt-3 border-t border-stone-100">
                {/* Город */}
                <div className="relative">
                  <label className="block text-sm text-stone-700 mb-1.5">
                    Город храма <span className="text-stone-400">(сначала выберите город)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cityQuery}
                      onChange={e => {
                        setCityQuery(e.target.value)
                        if (selectedCity !== null) {
                          setSelectedCity(null)
                          setTempleId(null)
                          setTempleQuery('')
                        }
                        setCityDropdown(true)
                      }}
                      onFocus={() => setCityDropdown(true)}
                      onBlur={() => setTimeout(() => setCityDropdown(false), 150)}
                      placeholder="Например, Москва"
                      className="w-full px-4 py-2 pr-10 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
                    />
                    {selectedCity && (
                      <button
                        type="button"
                        onClick={clearCity}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 px-2"
                        aria-label="Очистить город"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {cityDropdown && filteredCities.length > 0 && !selectedCity && (
                    <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-md max-h-60 overflow-y-auto">
                      {filteredCities.map(c => (
                        <li key={c}>
                          <button
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => selectCity(c)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 border-b border-stone-100 last:border-b-0"
                          >
                            {c}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {cityDropdown && cityQuery.trim() && filteredCities.length === 0 && !selectedCity && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-md px-4 py-3 text-sm text-stone-500">
                      В этом городе пока нет добавленных храмов. <Link to="/temples/new" className="underline" style={{ color: 'var(--color-accent-dark)' }}>Предложить храм</Link>
                    </div>
                  )}
                </div>

                {/* Храм — показываем только если выбран город */}
                {selectedCity && (
                  <div className="relative">
                    <label className="block text-sm text-stone-700 mb-1.5">Храм</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={templeQuery}
                        onChange={e => {
                          setTempleQuery(e.target.value)
                          if (templeId !== null) setTempleId(null)
                          setTempleDropdown(true)
                        }}
                        onFocus={() => setTempleDropdown(true)}
                        onBlur={() => setTimeout(() => setTempleDropdown(false), 150)}
                        placeholder="Начните вводить название"
                        className="w-full px-4 py-2 pr-10 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
                      />
                      {templeId !== null && (
                        <button
                          type="button"
                          onClick={clearTemple}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 px-2"
                          aria-label="Очистить"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {templeDropdown && templeOptions.length > 0 && templeId === null && (
                      <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-md max-h-72 overflow-y-auto">
                        {templeOptions.map(t => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => selectTemple(t)}
                              className="w-full text-left px-4 py-2 hover:bg-stone-50 border-b border-stone-100 last:border-b-0"
                            >
                              <div className="text-sm text-stone-900">{t.name}</div>
                              {t.address && <div className="text-xs text-stone-500 mt-0.5">{t.address}</div>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <p className="text-xs text-stone-500">
                  Не нашли свой храм? <Link to="/temples/new" className="underline" style={{ color: 'var(--color-accent-dark)' }}>Предложите добавить</Link>.
                </p>
              </div>
            )}
          </section>
          {/* === Блок 3. Интересы === */}
          <section className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="font-display text-xl mb-1" style={{ color: 'var(--color-deep)' }}>
                Духовные интересы
              </h2>
              <p className="text-sm text-stone-500">
                Выберите темы, которые вам близки. Это поможет другим находить единомышленников.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => {
                const Icon = getInterestIcon(tag.icon)
                const active = selectedTagIds.has(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors"
                    style={
                      active
                        ? { backgroundColor: 'var(--color-deep)', color: 'white', borderColor: 'var(--color-deep)' }
                        : { backgroundColor: 'white', color: 'var(--color-accent-dark)', borderColor: 'rgba(139, 111, 71, 0.3)' }
                    }
                  >
                    <Icon size={14} />
                    {tag.name}
                  </button>
                )
              })}
            </div>
            {allTags.length === 0 && (
              <p className="text-sm text-stone-500">Загрузка тегов…</p>
            )}
          </section>

          {/* === Блок 4. Соцсети === */}
          <section className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
            <h2 className="font-display text-xl" style={{ color: 'var(--color-deep)' }}>
              Контакты и ссылки
            </h2>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Telegram</label>
              <input
                type="text"
                value={socialLinks.telegram ?? ''}
                onChange={e => updateSocialLink('telegram', e.target.value)}
                placeholder="@username или ссылка"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">VK</label>
              <input
                type="text"
                value={socialLinks.vk ?? ''}
                onChange={e => updateSocialLink('vk', e.target.value)}
                placeholder="username или ссылка"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1.5">Сайт</label>
              <input
                type="url"
                value={socialLinks.website ?? ''}
                onChange={e => updateSocialLink('website', e.target.value)}
                placeholder="https://"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>
          </section>

          {/* === Блок 5. Приватность === */}
          <section className="bg-white border border-stone-200 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="font-display text-xl mb-1" style={{ color: 'var(--color-deep)' }}>
                Приватность
              </h2>
              <p className="text-sm text-stone-500">
                Что показывать на публичной странице профиля. Имя, фото, био и юзернейм публичны всегда.
              </p>
            </div>

            <div className="space-y-2.5">
              <PrivacyRow
                label="Имя в крещении"
                checked={privacy.christian_name}
                onChange={v => updatePrivacy('christian_name', v)}
              />
              <PrivacyRow
                label="Дата крещения"
                checked={privacy.baptism_date}
                onChange={v => updatePrivacy('baptism_date', v)}
              />
              <PrivacyRow
                label="Город"
                checked={privacy.city}
                onChange={v => updatePrivacy('city', v)}
              />
              <PrivacyRow
                label="Интересы"
                checked={privacy.interests}
                onChange={v => updatePrivacy('interests', v)}
              />
              <PrivacyRow
                label="Контакты и ссылки"
                checked={privacy.social_links}
                onChange={v => updatePrivacy('social_links', v)}
              />
            </div>
          </section>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
            >
              {saving ? 'Сохраняем…' : 'Сохранить'}
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

function PrivacyRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer">
      <span className="text-sm text-stone-700">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-xs text-stone-500 select-none">
          {checked ? 'Видно всем' : 'Скрыто'}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 rounded accent-stone-700"
        />
      </span>
    </label>
  )
}
function RelationOption({
  label, description, value, checked, onChange
}: {
  label: string
  description: string
  value: 'parishioner' | 'occasional' | 'seeking'
  checked: boolean
  onChange: (v: 'parishioner' | 'occasional' | 'seeking' | null) => void
}) {
  return (
    <label
      className="flex gap-3 items-start p-3 rounded-lg border cursor-pointer transition-colors"
      style={
        checked
          ? { borderColor: 'var(--color-accent)', backgroundColor: 'rgba(139, 111, 71, 0.06)' }
          : { borderColor: 'rgb(231, 229, 228)' }
      }
    >
      <input
        type="radio"
        name="temple-relation"
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1 accent-stone-700"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-stone-900">{label}</div>
        <div className="text-xs text-stone-500 mt-0.5">{description}</div>
      </div>
    </label>
  )
}
export default ProfileEditPage
