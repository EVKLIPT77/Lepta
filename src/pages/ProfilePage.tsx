import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface Application {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth()
  const [application, setApplication] = useState<Application | null>(null)

  useEffect(() => {
    if (!user) return
    async function loadApp() {
      const { data } = await supabase
        .from('author_applications')
        .select('id, status, created_at')
        .eq('profile_id', user!.id)
        .maybeSingle()
      setApplication(data)
    }
    loadApp()
  }, [user])

  if (loading) {
    return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const isAuthor = profile?.role === 'author' || profile?.role === 'editor' || profile?.role === 'admin'

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl mb-8 leading-tight" style={{ color: 'var(--color-deep)' }}>
          Личный кабинет
        </h1>

        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-5 mb-6">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? profile.username}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-2xl font-display flex-shrink-0">
                {profile?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display text-2xl" style={{ color: 'var(--color-deep)' }}>
                  {profile?.display_name || profile?.username || '—'}
                </span>
                {isAuthor && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(139, 111, 71, 0.15)', color: 'var(--color-accent-dark)' }}>
                    {profile?.role === 'author' ? 'Автор' : profile?.role === 'editor' ? 'Редактор' : 'Администратор'}
                  </span>
                )}
              </div>
              <div className="text-sm text-stone-500 mb-2">@{profile?.username}</div>
              {profile?.bio && (
                <p className="text-sm text-stone-700">{profile.bio}</p>
              )}
            </div>
          </div>

          <dl className="space-y-3 text-sm border-t border-stone-100 pt-4">
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

        {/* Заглушка для продавцов — будет видна по необходимости */}
        {/*
        {!isSeller && (
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h2 className="font-display text-xl mb-3" style={{ color: 'var(--color-deep)' }}>
              Стать продавцом
            </h2>
            <p className="text-sm text-stone-700 mb-4">
              Если у вас есть православная мастерская, монастырское хозяйство или книжное издательство — продавайте товары через Лѣпту.
            </p>
            <Link
              to="/profile/seller-application"
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors inline-block"
              style={{ backgroundColor: 'rgba(139, 111, 71, 0.15)', color: 'var(--color-accent-dark)' }}
            >
              Подать заявку
            </Link>
          </div>
        )}
        */}
      </div>
    </Layout>
  )
}

export default ProfilePage