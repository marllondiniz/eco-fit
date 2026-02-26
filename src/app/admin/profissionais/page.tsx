'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserCheck, Plus, Copy, CheckCircle, Clock, Mail } from 'lucide-react'
import { formatDate, formatDistanceToNow } from '@/lib/date-utils'
import type { Profile, Invitation } from '@/types/database'

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profile[]>([])
  const [convites, setConvites] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [novoLink, setNovoLink] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function load() {
    const [{ data: profs }, { data: invs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'personal').order('created_at', { ascending: false }),
      supabase.from('invitations').select('*').eq('role', 'personal').order('created_at', { ascending: false }),
    ])
    setProfissionais(profs as Profile[] ?? [])
    setConvites(invs as Invitation[] ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleConvidar() {
    if (!emailConvite.trim()) {
      setErro('Informe o e-mail do profissional.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailConvite.trim())) {
      setErro('E-mail inválido.')
      return
    }

    setErro(null)
    setEnviando(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email: emailConvite.trim().toLowerCase(),
        role: 'personal',
        invited_by: user!.id,
      })
      .select()
      .single()

    setEnviando(false)

    if (error) {
      setErro(
        error.code === '23505'
          ? 'Já existe um convite para este e-mail.'
          : 'Erro ao criar convite.'
      )
      return
    }

    const link = `${window.location.origin}/criar-conta?token=${data.token}`
    setNovoLink(link)
    await load()
  }

  async function handleCopiar(link: string) {
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function fecharModal() {
    setModalOpen(false)
    setEmailConvite('')
    setNovoLink(null)
    setErro(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Profissionais</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {profissionais.length} {profissionais.length === 1 ? 'profissional ativo' : 'profissionais ativos'}
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Convidar profissional
        </Button>
      </div>

      {/* Profissionais ativos */}
      {!profissionais.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum profissional cadastrado ainda.</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Enviar primeiro convite
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profissionais.map((prof) => {
            const initials = prof.full_name
              ? prof.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
              : prof.email?.[0]?.toUpperCase() ?? 'P'

            return (
              <Card key={prof.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">
                        {prof.full_name ?? 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{prof.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Desde {formatDate(prof.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 text-xs">
                      Profissional
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Convites pendentes */}
      {convites.filter(c => !c.used_at).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Convites pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border">
              {convites
                .filter(c => !c.used_at)
                .map((convite) => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/criar-conta?token=${convite.token}`
                  const expirado = new Date(convite.expires_at) < new Date()

                  return (
                    <li key={convite.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{convite.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enviado {formatDistanceToNow(convite.created_at)} ·
                          {expirado ? (
                            <span className="text-red-500"> Expirado</span>
                          ) : (
                            <span> Expira em {formatDate(convite.expires_at)}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {expirado ? (
                          <Badge variant="secondary" className="text-xs text-red-500">Expirado</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pendente
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => handleCopiar(link)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar link
                        </Button>
                      </div>
                    </li>
                  )
                })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Modal convidar */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && fecharModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar profissional</DialogTitle>
          </DialogHeader>

          {novoLink ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">Convite criado com sucesso!</p>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Link de convite</p>
                <p className="text-xs text-foreground break-all font-mono">{novoLink}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Envie este link para o profissional. Ele expira em 7 dias.
              </p>
              <Button
                onClick={() => handleCopiar(novoLink)}
                className="w-full gap-2"
                variant={copiado ? 'outline' : 'default'}
              >
                {copiado ? (
                  <><CheckCircle className="w-4 h-4" /> Link copiado!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copiar link</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Informe o e-mail do profissional. Um link de cadastro será gerado para ele.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="email-convite">E-mail do profissional</Label>
                <Input
                  id="email-convite"
                  type="email"
                  value={emailConvite}
                  onChange={e => setEmailConvite(e.target.value)}
                  placeholder="profissional@email.com"
                  onKeyDown={e => e.key === 'Enter' && handleConvidar()}
                />
              </div>
              {erro && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {erro}
                </p>
              )}
            </div>
          )}

          {!novoLink && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={fecharModal}>Cancelar</Button>
              <Button
                onClick={handleConvidar}
                disabled={enviando}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {enviando ? 'Gerando...' : 'Gerar link de convite'}
              </Button>
            </DialogFooter>
          )}
          {novoLink && (
            <DialogFooter>
              <Button variant="outline" onClick={fecharModal} className="w-full">Fechar</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
