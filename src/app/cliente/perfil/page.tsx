'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User, Camera, Save, CheckCircle2, AlertCircle,
  Dumbbell, Utensils, Trophy, TrendingUp, Target,
  Flame, Calendar, History
} from 'lucide-react'
import { formatDate, formatDistanceToNow } from '@/lib/date-utils'

// ── Constantes de opções ──────────────────────────────────────────────────────
const GOALS = [
  { value: 'weight_loss',    label: 'Emagrecimento' },
  { value: 'muscle_gain',    label: 'Ganho de massa muscular' },
  { value: 'maintenance',    label: 'Manutenção' },
  { value: 'health',         label: 'Saúde geral' },
  { value: 'performance',    label: 'Performance esportiva' },
  { value: 'rehabilitation', label: 'Reabilitação' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentário (sem exercícios)' },
  { value: 'light',     label: 'Leve (1-2x por semana)' },
  { value: 'moderate',  label: 'Moderado (3-4x por semana)' },
  { value: 'intense',   label: 'Intenso (5-6x por semana)' },
  { value: 'athlete',   label: 'Atleta (diário ou duas vezes ao dia)' },
]

const SEX_OPTIONS = [
  { value: 'male',               label: 'Masculino' },
  { value: 'female',             label: 'Feminino' },
  { value: 'other',              label: 'Outro' },
  { value: 'prefer_not_to_say',  label: 'Prefiro não dizer' },
]

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ClientProfile {
  age: string; sex: string; height_cm: string; weight_kg: string
  goal: string; activity_level: string; avatar_url: string
}

interface Anamnese {
  health_history: string; injuries: string; diseases: string
  medications: string; food_allergies: string; food_preferences: string
  training_experience: string; notes: string
}

const emptyProfile = (): ClientProfile => ({
  age: '', sex: '', height_cm: '', weight_kg: '',
  goal: '', activity_level: '', avatar_url: '',
})

const emptyAnamnese = (): Anamnese => ({
  health_history: '', injuries: '', diseases: '', medications: '',
  food_allergies: '', food_preferences: '', training_experience: '', notes: '',
})

// ── Componente principal ───────────────────────────────────────────────────────
export default function PerfilPage() {
  const [userId, setUserId]     = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [profile, setProfile]   = useState<ClientProfile>(emptyProfile())
  const [anamnese, setAnamnese] = useState<Anamnese>(emptyAnamnese())
  const [loading, setLoading]   = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAnamnese, setSavingAnamnese] = useState(false)
  const [successProfile, setSuccessProfile] = useState(false)
  const [successAnamnese, setSuccessAnamnese] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Histórico
  const [sessions, setSessions]   = useState<any[]>([])
  const [histItems, setHistItems] = useState<any[]>([])
  const [gamification, setGamification] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [
        { data: profileBase },
        { data: profileExt },
        { data: anamneseData },
        { data: sessionsData },
        { data: gamiData },
        { data: dietas },
        { data: treinos },
      ] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
        supabase.from('client_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('client_anamnese').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('workout_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(20),
        supabase.from('user_gamification').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('diets').select('id, name, objective, status, sent_at, profiles!diets_professional_id_fkey(full_name)')
          .eq('client_id', user.id).order('sent_at', { ascending: false }),
        supabase.from('workouts').select('id, name, division, status, sent_at, profiles!workouts_professional_id_fkey(full_name)')
          .eq('client_id', user.id).order('sent_at', { ascending: false }),
      ])

      setUserName(profileBase?.full_name ?? null)
      setUserEmail(profileBase?.email ?? null)

      if (profileExt) {
        setProfile({
          age:            String(profileExt.age ?? ''),
          sex:            profileExt.sex ?? '',
          height_cm:      String(profileExt.height_cm ?? ''),
          weight_kg:      String(profileExt.weight_kg ?? ''),
          goal:           profileExt.goal ?? '',
          activity_level: profileExt.activity_level ?? '',
          avatar_url:     profileExt.avatar_url ?? '',
        })
        if (profileExt.avatar_url) setAvatarPreview(profileExt.avatar_url)
      }

      if (anamneseData) {
        setAnamnese({
          health_history:      anamneseData.health_history     ?? '',
          injuries:            anamneseData.injuries            ?? '',
          diseases:            anamneseData.diseases            ?? '',
          medications:         anamneseData.medications         ?? '',
          food_allergies:      anamneseData.food_allergies      ?? '',
          food_preferences:    anamneseData.food_preferences    ?? '',
          training_experience: anamneseData.training_experience ?? '',
          notes:               anamneseData.notes               ?? '',
        })
      }

      setSessions(sessionsData ?? [])
      setGamification(gamiData ?? null)

      const hist = [
        ...(dietas ?? []).map((d: any) => ({ ...d, _type: 'diet' })),
        ...(treinos ?? []).map((t: any) => ({ ...t, _type: 'workout' })),
      ].sort((a, b) => new Date(b.sent_at ?? 0).getTime() - new Date(a.sent_at ?? 0).getTime())
      setHistItems(hist)

      setLoading(false)
    }
    load()
  }, [])

  // ── Upload de avatar ──────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    // Show local preview immediately
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    setUploadingAvatar(true)

    // Always use .jpg to avoid URL mismatch between uploads
    const path = `${userId}/avatar.${file.name.split('.').pop() ?? 'jpg'}`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '1' })

    if (uploadErr) {
      console.error('Avatar upload error:', uploadErr.message)
      setUploadingAvatar(false)
      return
    }

    // Add cache-bust timestamp so browsers always fetch the new image
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = `${data.publicUrl}?t=${Date.now()}`

    // Update local state
    setProfile(p => ({ ...p, avatar_url: urlWithBust }))
    setAvatarPreview(urlWithBust)

    // Auto-save to DB immediately — don't wait for the user to click "Salvar dados"
    await supabase.from('client_profiles').upsert(
      { user_id: userId, avatar_url: urlWithBust },
      { onConflict: 'user_id' }
    )

    setUploadingAvatar(false)
  }

  // ── Salvar perfil pessoal ─────────────────────────────────────────────────
  async function saveProfile() {
    if (!userId) return
    setSavingProfile(true)

    await supabase.from('client_profiles').upsert({
      user_id:        userId,
      age:            profile.age ? parseInt(profile.age) : null,
      sex:            profile.sex || null,
      height_cm:      profile.height_cm ? parseFloat(profile.height_cm) : null,
      weight_kg:      profile.weight_kg ? parseFloat(profile.weight_kg) : null,
      goal:           profile.goal || null,
      activity_level: profile.activity_level || null,
      avatar_url:     profile.avatar_url || null,
    }, { onConflict: 'user_id' })

    setSavingProfile(false)
    setSuccessProfile(true)
    setTimeout(() => setSuccessProfile(false), 3000)
  }

  // ── Salvar anamnese ───────────────────────────────────────────────────────
  async function saveAnamnese() {
    if (!userId) return
    setSavingAnamnese(true)

    await supabase.from('client_anamnese').upsert({
      user_id: userId,
      ...Object.fromEntries(
        Object.entries(anamnese).map(([k, v]) => [k, v.trim() || null])
      ),
    }, { onConflict: 'user_id' })

    setSavingAnamnese(false)
    setSuccessAnamnese(true)
    setTimeout(() => setSuccessAnamnese(false), 3000)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : userEmail?.[0]?.toUpperCase() ?? 'U'

  const goalLabel  = GOALS.find(g => g.value === profile.goal)?.label ?? '—'
  const actLabel   = ACTIVITY_LEVELS.find(a => a.value === profile.activity_level)?.label ?? '—'

  const totalSessions  = gamification?.total_sessions ?? 0
  const streak         = gamification?.streak_days ?? 0
  const totalXP        = gamification?.total_xp ?? 0
  const monthComplete  = sessions.filter(s => {
    const now = new Date()
    return s.date?.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`) && s.is_complete
  }).length

  const STATUS_LABEL: Record<string, string> = { draft: 'Rascunho', review: 'Em revisão', sent: 'Enviado' }
  const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'default'> = {
    draft: 'secondary', review: 'outline', sent: 'default',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header do perfil */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 bg-card border border-border rounded-2xl">
        <div className="relative self-start sm:self-auto">
          <Avatar className="w-20 h-20">
            <AvatarImage src={avatarPreview ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
            aria-label="Alterar foto"
          >
            {uploadingAvatar
              ? <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
              : <Camera className="w-3.5 h-3.5" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground">{userName ?? 'Usuário'}</h2>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {profile.goal && (
              <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 text-xs">
                {goalLabel}
              </Badge>
            )}
            {profile.activity_level && (
              <Badge variant="secondary" className="text-xs">
                {actLabel}
              </Badge>
            )}
            {profile.weight_kg && (
              <Badge variant="outline" className="text-xs">
                {profile.weight_kg} kg
              </Badge>
            )}
            {profile.height_cm && (
              <Badge variant="outline" className="text-xs">
                {profile.height_cm} cm
              </Badge>
            )}
          </div>
        </div>
        {/* Mini stats */}
        <div className="flex gap-4 flex-wrap sm:flex-col sm:gap-2 sm:text-right">
          <div>
            <p className="text-lg font-bold text-foreground">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">treinos</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{streak}</p>
            <p className="text-xs text-muted-foreground">dias seguidos</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{totalXP}</p>
            <p className="text-xs text-muted-foreground">XP total</p>
          </div>
        </div>
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="dados" className="gap-1.5 text-xs sm:text-sm">
            <User className="w-3.5 h-3.5" />
            <span>Dados</span>
          </TabsTrigger>
          <TabsTrigger value="anamnese" className="gap-1.5 text-xs sm:text-sm">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Anamnese</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* ── ABA: Dados Pessoais ─────────────────────────────────────────── */}
        <TabsContent value="dados" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    type="number"
                    min={1} max={120}
                    value={profile.age}
                    onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
                    placeholder="Ex: 25"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={profile.height_cm}
                    onChange={e => setProfile(p => ({ ...p, height_cm: e.target.value }))}
                    placeholder="Ex: 175"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={profile.weight_kg}
                    onChange={e => setProfile(p => ({ ...p, weight_kg: e.target.value }))}
                    placeholder="Ex: 70.5"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select value={profile.sex || 'none'} onValueChange={v => setProfile(p => ({ ...p, sex: v === 'none' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {SEX_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Objetivo principal</Label>
                <Select value={profile.goal || 'none'} onValueChange={v => setProfile(p => ({ ...p, goal: v === 'none' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {GOALS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Nível de atividade atual</Label>
                <Select value={profile.activity_level || 'none'} onValueChange={v => setProfile(p => ({ ...p, activity_level: v === 'none' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {ACTIVITY_LEVELS.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingProfile ? 'Salvando...' : 'Salvar dados'}
                </Button>
                {successProfile && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Salvo com sucesso
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA: Anamnese ───────────────────────────────────────────────── */}
        <TabsContent value="anamnese" className="mt-4 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Suas informações de saúde são confidenciais e visíveis somente para você e o seu profissional responsável.
            </p>
          </div>

          {/* Bloco: Saúde */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Histórico de Saúde
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Histórico de saúde geral</Label>
                <Textarea
                  value={anamnese.health_history}
                  onChange={e => setAnamnese(a => ({ ...a, health_history: e.target.value }))}
                  placeholder="Descreva seu histórico de saúde, cirurgias anteriores, internações..."
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lesões ou restrições físicas</Label>
                <Textarea
                  value={anamnese.injuries}
                  onChange={e => setAnamnese(a => ({ ...a, injuries: e.target.value }))}
                  placeholder="Lesões atuais ou passadas que afetam seus exercícios..."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Doenças pré-existentes</Label>
                <Textarea
                  value={anamnese.diseases}
                  onChange={e => setAnamnese(a => ({ ...a, diseases: e.target.value }))}
                  placeholder="Hipertensão, diabetes, hipotireoidismo, etc."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Uso de medicamentos</Label>
                <Textarea
                  value={anamnese.medications}
                  onChange={e => setAnamnese(a => ({ ...a, medications: e.target.value }))}
                  placeholder="Liste os medicamentos de uso contínuo com a dosagem..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bloco: Alimentação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Alimentação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Alergias ou intolerâncias alimentares</Label>
                <Textarea
                  value={anamnese.food_allergies}
                  onChange={e => setAnamnese(a => ({ ...a, food_allergies: e.target.value }))}
                  placeholder="Lactose, glúten, amendoim, frutos do mar..."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preferências alimentares</Label>
                <Textarea
                  value={anamnese.food_preferences}
                  onChange={e => setAnamnese(a => ({ ...a, food_preferences: e.target.value }))}
                  placeholder="Vegetariano, vegano, alimentos que não gosta, preferências..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bloco: Treino */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Experiência com Treino
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Histórico de atividade física</Label>
                <Textarea
                  value={anamnese.training_experience}
                  onChange={e => setAnamnese(a => ({ ...a, training_experience: e.target.value }))}
                  placeholder="Há quanto tempo treina, modalidades praticadas, frequência atual..."
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Observações gerais</Label>
                <Textarea
                  value={anamnese.notes}
                  onChange={e => setAnamnese(a => ({ ...a, notes: e.target.value }))}
                  placeholder="Qualquer informação adicional relevante para o seu profissional..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 pb-4">
            <Button
              onClick={saveAnamnese}
              disabled={savingAnamnese}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Save className="w-4 h-4" />
              {savingAnamnese ? 'Salvando...' : 'Salvar anamnese'}
            </Button>
            {successAnamnese && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Salvo com sucesso
              </span>
            )}
          </div>
        </TabsContent>

        {/* ── ABA: Histórico ──────────────────────────────────────────────── */}
        <TabsContent value="historico" className="mt-4 space-y-4">

          {/* Mini stats de desempenho */}
          {gamification && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Treinos</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
                  <p className="text-xs text-muted-foreground">sessões completas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground">Sequência</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{streak}</p>
                  <p className="text-xs text-muted-foreground">{streak === 1 ? 'dia' : 'dias'} consecutivos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Este mês</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{monthComplete}</p>
                  <p className="text-xs text-muted-foreground">treinos completos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">XP total</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{totalXP}</p>
                  <p className="text-xs text-muted-foreground">pontos</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Histórico de sessões */}
          {sessions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  Sessões de Treino Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sessions.slice(0, 10).map((s: any) => {
                    const pct = s.total_exercises > 0
                      ? Math.round((s.completed_count / s.total_exercises) * 100) : 0
                    const d = new Date(s.date + 'T12:00:00')
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          s.is_complete ? 'bg-emerald-100 dark:bg-emerald-900/60' : 'bg-muted'
                        }`}>
                          {s.is_complete
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            : <Target className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 bg-muted rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">{s.completed_count}/{s.total_exercises}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de planos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Planos Recebidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!histItems.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum plano vinculado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {histItems.slice(0, 10).map((item: any) => {
                    const isDiet = item._type === 'diet'
                    const Icon = isDiet ? Utensils : Dumbbell
                    return (
                      <div key={`${item._type}-${item.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isDiet ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-blue-50 dark:bg-blue-950/50'
                        }`}>
                          <Icon className={`w-4 h-4 ${isDiet ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {isDiet ? 'Dieta' : 'Treino'}
                            {item.profiles?.full_name ? ` · ${item.profiles.full_name}` : ''}
                            {item.sent_at ? ` · ${formatDistanceToNow(item.sent_at)}` : ''}
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANT[item.status]} className="text-xs flex-shrink-0">
                          {STATUS_LABEL[item.status]}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
