import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captchaToken! },
    })

    if (loginError) {
      setError(loginError.message === 'Invalid login credentials'
        ? 'Неверный email или пароль'
        : loginError.message)
      turnstileRef.current?.reset()
      setCaptchaToken(null)
      setLoading(false)
      return
    }

    navigate('/')
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-6 py-12">
        <h1 className="font-display text-4xl mb-2 leading-tight" style={{ color: 'var(--color-deep)' }}>
          Вход
        </h1>
        <p className="text-stone-600 mb-8">
          Нет аккаунта?{' '}
          <Link to="/signup" className="underline hover:opacity-70" style={{ color: 'var(--color-accent-dark)' }}>
            Зарегистрироваться
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
            />
          </div>

          <Turnstile
            ref={turnstileRef}
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
            onSuccess={setCaptchaToken}
            onError={() => setCaptchaToken(null)}
            onExpire={() => setCaptchaToken(null)}
            options={{ theme: 'light', language: 'ru' }}
          />

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full py-3 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
          >
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

export default LoginPage