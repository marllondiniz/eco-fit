import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { getProfile, createSupabaseServerClient } from '@/lib/supabase-server'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export const dynamic = 'force-dynamic'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  unstable_noStore()
  const profile = await getProfile()

  if (!profile) redirect('/')
  const role = profile.role
  if (role !== 'admin' && role !== 'personal' && role !== 'user') redirect('/')
  if (role !== 'user') redirect(role === 'personal' ? '/profissional' : '/admin')

  // Fetch avatar from client_profiles
  const supabase = await createSupabaseServerClient()
  const { data: clientProfile } = await supabase
    .from('client_profiles')
    .select('avatar_url')
    .eq('user_id', profile.id)
    .maybeSingle()

  return (
    <DashboardLayout
      role="user"
      name={profile.full_name}
      email={profile.email}
      avatarUrl={clientProfile?.avatar_url ?? null}
    >
      {children}
    </DashboardLayout>
  )
}
