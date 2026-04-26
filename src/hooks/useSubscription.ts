import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export function useSubscription(authorId: number | null) {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    if (!authorId) {
      setLoading(false)
      return
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, user?.id])

  async function loadData() {
    if (!authorId) return

    // Считаем общее количество подписчиков
    const { count: total } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', authorId)

    setCount(total ?? 0)

    // Проверяем подписан ли текущий пользователь
    if (user) {
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('author_id', authorId)
        .eq('subscriber_id', user.id)
        .maybeSingle()
      setIsSubscribed(!!data)
    } else {
      setIsSubscribed(false)
    }

    setLoading(false)
  }

  async function toggle() {
    if (!user || !authorId || acting) return
    setActing(true)

    if (isSubscribed) {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('subscriber_id', user.id)
        .eq('author_id', authorId)
      if (!error) {
        setIsSubscribed(false)
        setCount(c => Math.max(0, c - 1))
      }
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .insert({ subscriber_id: user.id, author_id: authorId })
      if (!error) {
        setIsSubscribed(true)
        setCount(c => c + 1)
      }
    }

    setActing(false)
  }

  return { isSubscribed, count, loading, acting, toggle }
}