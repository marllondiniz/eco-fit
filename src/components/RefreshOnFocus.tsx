'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Chama router.refresh() quando o usuário volta à aba, para buscar dados atualizados do servidor. */
export function RefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [router])

  return null
}
