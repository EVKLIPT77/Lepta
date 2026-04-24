import { useEffect, useState } from 'react'

interface Saint {
  name: string
  url: string
  isMain: boolean // главный святой дня или второстепенный
}

function CalendarWidget() {
  const [saints, setSaints] = useState<Saint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const dateStr = today.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  // Убирает ударения (U+0301) из строки — Ruslan Display их не поддерживает
  function stripAccents(text: string): string {
    return text.replace(/\u0301/g, '').replace(/\s+/g, ' ').trim()
  }

  useEffect(() => {
    async function loadCalendar() {
      try {
        const response = await fetch('/api/azbyka')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()

        // Парсим HTML из ответа
        const parser = new DOMParser()
        const doc = parser.parseFromString(data.presentations, 'text/html')

        const parsed: Saint[] = []

        // paragraph-0 — главный святой дня
        doc.querySelectorAll('.paragraph-0 a').forEach(link => {
          parsed.push({
            name: stripAccents(link.textContent || ''),
            url: link.getAttribute('href') || '',
            isMain: true
          })
        })

        // paragraph-2 и paragraph-3 — остальные святые
        doc.querySelectorAll('.paragraph-2 a, .paragraph-3 a').forEach(link => {
          parsed.push({
            name: stripAccents(link.textContent || ''),
            url: link.getAttribute('href') || '',
            isMain: false
          })
        })

        setSaints(parsed)
      } catch (err: any) {
        setError(err.message || 'Не удалось загрузить календарь')
      } finally {
        setLoading(false)
      }
    }
    loadCalendar()
  }, [])

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-5">
      <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Сегодня</div>
      <div className="font-display text-xl mb-4 capitalize" style={{ color: 'var(--color-deep)' }}>{dateStr}</div>

      {loading && <p className="text-sm text-stone-500">Загрузка...</p>}

      {error && (
        <p className="text-sm text-stone-500">
          Календарь сейчас недоступен
        </p>
      )}

      {!loading && !error && saints.length > 0 && (
        <>
          {saints.filter(s => s.isMain).length > 0 && (
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: '#78716c' }}>
    Главный святой дня
  </div>
              {saints.filter(s => s.isMain).map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display text-base hover:opacity-70 block transition-opacity"
style={{ color: 'var(--color-deep)' }}
                >
                  {s.name}
                </a>
              ))}
            </div>
          )}

          {saints.filter(s => !s.isMain).length > 0 && (
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1.5">
                Также память
              </div>
              <ul className="space-y-1">
                {saints.filter(s => !s.isMain).map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-stone-700 hover:text-stone-900"
                    >
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-stone-400 mt-4 pt-3 border-t border-stone-100">
            Данные: azbyka.ru
          </div>
        </>
      )}
    </div>
  )
}

export default CalendarWidget