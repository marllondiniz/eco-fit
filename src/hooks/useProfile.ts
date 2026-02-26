'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { translateAuthError } from '@/lib/auth-errors'
import type { Profile } from '@/types/database'

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchProfile() {
    setLoading(true)
    setError(null)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      setError(translateAuthError(profileError.message))
    } else {
      setProfile(data as Profile)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  return { profile, loading, error, refetch: fetchProfile }
}
