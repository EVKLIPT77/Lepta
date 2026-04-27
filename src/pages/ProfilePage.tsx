import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ProfileCard, { type ProfileInterest } from '../components/ProfileCard'

interface Application {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth()
  const [application, setApplication] = useState<Application | null>(null)
  const [interests, setInterests] = useState<ProfileInterest[]>([])

  useEffect(() => {
    if (!user) return

    async function load() {
      const [{ data: appData }, { data: interestsData }] = await Promise.all([
        supabase
          .from('author_applications')
          .select('id, status, created_at')
          .eq('profile_id', user!.id)
          .maybeSingle(),
        supabase
          .from('profile_interests')
          .select('tag_id, interest_tags(id, name, icon, sort_order)')
          .eq('profile_id', user!.id),
      ])

      // Заявка
      if (appData) {
        const validStatuses = ['pending', 'approved', 'rejected'] as const
        const status = (validStatuses as readonly string[]).includes(appData.status)
          ? (appData.status as Application['status'])
          : 'pending'
        setApplication({ ...appData, status })
      } else {
        setApplication(null)
      }

      // Интересы (через join)
      const tags = (interestsData || [])
        .map(row => row.interest_tags)
        .filter((t): t is { id: number; name: string; icon: string | null; sort_order: number | null } => Boolean(t))
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
        .map(t => ({ id: t.id, name: t.name, icon: t.icon }))
      setInterests(tags)
    }

    load()
  }, [user])

  if (loading) {
    return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  const isAuthor = profile.role === 'author' || profile.role === 'editor' || profile.role === 'admin'

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl mb-8 leading-tight" style={{ color: 'var(--color-deep)' }}>
          Личный кабинет
        </h1>

        {/* Карточка профиля — режим владельца, видим всё */}
        <div className="mb-6">
          <ProfileCard
            data={profile}
            interests={interests}
            viewMode="owner"
          />
        </div>

        {/* Кнопки и контакт-данные владельца */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-stone-500 text-xs uppercase tracking-wider">Email</dt>
              <dd className="text-stone-900 mt-0.5">{user.email}</dd>
            </div>
          </dl>

          <div className="flex gap-3 mt-6 flex-wrap">
            <Link
              to="/profile/edit"
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
            >
              Редактировать профиль
            </Link>
            {isAuthor && (
              <Link
                to="/profile/posts"
                className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'rgba(139, 111, 71, 0.15)', color: 'var(--color-accent-dark)' }}
              >
                Мои публикации
              </Link>
            )}
            <Link
              to={isAuthor ? `/author/${profile.username}` : `/u/${profile.username}`}
              className="px-5 py-2.5 rounded-lg text-sm border border-stone-300 hover:bg-stone-100 transition-colors"
            >
              Открыть мою страницу
            </Link>
            <button
              onClick={signOut}
              className="px-5 py-2.5 rounded-lg text-sm border border-stone-300 hover:bg-stone-100 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Блок заявки на авторство */}
        {!isAuthor && (
          <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
            <h2 className="font-display text-xl mb-3" style={{ color: 'var(--color-deep)' }}>
              Стать автором
            </h2>

            {!application && (
              <>
                <p className="text-sm text-stone-700 mb-4">
                  Хотите публиковать материалы на Лѣпте? Подайте заявку — для этого нужен скан письменного благословения от священника.
                </p>
                <Link
                  to="/profile/author-application"
                  className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors inline-block"
                  style={{ backgroundColor: 'rgba(139, 111, 71, 0.15)', color: 'var(--color-accent-dark)' }}
                >
                  Подать заявку
                </Link>
              </>
            )}

            {application?.status === 'pending' && (
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-stone-900">Заявка на рассмотрении</div>
                  <div className="text-xs text-stone-500">Подана {new Date(application.created_at).toLocaleDateString('ru-RU')}</div>
                </div>
                <Link
                  to="/profile/author-application"
                  className="text-sm text-stone-600 hover:text-stone-900 underline"
                >
                  Подробнее
                </Link>
              </div>
            )}

            {application?.status === 'rejected' && (
              <div>
                <div className="text-sm text-stone-900 mb-2">
                  <span className="text-amber-700">Предыдущая заявка отклонена.</span> Вы можете подать снова.
                </div>
                <Link
                  to="/profile/author-application"
                  className="text-sm underline"
                  style={{ color: 'var(--color-accent-dark)' }}
                >
                  Подать заявку повторно →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ProfilePage
