import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import type { Profile } from '@/types/database'

export const metadata = { title: 'ECOFIT — Usuários' }

const ROLE_LABEL: Record<string, string> = {
  user: 'Cliente',
  personal: 'Profissional',
  admin: 'Admin',
}
const ROLE_CLASS: Record<string, string> = {
  user: 'bg-slate-100 text-slate-600',
  personal: 'bg-emerald-100 text-emerald-700',
  admin: 'bg-purple-100 text-purple-700',
}

export default async function UsuariosPage() {
  const supabase = await createSupabaseServerClient()

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const profiles = (usuarios ?? []) as Profile[]

  const contagem = {
    user: profiles.filter(p => p.role === 'user').length,
    personal: profiles.filter(p => p.role === 'personal').length,
    admin: profiles.filter(p => p.role === 'admin').length,
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Usuários</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {profiles.length} total ·{' '}
          {contagem.user} {contagem.user === 1 ? 'cliente' : 'clientes'} ·{' '}
          {contagem.personal} {contagem.personal === 1 ? 'profissional' : 'profissionais'} ·{' '}
          {contagem.admin} admin
        </p>
      </div>

      {!profiles.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {profiles.map((usuario) => {
                const initials = usuario.full_name
                  ? usuario.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                  : usuario.email?.[0]?.toUpperCase() ?? 'U'

                return (
                  <li key={usuario.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {usuario.full_name ?? 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{usuario.email}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="hidden sm:block text-xs text-muted-foreground">
                        {formatDate(usuario.created_at)}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_CLASS[usuario.role]}`}>
                        {ROLE_LABEL[usuario.role]}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
