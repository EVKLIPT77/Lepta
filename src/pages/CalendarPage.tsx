import Layout from '../components/Layout'
import CalendarWidget from '../components/CalendarWidget'

function CalendarPage() {
  return (
    <Layout>
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-8 md:py-12 text-center">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-wide mb-3 leading-tight" style={{ color: 'var(--color-deep)' }}>
            Православный календарь
          </h1>
          <p className="text-stone-600 max-w-xl mx-auto">
            Праздники и память святых на сегодня
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <CalendarWidget />

        <p className="text-xs text-stone-400 mt-6 text-center">
          В будущих версиях
        </p>
      </div>
    </Layout>
  )
}

export default CalendarPage