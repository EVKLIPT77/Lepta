import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function SignUpPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [consentPolicy, setConsentPolicy] = useState(false)
  const [consentData, setConsentData] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  function validateUsername(u: string): string | null {
    if (u.length < 3) return 'Минимум 3 символа'
    if (u.length > 30) return 'Максимум 30 символов'
    if (!/^[a-z0-9_]+$/.test(u)) return 'Только латиница, цифры и _'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const usernameError = validateUsername(username)
    if (usernameError) {
      setError(usernameError)
      return
    }
    if (password.length < 6) {
      setError('Пароль должен быть не меньше 6 символов')
      return
    }
    if (!consentPolicy || !consentData) {
      setError('Необходимо принять политику и дать согласие на обработку данных')
      return
    }

    setLoading(true)

    // Проверяем уникальность username до регистрации
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      setError('Этот username уже занят')
      setLoading(false)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken: captchaToken!,
        data: { username, display_name: username },
      }
    })

    if (signUpError) {
      setError(signUpError.message)
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
          Регистрация
        </h1>
        <p className="text-stone-600 mb-8">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="underline hover:opacity-70" style={{ color: 'var(--color-accent-dark)' }}>
            Войти
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              placeholder="ivan_petrov"
              required
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-stone-500 bg-white"
            />
            <p className="text-xs text-stone-500 mt-1">3–30 символов, латиница, цифры и нижнее подчёркивание</p>
          </div>

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
            <p className="text-xs text-stone-500 mt-1">Не меньше 6 символов</p>
          </div>

          <Turnstile
            ref={turnstileRef}
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
            onSuccess={setCaptchaToken}
            onError={() => setCaptchaToken(null)}
            onExpire={() => setCaptchaToken(null)}
            options={{ theme: 'light', language: 'ru' }}
          />

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentPolicy}
                onChange={e => setConsentPolicy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-stone-700 flex-shrink-0"
              />
              <span className="text-sm text-stone-700">
                Я ознакомился с{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  className="underline hover:opacity-70"
                  style={{ color: 'var(--color-accent-dark)' }}
                >
                  Политикой обработки персональных данных
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentData}
                onChange={e => setConsentData(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-stone-700 flex-shrink-0"
              />
              <span className="text-sm text-stone-700">
                Я даю{' '}
                <Link
                  to="/consent"
                  target="_blank"
                  className="underline hover:opacity-70"
                  style={{ color: 'var(--color-accent-dark)' }}
                >
                  согласие на обработку персональных данных
                </Link>
                , в том числе специальных категорий
              </span>
            </label>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !consentPolicy || !consentData || !captchaToken}
            className="w-full py-3 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-deep)', color: 'white' }}
          >
            {loading ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

export default SignUpPage