'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, ChevronLeft, GripVertical, Sparkles, Loader2, ChevronsUpDown, Utensils, Pill } from 'lucide-react'
import Link from 'next/link'
import { AnamnesePanel } from '@/components/AnamnesePanel'
import { FoodCombobox } from '@/components/FoodCombobox'
import { FoodSubstitutionCombobox } from '@/components/FoodSubstitutionCombobox'

export interface FoodSubstitution {
  name: string
  quantity: string
  unit: string
}

interface Alimento {
  name: string
  quantity: string
  unit: string
  calories: string
  substitutions?: FoodSubstitution[]
  showAlt?: boolean
}

interface Refeicao {
  id?: string
  name: string
  time_of_day: string
  foods: Alimento[]
  notes: string
  order_index?: number
}

interface Suplemento {
  name: string
  dose: string
  schedule: string
  notes: string
}

interface Cliente {
  id: string
  full_name: string | null
  email: string | null
}

const emptyFood = (): Alimento => ({ name: '', quantity: '', unit: 'g', calories: '', substitutions: [], showAlt: false })
const emptyMeal = (): Refeicao => ({ name: '', time_of_day: '', foods: [emptyFood()], notes: '' })

const OBJETIVOS = [
  'Emagrecimento', 'Ganho de massa muscular', 'Manutenção', 'Saúde geral',
  'Performance esportiva', 'Reeducação alimentar',
]

export default function EditarDietaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [clienteId, setClienteId] = useState('')
  const [nome, setNome] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [metodologia, setMetodologia] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([emptyMeal()])
  const [suplementos, setSuplementos] = useState<Suplemento[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: dieta }, { data: clientesData }] = await Promise.all([
        supabase
          .from('diets')
          .select('*, diet_meals(*)')
          .eq('id', id)
          .single(),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('role', 'user')
          .order('full_name'),
      ])

      if (!dieta) { router.push('/profissional/dietas'); return }

      setNome(dieta.name ?? '')
      setObjetivo(dieta.objective ?? '')
      setMetodologia(dieta.methodology ?? '')
      setObservacoes(dieta.notes ?? '')
      setClienteId(dieta.client_id ?? '')
      setClientes((clientesData as Cliente[]) ?? [])

      const meals = (dieta.diet_meals ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((m: any) => ({
          id: m.id,
          name: m.name ?? '',
          time_of_day: m.time_of_day ?? '',
          notes: m.notes ?? '',
          foods: (m.foods ?? []).map((f: any) => ({
            name: f.name ?? '',
            quantity: String(f.quantity ?? ''),
            unit: f.unit ?? 'g',
            calories: f.calories != null ? String(f.calories) : '',
            substitutions: f.substitutions ?? [],
            showAlt: (f.substitutions?.length ?? 0) > 0,
          })),
        }))

      setRefeicoes(meals.length ? meals : [emptyMeal()])
      const sups = (dieta.supplements ?? []).map((s: any) => ({
        name: s.name ?? '',
        dose: s.dose ?? '',
        schedule: s.schedule ?? '',
        notes: s.notes ?? '',
      }))
      setSuplementos(sups)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function gerarComIA() {
    setGerandoIA(true)
    setErro(null)
    const clienteSelecionado = clientes.find(c => c.id === clienteId)

    let profileData: Record<string, any> = {}
    let anamneseData: Record<string, any> = {}

    if (clienteId) {
      const [{ data: prof }, { data: anam }] = await Promise.all([
        supabase.from('client_profiles').select('*').eq('user_id', clienteId).maybeSingle(),
        supabase.from('client_anamnese').select('*').eq('user_id', clienteId).maybeSingle(),
      ])
      profileData = prof ?? {}
      anamneseData = anam ?? {}
    }

    const GOAL_PT: Record<string, string> = {
      weight_loss: 'Emagrecimento', muscle_gain: 'Ganho de massa muscular',
      maintenance: 'Manutenção', health: 'Saúde geral',
      performance: 'Performance esportiva', rehabilitation: 'Reeducação alimentar',
    }
    const ACTIVITY_PT: Record<string, string> = {
      sedentary: 'Sedentário', light: 'Leve', moderate: 'Moderado',
      intense: 'Intenso', athlete: 'Atleta',
    }
    const SEX_PT: Record<string, string> = {
      male: 'Masculino', female: 'Feminino', other: 'Outro',
    }

    const restricoes = [anamneseData.injuries, anamneseData.diseases].filter(Boolean).join('; ') || ''
    const numRef = parseInt(anamneseData.meals_per_day) || 5

    try {
      const res = await fetch('/api/ai/dieta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objetivo:       objetivo || GOAL_PT[profileData.goal ?? ''] || '',
          clienteNome:    clienteSelecionado?.full_name ?? '',
          observacoes,
          numRefeicoes:   numRef,
          peso:           profileData.weight_kg ? String(profileData.weight_kg) : '',
          altura:         profileData.height_cm ? String(profileData.height_cm) : '',
          idade:          profileData.age ? String(profileData.age) : '',
          sexo:           SEX_PT[profileData.sex ?? ''] ?? '',
          nivelAtividade: ACTIVITY_PT[profileData.activity_level ?? ''] ?? '',
          alergias:       anamneseData.food_allergies ?? '',
          preferencias:   anamneseData.food_preferences ?? '',
          restricoes,
          medicamentos:   anamneseData.medications ?? '',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao gerar com IA.'); return }
      if (data.nome) setNome(data.nome)
      if (data.metodologia) setMetodologia(data.metodologia)
      if (data.observacoes) setObservacoes(data.observacoes)
      if (data.refeicoes?.length) {
        setRefeicoes(data.refeicoes.map((r: any) => ({
          name: r.name ?? '',
          time_of_day: r.time_of_day ?? '',
          notes: r.notes ?? '',
          foods: (r.foods ?? []).map((f: any) => ({
            name: f.name ?? '',
            quantity: String(f.quantity ?? ''),
            unit: f.unit ?? 'g',
            calories: f.calories != null ? String(f.calories) : '',
            substitutions: f.substitutions ?? [],
            showAlt: (f.substitutions?.length ?? 0) > 0,
          })),
        })))
      }
    } catch {
      setErro('Erro ao conectar com a IA.')
    } finally {
      setGerandoIA(false)
    }
  }

  function addRefeicao() { setRefeicoes(prev => [...prev, emptyMeal()]) }
  function removeRefeicao(idx: number) { setRefeicoes(prev => prev.filter((_, i) => i !== idx)) }
  function updateRefeicao(idx: number, field: keyof Refeicao, value: string) {
    setRefeicoes(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }
  function addFood(mealIdx: number) {
    setRefeicoes(prev => prev.map((r, i) => i === mealIdx ? { ...r, foods: [...r.foods, emptyFood()] } : r))
  }
  function removeFood(mealIdx: number, foodIdx: number) {
    setRefeicoes(prev => prev.map((r, i) =>
      i === mealIdx ? { ...r, foods: r.foods.filter((_, fi) => fi !== foodIdx) } : r
    ))
  }
  function updateFood(mealIdx: number, foodIdx: number, field: keyof Alimento, value: string) {
    setRefeicoes(prev => prev.map((r, i) =>
      i === mealIdx
        ? { ...r, foods: r.foods.map((f, fi) => fi === foodIdx ? { ...f, [field]: value } : f) }
        : r
    ))
  }
  function addSubstitution(mealIdx: number, foodIdx: number, sub: FoodSubstitution) {
    setRefeicoes(prev => prev.map((r, i) =>
      i === mealIdx
        ? {
            ...r,
            foods: r.foods.map((f, fi) =>
              fi === foodIdx
                ? { ...f, substitutions: [...(f.substitutions ?? []), sub] }
                : f
            ),
          }
        : r
    ))
  }
  function removeSubstitution(mealIdx: number, foodIdx: number, subIdx: number) {
    setRefeicoes(prev => prev.map((r, i) =>
      i === mealIdx
        ? {
            ...r,
            foods: r.foods.map((f, fi) =>
              fi === foodIdx
                ? { ...f, substitutions: (f.substitutions ?? []).filter((_, si) => si !== subIdx) }
                : f
            ),
          }
        : r
    ))
  }
  function replaceWithSubstitution(mealIdx: number, foodIdx: number, sub: FoodSubstitution) {
    setRefeicoes(prev => prev.map((r, i) =>
      i === mealIdx
        ? {
            ...r,
            foods: r.foods.map((f, fi) =>
              fi === foodIdx
                ? {
                    name: sub.name,
                    quantity: sub.quantity,
                    unit: sub.unit,
                    calories: f.calories,
                    substitutions: (f.substitutions ?? []).filter(s => s.name !== sub.name),
                  }
                : f
            ),
          }
        : r
    ))
  }
  function toggleSubstitution(mealIdx: number, foodIdx: number) {
    setRefeicoes(prev => prev.map((r, i) =>
      i === mealIdx
        ? {
            ...r,
            foods: r.foods.map((f, fi) =>
              fi === foodIdx
                ? {
                    ...f,
                    showAlt: !(f.showAlt ?? false),
                    substitutions: f.showAlt ? [] : (f.substitutions ?? []),
                  }
                : f
            ),
          }
        : r
    ))
  }
  function addSuplemento() {
    setSuplementos(prev => [...prev, { name: '', dose: '', schedule: '', notes: '' }])
  }
  function removeSuplemento(idx: number) {
    setSuplementos(prev => prev.filter((_, i) => i !== idx))
  }
  function updateSuplemento(idx: number, field: keyof Suplemento, value: string) {
    setSuplementos(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  async function handleSave(status: 'draft' | 'review') {
    if (!nome.trim()) { setErro('Informe o nome da dieta.'); return }
    if (refeicoes.some(r => !r.name.trim())) { setErro('Todas as refeições precisam de um nome.'); return }

    setErro(null)
    setSaving(true)

    await supabase
      .from('diets')
      .update({
        client_id: clienteId || null,
        name: nome.trim(),
        objective: objetivo || null,
        methodology: metodologia.trim() || null,
        notes: observacoes.trim() || null,
        supplements: suplementos.filter(s => s.name.trim()).map(s => ({
          name: s.name.trim(),
          dose: s.dose.trim(),
          schedule: s.schedule.trim(),
          notes: s.notes.trim(),
        })),
        status,
        sent_at: status === 'review' ? new Date().toISOString() : null,
      })
      .eq('id', id)

    // Recriar as refeições
    await supabase.from('diet_meals').delete().eq('diet_id', id)

    const mealsToInsert = refeicoes.map((r, idx) => ({
      diet_id: id,
      name: r.name,
      time_of_day: r.time_of_day || null,
      foods: r.foods.filter(f => f.name.trim()).map(f => ({
        name:          f.name,
        quantity:      f.quantity,
        unit:          f.unit,
        calories:      f.calories ? Number(f.calories) : undefined,
        substitutions: (f.substitutions ?? []).filter(s => s.name?.trim()),
      })),
      notes: r.notes || null,
      order_index: idx,
    }))
    await supabase.from('diet_meals').insert(mealsToInsert)

    setSaving(false)
    router.push(status === 'review' ? '/profissional/supervisao' : '/profissional/dietas')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/profissional/dietas">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ChevronLeft className="w-4 h-4" />
            Dietas
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Editar Dieta</h2>
          <p className="text-muted-foreground mt-1 text-sm">Atualize as informações do plano alimentar.</p>
        </div>
        <Button
          type="button"
          onClick={gerarComIA}
          disabled={gerandoIA}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm self-start sm:flex-shrink-0"
        >
          {gerandoIA ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Gerar com IA</>
          )}
        </Button>
      </div>

      {/* Anamnese do cliente selecionado */}
      {clienteId && <AnamnesePanel clienteId={clienteId} />}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Informações do Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cliente">Cliente</Label>
            <Select value={clienteId || 'none'} onValueChange={v => setClienteId(v === 'none' ? '' : v)}>
              <SelectTrigger id="cliente">
                <SelectValue placeholder="Selecionar cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cliente vinculado</SelectItem>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name ?? c.email ?? c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome da dieta *</Label>
              <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Plano Hipocalórico" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objetivo">Objetivo</Label>
              <Select value={objetivo} onValueChange={setObjetivo}>
                <SelectTrigger id="objetivo"><SelectValue placeholder="Selecionar objetivo" /></SelectTrigger>
                <SelectContent>
                  {OBJETIVOS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metodologia">Metodologia aplicada</Label>
            <Textarea id="metodologia" value={metodologia} onChange={e => setMetodologia(e.target.value)} rows={3} placeholder="Metodologia nutricional..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações gerais</Label>
            <Textarea id="observacoes" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} placeholder="Informações adicionais..." />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Refeições</h3>
          <Button variant="outline" size="sm" onClick={addRefeicao} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Adicionar refeição
          </Button>
        </div>

        {refeicoes.map((refeicao, mealIdx) => (
          <Card key={mealIdx}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-2.5 flex-shrink-0" />
                <div className="flex-1 grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nome da refeição *</Label>
                    <Input value={refeicao.name} onChange={e => updateRefeicao(mealIdx, 'name', e.target.value)} placeholder="Ex: Café da manhã" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horário sugerido</Label>
                    <Input value={refeicao.time_of_day} onChange={e => updateRefeicao(mealIdx, 'time_of_day', e.target.value)} placeholder="Ex: 07:00" />
                  </div>
                </div>
                {refeicoes.length > 1 && (
                  <button onClick={() => removeRefeicao(mealIdx)} className="mt-6 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="ml-7 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" /> Alimentos
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addFood(mealIdx)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </Button>
                </div>
                {refeicao.foods.map((food, foodIdx) => (
                  <div key={foodIdx} className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row gap-2 items-start">
                      <FoodCombobox
                        value={food.name}
                        onChange={v => updateFood(mealIdx, foodIdx, 'name', v)}
                        onSelectFood={f => updateFood(mealIdx, foodIdx, 'calories', String(Math.round(f.energy_kcal)))}
                        placeholder="Alimento (Base TACO)"
                        className="w-full sm:flex-1"
                      />
                      <div className="flex gap-2 items-start w-full sm:w-auto">
                        <Input value={food.quantity} onChange={e => updateFood(mealIdx, foodIdx, 'quantity', e.target.value)} placeholder="Qtd" className="w-16 text-sm" />
                        <Select value={food.unit} onValueChange={v => updateFood(mealIdx, foodIdx, 'unit', v)}>
                          <SelectTrigger className="w-16 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['g', 'ml', 'un', 'col', 'xíc', 'fatia'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input value={food.calories} onChange={e => updateFood(mealIdx, foodIdx, 'calories', e.target.value)} placeholder="kcal" type="number" className="w-16 text-sm flex-1 sm:flex-none" />
                        {refeicao.foods.length > 1 && (
                          <button onClick={() => removeFood(mealIdx, foodIdx)} className="p-2 text-muted-foreground/40 hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {food.showAlt ? (
                      <div className="ml-2 pl-3 border-l-2 border-dashed border-violet-300 dark:border-violet-700 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-violet-600 dark:text-violet-400">Opção 2 (alternativa)</span>
                          <button type="button" onClick={() => toggleSubstitution(mealIdx, foodIdx)} className="text-xs text-muted-foreground hover:text-red-500 ml-auto">remover</button>
                        </div>
                        {(food.substitutions ?? []).length > 0 && (
                          <div className="space-y-1.5">
                            {(food.substitutions ?? []).map((sub, subIdx) => (
                              <div key={subIdx} className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-violet-50/80 dark:bg-violet-950/30 text-sm">
                                <span className="text-foreground">{sub.name} — {sub.quantity} {sub.unit}</span>
                                <div className="flex items-center gap-1">
                                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-violet-600 hover:text-violet-700" onClick={() => replaceWithSubstitution(mealIdx, foodIdx, sub)}>Usar</Button>
                                  <button type="button" onClick={() => removeSubstitution(mealIdx, foodIdx, subIdx)} className="p-1 text-muted-foreground hover:text-red-500" aria-label="Remover substituição"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {food.name.trim() && food.calories && parseFloat(food.calories) > 0 && (
                          <FoodSubstitutionCombobox
                            originalCalories={parseFloat(food.calories)}
                            originalUnit={food.unit}
                            onSelect={sub => addSubstitution(mealIdx, foodIdx, sub)}
                            placeholder="Alimento alternativo (Base TACO)…"
                            className="w-full"
                          />
                        )}
                      </div>
                    ) : (
                      <button type="button" onClick={() => toggleSubstitution(mealIdx, foodIdx)} className="text-xs text-violet-600 dark:text-violet-400 hover:opacity-80 flex items-center gap-1 ml-1">
                        <ChevronsUpDown className="w-3 h-3" />
                        Adicionar alternativa
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="ml-7 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Observações desta refeição</Label>
                <Input value={refeicao.notes} onChange={e => updateRefeicao(mealIdx, 'notes', e.target.value)} placeholder="Ex: Substituir por opção vegana" className="text-sm" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prescrição de Suplementação */}
      <Card>
        <CardContent className="p-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" /> Prescrição de Suplementação
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addSuplemento} className="h-7 text-xs gap-1.5">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Suplementos prescritos separados da alimentação principal.</p>
            {suplementos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum suplemento adicionado. Clique em Adicionar para prescrever.</p>
            ) : (
              <div className="space-y-3">
                {suplementos.map((sup, idx) => (
                  <div key={idx} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 rounded-xl border border-border bg-muted/30">
                    <div className="sm:col-span-2 lg:col-span-1 space-y-1.5">
                      <Label className="text-xs">Nome do suplemento</Label>
                      <Input value={sup.name} onChange={e => updateSuplemento(idx, 'name', e.target.value)} placeholder="Ex: Whey Protein" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Dose</Label>
                      <Input value={sup.dose} onChange={e => updateSuplemento(idx, 'dose', e.target.value)} placeholder="Ex: 30g" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Horário</Label>
                      <Input value={sup.schedule} onChange={e => updateSuplemento(idx, 'schedule', e.target.value)} placeholder="Ex: Após treino" className="text-sm" />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                      <Label className="text-xs">Observações</Label>
                      <Input value={sup.notes} onChange={e => updateSuplemento(idx, 'notes', e.target.value)} placeholder="Ex: Tomar com água" className="text-sm" />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeSuplemento(idx)} className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40">
                        <Trash2 className="w-3 h-3 mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {erro && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-xl px-4 py-2.5">{erro}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-8">
        <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="flex-1 sm:flex-none">
          {saving ? 'Salvando...' : 'Salvar rascunho'}
        </Button>
        <Button onClick={() => handleSave('review')} disabled={saving} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white">
          {saving ? 'Enviando...' : 'Enviar para revisão'}
        </Button>
      </div>
    </div>
  )
}
