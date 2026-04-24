export default async function handler(_request: Request) {
  try {
    const response = await fetch(
      'https://azbyka.ru/days/widgets/presentations.json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Lepta Orthodox App)'
        }
      }
    )

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream ${response.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate'
      }
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}