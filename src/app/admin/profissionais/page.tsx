'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserCheck, Plus, CheckCircle, Clock, Mail, XCircle, Trash2, RefreshCw, Send } from 'lucide-react'
import { formatDate, formatDistanceToNow } from '@/lib/date-utils'
import type { Profile, Invitation, ProfessionalType } from '@/types/database'

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profile[]>([])
  const [convites, setConvites] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [tipoConvite, setTipoConvite] = useState<ProfessionalType>('personal')
  const [enviando, setEnviando] = useState(false)
  const [conviteEnviado, setConviteEnviado] = useState(false)  // sucesso final
  const [emailEnviadoId, setEmailEnviadoId] = useState<string | null>(null) // id do convite recem enviado
  const [reenviadoId, setReenviadoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function load() {
    const [{ data: profs }, { data: invs }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'personal')
        .order('created_at', { ascending: false }),
      supabase
        .from('invitations')
        .select('*')
        .eq('role', 'personal')
        .order('created_at', { ascending: false }),
    ])
    setProfissionais(profs as Profile[] ?? [])
    setConvites(invs as Invitation[] ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function enviarEmailConvite(invitationId: string, invitedByName: string): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, invitedByName }),
      })
      return res.ok
    } catch {
      return false
    }
  }

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
        professional_type: tipoConvite,
        invited_by: user!.id,
      })
      .select()
      .single()

    if (error) {
      setEnviando(false)
      setErro(
        error.code === '23505'
          ? 'Já existe um convite pendente para este e-mail.'
          : 'Erro ao criar convite.'
      )
      return
    }

    // Busca nome do admin e envia e-mail automaticamente
    const { data: adminProfile } = await supabase
      .from('profiles').select('full_name').eq('id', user!.id).maybeSingle()

    const ok = await enviarEmailConvite(data.id, adminProfile?.full_name ?? 'LB.FIT')

    setConviteEnviado(ok)
    setEmailEnviadoId(data.id)
    if (!ok) setErro('Convite criado, mas houve erro ao enviar o e-mail. Verifique RESEND_API_KEY.')

    setEnviando(false)
    await load()
  }

  async function handleReenviar(conviteId: string) {
    setReenviadoId(conviteId)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: adminProfile } = await supabase
      .from('profiles').select('full_name').eq('id', user!.id).maybeSingle()
    await enviarEmailConvite(conviteId, adminProfile?.full_name ?? 'LB.FIT')
    setTimeout(() => setReenviadoId(null), 2500)
  }

  async function handleCancelarConvite(id: string) {
    setErro(null)
    const { error } = await supabase
      .from('invitations')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      setErro('Erro ao cancelar convite.')
      return
    }
    await load()
  }

  async function handleExcluirConvite(id: string) {
    setErro(null)
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)

    if (error) {
      setErro('Erro ao excluir convite.')
      return
    }
    await load()
  }

  function fecharModal() {
    setModalOpen(false)
    setEmailConvite('')
    setTipoConvite('personal')
    setConviteEnviado(false)
    setEmailEnviadoId(null)
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
                      {prof.professional_type === 'nutritionist'
                        ? 'Nutricionista'
                        : prof.professional_type === 'personal'
                          ? 'Personal'
                          : 'Personal + Nutricionista'}
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
                        <p className="text-sm font-medium text-foreground truncate">
                          {convite.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enviado {formatDistanceToNow(convite.created_at)} ·
                          {expirado ? (
                            <span className="text-red-500"> Expirado</span>
                          ) : (
                            <span> Expira em {formatDate(convite.expires_at)}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tipo:{' '}
                          {convite.professional_type === 'nutritionist'
                            ? 'Nutricionista'
                            : convite.professional_type === 'personal'
                              ? 'Personal'
                              : 'Personal + Nutricionista'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                        {expirado ? (
                          <Badge variant="secondary" className="text-xs text-red-500">Expirado</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pendente
                          </Badge>
                        )}
                        {!expirado && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700"
                            disabled={reenviadoId === convite.id}
                            onClick={() => handleReenviar(convite.id)}
                          >
                            {reenviadoId === convite.id ? (
                              <><CheckCircle className="w-3.5 h-3.5" /> Enviado!</>
                            ) : (
                              <><RefreshCw className="w-3.5 h-3.5" /> Reenviar</>
                            )}
                          </Button>
                        )}
                        {!expirado && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1 text-amber-600 hover:text-amber-700"
                            onClick={() => handleCancelarConvite(convite.id)}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancelar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1 text-red-600 hover:text-red-700"
                          onClick={() => handleExcluirConvite(convite.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
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

          {conviteEnviado ? (
            /* ── Tela de sucesso ── */
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Convite enviado!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Um e-mail foi enviado para <strong className="text-foreground">{emailConvite}</strong> com o link de acesso ao LB.FIT.
                </p>
              </div>
              <div className="bg-muted/60 rounded-xl px-4 py-3 text-xs text-muted-foreground text-left space-y-1">
                <p>✅ E-mail enviado por: <strong>LB.FIT</strong></p>
                <p>⏱ Convite válido por 7 dias</p>
                <p>🔒 Acesso criado apenas ao clicar no link</p>
              </div>
            </div>
          ) : (
            /* ── Formulário ── */
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Informe o e-mail e o tipo. O convite será enviado automaticamente por e-mail.
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
              <div className="space-y-1.5">
                <Label htmlFor="tipo-profissional">Tipo de profissional</Label>
                <Select
                  value={tipoConvite}
                  onValueChange={value => setTipoConvite(value as ProfessionalType)}
                >
                  <SelectTrigger id="tipo-profissional">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Trainer</SelectItem>
                    <SelectItem value="nutritionist">Nutricionista</SelectItem>
                    <SelectItem value="both">Ambos (personal + nutricionista)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {erro && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                  {erro}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {conviteEnviado ? (
              <>
                <Button variant="outline" onClick={() => { setConviteEnviado(false); setEmailConvite(''); setEmailEnviadoId(null) }} className="flex-1">
                  Convidar outro
                </Button>
                <Button onClick={fecharModal} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  Concluir
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={fecharModal}>Cancelar</Button>
                <Button
                  onClick={handleConvidar}
                  disabled={enviando}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {enviando ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Enviar convite</>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
