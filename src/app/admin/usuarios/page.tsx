 'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, Shield, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import type { Profile, ProfessionalType } from '@/types/database'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type AccessOption = 'client' | 'personal' | 'nutritionist' | 'both' | 'admin'

const ACCESS_LABEL: Record<AccessOption, string> = {
  client: 'Cliente',
  personal: 'Personal',
  nutritionist: 'Nutricionista',
  both: 'Personal + Nutricionista',
  admin: 'Admin',
}

const ROLE_CHIP_CLASS: Record<string, string> = {
  user: 'bg-slate-100 text-slate-600',
  personal: 'bg-emerald-100 text-emerald-700',
  admin: 'bg-purple-100 text-purple-700',
}

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setErro('Erro ao carregar usuários.')
      setProfiles([])
    } else {
      setProfiles((data ?? []) as Profile[])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function mapProfileToAccess(p: Profile): AccessOption {
    if (p.role === 'admin') return 'admin'
    if (p.role === 'user') return 'client'
    const t: ProfessionalType | null | undefined = p.professional_type ?? null
    if (t === 'nutritionist') return 'nutritionist'
    if (t === 'personal') return 'personal'
    return 'both'
  }

  async function handleChangeAccess(id: string, option: AccessOption) {
    setSavingId(id)
    setErro(null)

    let roleUpdate: 'user' | 'personal' | 'admin' = 'user'
    let typeUpdate: ProfessionalType | null = null

    if (option === 'admin') {
      roleUpdate = 'admin'
      typeUpdate = null
    } else if (option === 'client') {
      roleUpdate = 'user'
      typeUpdate = null
    } else {
      roleUpdate = 'personal'
      if (option === 'personal') typeUpdate = 'personal'
      else if (option === 'nutritionist') typeUpdate = 'nutritionist'
      else typeUpdate = 'both'
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        role: roleUpdate,
        professional_type: typeUpdate,
      })
      .eq('id', id)

    if (error) {
      setErro('Erro ao atualizar permissões do usuário.')
    } else {
      await load()
    }
    setSavingId(null)
  }

  async function handleExcluirUsuario(id: string) {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return
    }
    setSavingId(id)
    setErro(null)

    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) {
      setErro('Erro ao excluir usuário.')
    } else {
      await load()
    }
    setSavingId(null)
  }

  const contagem = {
    user: profiles.filter(p => p.role === 'user').length,
    personal: profiles.filter(p => p.role === 'personal').length,
    admin: profiles.filter(p => p.role === 'admin').length,
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usuários & Permissões</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie papéis (cliente, personal, nutricionista, ambos, admin) e exclusão de usuários.
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground gap-1">
          <span>
            {profiles.length} total · {contagem.user} clientes · {contagem.personal} profissionais ·{' '}
            {contagem.admin} admin
          </span>
        </div>
      </div>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          </CardContent>
        </Card>
      ) : !profiles.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[720px]">
              <ul className="divide-y divide-border">
                {profiles.map((usuario) => {
                  const initials = usuario.full_name
                    ? usuario.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                    : usuario.email?.[0]?.toUpperCase() ?? 'U'
                  const access = mapProfileToAccess(usuario)

                  return (
                    <li
                      key={usuario.id}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
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

                      <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground w-36">
                        <span>{formatDate(usuario.created_at)}</span>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${ROLE_CHIP_CLASS[usuario.role]}`}
                        >
                          <Shield className="w-3 h-3" />
                          {usuario.role === 'user'
                            ? 'Cliente'
                            : usuario.role === 'personal'
                              ? 'Profissional'
                              : 'Admin'}
                        </span>
                      </div>

                      <div className="w-52">
                        <Select
                          value={access}
                          onValueChange={(val) => handleChangeAccess(usuario.id, val as AccessOption)}
                          disabled={savingId === usuario.id}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Tipo de acesso" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">{ACCESS_LABEL.client}</SelectItem>
                            <SelectItem value="personal">{ACCESS_LABEL.personal}</SelectItem>
                            <SelectItem value="nutritionist">{ACCESS_LABEL.nutritionist}</SelectItem>
                            <SelectItem value="both">{ACCESS_LABEL.both}</SelectItem>
                            <SelectItem value="admin">{ACCESS_LABEL.admin}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-red-600 hover:text-red-700"
                          disabled={savingId === usuario.id}
                          onClick={() => handleExcluirUsuario(usuario.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
