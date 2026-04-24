export default async function handler(_request: Request) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(
      'https://azbyka.ru/days/widgets/presentations.json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Lepta/1.0; +https://lepta.vercel.app)',
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Azbyka returned ${response.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (err: any) {
    clearTimeout(timeoutId)
    const isTimeout = err.name === 'AbortError'
    return new Response(
      JSON.stringify({
        error: isTimeout ? 'timeout' : (err.message || 'unknown'),
        details: 'Не удалось получить данные с azbyka.ru'
      }),
      { status: isTimeout ? 504 : 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}