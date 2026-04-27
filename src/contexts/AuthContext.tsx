/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'

export interface SocialLinks {
  telegram?: string
  vk?: string
  website?: string
}

export interface PrivacySettings {
  christian_name: boolean
  baptism_date: boolean
  city: boolean
  interests: boolean
  social_links: boolean
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: 'reader' | 'author' | 'editor' | 'admin'
  christian_name: string | null
  baptism_date: string | null
  city: string | null
  social_links: SocialLinks
  privacy_settings: PrivacySettings
}

const DEFAULT_PRIVACY: PrivacySettings = {
  christian_name: true,
  baptism_date: false,
  city: false,
  interests: true,
  social_links: true,
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!data) {
      setProfile(null)
      return
    }
    // Сужаем role: в БД это text + check, но Supabase выдаёт строку
    const validRoles = ['reader', 'author', 'editor', 'admin'] as const
    const role = (validRoles as readonly string[]).includes(data.role) ? (data.role as Profile['role']) : 'reader'
    // social_links/privacy_settings в БД — jsonb. Для безопасности подмешиваем дефолты-ключи
    const socialLinks = (data.social_links ?? {}) as SocialLinks
    const privacy = { ...DEFAULT_PRIVACY, ...((data.privacy_settings ?? {}) as Partial<PrivacySettings>) }
    setProfile({
      ...data,
      role,
      social_links: socialLinks,
      privacy_settings: privacy,
    })
  }

  useEffect(() => {
    // Получаем текущую сессию при загрузке
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Подписываемся на изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}