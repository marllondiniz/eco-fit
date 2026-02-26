import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { getProfile } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  unstable_noStore()
  const profile = await getProfile()

  if (!profile) {
    redirect('/')
  }

  const rawRole = profile.role
  const role = typeof rawRole === 'string' ? rawRole.toLowerCase().trim() : 'user'
  const dest: Record<string, string> = {
    admin: '/admin',
    personal: '/profissional',
    user: '/cliente',
  }
  const path = dest[role] ?? '/cliente'
  redirect(path)
}
