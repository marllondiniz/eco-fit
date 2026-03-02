'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, AlertTriangle, User, Utensils, Dumbbell, Activity, Clock, Target, Brain } from 'lucide-react'

interface AnamnesePanelProps {
  clienteId: string
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Emagrecimento', muscle_gain: 'Ganho de massa',
  maintenance: 'Manutenção', health: 'Saúde geral',
  performance: 'Performance', rehabilitation: 'Reabilitação',
}
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentário', light: 'Leve', moderate: 'Moderado',
  intense: 'Intenso', athlete: 'Atleta',
}
const SEX_LABELS: Record<string, string> = {
  male: 'Masculino', female: 'Feminino', other: 'Outro', prefer_not_to_say: 'Não informado',
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function HighlightField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{value}</p>
    </div>
  )
}

export function AnamnesePanel({ clienteId }: AnamnesePanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState<Record<string, any> | null>(null)
  const [anamnese, setAnamnese] = useState<Record<string, any> | null>(null)
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

  useEffect(() => {
    setLoaded(false)
    setProfile(null)
    setAnamnese(null)
    setOpen(false)
  }, [clienteId])

  if (!clienteId) return null

  const hasRestrictions = !!(anamnese?.injuries || anamnese?.diseases || anamnese?.medications || anamnese?.food_allergies || anamnese?.frequent_pain)

  return (
    <Card className={`border ${hasRestrictions && loaded ? 'border-amber-200 dark:border-amber-800' : 'border-border'}`}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">
                Anamnese LBFIT
                {clientName && <span className="font-normal text-muted-foreground ml-1">— {clientName}</span>}
              </CardTitle>
              {hasRestrictions && loaded && (
                <Badge className="bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-0 text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" /> Restrições
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
          {/* Dados Pessoais */}
          {profile && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Dados Pessoais
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Idade" value={profile.age ? `${profile.age} anos` : null} />
                <Field label="Sexo" value={profile.sex ? (SEX_LABELS[profile.sex] ?? profile.sex) : null} />
                <Field label="Peso" value={profile.weight_kg ? `${profile.weight_kg} kg` : null} />
                <Field label="Altura" value={profile.height_cm ? `${profile.height_cm} cm` : null} />
                <HighlightField label="Objetivo" value={profile.goal ? (GOAL_LABELS[profile.goal] ?? profile.goal) : null} />
                <Field label="Atividade" value={profile.activity_level ? (ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level) : null} />
                <Field label="Profissão" value={profile.profession} />
                <Field label="Cidade" value={profile.city_state} />
              </div>
            </div>
          )}

          {/* Restrições Médicas */}
          {(anamnese?.diseases || anamnese?.injuries || anamnese?.medications || anamnese?.frequent_pain) && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Atenção — Restrições Médicas
              </p>
              <Field label="Condições diagnosticadas" value={anamnese.diseases} />
              <Field label="Lesões" value={anamnese.injuries} />
              <Field label="Dores frequentes" value={anamnese.frequent_pain} />
              <Field label="Medicamentos" value={anamnese.medications} />
              <Field label="Histórico de saúde" value={anamnese.health_history} />
              <Field label="Acompanhamento anterior" value={anamnese.previous_coaching} />
            </div>
          )}

          {/* Rotina Diária */}
          {(anamnese?.wake_up_time || anamnese?.sleep_time || anamnese?.preferred_training_time || anamnese?.trains_fasted) && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Rotina Diária
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Acorda" value={anamnese.wake_up_time} />
                <Field label="Dorme" value={anamnese.sleep_time} />
                <Field label="Treina às" value={anamnese.preferred_training_time} />
                <Field label="Treina em jejum" value={anamnese.trains_fasted} />
                <Field label="Pico de fome" value={anamnese.hunger_peak_time} />
                <Field label="Dificuldade alimentar" value={anamnese.feeding_difficulty_time} />
              </div>
              <Field label="Motivo da dificuldade" value={anamnese.feeding_difficulty_reason} />
            </div>
          )}

          {/* Treinamento */}
          {(anamnese?.training_experience || anamnese?.weekly_availability || anamnese?.training_location) && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5" /> Treinamento
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Experiência" value={anamnese.training_experience} />
                <Field label="Frequência" value={anamnese.weekly_availability ? `${anamnese.weekly_availability}x/semana` : null} />
                <Field label="Tempo/sessão" value={anamnese.session_duration_min ? `${anamnese.session_duration_min} min` : null} />
                <Field label="Local" value={anamnese.training_location} />
                <Field label="2x ao dia" value={anamnese.can_train_twice_daily ? 'Sim' : null} />
                <Field label="Aeróbico" value={anamnese.does_aerobic} />
              </div>
              {anamnese.does_aerobic === 'Sim' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo" value={anamnese.aerobic_type} />
                  <Field label="Frequência" value={anamnese.aerobic_frequency} />
                </div>
              )}
              <Field label="Modalidades adicionais" value={anamnese.additional_modalities} />
              <Field label="Equipamentos em casa" value={anamnese.home_equipment} />
            </div>
          )}

          {/* Objetivos */}
          {(anamnese?.muscle_priorities || anamnese?.secondary_goal || anamnese?.desired_timeframe) && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Objetivos
              </p>
              <HighlightField label="Prioridades musculares" value={anamnese.muscle_priorities} />
              <Field label="Objetivo secundário" value={anamnese.secondary_goal} />
              <Field label="Prazo desejado" value={anamnese.desired_timeframe} />
            </div>
          )}

          {/* Alimentação */}
          {(anamnese?.food_allergies || anamnese?.food_preferences || anamnese?.meals_per_day || anamnese?.disliked_foods) && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5" /> Alimentação
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Refeições/dia" value={anamnese.meals_per_day} />
                <Field label="Pula refeições" value={anamnese.skips_meals ? 'Sim' : null} />
                <Field label="Álcool" value={anamnese.alcohol_consumption} />
                <Field label="Água/dia" value={anamnese.daily_water_intake} />
                <Field label="Tempo p/ preparo" value={anamnese.meal_prep_time} />
              </div>
              <Field label="Alergias / restrições" value={anamnese.food_allergies} />
              <Field label="Preferências" value={anamnese.food_preferences} />
              <Field label="Alimentos que não gosta" value={anamnese.disliked_foods} />
            </div>
          )}

          {/* Comportamento */}
          {(anamnese?.discipline_level || anamnese?.biggest_difficulty || anamnese?.motivation_reason) && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Comportamento e Aderência
              </p>
              {anamnese.discipline_level != null && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Disciplina (0-10)</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 bg-muted rounded-full h-2 max-w-[200px]">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(anamnese.discipline_level / 10) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-primary">{anamnese.discipline_level}</span>
                  </div>
                </div>
              )}
              <Field label="Maior dificuldade" value={anamnese.biggest_difficulty} />
              <Field label="Motivação" value={anamnese.motivation_reason} />
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
