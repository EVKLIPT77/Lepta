import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

function LeptaPage() {
  return (
    <Layout>
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-6 py-16 sm:py-24 text-center">
          {/* Текстовый логотип */}
          <div
            className="font-display tracking-wide mb-6 leading-none"
            style={{
              color: 'var(--color-deep)',
              fontSize: 'clamp(4rem, 14vw, 7rem)'
            }}
          >
            Лѣпта
          </div>

          <p
            className="italic text-lg sm:text-xl mb-2 leading-relaxed"
            style={{ color: 'var(--color-accent-dark)' }}
          >
            «Вдова сія убогая болѣе всѣхъ положила»
          </p>
          <p className="text-sm text-stone-500 mb-12">Лк 21:3</p>

          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs uppercase tracking-wider mb-6"
            style={{
              backgroundColor: 'rgba(139, 111, 71, 0.12)',
              color: 'var(--color-accent-dark)'
            }}
          >
            Раздел в разработке
          </div>

          <p className="text-base sm:text-lg text-stone-700 max-w-xl mx-auto leading-relaxed mb-10">
            Здесь православные мастера, монастыри и издательства будут предлагать свою продукцию — иконы, книги, церковную утварь, мёд с пасек, ладан, рукоделие.
          </p>

          <p className="text-sm text-stone-600 max-w-xl mx-auto leading-relaxed mb-10">
            Мы хотим, чтобы добрый труд православных людей доходил до тех, кому он нужен — без посредников и наценок.
          </p>

          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
          >
            ← На главную
          </Link>
        </div>
      </section>
    </Layout>
  )
}

export default LeptaPage
