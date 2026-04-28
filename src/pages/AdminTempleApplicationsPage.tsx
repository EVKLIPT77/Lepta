import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

type Status = 'pending' | 'approved' | 'rejected'

interface TempleApp {
  id: number
  name: string
  city: string | null
  status: Status
  created_at: string | null
  reviewed_at: string | null
  profile: {
    username: string
    display_name: string | null
  } | null
}

const STATUSES: { key: Status | 'all'; label: string }[] = [
  { key: 'pending', label: 'На рассмотрении' },
  { key: 'approved', label: 'Одобрены' },
  { key: 'rejected', label: 'Отклонены' },
  { key: 'all', label: 'Все' },
]

function AdminTempleApplicationsPage() {
  const { profile, loading: authLoading } = useAuth()
  const [filter, setFilter] = useState<Status | 'all'>('pending')
  const [items, setItems] = useState<TempleApp[]>([])
  const [loading, setLoading] = useState(true)

  const isEditor = profile?.role === 'editor' || profile?.role === 'admin'

  useEffect(() => {
    if (!isEditor) return

    async function load() {
      setLoading(true)
      let query = supabase
        .from('temple_applications')
        .select('id, name, city, status, created_at, reviewed_at, profiles!profile_id(username, display_name)')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data } = await query
      const validStatuses = ['pending', 'approved', 'rejected'] as const
      const apps: TempleApp[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        city: row.city,
        status: ((validStatuses as readonly string[]).includes(row.status) ? row.status : 'pending') as Status,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
        profile: row.profiles as TempleApp['profile'],
      }))
      setItems(apps)
      setLoading(false)
    }
    load()
  }, [isEditor, filter])

  if (authLoading) return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  if (!isEditor) return <Navigate to="/" replace />

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl mb-8 leading-tight" style={{ color: 'var(--color-deep)' }}>
          Заявки на храмы
        </h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className="px-4 py-1.5 rounded-full text-sm transition-colors"
              style={{
                backgroundColor: filter === s.key ? 'var(--color-deep)' : 'rgba(139, 111, 71, 0.1)',
                color: filter === s.key ? 'white' : 'var(--color-accent-dark)'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-stone-500">Загрузка…</p>}

        {!loading && items.length === 0 && (
          <p className="text-stone-500 text-center py-10">Нет заявок в этой категории</p>
        )}

        <div className="space-y-3">
          {items.map(app => (
            <Link
              key={app.id}
              to={`/admin/temple-applications/${app.id}`}
              className="block bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm hover:border-stone-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg mb-1" style={{ color: 'var(--color-deep)' }}>
                    {app.name}
                  </div>
                  {app.city && (
                    <div className="text-sm text-stone-600 mb-1">{app.city}</div>
                  )}
                  {app.profile && (
                    <div className="text-xs text-stone-500">
                      от @{app.profile.username}
                      {app.profile.display_name && ` (${app.profile.display_name})`}
                    </div>
                  )}
                </div>
                <StatusPill status={app.status} />
              </div>
              {app.created_at && (
                <div className="text-xs text-stone-400 mt-2">
                  Подана {new Date(app.created_at).toLocaleDateString('ru-RU')}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}

function StatusPill({ status }: { status: Status }) {
  if (status === 'pending') return (
    <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
          style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#92400e' }}>
      Ожидает
    </span>
  )
  if (status === 'approved') return (
    <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
          style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#065f46' }}>
      Одобрена
    </span>
  )
  return (
    <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
          style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#991b1b' }}>
      Отклонена
    </span>
  )
}

export default AdminTempleApplicationsPage