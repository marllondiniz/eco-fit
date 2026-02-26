'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, AlertTriangle, User, Utensils, Dumbbell, Activity } from 'lucide-react'

interface AnamnesePanelProps {
  clienteId: string
}

interface ProfileData {
  age?: number | null
  sex?: string | null
  height_cm?: number | null
  weight_kg?: number | null
  goal?: string | null
  activity_level?: string | null
}

interface AnamneseData {
  health_history?: string | null
  injuries?: string | null
  diseases?: string | null
  medications?: string | null
  food_allergies?: string | null
  food_preferences?: string | null
  training_experience?: string | null
  notes?: string | null
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss:    'Emagrecimento',
  muscle_gain:    'Ganho de massa',
  maintenance:    'Manutenção',
  health:         'Saúde geral',
  performance:    'Performance',
  rehabilitation: 'Reabilitação',
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentário',
  light:     'Leve',
  moderate:  'Moderado',
  intense:   'Intenso',
  athlete:   'Atleta',
}

const SEX_LABELS: Record<string, string> = {
  male:              'Masculino',
  female:            'Feminino',
  other:             'Outro',
  prefer_not_to_say: 'Não informado',
}

export function AnamnesePanel({ clienteId }: AnamnesePanelProps) {
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [loaded, setLoaded]     = useState(false)
  const [profile, setProfile]   = useState<ProfileData | null>(null)
  const [anamnese, setAnamnese] = useState<AnamneseData | null>(null)
  const [clientName, setClientName] = useState<string | null>(null)

  useEffect(() => {
    if (!clienteId || loaded) return
    async function fetchData() {
      setLoading(true)
      const [{ data: base }, { data: prof }, { data: anam }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', clienteId).maybeSingle(),
        supabase.from('client_profiles').select('*').eq('user_id', clienteId).maybeSingle(),
        supabase.from('client_anamnese').select('*').eq('user_id', clienteId).maybeSingle(),
      ])
      setClientName(base?.full_name ?? null)
      setProfile(prof ?? null)
      setAnamnese(anam ?? null)
      setLoaded(true)
      setLoading(false)
    }
    fetchData()
  }, [clienteId, loaded])

  // Reset when client changes
  useEffect(() => {
    setLoaded(false)
    setProfile(null)
    setAnamnese(null)
    setOpen(false)
  }, [clienteId])

  if (!clienteId) return null

  // Check for critical flags
  const hasRestrictions = !!(anamnese?.injuries || anamnese?.diseases || anamnese?.medications || anamnese?.food_allergies)

  return (
    <Card className={`border ${hasRestrictions && loaded ? 'border-amber-200 dark:border-amber-800' : 'border-border'}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">
                Perfil e Anamnese do Cliente
                {clientName && <span className="font-normal text-muted-foreground ml-1">— {clientName}</span>}
              </CardTitle>
              {hasRestrictions && loaded && (
                <Badge className="bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-0 text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Restrições
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
              {loading ? (
                <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{open ? 'Recolher' : 'Expandir'}</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </button>

      {open && loaded && (
        <CardContent className="px-5 pb-5 pt-0 space-y-4">
          {/* Dados pessoais */}
          {profile && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Dados Pessoais
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profile.age && (
                  <div>
                    <p className="text-xs text-muted-foreground">Idade</p>
                    <p className="text-sm font-semibold text-foreground">{profile.age} anos</p>
                  </div>
                )}
                {profile.sex && (
                  <div>
                    <p className="text-xs text-muted-foreground">Sexo</p>
                    <p className="text-sm font-semibold text-foreground">{SEX_LABELS[profile.sex] ?? profile.sex}</p>
                  </div>
                )}
                {profile.weight_kg && (
                  <div>
                    <p className="text-xs text-muted-foreground">Peso</p>
                    <p className="text-sm font-semibold text-foreground">{profile.weight_kg} kg</p>
                  </div>
                )}
                {profile.height_cm && (
                  <div>
                    <p className="text-xs text-muted-foreground">Altura</p>
                    <p className="text-sm font-semibold text-foreground">{profile.height_cm} cm</p>
                  </div>
                )}
                {profile.goal && (
                  <div>
                    <p className="text-xs text-muted-foreground">Objetivo</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {GOAL_LABELS[profile.goal] ?? profile.goal}
                    </p>
                  </div>
                )}
                {profile.activity_level && (
                  <div>
                    <p className="text-xs text-muted-foreground">Atividade</p>
                    <p className="text-sm font-semibold text-foreground">
                      {ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Restrições críticas com destaque */}
          {(anamnese?.diseases || anamnese?.injuries || anamnese?.medications) && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Atenção — Restrições Médicas
              </p>
              {anamnese.diseases && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Doenças pré-existentes</p>
                  <p className="text-sm text-foreground">{anamnese.diseases}</p>
                </div>
              )}
              {anamnese.injuries && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Lesões / restrições físicas</p>
                  <p className="text-sm text-foreground">{anamnese.injuries}</p>
                </div>
              )}
              {anamnese.medications && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Medicamentos em uso</p>
                  <p className="text-sm text-foreground">{anamnese.medications}</p>
                </div>
              )}
            </div>
          )}

          {/* Alimentação */}
          {(anamnese?.food_allergies || anamnese?.food_preferences) && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5" /> Alimentação
              </p>
              {anamnese.food_allergies && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Alergias / intolerâncias</p>
                  <p className="text-sm text-foreground">{anamnese.food_allergies}</p>
                </div>
              )}
              {anamnese.food_preferences && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Preferências alimentares</p>
                  <p className="text-sm text-foreground">{anamnese.food_preferences}</p>
                </div>
              )}
            </div>
          )}

          {/* Treino */}
          {(anamnese?.training_experience || anamnese?.health_history) && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5" /> Treino & Saúde
              </p>
              {anamnese.health_history && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Histórico de saúde</p>
                  <p className="text-sm text-foreground">{anamnese.health_history}</p>
                </div>
              )}
              {anamnese.training_experience && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Experiência com treino</p>
                  <p className="text-sm text-foreground">{anamnese.training_experience}</p>
                </div>
              )}
            </div>
          )}

          {anamnese?.notes && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Observações gerais</p>
              <p className="text-sm text-foreground">{anamnese.notes}</p>
            </div>
          )}

          {!profile && !anamnese && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este cliente ainda não preencheu seu perfil ou anamnese.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
