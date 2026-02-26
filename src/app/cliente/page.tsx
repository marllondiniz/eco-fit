import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getProfile } from '@/lib/supabase-server'
import { ClienteGreeting } from '@/components/ClienteGreeting'
import { ClienteEvolucaoBlock } from '@/components/ClienteEvolucaoBlock'

export const metadata = { title: 'LB.FIT — Início' }

function getFirstName(fullName: string | null) {
  if (!fullName) return 'Atleta'
  return fullName.trim().split(' ')[0]
}

export default async function ClientePage() {
  const supabase = await createSupabaseServerClient()
  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getProfile(),
  ])

  const [
    { data: dietas },
    { data: treinos },
    { data: scheduleRows },
  ] = await Promise.all([
    supabase
      .from('diets')
      .select('id, name, sent_at, profiles!diets_professional_id_fkey(full_name)')
      .eq('client_id', user!.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(3),
    supabase
      .from('workouts')
      .select('id, name, label, sent_at, end_date, profiles!workouts_professional_id_fkey(full_name), workout_exercises(id)')
      .eq('client_id', user!.id)
      .eq('status', 'sent')
      .order('end_date', { ascending: false, nullsFirst: false }),
    supabase
      .from('client_workout_schedule')
      .select('day_of_week, workout_label')
      .eq('client_id', user!.id),
  ])

  const scheduleMap: Record<string, string | null> = {}
  for (const row of scheduleRows ?? []) {
    scheduleMap[(row as { day_of_week: string }).day_of_week] =
      (row as { workout_label: string | null }).workout_label ?? null
  }

  const firstName = getFirstName(profile?.full_name ?? null)

  return (
    <div className="space-y-6">
      <ClienteGreeting firstName={firstName} />

      <ClienteEvolucaoBlock
        userId={user!.id}
        treinos={treinos ?? []}
        dietas={dietas ?? []}
        scheduleMap={scheduleMap}
      />
    </div>
  )
}
