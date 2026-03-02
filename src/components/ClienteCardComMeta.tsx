'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Target, Loader2, Eye, User, Heart, ImageIcon, X,
} from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Emagrecimento', muscle_gain: 'Ganho de massa muscular',
  maintenance: 'Manutenção', health: 'Saúde geral',
  performance: 'Performance esportiva', rehabilitation: 'Reabilitação',
}
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentário', light: 'Leve (1-2x/sem)', moderate: 'Moderado (3-4x/sem)',
  intense: 'Intenso (5-6x/sem)', athlete: 'Atleta',
}

interface ClienteCardComMetaProps {
  cliente: { id: string; full_name: string | null; email: string | null; created_at: string }
  counts: { dietas: number; treinos: number }
  weeklyTarget: number | null
}

export function ClienteCardComMeta({ cliente, counts, weeklyTarget }: ClienteCardComMetaProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(String(weeklyTarget ?? 3))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [clientAnamnese, setClientAnamnese] = useState<any>(null)
  const [bodyPhotos, setBodyPhotos] = useState<{ front: string | null; side: string | null; back: string | null }>({ front: null, side: null, back: null })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const initials = cliente.full_name
    ? cliente.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : cliente.email?.[0]?.toUpperCase() ?? 'C'

  const loadClientDetail = useCallback(async () => {
    if (detailLoading || clientProfile) return
    setDetailLoading(true)
    const [
      { data: cp },
      { data: ca },
      { data: photos },
    ] = await Promise.all([
      supabase.from('client_profiles').select('*').eq('user_id', cliente.id).maybeSingle(),
      supabase.from('client_anamnese').select('*').eq('user_id', cliente.id).maybeSingle(),
      supabase.from('body_photos').select('photo_type, url, uploaded_at').eq('user_id', cliente.id).order('uploaded_at', { ascending: false }),
    ])
    setClientProfile(cp)
    setClientAnamnese(ca)
    const p: Record<string, string | null> = { front: null, side: null, back: null }
    for (const row of (photos ?? []) as any[]) {
      if (!p[row.photo_type]) p[row.photo_type] = row.url
    }
    setBodyPhotos({ front: p.front, side: p.side, back: p.back })
    setDetailLoading(false)
  }, [cliente.id, detailLoading, clientProfile])

  useEffect(() => {
    if (detailOpen && !clientProfile) loadClientDetail()
  }, [detailOpen, clientProfile, loadClientDetail])

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/profissional/cliente-meta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: cliente.id, weeklyTarget: parseInt(value, 10) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao salvar.')
        return
      }
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const photoLabels = { front: 'Frente', side: 'Lado', back: 'Costas' } as const
  const hasPhotos = bodyPhotos.front || bodyPhotos.side || bodyPhotos.back

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setDetailOpen(true)}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">
                {cliente.full_name ?? 'Sem nome'}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{cliente.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Desde {formatDate(cliente.created_at)}
              </p>
            </div>
            <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
          </div>
          <div className="flex flex-wrap gap-2 mt-4" onClick={e => e.stopPropagation()}>
            <Badge variant="secondary" className="text-xs gap-1">
              {counts.dietas} {counts.dietas === 1 ? 'dieta' : 'dietas'}
            </Badge>
            <Badge variant="secondary" className="text-xs gap-1">
              {counts.treinos} {counts.treinos === 1 ? 'treino' : 'treinos'}
            </Badge>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1">
                  <Target className="w-3 h-3" />
                  Meta: {weeklyTarget ?? 3}/sem
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Meta de treinos por semana</DialogTitle>
                  <DialogDescription>
                    Defina quantos treinos por semana este cliente deve realizar (2 a 7).
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label className="text-sm">Treinos por semana</Label>
                  <Select value={value} onValueChange={setValue}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x por semana
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal de Detalhe do Cliente ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={clientProfile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-bold">{cliente.full_name ?? 'Sem nome'}</p>
                <p className="text-xs font-normal text-muted-foreground">{cliente.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5 mt-2">
              {/* Dados básicos */}
              {clientProfile && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {clientProfile.age && (
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Idade</p>
                        <p className="text-sm font-semibold text-foreground">{clientProfile.age} anos</p>
                      </div>
                    )}
                    {clientProfile.sex && (
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Sexo</p>
                        <p className="text-sm font-semibold text-foreground">
                          {clientProfile.sex === 'male' ? 'Masculino' : clientProfile.sex === 'female' ? 'Feminino' : clientProfile.sex}
                        </p>
                      </div>
                    )}
                    {clientProfile.weight_kg && (
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Peso</p>
                        <p className="text-sm font-semibold text-foreground">{clientProfile.weight_kg} kg</p>
                      </div>
                    )}
                    {clientProfile.height_cm && (
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Altura</p>
                        <p className="text-sm font-semibold text-foreground">{clientProfile.height_cm} cm</p>
                      </div>
                    )}
                    {clientProfile.goal && (
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Objetivo</p>
                        <p className="text-sm font-semibold text-foreground">{GOAL_LABELS[clientProfile.goal] ?? clientProfile.goal}</p>
                      </div>
                    )}
                    {clientProfile.activity_level && (
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Atividade</p>
                        <p className="text-sm font-semibold text-foreground">{ACTIVITY_LABELS[clientProfile.activity_level] ?? clientProfile.activity_level}</p>
                      </div>
                    )}
                    {clientProfile.city_state && (
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Local</p>
                        <p className="text-sm font-semibold text-foreground">{clientProfile.city_state}</p>
                      </div>
                    )}
                    {clientProfile.profession && (
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Profissão</p>
                        <p className="text-sm font-semibold text-foreground">{clientProfile.profession}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fotos corporais */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" /> Fotos Corporais
                </h3>
                {hasPhotos ? (
                  <div className="grid grid-cols-3 gap-3">
                    {(['front', 'side', 'back'] as const).map(type => (
                      <div key={type} className="flex flex-col items-center gap-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase">{photoLabels[type]}</p>
                        {bodyPhotos[type] ? (
                          <div
                            className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                            onClick={() => setPhotoPreview(bodyPhotos[type])}
                          >
                            <img src={bodyPhotos[type]!} alt={`Foto ${photoLabels[type]}`} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-border bg-muted/20 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Não enviada</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-xl p-6 text-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma foto enviada ainda.</p>
                  </div>
                )}
              </div>

              {/* Anamnese resumida */}
              {clientAnamnese && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" /> Anamnese
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      ['Experiência', clientAnamnese.training_experience],
                      ['Treinos/sem', clientAnamnese.weekly_availability ? `${clientAnamnese.weekly_availability}x` : null],
                      ['Duração sessão', clientAnamnese.session_duration_min ? `${clientAnamnese.session_duration_min} min` : null],
                      ['Local de treino', clientAnamnese.training_location],
                      ['Faz aeróbico', clientAnamnese.does_aerobic],
                      ['Tipo aeróbico', clientAnamnese.aerobic_type],
                      ['Treina jejum', clientAnamnese.trains_fasted],
                      ['Acorda', clientAnamnese.wake_up_time],
                      ['Dorme', clientAnamnese.sleep_time],
                      ['Horário treino', clientAnamnese.preferred_training_time],
                      ['Refeições/dia', clientAnamnese.meals_per_day],
                      ['Pula refeição', clientAnamnese.skips_meals ? 'Sim' : 'Não'],
                      ['Restrições', clientAnamnese.food_allergies],
                      ['Preferências', clientAnamnese.food_preferences],
                      ['Não gosta de', clientAnamnese.disliked_foods],
                      ['Álcool', clientAnamnese.alcohol_consumption],
                      ['Água/dia', clientAnamnese.daily_water_intake],
                      ['Prioridade muscular', clientAnamnese.muscle_priorities],
                      ['Prazo desejado', clientAnamnese.desired_timeframe],
                      ['Condições', clientAnamnese.diseases],
                      ['Lesões', clientAnamnese.injuries],
                      ['Dores', clientAnamnese.frequent_pain],
                      ['Medicamentos', clientAnamnese.medications],
                      ['Histórico saúde', clientAnamnese.health_history],
                      ['Disciplina', clientAnamnese.discipline_level ? `${clientAnamnese.discipline_level}/10` : null],
                      ['Dificuldade', clientAnamnese.biggest_difficulty],
                      ['Motivação', clientAnamnese.motivation_reason],
                    ] as [string, string | null | undefined][])
                      .filter(([, v]) => v && String(v).trim())
                      .map(([label, value]) => (
                        <div key={label} className="flex gap-2 text-xs py-1.5 border-b border-border/50">
                          <span className="text-muted-foreground font-medium min-w-[110px]">{label}</span>
                          <span className="text-foreground flex-1">{value}</span>
                        </div>
                      ))}
                  </div>
                  {clientAnamnese.notes && (
                    <div className="bg-muted/40 rounded-lg p-3 mt-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Observações</p>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{clientAnamnese.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {!clientProfile && !clientAnamnese && (
                <div className="bg-muted/30 rounded-xl p-6 text-center">
                  <User className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Este cliente ainda não preencheu o perfil e anamnese.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Photo Preview fullscreen ── */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setPhotoPreview(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={photoPreview}
            alt="Foto corporal"
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
