// Публичная страница профиля для НЕ-авторов: /u/:username.
// Если пользователь — автор, редиректим на /author/:slug
// (так у автора одна публичная страница, а не две).

import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ProfileCard, { type ProfileCardData, type ProfileInterest } from '../components/ProfileCard'
import type { PrivacySettings, SocialLinks } from '../contexts/AuthContext'

const DEFAULT_PRIVACY: PrivacySettings = {
  christian_name: true,
  baptism_date: false,
  city: false,
  interests: true,
  social_links: true,
}

function UserPage() {
  const { username } = useParams<{ username: string }>()
  const [data, setData] = useState<ProfileCardData | null>(null)
  const [interests, setInterests] = useState<ProfileInterest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirectToAuthor, setRedirectToAuthor] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return

    async function load() {
      setLoading(true)
      setError(null)

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username!)
        .maybeSingle()

      if (profErr) {
        setError(profErr.message)
        setLoading(false)
        return
      }
      if (!prof) {
        setError('Пользователь не найден')
        setLoading(false)
        return
      }

      // Если автор — отдаём команду на редирект
      if (prof.role === 'author' || prof.role === 'editor' || prof.role === 'admin') {
        setRedirectToAuthor(prof.username)
        return
      }

      // Сужаем role к union (Supabase возвращает text)
      const validRoles = ['reader', 'author', 'editor', 'admin'] as const
      const role = (validRoles as readonly string[]).includes(prof.role)
        ? (prof.role as ProfileCardData['role'])
        : 'reader'

      const cardData: ProfileCardData = {
        username: prof.username,
        display_name: prof.display_name,
        avatar_url: prof.avatar_url,
        bio: prof.bio,
        christian_name: prof.christian_name,
        baptism_date: prof.baptism_date,
        city: prof.city,
        social_links: (prof.social_links ?? {}) as SocialLinks,
        privacy_settings: { ...DEFAULT_PRIVACY, ...((prof.privacy_settings ?? {}) as Partial<PrivacySettings>) },
        role,
      }
      setData(cardData)

      // Интересы (если разрешены приватностью — в любом случае грузим, ProfileCard сам решит показывать ли)
      const { data: interestsData } = await supabase
        .from('profile_interests')
        .select('tag_id, interest_tags(id, name, icon, sort_order)')
        .eq('profile_id', prof.id)

      const tags = (interestsData || [])
        .map(row => row.interest_tags)
        .filter((t): t is { id: number; name: string; icon: string | null; sort_order: number | null } => Boolean(t))
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
        .map(t => ({ id: t.id, name: t.name, icon: t.icon }))
      setInterests(tags)

      setLoading(false)
    }

    load()
  }, [username])

  if (redirectToAuthor) {
    return <Navigate to={`/author/${redirectToAuthor}`} replace />
  }

  if (loading) {
    return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <p className="text-red-600 mb-4">{error || 'Не удалось открыть профиль'}</p>
          <Link to="/" className="text-stone-700 underline">На главную</Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <ProfileCard data={data} interests={interests} viewMode="public" />
      </div>
    </Layout>
  )
}

export default UserPage
