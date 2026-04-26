import { Link } from 'react-router-dom'
import { useSubscription } from '../hooks/useSubscription'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  authorId: number
  showCount?: boolean
}

function SubscribeButton({ authorId, showCount = true }: Props) {
  const { user } = useAuth()
  const { isSubscribed, count, loading, acting, toggle } = useSubscription(authorId)

  if (loading) {
    return <div className="text-sm text-stone-400">…</div>
  }

  // Не залогинен — ведём на логин
  if (!user) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          to="/login"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-85 hover:shadow-sm"
          style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
        >
          Отслеживать
        </Link>
        {showCount && count > 0 && (
          <span className="text-sm text-stone-500">
            {count} {pluralize(count, ['подписчик', 'подписчика', 'подписчиков'])}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={toggle}
        disabled={acting}
        className="group px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 cursor-pointer hover:shadow-sm"
        style={
          isSubscribed
            ? { backgroundColor: 'rgba(139, 111, 71, 0.25)', color: 'var(--color-accent-dark)' }
            : { backgroundColor: 'var(--color-deep)', color: 'white' }
        }
        onMouseEnter={(e) => {
          if (isSubscribed) {
            e.currentTarget.style.backgroundColor = 'rgba(139, 111, 71, 0.4)'
          }
        }}
        onMouseLeave={(e) => {
          if (isSubscribed) {
            e.currentTarget.style.backgroundColor = 'rgba(139, 111, 71, 0.25)'
          }
        }}
      >
        {isSubscribed ? (
          <>
            <span className="group-hover:hidden">✓ Отслеживаете</span>
            <span className="hidden group-hover:inline">Отписаться</span>
          </>
        ) : (
          'Отслеживать'
        )}
      </button>
      {showCount && count > 0 && (
        <span className="text-sm text-stone-500">
          {count} {pluralize(count, ['подписчик', 'подписчика', 'подписчиков'])}
        </span>
      )}
    </div>
  )
}

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

export default SubscribeButton