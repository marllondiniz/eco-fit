import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { getProfile } from '@/lib/supabase-server'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export const dynamic = 'force-dynamic'

export default async function ProfissionalLayout({ children }: { children: React.ReactNode }) {
  unstable_noStore()
  const profile = await getProfile()

  if (!profile) redirect('/')
  const role = profile.role
  if (role !== 'admin' && role !== 'personal' && role !== 'user') redirect('/')
  if (role !== 'personal') redirect(role === 'admin' ? '/admin' : '/cliente')

  return (
    <DashboardLayout
      role="personal"
      name={profile.full_name}
      email={profile.email}
    >
      {children}
    </DashboardLayout>
  )
}
