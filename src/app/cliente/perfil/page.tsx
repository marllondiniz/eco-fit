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
  Flame, Calendar, History, Phone, Mail,
  ChevronLeft, ChevronRight, Sparkles, ArrowRight, PartyPopper, ClipboardList, Heart, Send, Home,
  Upload, ImageIcon, Trash2, Loader2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate, formatDistanceToNow } from '@/lib/date-utils'

// ── Máscaras de input ─────────────────────────────────────────────────────────
function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskWeight(value: string): string {
  const clean = value.replace(/[^0-9.,]/g, '').replace(',', '.')
  const parts = clean.split('.')
  if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('')
  if (parts[0] && parts[0].length > 3) parts[0] = parts[0].slice(0, 3)
  if (parts[1] !== undefined) parts[1] = parts[1].slice(0, 1)
  return parts.join('.')
}

function maskHeight(value: string): string {
  return value.replace(/\D/g, '').slice(0, 3)
}

function maskAge(value: string): string {
  return value.replace(/\D/g, '').slice(0, 3)
}

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

const ESTADOS_CIDADES: Record<string, string[]> = {
  'AC': ['Rio Branco','Cruzeiro do Sul','Sena Madureira','Tarauacá','Feijó'],
  'AL': ['Maceió','Arapiraca','Rio Largo','Palmeira dos Índios','Penedo'],
  'AM': ['Manaus','Parintins','Itacoatiara','Manacapuru','Coari'],
  'AP': ['Macapá','Santana','Laranjal do Jari','Oiapoque','Mazagão'],
  'BA': ['Salvador','Feira de Santana','Vitória da Conquista','Camaçari','Itabuna','Juazeiro','Lauro de Freitas','Ilhéus','Jequié','Teixeira de Freitas','Barreiras','Porto Seguro'],
  'CE': ['Fortaleza','Caucaia','Juazeiro do Norte','Maracanaú','Sobral','Crato','Itapipoca','Maranguape','Iguatu'],
  'DF': ['Brasília','Ceilândia','Taguatinga','Samambaia','Plano Piloto','Gama','Águas Claras','Sobradinho'],
  'ES': ['Vitória','Vila Velha','Serra','Cariacica','Linhares','Cachoeiro de Itapemirim','Colatina','Guarapari'],
  'GO': ['Goiânia','Aparecida de Goiânia','Anápolis','Rio Verde','Luziânia','Águas Lindas de Goiás','Valparaíso de Goiás','Trindade','Catalão'],
  'MA': ['São Luís','Imperatriz','São José de Ribamar','Timon','Caxias','Codó','Paço do Lumiar','Açailândia'],
  'MG': ['Belo Horizonte','Uberlândia','Contagem','Juiz de Fora','Betim','Montes Claros','Ribeirão das Neves','Uberaba','Governador Valadares','Ipatinga','Sete Lagoas','Divinópolis','Santa Luzia','Poços de Caldas'],
  'MS': ['Campo Grande','Dourados','Três Lagoas','Corumbá','Ponta Porã','Naviraí'],
  'MT': ['Cuiabá','Várzea Grande','Rondonópolis','Sinop','Tangará da Serra','Cáceres','Sorriso','Lucas do Rio Verde'],
  'PA': ['Belém','Ananindeua','Santarém','Marabá','Parauapebas','Castanhal','Abaetetuba','Marituba'],
  'PB': ['João Pessoa','Campina Grande','Santa Rita','Patos','Bayeux','Cabedelo','Cajazeiras'],
  'PE': ['Recife','Jaboatão dos Guararapes','Olinda','Caruaru','Petrolina','Paulista','Cabo de Santo Agostinho','Camaragibe','Garanhuns'],
  'PI': ['Teresina','Parnaíba','Picos','Piripiri','Floriano','Campo Maior'],
  'PR': ['Curitiba','Londrina','Maringá','Ponta Grossa','Cascavel','São José dos Pinhais','Foz do Iguaçu','Colombo','Guarapuava','Paranaguá','Araucária'],
  'RJ': ['Rio de Janeiro','São Gonçalo','Duque de Caxias','Nova Iguaçu','Niterói','Belford Roxo','Campos dos Goytacazes','São João de Meriti','Petrópolis','Volta Redonda','Magé','Macaé','Itaboraí','Cabo Frio','Angra dos Reis'],
  'RN': ['Natal','Mossoró','Parnamirim','São Gonçalo do Amarante','Macaíba','Ceará-Mirim','Caicó'],
  'RO': ['Porto Velho','Ji-Paraná','Ariquemes','Vilhena','Cacoal','Rolim de Moura'],
  'RR': ['Boa Vista','Rorainópolis','Caracaraí','Alto Alegre','Pacaraima'],
  'RS': ['Porto Alegre','Caxias do Sul','Pelotas','Canoas','Santa Maria','Gravataí','Viamão','Novo Hamburgo','São Leopoldo','Rio Grande','Alvorada','Passo Fundo'],
  'SC': ['Florianópolis','Joinville','Blumenau','São José','Chapecó','Criciúma','Itajaí','Jaraguá do Sul','Lages','Palhoça','Balneário Camboriú'],
  'SE': ['Aracaju','Nossa Senhora do Socorro','Lagarto','Itabaiana','São Cristóvão','Estância'],
  'SP': ['São Paulo','Guarulhos','Campinas','São Bernardo do Campo','Santo André','São José dos Campos','Osasco','Ribeirão Preto','Sorocaba','Santos','Mauá','São José do Rio Preto','Mogi das Cruzes','Diadema','Jundiaí','Piracicaba','Carapicuíba','Bauru','Itaquaquecetuba','Franca','Praia Grande','Guarujá','Taubaté','Limeira','Suzano','Marília'],
  'TO': ['Palmas','Araguaína','Gurupi','Porto Nacional','Paraíso do Tocantins'],
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ClientProfile {
  age: string; sex: string; height_cm: string; weight_kg: string
  goal: string; activity_level: string; avatar_url: string
  date_of_birth: string; profession: string; city_state: string
}

interface Anamnese {
  // Rotina diária
  wake_up_time: string
  sleep_time: string
  preferred_training_time: string
  trains_fasted: string
  hunger_peak_time: string
  feeding_difficulty_time: string
  feeding_difficulty_reason: string
  // Treinamento
  training_experience: string
  weekly_availability: string
  session_duration_min: string
  can_train_twice_daily: string
  does_aerobic: string
  aerobic_type: string
  aerobic_frequency: string
  additional_modalities: string
  training_location: string
  home_equipment: string
  // Objetivos
  secondary_goal: string
  muscle_priorities: string
  desired_timeframe: string
  // Alimentação
  meals_per_day: string
  skips_meals: string
  food_allergies: string
  food_preferences: string
  disliked_foods: string
  alcohol_consumption: string
  daily_water_intake: string
  meal_prep_time: string
  // Saúde
  health_history: string
  injuries: string
  diseases: string
  medications: string
  frequent_pain: string
  previous_coaching: string
  // Comportamento
  discipline_level: string
  biggest_difficulty: string
  motivation_reason: string
  // Geral
  notes: string
  confirmed: boolean
}

const emptyProfile = (): ClientProfile => ({
  age: '', sex: '', height_cm: '', weight_kg: '',
  goal: '', activity_level: '', avatar_url: '',
  date_of_birth: '', profession: '', city_state: '',
})

const emptyAnamnese = (): Anamnese => ({
  wake_up_time: '', sleep_time: '', preferred_training_time: '',
  trains_fasted: '', hunger_peak_time: '', feeding_difficulty_time: '',
  feeding_difficulty_reason: '',
  training_experience: '', weekly_availability: '', session_duration_min: '',
  can_train_twice_daily: '', does_aerobic: '', aerobic_type: '',
  aerobic_frequency: '', additional_modalities: '', training_location: '',
  home_equipment: '',
  secondary_goal: '', muscle_priorities: '', desired_timeframe: '',
  meals_per_day: '', skips_meals: '', food_allergies: '',
  food_preferences: '', disliked_foods: '', alcohol_consumption: '',
  daily_water_intake: '', meal_prep_time: '',
  health_history: '', injuries: '', diseases: '', medications: '',
  frequent_pain: '', previous_coaching: '',
  discipline_level: '', biggest_difficulty: '', motivation_reason: '',
  notes: '', confirmed: false,
})

// ── Componente principal ───────────────────────────────────────────────────────
export default function PerfilPage() {
  const [userId, setUserId]       = useState<string | null>(null)
  const [userName, setUserName]   = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [profile, setProfile]     = useState<ClientProfile>(emptyProfile())
  const [anamnese, setAnamnese]   = useState<Anamnese>(emptyAnamnese())
  const [anamneseStep, setAnamneseStep] = useState(1)
  const [loading, setLoading]     = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAnamnese, setSavingAnamnese] = useState(false)
  const [successProfile, setSuccessProfile] = useState(false)
  const [successAnamnese, setSuccessAnamnese] = useState(false)
  const [erroAnamnese, setErroAnamnese] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selectedUF, setSelectedUF] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [activeTab, setActiveTab] = useState('dados')
  const [profileStep, setProfileStep] = useState(1)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showGoToAnamnese, setShowGoToAnamnese] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const PROFILE_STEPS_MAX = 4

  // Fotos corporais
  const [bodyPhotos, setBodyPhotos] = useState<{ front: string | null; side: string | null; back: string | null }>({ front: null, side: null, back: null })
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)
  const frontRef = useRef<HTMLInputElement>(null)
  const sideRef  = useRef<HTMLInputElement>(null)
  const backRef  = useRef<HTMLInputElement>(null)

  // Histórico
  const [sessions, setSessions]   = useState<any[]>([])
  const [histItems, setHistItems] = useState<any[]>([])
  const [gamification, setGamification] = useState<any>(null)
  const [onboardingAlreadyDone, setOnboardingAlreadyDone] = useState(false)

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
        { data: photosData },
      ] = await Promise.all([
        supabase.from('profiles').select('full_name, email, phone, onboarding_completed').eq('id', user.id).maybeSingle(),
        supabase.from('client_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('client_anamnese').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('workout_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(20),
        supabase.from('user_gamification').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('diets').select('id, name, objective, status, sent_at, profiles!diets_professional_id_fkey(full_name)')
          .eq('client_id', user.id).order('sent_at', { ascending: false }),
        supabase.from('workouts').select('id, name, division, status, sent_at, profiles!workouts_professional_id_fkey(full_name)')
          .eq('client_id', user.id).order('sent_at', { ascending: false }),
        supabase.from('body_photos').select('photo_type, url').eq('user_id', user.id).order('uploaded_at', { ascending: false }),
      ])

      setUserName(profileBase?.full_name ?? '')
      setUserEmail(profileBase?.email ?? '')
      setUserPhone(profileBase?.phone ?? '')
      if (profileBase?.onboarding_completed) setOnboardingAlreadyDone(true)

      if (profileExt) {
        setProfile({
          age:            String(profileExt.age ?? ''),
          sex:            profileExt.sex ?? '',
          height_cm:      String(profileExt.height_cm ?? ''),
          weight_kg:      String(profileExt.weight_kg ?? ''),
          goal:           profileExt.goal ?? '',
          activity_level: profileExt.activity_level ?? '',
          avatar_url:     profileExt.avatar_url ?? '',
          date_of_birth:  profileExt.date_of_birth ?? '',
          profession:     profileExt.profession ?? '',
          city_state:     profileExt.city_state ?? '',
        })
        if (profileExt.city_state) {
          const parts = (profileExt.city_state as string).split(' / ')
          if (parts.length === 2) {
            setSelectedCity(parts[0].trim())
            setSelectedUF(parts[1].trim())
          }
        }
        if (profileExt.avatar_url) setAvatarPreview(profileExt.avatar_url)
      }

      if (anamneseData) {
        const a = anamneseData as Record<string, any>
        setAnamnese({
          wake_up_time:          a.wake_up_time ?? '',
          sleep_time:            a.sleep_time ?? '',
          preferred_training_time: a.preferred_training_time ?? '',
          trains_fasted:         a.trains_fasted ?? '',
          hunger_peak_time:      a.hunger_peak_time ?? '',
          feeding_difficulty_time: a.feeding_difficulty_time ?? '',
          feeding_difficulty_reason: a.feeding_difficulty_reason ?? '',
          training_experience:   a.training_experience ?? '',
          weekly_availability:   a.weekly_availability ?? '',
          session_duration_min:  String(a.session_duration_min ?? ''),
          can_train_twice_daily: a.can_train_twice_daily ? 'Sim' : '',
          does_aerobic:          a.does_aerobic ?? '',
          aerobic_type:          a.aerobic_type ?? '',
          aerobic_frequency:     a.aerobic_frequency ?? '',
          additional_modalities: a.additional_modalities ?? '',
          training_location:     a.training_location ?? '',
          home_equipment:        a.home_equipment ?? '',
          secondary_goal:        a.secondary_goal ?? '',
          muscle_priorities:     a.muscle_priorities ?? '',
          desired_timeframe:     a.desired_timeframe ?? '',
          meals_per_day:         a.meals_per_day ?? '',
          skips_meals:           a.skips_meals ? 'Sim' : '',
          food_allergies:        a.food_allergies ?? '',
          food_preferences:      a.food_preferences ?? '',
          disliked_foods:        a.disliked_foods ?? '',
          alcohol_consumption:   a.alcohol_consumption ?? '',
          daily_water_intake:    a.daily_water_intake ?? '',
          meal_prep_time:        a.meal_prep_time ?? '',
          health_history:        a.health_history ?? '',
          injuries:              a.injuries ?? '',
          diseases:              a.diseases ?? '',
          medications:           a.medications ?? '',
          frequent_pain:         a.frequent_pain ?? '',
          previous_coaching:     a.previous_coaching ?? '',
          discipline_level:      String(a.discipline_level ?? ''),
          biggest_difficulty:    a.biggest_difficulty ?? '',
          motivation_reason:     a.motivation_reason ?? '',
          notes:                 a.notes ?? '',
          confirmed:             a.confirmed ?? false,
        })
      }

      setSessions(sessionsData ?? [])
      setGamification(gamiData ?? null)

      // Fotos corporais
      const photos: Record<string, string | null> = { front: null, side: null, back: null }
      for (const p of (photosData ?? []) as any[]) {
        if (!photos[p.photo_type]) photos[p.photo_type] = p.url
      }
      setBodyPhotos({ front: photos.front, side: photos.side, back: photos.back })

      const hist = [
        ...(dietas ?? []).map((d: any) => ({ ...d, _type: 'diet' })),
        ...(treinos ?? []).map((t: any) => ({ ...t, _type: 'workout' })),
      ].sort((a, b) => new Date(b.sent_at ?? 0).getTime() - new Date(a.sent_at ?? 0).getTime())
      setHistItems(hist)

      const isNewProfile = !profileExt || (!profileExt.age && !profileExt.weight_kg)
      const hasNoAnamnese = !anamneseData || !anamneseData.confirmed
      if (isNewProfile) setShowWelcome(true)
      else if (hasNoAnamnese && profileExt?.age) {
        setActiveTab('anamnese')
      }

      setLoading(false)
    }
    load()
  }, [])

  // ── Upload de foto corporal ──────────────────────────────────────────────
  async function handleBodyPhoto(e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'side' | 'back') {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploadingPhoto(type)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${type}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('body-photos')
      .upload(path, file, { upsert: true, cacheControl: '1' })

    if (upErr) {
      console.error('Body photo upload error:', upErr.message)
      setUploadingPhoto(null)
      return
    }

    const { data } = supabase.storage.from('body-photos').getPublicUrl(path)
    const url = `${data.publicUrl}?t=${Date.now()}`

    // Remove registro antigo (se existir) e insere novo
    await supabase.from('body_photos').delete().eq('user_id', userId).eq('photo_type', type)
    await supabase.from('body_photos').insert({ user_id: userId, photo_type: type, url })

    setBodyPhotos(prev => ({ ...prev, [type]: url }))
    setUploadingPhoto(null)
  }

  async function deleteBodyPhoto(type: 'front' | 'side' | 'back') {
    if (!userId) return
    setUploadingPhoto(type)
    await supabase.from('body_photos').delete().eq('user_id', userId).eq('photo_type', type)
    setBodyPhotos(prev => ({ ...prev, [type]: null }))
    setUploadingPhoto(null)
  }

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

    const pMissing = REQUIRED_PROFILE_FIELDS.filter(f => !getProfileFieldValue(f.key))
    if (pMissing.length > 0) {
      setSuccessProfile(false)
      return
    }

    setSavingProfile(true)

    await Promise.all([
      supabase.from('profiles').update({
        full_name: userName.trim() || null,
        phone:     userPhone.trim() || null,
      }).eq('id', userId),
      supabase.from('client_profiles').upsert({
        user_id:        userId,
        age:            profile.age ? parseInt(profile.age) : null,
        sex:            profile.sex || null,
        height_cm:      profile.height_cm ? parseFloat(profile.height_cm) : null,
        weight_kg:      profile.weight_kg ? parseFloat(profile.weight_kg) : null,
        goal:           profile.goal || null,
        activity_level: profile.activity_level || null,
        avatar_url:     profile.avatar_url || null,
        date_of_birth:  profile.date_of_birth || null,
        profession:     profile.profession.trim() || null,
        city_state:     profile.city_state.trim() || null,
      }, { onConflict: 'user_id' }),
    ])

    setSavingProfile(false)
    setSuccessProfile(true)

    const hasAnamnese = anamnese.confirmed
    if (!hasAnamnese) {
      setShowGoToAnamnese(true)
    }
    setTimeout(() => setSuccessProfile(false), 3000)
  }

  // ── Salvar anamnese ───────────────────────────────────────────────────────
  async function saveAnamnese() {
    if (!userId) return

    // Validação: todos os campos obrigatórios devem estar preenchidos
    const pMissing = REQUIRED_PROFILE_FIELDS.filter(f => !getProfileFieldValue(f.key))
    const aMissing = REQUIRED_ANAMNESE_FIELDS.filter(f => !getAnamneseFieldValue(f.key))

    if (pMissing.length > 0 || aMissing.length > 0) {
      const allMissing = [...pMissing, ...aMissing]
      setErroAnamnese(
        `Preencha todos os campos obrigatórios antes de confirmar. Pendentes: ${allMissing.map(f => f.label).join(', ')}.`
      )
      return
    }

    if (!anamnese.confirmed) {
      setErroAnamnese('Marque a confirmação para concluir.')
      return
    }

    const requiredFieldsFilled = true
    setErroAnamnese(null)
    setSavingAnamnese(true)

    const BOOL_FIELDS = ['can_train_twice_daily', 'skips_meals'] as const
    const INT_FIELDS = ['session_duration_min', 'discipline_level'] as const

    const anamneseColumns = [
      'wake_up_time', 'sleep_time', 'preferred_training_time', 'trains_fasted',
      'hunger_peak_time', 'feeding_difficulty_time', 'feeding_difficulty_reason',
      'training_experience', 'weekly_availability', 'session_duration_min',
      'can_train_twice_daily', 'does_aerobic', 'aerobic_type', 'aerobic_frequency',
      'additional_modalities', 'training_location', 'home_equipment',
      'secondary_goal', 'muscle_priorities', 'desired_timeframe',
      'meals_per_day', 'skips_meals', 'food_allergies', 'food_preferences',
      'disliked_foods', 'alcohol_consumption', 'daily_water_intake', 'meal_prep_time',
      'health_history', 'injuries', 'diseases', 'medications',
      'frequent_pain', 'previous_coaching',
      'discipline_level', 'biggest_difficulty', 'motivation_reason',
      'notes', 'confirmed',
    ] as const

    const payload: Record<string, unknown> = { user_id: userId }
    for (const key of anamneseColumns) {
      const v = anamnese[key as keyof Anamnese]
      if (key === 'confirmed') {
        payload[key] = v
      } else if ((INT_FIELDS as readonly string[]).includes(key)) {
        const num = parseInt(String(v), 10)
        payload[key] = isNaN(num) ? null : num
      } else if ((BOOL_FIELDS as readonly string[]).includes(key)) {
        payload[key] = v === 'Sim'
      } else {
        payload[key] = typeof v === 'string' ? v.trim() || null : v
      }
    }

    await supabase.from('client_anamnese').upsert(payload, { onConflict: 'user_id' })

    const isFirstCompletion = anamnese.confirmed && requiredFieldsFilled && !onboardingAlreadyDone

    if (isFirstCompletion) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId)

      // Buscar profissional responsável
      let professionalId: string | null = null
      if (userEmail) {
        const { data: invite } = await supabase
          .from('invitations')
          .select('invited_by')
          .eq('email', userEmail)
          .not('used_at', 'is', null)
          .order('used_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        professionalId = (invite as any)?.invited_by ?? null
      }

      if (!professionalId) {
        const [{ data: lastWorkout }, { data: lastDiet }] = await Promise.all([
          supabase
            .from('workouts')
            .select('professional_id')
            .eq('client_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('diets')
            .select('professional_id')
            .eq('client_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
        professionalId = (lastWorkout as any)?.professional_id
          ?? (lastDiet as any)?.professional_id
          ?? null
      }

      if (professionalId) {
        await supabase
          .from('client_profiles')
          .upsert({ user_id: userId, invited_by: professionalId }, { onConflict: 'user_id' })
      }

      // Enviar solicitações: treino+dieta e cardio
      await supabase.from('plan_requests').insert([
        { client_id: userId, professional_id: professionalId, type: 'both',   status: 'pending' },
        { client_id: userId, professional_id: professionalId, type: 'cardio', status: 'pending' },
      ])

      setOnboardingAlreadyDone(true)
      setShowComplete(true)
    }

    setSavingAnamnese(false)
    setSuccessAnamnese(true)
    setTimeout(() => setSuccessAnamnese(false), 3000)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : userEmail?.[0]?.toUpperCase() || 'U'

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

  // ── Campos obrigatórios ──────────────────────────────────────────────────
  const REQUIRED_PROFILE_FIELDS: { key: string; label: string }[] = [
    { key: 'userName', label: 'Nome completo' },
    { key: 'userPhone', label: 'Telefone' },
    { key: 'age', label: 'Idade' },
    { key: 'sex', label: 'Sexo' },
    { key: 'date_of_birth', label: 'Data de nascimento' },
    { key: 'height_cm', label: 'Altura' },
    { key: 'weight_kg', label: 'Peso' },
    { key: 'profession', label: 'Profissão' },
    { key: 'city_state', label: 'Cidade/Estado' },
    { key: 'goal', label: 'Objetivo' },
    { key: 'activity_level', label: 'Nível de atividade' },
  ]

  const REQUIRED_ANAMNESE_FIELDS: { key: string; label: string }[] = [
    { key: 'wake_up_time', label: 'Horário de acordar' },
    { key: 'sleep_time', label: 'Horário de dormir' },
    { key: 'preferred_training_time', label: 'Horário para treinar' },
    { key: 'trains_fasted', label: 'Treina em jejum?' },
    { key: 'hunger_peak_time', label: 'Horário com mais fome' },
    { key: 'feeding_difficulty_time', label: 'Dificuldade alimentar' },
    { key: 'feeding_difficulty_reason', label: 'Motivo da dificuldade' },
    { key: 'training_experience', label: 'Experiência em musculação' },
    { key: 'weekly_availability', label: 'Disponibilidade semanal' },
    { key: 'session_duration_min', label: 'Duração da sessão' },
    { key: 'can_train_twice_daily', label: 'Treinar 2x ao dia' },
    { key: 'does_aerobic', label: 'Pratica aeróbico' },
    { key: 'training_location', label: 'Local de treino' },
    { key: 'muscle_priorities', label: 'Prioridade muscular' },
    { key: 'desired_timeframe', label: 'Prazo desejado' },
    { key: 'meals_per_day', label: 'Refeições por dia' },
    { key: 'skips_meals', label: 'Pula refeições?' },
    { key: 'food_allergies', label: 'Restrição alimentar' },
    { key: 'food_preferences', label: 'Preferências alimentares' },
    { key: 'disliked_foods', label: 'Alimentos que não gosta' },
    { key: 'alcohol_consumption', label: 'Consumo de álcool' },
    { key: 'daily_water_intake', label: 'Consumo de água' },
    { key: 'meal_prep_time', label: 'Tempo para preparo' },
    { key: 'diseases', label: 'Condições de saúde' },
    { key: 'injuries', label: 'Lesões' },
    { key: 'frequent_pain', label: 'Dores frequentes' },
    { key: 'medications', label: 'Medicamentos' },
    { key: 'health_history', label: 'Histórico de saúde' },
    { key: 'previous_coaching', label: 'Acompanhamento anterior' },
    { key: 'discipline_level', label: 'Nível de disciplina' },
    { key: 'biggest_difficulty', label: 'Maior dificuldade' },
    { key: 'motivation_reason', label: 'Motivação' },
  ]

  function getProfileFieldValue(key: string): string {
    if (key === 'userName') return userName.trim()
    if (key === 'userPhone') return userPhone.replace(/\D/g, '')
    return (profile[key as keyof ClientProfile] ?? '').toString().trim()
  }

  function getAnamneseFieldValue(key: string): string {
    return (anamnese[key as keyof Anamnese] ?? '').toString().trim()
  }

  const missingProfileFields = REQUIRED_PROFILE_FIELDS.filter(f => !getProfileFieldValue(f.key))
  const missingAnamneseFields = REQUIRED_ANAMNESE_FIELDS.filter(f => !getAnamneseFieldValue(f.key))
  const profileFilledAll = missingProfileFields.length === 0
  const anamneseFilledAll = missingAnamneseFields.length === 0
  const anamneseDone = anamnese.confirmed && anamneseFilledAll && profileFilledAll

  const ONBOARDING_STEPS = [
    { key: 'dados',     label: 'Dados Pessoais', done: profileFilledAll },
    { key: 'anamnese',  label: 'Anamnese',       done: anamneseDone },
  ]

  const profilePct = Math.round(((REQUIRED_PROFILE_FIELDS.length - missingProfileFields.length) / REQUIRED_PROFILE_FIELDS.length) * 100)
  const anamnesePct = Math.round(((REQUIRED_ANAMNESE_FIELDS.length - missingAnamneseFields.length) / REQUIRED_ANAMNESE_FIELDS.length) * 100)

  // ── Welcome screen ─────────────────────────────────────────────────────
  if (showWelcome) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <span className="relative block h-14 w-[140px]">
              <Image
                src="/logo-preto.png"
                alt="LB.FIT"
                fill
                className="object-contain object-center dark:hidden"
                sizes="140px"
                priority
              />
              <Image
                src="/logo-branco.png"
                alt="LB.FIT"
                fill
                className="object-contain object-center hidden dark:block"
                sizes="140px"
                priority
              />
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo(a) ao LB.FIT!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Vamos configurar seu perfil em poucos minutos. Com suas informações, seu profissional poderá criar planos <strong>100% personalizados</strong> para você.
            </p>
          </div>

          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-sm font-bold text-emerald-600">1</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Dados Pessoais</p>
                <p className="text-xs text-muted-foreground">Nome, idade, peso, altura e objetivo</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">~2 min</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-sm font-bold text-emerald-600">2</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Anamnese Completa</p>
                <p className="text-xs text-muted-foreground">Rotina, treino, alimentação e saúde</p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">~5 min</span>
            </div>
          </div>

          <Button
            onClick={() => { setShowWelcome(false); setActiveTab('dados') }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12 text-base"
          >
            Vamos começar <ArrowRight className="w-5 h-5" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Todos os campos são obrigatórios para liberar o acesso à plataforma.
          </p>
        </div>
      </div>
    )
  }

  // ── Tela de conclusão ──────────────────────────────────────────────────
  if (showComplete) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 animate-bounce">
            <PartyPopper className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Parabéns, {userName?.split(' ')[0] || 'tudo pronto'}!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Seu cadastro foi concluído com sucesso. Já enviamos automaticamente uma <strong>solicitação de plano</strong> para seu profissional responsável.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Send className="w-4 h-4 text-primary" />
              Solicitação enviada
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Seu personal/nutricionista já foi notificado e em breve irá preparar seus planos personalizados com base nas informações que você preencheu.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                <Dumbbell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400">Treino</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                <Utensils className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Dieta</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
                <Heart className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400">Cardio</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400 text-left leading-relaxed">
              Enquanto aguarda, explore a plataforma. Assim que seus planos estiverem prontos, eles aparecerão na sua página inicial.
            </p>
          </div>

          <Link
            href="/cliente"
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-medium rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" /> Ir para a página inicial
          </Link>
        </div>
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
          <h2 className="text-xl font-bold text-foreground">{userName || 'Usuário'}</h2>
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

      {/* Mini progresso do onboarding (só exibe se falta completar) */}
      {(!profileFilledAll || !anamneseDone) && (
        <div className="bg-card border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-foreground">Complete seu cadastro para acessar a plataforma</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Todos os campos de dados pessoais e anamnese são obrigatórios. Você só terá acesso às demais áreas após preencher 100%.
          </p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Dados: <strong className={profileFilledAll ? 'text-emerald-600' : 'text-amber-600'}>{profilePct}%</strong></span>
            <span>Anamnese: <strong className={anamneseFilledAll ? 'text-emerald-600' : 'text-amber-600'}>{anamnesePct}%</strong></span>
          </div>
          <div className="flex gap-2">
            {ONBOARDING_STEPS.map((s) => (
              <button
                key={s.key}
                onClick={() => { setActiveTab(s.key); setShowGoToAnamnese(false) }}
                className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                  s.done
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : activeTab === s.key
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/30 border-border hover:border-primary/20'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  s.done ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">{s.key === 'dados' ? '1' : '2'}</span>}
                </div>
                <span className={`text-xs font-medium ${s.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Banner: Ir para anamnese após salvar dados */}
      {showGoToAnamnese && !anamneseDone && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Dados salvos! Agora falta a anamnese.</p>
            <p className="text-xs text-violet-600 dark:text-violet-400">Preencha para que seu profissional crie planos personalizados para você.</p>
          </div>
          <Button
            onClick={() => { setActiveTab('anamnese'); setAnamneseStep(1); setShowGoToAnamnese(false) }}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 flex-shrink-0"
          >
            Iniciar anamnese <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setShowGoToAnamnese(false) }} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="dados" className="gap-1.5 text-xs sm:text-sm">
            {profileFilledAll ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <User className="w-3.5 h-3.5" />}
            <span>Dados</span>
          </TabsTrigger>
          <TabsTrigger value="anamnese" className="gap-1.5 text-xs sm:text-sm">
            {anamneseDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>Anamnese</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* ── ABA: Dados Pessoais (com steps) ─────────────────────────────── */}
        <TabsContent value="dados" className="mt-4 space-y-4">
          {/* Alerta campos pendentes */}
          {missingProfileFields.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {missingProfileFields.length} {missingProfileFields.length === 1 ? 'campo pendente' : 'campos pendentes'}
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                  {missingProfileFields.map(f => f.label).join(', ')}
                </p>
              </div>
            </div>
          )}
          {/* Barra de progresso dos steps do perfil */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Etapa {profileStep} de {PROFILE_STEPS_MAX}</span>
              <span>{Math.round((profileStep / PROFILE_STEPS_MAX) * 100)}%</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: PROFILE_STEPS_MAX }, (_, i) => i + 1).map(s => (
                <button key={s} type="button" onClick={() => setProfileStep(s)}
                  className={`h-2 flex-1 rounded-full transition-colors ${s <= profileStep ? 'bg-emerald-500' : 'bg-muted'}`}
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-foreground text-center">
              {profileStep === 1 && 'Contato'}
              {profileStep === 2 && 'Identificação e medidas'}
              {profileStep === 3 && 'Localização'}
              {profileStep === 4 && 'Objetivos'}
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Contato */}
              {profileStep === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className={!userName.trim() ? 'text-red-600 dark:text-red-400' : ''}>Nome completo *</Label>
                    <Input id="fullName" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Seu nome completo" className={!userName.trim() ? 'border-red-300 dark:border-red-700' : ''} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className={!userPhone.replace(/\D/g, '') ? 'text-red-600 dark:text-red-400' : ''}>Telefone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="phone" className={`pl-9 ${!userPhone.replace(/\D/g, '') ? 'border-red-300 dark:border-red-700' : ''}`} value={userPhone} onChange={e => setUserPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={16} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9 bg-muted/50 cursor-not-allowed" value={userEmail} readOnly disabled />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Identificação e medidas */}
              {profileStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="age" className={!profile.age ? 'text-red-600 dark:text-red-400' : ''}>Idade *</Label>
                      <Input id="age" inputMode="numeric" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: maskAge(e.target.value) }))} placeholder="Ex: 25" maxLength={3} className={!profile.age ? 'border-red-300 dark:border-red-700' : ''} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dob" className={!profile.date_of_birth ? 'text-red-600 dark:text-red-400' : ''}>Data de nascimento *</Label>
                      <Input id="dob" type="date" value={profile.date_of_birth} onChange={e => setProfile(p => ({ ...p, date_of_birth: e.target.value }))} className={!profile.date_of_birth ? 'border-red-300 dark:border-red-700' : ''} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={!profile.sex ? 'text-red-600 dark:text-red-400' : ''}>Sexo *</Label>
                      <Select value={profile.sex || 'none'} onValueChange={v => setProfile(p => ({ ...p, sex: v === 'none' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não informado</SelectItem>
                          {SEX_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="weight" className={!profile.weight_kg ? 'text-red-600 dark:text-red-400' : ''}>Peso atual (kg) *</Label>
                      <Input id="weight" inputMode="decimal" value={profile.weight_kg} onChange={e => setProfile(p => ({ ...p, weight_kg: maskWeight(e.target.value) }))} placeholder="Ex: 70.5" maxLength={5} className={!profile.weight_kg ? 'border-red-300 dark:border-red-700' : ''} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="height" className={!profile.height_cm ? 'text-red-600 dark:text-red-400' : ''}>Altura (cm) *</Label>
                      <Input id="height" inputMode="numeric" value={profile.height_cm} onChange={e => setProfile(p => ({ ...p, height_cm: maskHeight(e.target.value) }))} placeholder="Ex: 175" maxLength={3} className={!profile.height_cm ? 'border-red-300 dark:border-red-700' : ''} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profession" className={!profile.profession.trim() ? 'text-red-600 dark:text-red-400' : ''}>Profissão *</Label>
                      <Input id="profession" value={profile.profession} onChange={e => setProfile(p => ({ ...p, profession: e.target.value }))} placeholder="Ex: Engenheiro" className={!profile.profession.trim() ? 'border-red-300 dark:border-red-700' : ''} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Localização */}
              {profileStep === 3 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className={!selectedUF ? 'text-red-600 dark:text-red-400' : ''}>Estado *</Label>
                    <Select value={selectedUF || 'none'} onValueChange={uf => {
                      const v = uf === 'none' ? '' : uf
                      setSelectedUF(v)
                      setSelectedCity('')
                      setProfile(p => ({ ...p, city_state: '' }))
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecionar estado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecionar</SelectItem>
                        {Object.keys(ESTADOS_CIDADES).sort().map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!selectedCity ? 'text-red-600 dark:text-red-400' : ''}>Cidade *</Label>
                    <Select value={selectedCity || 'none'} onValueChange={city => {
                      const v = city === 'none' ? '' : city
                      setSelectedCity(v)
                      if (v && selectedUF) {
                        setProfile(p => ({ ...p, city_state: `${v} / ${selectedUF}` }))
                      }
                    }} disabled={!selectedUF}>
                      <SelectTrigger><SelectValue placeholder={selectedUF ? 'Selecionar cidade' : 'Selecione o estado primeiro'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecionar</SelectItem>
                        {(ESTADOS_CIDADES[selectedUF] ?? []).map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 4: Objetivos */}
              {profileStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className={!profile.goal ? 'text-red-600 dark:text-red-400' : ''}>Objetivo principal *</Label>
                    <Select value={profile.goal || 'none'} onValueChange={v => setProfile(p => ({ ...p, goal: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar objetivo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não informado</SelectItem>
                        {GOALS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!profile.activity_level ? 'text-red-600 dark:text-red-400' : ''}>Nível de atividade atual *</Label>
                    <Select value={profile.activity_level || 'none'} onValueChange={v => setProfile(p => ({ ...p, activity_level: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar nível" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não informado</SelectItem>
                        {ACTIVITY_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {successProfile && (
                    <p className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Salvo com sucesso
                    </p>
                  )}
                </div>
              )}

              {/* Navegação dos steps do perfil */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProfileStep(s => Math.max(1, s - 1))}
                  disabled={profileStep === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </Button>
                <span className="text-xs text-muted-foreground">{profileStep} / {PROFILE_STEPS_MAX}</span>
                {profileStep < PROFILE_STEPS_MAX ? (
                  <Button type="button" onClick={() => setProfileStep(s => Math.min(PROFILE_STEPS_MAX, s + 1))} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    Próximo <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button onClick={saveProfile} disabled={savingProfile} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Save className="w-4 h-4" />
                    {savingProfile ? 'Salvando...' : 'Salvar dados'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA: Anamnese ───────────────────────────────────────────────── */}
        <TabsContent value="anamnese" className="mt-4 space-y-4">
          {/* Header + Progresso */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Suas informações são confidenciais e visíveis somente para você e o seu profissional responsável. <strong>Todos os campos são obrigatórios.</strong>
            </p>
            {missingAnamneseFields.length > 0 && (
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                {missingAnamneseFields.length} {missingAnamneseFields.length === 1 ? 'campo pendente' : 'campos pendentes'}: {missingAnamneseFields.map(f => f.label).join(', ')}
              </p>
            )}
          </div>
          {erroAnamnese && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{erroAnamnese}</p>
            </div>
          )}

          {/* Barra de progresso dos steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Etapa {anamneseStep} de 6</span>
              <span>{Math.round((anamneseStep / 6) * 100)}% concluído</span>
            </div>
            <div className="flex gap-1.5">
              {[1,2,3,4,5,6].map(s => (
                <button key={s} onClick={() => setAnamneseStep(s)}
                  className={`h-2 flex-1 rounded-full transition-colors ${s <= anamneseStep ? 'bg-emerald-500' : 'bg-muted'}`}
                />
              ))}
            </div>
            <div className="flex justify-center">
              <span className="text-sm font-semibold text-foreground">
                {anamneseStep === 1 && 'Rotina Diária'}
                {anamneseStep === 2 && 'Treinamento'}
                {anamneseStep === 3 && 'Objetivos e Alimentação'}
                {anamneseStep === 4 && 'Saúde e Histórico'}
                {anamneseStep === 5 && 'Fotos Corporais'}
                {anamneseStep === 6 && 'Comportamento e Finalização'}
              </span>
            </div>
          </div>

          {/* ── STEP 1: Rotina Diária ── */}
          {anamneseStep === 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Rotina Diária
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className={!anamnese.wake_up_time ? 'text-red-600 dark:text-red-400' : ''}>Horário que costuma acordar *</Label>
                    <Input type="time" value={anamnese.wake_up_time} onChange={e => setAnamnese(a => ({ ...a, wake_up_time: e.target.value }))} className={!anamnese.wake_up_time ? 'border-red-300 dark:border-red-700' : ''} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.sleep_time ? 'text-red-600 dark:text-red-400' : ''}>Horário que costuma dormir *</Label>
                    <Input type="time" value={anamnese.sleep_time} onChange={e => setAnamnese(a => ({ ...a, sleep_time: e.target.value }))} className={!anamnese.sleep_time ? 'border-red-300 dark:border-red-700' : ''} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.preferred_training_time ? 'text-red-600 dark:text-red-400' : ''}>Melhor horário para treinar *</Label>
                  <Input type="time" value={anamnese.preferred_training_time} onChange={e => setAnamnese(a => ({ ...a, preferred_training_time: e.target.value }))} className={!anamnese.preferred_training_time ? 'border-red-300 dark:border-red-700' : ''} />
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.trains_fasted ? 'text-red-600 dark:text-red-400' : ''}>Treina em jejum? *</Label>
                  <Select value={anamnese.trains_fasted || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, trains_fasted: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Pretende começar">Pretende começar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.hunger_peak_time ? 'text-red-600 dark:text-red-400' : ''}>Horário em que sente mais fome *</Label>
                  <Input value={anamnese.hunger_peak_time} onChange={e => setAnamnese(a => ({ ...a, hunger_peak_time: e.target.value }))} placeholder="Ex: Meio da tarde, 16h" className={!anamnese.hunger_peak_time ? 'border-red-300 dark:border-red-700' : ''} />
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.feeding_difficulty_time ? 'text-red-600 dark:text-red-400' : ''}>Horário com mais dificuldade para se alimentar *</Label>
                  <Input value={anamnese.feeding_difficulty_time} onChange={e => setAnamnese(a => ({ ...a, feeding_difficulty_time: e.target.value }))} placeholder="Ex: Manhã, 7h" className={!anamnese.feeding_difficulty_time ? 'border-red-300 dark:border-red-700' : ''} />
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.feeding_difficulty_reason ? 'text-red-600 dark:text-red-400' : ''}>Motivo da dificuldade *</Label>
                  <Select value={anamnese.feeding_difficulty_reason || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, feeding_difficulty_reason: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="Falta de tempo">Falta de tempo</SelectItem>
                      <SelectItem value="Falta de apetite">Falta de apetite</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 2: Treinamento ── */}
          {anamneseStep === 2 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Treinamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className={!anamnese.training_experience ? 'text-red-600 dark:text-red-400' : ''}>Experiência em musculação *</Label>
                  <Select value={anamnese.training_experience || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, training_experience: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="Nunca treinou">Nunca treinou</SelectItem>
                      <SelectItem value="Menos de 6 meses">Menos de 6 meses</SelectItem>
                      <SelectItem value="6 meses a 1 ano">6 meses a 1 ano</SelectItem>
                      <SelectItem value="Mais de 1 ano">Mais de 1 ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.weekly_availability ? 'text-red-600 dark:text-red-400' : ''}>Quantas vezes por semana pode treinar? *</Label>
                  <Select value={anamnese.weekly_availability || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, weekly_availability: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      {['2', '3', '4', '5', '6'].map(n => <SelectItem key={n} value={n}>{n}x por semana</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.session_duration_min ? 'text-red-600 dark:text-red-400' : ''}>Tempo disponível por sessão *</Label>
                  <Select value={anamnese.session_duration_min || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, session_duration_min: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="45">Menos de 1h</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="90">Até 1h30</SelectItem>
                      <SelectItem value="120">Mais de 1h30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.can_train_twice_daily ? 'text-red-600 dark:text-red-400' : ''}>Consegue realizar atividade física mais de 1x ao dia? *</Label>
                  <Select value={anamnese.can_train_twice_daily || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, can_train_twice_daily: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.does_aerobic ? 'text-red-600 dark:text-red-400' : ''}>Já pratica atividade aeróbica? *</Label>
                  <Select value={anamnese.does_aerobic || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, does_aerobic: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {anamnese.does_aerobic === 'Sim' && (
                  <div className="grid grid-cols-2 gap-4 ml-3 pl-3 border-l-2 border-primary/20">
                    <div className="space-y-1.5">
                      <Label>Tipo de aeróbico</Label>
                      <Input value={anamnese.aerobic_type} onChange={e => setAnamnese(a => ({ ...a, aerobic_type: e.target.value }))} placeholder="Ex: Corrida, bike" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Frequência semanal</Label>
                      <Input value={anamnese.aerobic_frequency} onChange={e => setAnamnese(a => ({ ...a, aerobic_frequency: e.target.value }))} placeholder="Ex: 3x" />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Modalidades adicionais (crossfit, corrida, luta, bike, etc.)</Label>
                  <Textarea value={anamnese.additional_modalities} onChange={e => setAnamnese(a => ({ ...a, additional_modalities: e.target.value }))} placeholder="Ex: Jiu-jitsu 2x/semana, corrida aos sábados..." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.training_location ? 'text-red-600 dark:text-red-400' : ''}>Local de treino *</Label>
                  <Select value={anamnese.training_location || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, training_location: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="Academia">Academia</SelectItem>
                      <SelectItem value="Condomínio">Condomínio</SelectItem>
                      <SelectItem value="Casa">Casa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(anamnese.training_location === 'Casa' || anamnese.training_location === 'Condomínio') && (
                  <div className="space-y-2 ml-3 pl-3 border-l-2 border-primary/20">
                    <Label>Equipamentos disponíveis (marque os que possui)</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {['Halteres', 'Barra', 'Anilhas', 'Máquina', 'Apenas peso corporal'].map(eq => {
                        const checked = anamnese.home_equipment.includes(eq)
                        return (
                          <label key={eq} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-0" checked={checked}
                              onChange={() => setAnamnese(a => ({
                                ...a,
                                home_equipment: checked
                                  ? a.home_equipment.split(', ').filter(e => e !== eq).join(', ')
                                  : [a.home_equipment, eq].filter(Boolean).join(', '),
                              }))}
                            />
                            <span>{eq}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── STEP 3: Objetivos + Alimentação ── */}
          {anamneseStep === 3 && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Objetivos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Objetivo secundário</Label>
                    <Input value={anamnese.secondary_goal} onChange={e => setAnamnese(a => ({ ...a, secondary_goal: e.target.value }))} placeholder="Ex: Melhorar condicionamento, flexibilidade..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.muscle_priorities.trim() ? 'text-red-600 dark:text-red-400' : ''}>Prioridade muscular *</Label>
                    <Textarea value={anamnese.muscle_priorities} onChange={e => setAnamnese(a => ({ ...a, muscle_priorities: e.target.value }))} placeholder="Ex: Glúteos, costas, pernas, ombros..." rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.desired_timeframe ? 'text-red-600 dark:text-red-400' : ''}>Prazo desejado para resultado *</Label>
                    <Select value={anamnese.desired_timeframe || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, desired_timeframe: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        <SelectItem value="1 mês">1 mês</SelectItem>
                        <SelectItem value="3 meses">3 meses</SelectItem>
                        <SelectItem value="6 meses">6 meses</SelectItem>
                        <SelectItem value="1 ano">1 ano</SelectItem>
                        <SelectItem value="Sem prazo definido">Sem prazo definido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Hábitos Alimentares
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className={!anamnese.meals_per_day ? 'text-red-600 dark:text-red-400' : ''}>Número médio de refeições por dia *</Label>
                    <Select value={anamnese.meals_per_day || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, meals_per_day: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {['3', '4', '5', '6'].map(n => <SelectItem key={n} value={n}>{n} refeições</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.skips_meals ? 'text-red-600 dark:text-red-400' : ''}>Costuma pular refeições? *</Label>
                    <Select value={anamnese.skips_meals || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, skips_meals: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className={!anamnese.food_allergies.trim() ? 'text-red-600 dark:text-red-400' : ''}>Restrição alimentar *</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {['Lactose', 'Glúten', 'Ovos', 'Nenhuma'].map(r => {
                        const checked = anamnese.food_allergies.includes(r)
                        return (
                          <label key={r} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-0" checked={checked}
                              onChange={() => setAnamnese(a => ({
                                ...a,
                                food_allergies: checked
                                  ? a.food_allergies.split(', ').filter(x => x !== r).join(', ')
                                  : [a.food_allergies, r].filter(Boolean).join(', '),
                              }))}
                            />
                            <span>{r}</span>
                          </label>
                        )
                      })}
                    </div>
                    <Input value={anamnese.food_allergies} onChange={e => setAnamnese(a => ({ ...a, food_allergies: e.target.value }))} placeholder="Outras alergias/intolerâncias..." className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.food_preferences.trim() ? 'text-red-600 dark:text-red-400' : ''}>Preferências alimentares *</Label>
                    <Textarea value={anamnese.food_preferences} onChange={e => setAnamnese(a => ({ ...a, food_preferences: e.target.value }))} placeholder="Ex: Vegano, vegetariano, low carb..." rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.disliked_foods.trim() ? 'text-red-600 dark:text-red-400' : ''}>Alimentos que não gosta *</Label>
                    <Textarea value={anamnese.disliked_foods} onChange={e => setAnamnese(a => ({ ...a, disliked_foods: e.target.value }))} placeholder="Ex: Beterraba, fígado, quiabo..." rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.alcohol_consumption ? 'text-red-600 dark:text-red-400' : ''}>Consumo de álcool *</Label>
                    <Select value={anamnese.alcohol_consumption || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, alcohol_consumption: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        <SelectItem value="Não consome">Não consome</SelectItem>
                        <SelectItem value="Ocasional">Ocasional</SelectItem>
                        <SelectItem value="Frequente">Frequente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.daily_water_intake ? 'text-red-600 dark:text-red-400' : ''}>Consumo de água diário estimado *</Label>
                    <Select value={anamnese.daily_water_intake || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, daily_water_intake: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        <SelectItem value="Menos de 1 litro">Menos de 1 litro</SelectItem>
                        <SelectItem value="1 litro">1 litro</SelectItem>
                        <SelectItem value="1,5 litros">1,5 litros</SelectItem>
                        <SelectItem value="2 litros">2 litros</SelectItem>
                        <SelectItem value="2,5 litros">2,5 litros</SelectItem>
                        <SelectItem value="3 litros">3 litros</SelectItem>
                        <SelectItem value="3,5 litros">3,5 litros</SelectItem>
                        <SelectItem value="4 litros ou mais">4 litros ou mais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.meal_prep_time ? 'text-red-600 dark:text-red-400' : ''}>Tempo disponível para preparar refeições *</Label>
                    <Select value={anamnese.meal_prep_time || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, meal_prep_time: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        <SelectItem value="Alto">Alto</SelectItem>
                        <SelectItem value="Moderado">Moderado</SelectItem>
                        <SelectItem value="Baixo">Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── STEP 4: Saúde e Histórico ── */}
          {anamneseStep === 4 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Saúde e Histórico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className={!anamnese.diseases.trim() ? 'text-red-600 dark:text-red-400' : ''}>Possui alguma condição diagnosticada? *</Label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['Nenhuma', 'Diabetes', 'Hipoglicemia', 'Hipotireoidismo', 'Hérnia'].map(cond => {
                      const checked = anamnese.diseases.includes(cond)
                      return (
                        <label key={cond} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-0" checked={checked}
                            onChange={() => setAnamnese(a => ({
                              ...a,
                              diseases: checked
                                ? a.diseases.split(', ').filter(x => x !== cond).join(', ')
                                : [a.diseases, cond].filter(Boolean).join(', '),
                            }))}
                          />
                          <span>{cond}</span>
                        </label>
                      )
                    })}
                  </div>
                  <Input value={anamnese.diseases} onChange={e => setAnamnese(a => ({ ...a, diseases: e.target.value }))} placeholder="Outras condições..." className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.injuries.trim() ? 'text-red-600 dark:text-red-400' : ''}>Lesões (joelho, ombro, coluna, etc.) *</Label>
                  <Textarea value={anamnese.injuries} onChange={e => setAnamnese(a => ({ ...a, injuries: e.target.value }))} placeholder="Descreva lesões atuais ou passadas..." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.frequent_pain.trim() ? 'text-red-600 dark:text-red-400' : ''}>Sente dores frequentes? Onde? *</Label>
                  <Textarea value={anamnese.frequent_pain} onChange={e => setAnamnese(a => ({ ...a, frequent_pain: e.target.value }))} placeholder="Ex: Dor no joelho direito, lombar..." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.medications.trim() ? 'text-red-600 dark:text-red-400' : ''}>Medicamentos contínuos *</Label>
                  <Textarea value={anamnese.medications} onChange={e => setAnamnese(a => ({ ...a, medications: e.target.value }))} placeholder="Liste medicamentos com dosagem..." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.health_history.trim() ? 'text-red-600 dark:text-red-400' : ''}>Histórico de saúde geral *</Label>
                  <Textarea value={anamnese.health_history} onChange={e => setAnamnese(a => ({ ...a, health_history: e.target.value }))} placeholder="Cirurgias, internações, etc." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label className={!anamnese.previous_coaching.trim() ? 'text-red-600 dark:text-red-400' : ''}>Já realizou acompanhamento nutricional ou treinamento antes? *</Label>
                  <Textarea value={anamnese.previous_coaching} onChange={e => setAnamnese(a => ({ ...a, previous_coaching: e.target.value }))} placeholder="Descreva experiências anteriores..." rows={2} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 5: Fotos Corporais ── */}
          {anamneseStep === 5 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Fotos Corporais Iniciais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Envie fotos de frente, lado e costas para que seu profissional acompanhe sua evolução. As fotos são visíveis apenas para você e seu profissional.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {([
                    { type: 'front' as const, label: 'Frente', ref: frontRef },
                    { type: 'side' as const,  label: 'Lado',   ref: sideRef },
                    { type: 'back' as const,  label: 'Costas', ref: backRef },
                  ]).map(({ type, label, ref }) => (
                    <div key={type} className="flex flex-col items-center gap-2">
                      <p className="text-xs font-medium text-foreground">{label}</p>
                      <div
                        className="relative w-full aspect-[3/4] rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => ref.current?.click()}
                      >
                        {uploadingPhoto === type ? (
                          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                        ) : bodyPhotos[type] ? (
                          <img
                            src={bodyPhotos[type]!}
                            alt={`Foto ${label}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                            <Upload className="w-5 h-5" />
                            <span className="text-[10px]">Enviar</span>
                          </div>
                        )}
                      </div>
                      <input
                        ref={ref}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleBodyPhoto(e, type)}
                      />
                      {bodyPhotos[type] && (
                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1 px-2"
                            onClick={() => ref.current?.click()}
                          >
                            <Camera className="w-3 h-3" /> Trocar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => deleteBodyPhoto(type)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Galeria com data */}
                {(bodyPhotos.front || bodyPhotos.side || bodyPhotos.back) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {[bodyPhotos.front, bodyPhotos.side, bodyPhotos.back].filter(Boolean).length} de 3 fotos enviadas
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── STEP 6: Comportamento + Observações + Confirmação ── */}
          {anamneseStep === 6 && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Comportamento e Aderência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nível de disciplina atual (autoavaliação de 0 a 10)</Label>
                    <div className="flex items-center gap-3">
                      <Input type="range" min={0} max={10} value={anamnese.discipline_level || '5'} onChange={e => setAnamnese(a => ({ ...a, discipline_level: e.target.value }))} className="flex-1" />
                      <span className="text-lg font-bold text-primary w-8 text-center">{anamnese.discipline_level || '5'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.biggest_difficulty ? 'text-red-600 dark:text-red-400' : ''}>Maior dificuldade hoje *</Label>
                    <Select value={anamnese.biggest_difficulty || 'none'} onValueChange={v => setAnamnese(a => ({ ...a, biggest_difficulty: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        <SelectItem value="Alimentação">Alimentação</SelectItem>
                        <SelectItem value="Constância no treino">Constância no treino</SelectItem>
                        <SelectItem value="Falta de tempo">Falta de tempo</SelectItem>
                        <SelectItem value="Ansiedade">Ansiedade</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={!anamnese.motivation_reason.trim() ? 'text-red-600 dark:text-red-400' : ''}>O que te fez buscar a LBFIT neste momento? *</Label>
                    <Textarea value={anamnese.motivation_reason} onChange={e => setAnamnese(a => ({ ...a, motivation_reason: e.target.value }))} placeholder="Conte sua motivação..." rows={3} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Observações Finais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea value={anamnese.notes} onChange={e => setAnamnese(a => ({ ...a, notes: e.target.value }))} placeholder="Espaço livre para informações adicionais que julgar importantes." rows={3} />
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-0" checked={anamnese.confirmed} onChange={e => setAnamnese(a => ({ ...a, confirmed: e.target.checked }))} />
                  <span>Confirmo que todas as informações fornecidas são verdadeiras e serão usadas para personalizar meus planos de dieta e treino.</span>
                </label>
                {successAnamnese && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Salvo com sucesso
                  </span>
                )}
              </div>
            </>
          )}

          {/* ── Navegação dos steps ── */}
          <div className="flex items-center justify-between pt-2 pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAnamneseStep(s => Math.max(1, s - 1))}
              disabled={anamneseStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </Button>

            <span className="text-xs text-muted-foreground">{anamneseStep} / 6</span>

            {anamneseStep < 6 ? (
              <Button
                type="button"
                onClick={() => setAnamneseStep(s => Math.min(6, s + 1))}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={saveAnamnese}
                disabled={savingAnamnese}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-4 h-4" />
                {savingAnamnese ? 'Salvando...' : 'Salvar anamnese'}
              </Button>
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
