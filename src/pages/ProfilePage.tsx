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
interface TempleApp {
  id: number
  name: string
  city: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string | null
  reviewer_comment: string | null
  temple_slug: string | null
}

function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth()
  const [application, setApplication] = useState<Application | null>(null)
  const [interests, setInterests] = useState<ProfileInterest[]>([])
  const [templeApps, setTempleApps] = useState<TempleApp[]>([])
  const [authorSlug, setAuthorSlug] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  useEffect(() => {
    if (!user) return

    async function load() {
      const [{ data: appData }, { data: interestsData }, { data: templeAppsData }, { data: authorRow }] = await Promise.all([
        supabase
          .from('author_applications')
          .select('id, status, created_at')
          .eq('profile_id', user!.id)
          .maybeSingle(),
        supabase
          .from('profile_interests')
          .select('tag_id, interest_tags(id, name, icon, sort_order)')
          .eq('profile_id', user!.id),
        supabase
          .from('temple_applications')
          .select('id, name, city, status, created_at, reviewer_comment, resulting_temple_id')
          .eq('profile_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('authors')
          .select('slug')
          .eq('profile_id', user!.id)
          .maybeSingle(),
      ])

      // Заявка на авторство
      if (appData) {
        const validStatuses = ['pending', 'approved', 'rejected'] as const
        const status = (validStatuses as readonly string[]).includes(appData.status)
          ? (appData.status as Application['status'])
          : 'pending'
        setApplication({ ...appData, status })
      } else {
        setApplication(null)
      }

      // Интересы
      const tags = (interestsData || [])
        .map(row => row.interest_tags)
        .filter((t): t is { id: number; name: string; icon: string | null; sort_order: number | null } => Boolean(t))
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
        .map(t => ({ id: t.id, name: t.name, icon: t.icon }))
      setInterests(tags)

      // Заявки на храмы
      const validStatuses = ['pending', 'approved', 'rejected'] as const
      let apps: TempleApp[] = (templeAppsData || []).map(a => ({
        id: a.id,
        name: a.name,
        city: a.city,
        status: ((validStatuses as readonly string[]).includes(a.status) ? a.status : 'pending') as TempleApp['status'],
        created_at: a.created_at,
        reviewer_comment: a.reviewer_comment,
        temple_slug: null as string | null,
      }))

      // Догружаем slug'и для approved-заявок отдельным запросом
      const approvedTempleIds = (templeAppsData || [])
        .filter(a => a.status === 'approved' && a.resulting_temple_id)
        .map(a => a.resulting_temple_id as number)

      if (approvedTempleIds.length > 0) {
        const { data: templesData } = await supabase
          .from('temples')
          .select('id, slug')
          .in('id', approvedTempleIds)

        const slugMap = new Map((templesData || []).map(t => [t.id, t.slug]))
        apps = apps.map(app => {
          const original = (templeAppsData || []).find(a => a.id === app.id)
          const tid = original?.resulting_temple_id
          return tid ? { ...app, temple_slug: slugMap.get(tid) ?? null } : app
        })
      }

      setTempleApps(apps)
      setAuthorSlug(authorRow?.slug ?? null)
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

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('delete_own_account')
    if (error) {
      setDeleteError('Не удалось удалить аккаунт: ' + error.message)
      setDeleting(false)
      return
    }
    await signOut()
  }
  
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
              to={authorSlug ? `/author/${authorSlug}` : `/u/${profile.username}`}
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
        {/* Удаление аккаунта */}
        <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
          <h2 className="font-display text-xl mb-1" style={{ color: 'var(--color-deep)' }}>
            Удаление аккаунта
          </h2>
          {!confirmDelete ? (
            <>
              <p className="text-sm text-stone-500 mb-4">
                {isAuthor
                  ? 'Будут удалены профиль, все публикации и данные автора. Это действие необратимо.'
                  : 'Будут удалены профиль и все связанные данные. Это действие необратимо.'}
              </p>
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-5 py-2.5 rounded-lg text-sm border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
              >
                Удалить аккаунт
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-red-700 mb-4">
                Вы уверены? Восстановить данные будет невозможно.
              </p>
              {deleteError && (
                <p className="text-sm text-red-600 mb-3">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Удаляем…' : 'Да, удалить навсегда'}
                </button>
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-lg text-sm border border-stone-300 hover:bg-stone-100 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </>
          )}
        </div>

        {/* Мои заявки на храмы */}
        {templeApps.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
            <h2 className="font-display text-xl mb-4" style={{ color: 'var(--color-deep)' }}>
              Мои заявки на храмы
            </h2>
            <div className="space-y-3">
              {templeApps.map(app => (
                <div key={app.id} className="border border-stone-100 rounded-lg p-4 flex items-start gap-3">
                  <TempleAppStatusBadge status={app.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-900">{app.name}</div>
                    {app.city && <div className="text-xs text-stone-500 mt-0.5">{app.city}</div>}
                    {app.status === 'rejected' && app.reviewer_comment && (
                      <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 mt-2">
                        {app.reviewer_comment}
                      </div>
                    )}
                    {app.status === 'approved' && app.temple_slug && (
                      <Link
                        to={`/temple/${app.temple_slug}`}
                        className="text-xs underline mt-2 inline-block"
                        style={{ color: 'var(--color-accent-dark)' }}
                      >
                        Открыть страницу храма →
                      </Link>
                    )}
                    {app.created_at && (
                      <div className="text-xs text-stone-400 mt-1">
                        Подана {new Date(app.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function TempleAppStatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full whitespace-nowrap"
            style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#92400e' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        На рассмотрении
      </span>
    )
  }
  if (status === 'approved') {
    return (
      <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
            style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#065f46' }}>
        Одобрена
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
          style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#991b1b' }}>
        Отклонена
    </span>
  )
}

export default ProfilePage
