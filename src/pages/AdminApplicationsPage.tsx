import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

interface ApplicationWithProfile {
  id: string
  profile_id: string
  motivation: string
  blessing_doc_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewer_comment: string | null
  created_at: string
  reviewed_at: string | null
  profiles: {
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

function AdminApplicationsPage() {
  const { profile, loading: authLoading } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  const isEditor = profile?.role === 'editor' || profile?.role === 'admin'

  useEffect(() => {
    if (!isEditor) return

    async function load() {
      let query = supabase
        .from('author_applications')
        .select('*, profiles(username, display_name, avatar_url)')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data } = await query
      setApplications((data || []).map(a => ({
        ...a,
        status: ((['pending','approved','rejected'] as const).includes(a.status as 'pending') ? a.status : 'pending') as 'pending' | 'approved' | 'rejected'
      })))
      setLoading(false)
    }
    load()
  }, [isEditor, filter])

  if (authLoading) {
    return <Layout><div className="p-10 text-stone-500">Загрузка…</div></Layout>
  }

  if (!isEditor) {
    return <Navigate to="/" replace />
  }

  const filterLabels: Record<string, string> = {
    pending: 'На рассмотрении',
    approved: 'Одобренные',
    rejected: 'Отклонённые',
    all: 'Все'
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl mb-2 leading-tight" style={{ color: 'var(--color-deep)' }}>
          Заявки на авторство
        </h1>
        <p className="text-stone-600 mb-6">Панель редактора</p>

        {/* Фильтр */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm transition-colors"
              style={{
                backgroundColor: filter === f ? 'var(--color-deep)' : 'rgba(139, 111, 71, 0.1)',
                color: filter === f ? 'white' : 'var(--color-accent-dark)'
              }}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {loading && <p className="text-stone-500">Загрузка…</p>}

        {!loading && applications.length === 0 && (
          <p className="text-stone-500 text-center py-12">Нет заявок в этом разделе</p>
        )}

        <div className="space-y-3">
          {applications.map(app => (
            <Link
              key={app.id}
              to={`/admin/applications/${app.id}`}
              className="block bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm hover:border-stone-300 transition-all"
            >
              <div className="flex items-start gap-4">
                {app.profiles?.avatar_url ? (
                  <img
                    src={app.profiles.avatar_url}
                    alt={app.profiles.username}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-xl font-display flex-shrink-0">
                    {app.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap mb-1">
                    <span className="font-display text-base" style={{ color: 'var(--color-deep)' }}>
                      {app.profiles?.display_name || app.profiles?.username}
                    </span>
                    <span className="text-xs text-stone-500">@{app.profiles?.username}</span>
                  </div>

                  <p className="text-sm text-stone-700 line-clamp-2 mb-2">
                    {app.motivation}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span>{new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
                    {app.blessing_doc_url && <span>📎 документ</span>}
                    <StatusBadge status={app.status} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const config: Record<typeof status, { label: string, bg: string, color: string }> = {
    pending: { label: 'на рассмотрении', bg: '#FEF3C7', color: '#92400E' },
    approved: { label: 'одобрена', bg: '#D1FAE5', color: '#065F46' },
    rejected: { label: 'отклонена', bg: '#FEE2E2', color: '#991B1B' }
  }
  const c = config[status]
  return (
    <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: c.bg, color: c.color }}>
      {c.label}
    </span>
  )
}

export default AdminApplicationsPage