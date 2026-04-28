import { useEffect, useState } from 'react'

// Типы window.ymaps. Для нашего использования достаточно any —
// у Яндекса огромный API, точная типизация — отдельный квест.
// Если понадобится строже — есть пакет @yandex/ymaps3-types.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps?: any
  }
}

const SCRIPT_ID = 'yandex-maps-script'

interface State {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ymaps: any | null
  loading: boolean
  error: string | null
}

/**
 * Загружает Yandex Maps API один раз на всё приложение.
 * Возвращает { ymaps, loading, error }.
 *
 * Особенности:
 * - Если скрипт уже добавлен в DOM (другой компонент уже подключил), не дублирует.
 * - Если ymaps уже есть в window, сразу возвращает его (после первой загрузки).
 * - Использует ymaps.ready() — это обязательный шаг по докам Yandex,
 *   он гарантирует, что внутренние модули прогрузились.
 */
export function useYandexMaps(): State {
  const [state, setState] = useState<State>({
    ymaps: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Уже загружен и готов — берём сразу
    if (window.ymaps && typeof window.ymaps.ready === 'function') {
      window.ymaps.ready(() => {
        setState({ ymaps: window.ymaps, loading: false, error: null })
      })
      return
    }

    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY
    if (!apiKey) {
      setState({ ymaps: null, loading: false, error: 'Не задан VITE_YANDEX_MAPS_API_KEY' })
      return
    }

    // Если скрипт уже добавлен другим компонентом — ждём его загрузки
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', onScriptLoaded)
      return () => existing.removeEventListener('load', onScriptLoaded)
    }

    // Иначе создаём <script> сами
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`
    script.async = true
    script.onload = onScriptLoaded
    script.onerror = () => {
      setState({ ymaps: null, loading: false, error: 'Не удалось загрузить Yandex Maps' })
    }
    document.head.appendChild(script)

    function onScriptLoaded() {
      if (!window.ymaps) {
        setState({ ymaps: null, loading: false, error: 'ymaps не появился в window' })
        return
      }
      window.ymaps.ready(() => {
        setState({ ymaps: window.ymaps, loading: false, error: null })
      })
    }
  }, [])

  return state
}