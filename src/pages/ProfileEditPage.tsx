import { useState, useEffect } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function ProfileEditPage() {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Заполняем форму данными профиля
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setBio(profile.bio ?? '')
      setAvatarUrl(profile.avatar_url ?? null)
    }
  }, [profile])

  if (authLoading) return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  if (!user) return <Navigate to="/login" replace />

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
    // Добавляем timestamp чтобы браузер обновил кеш
    const newUrl = data.publicUrl + '?t=' + Date.now()
    setAvatarUrl(newUrl)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setError(null)
    setSuccess(null)
    setSaving(true)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl
      })
      .eq('id', user.id)

    if (updateError) {
      setError('Не удалось сохранить: ' + updateError.message)
      setSaving(false)
      return
    }

    await refreshProfile()
    setSuccess('Сохранено')
    setSaving(false)

    // Через секунду возвращаемся в ЛК
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

        <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-lg p-6 space-y-5">
          {/* Аватар */}
          <div>
            <label className="block text-sm text-stone-700 mb-2">Фото профиля</label>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Аватар"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-2xl font-display">
                  {profile?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <label className="cursor-pointer">
                <span className="px-4 py-2 border border-stone-300 rounded-lg text-sm hover:bg-stone-100 inline-block">
                  {uploading ? 'Загрузка…' : 'Выбрать фото'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
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

export default ProfileEditPage