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
import { Plus, Trash2, ChevronLeft, GripVertical, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { AnamnesePanel } from '@/components/AnamnesePanel'

interface Alimento {
  name: string
  quantity: string
  unit: string
  calories: string
}

interface Refeicao {
  id?: string
  name: string
  time_of_day: string
  foods: Alimento[]
  notes: string
  order_index?: number
}

interface Cliente {
  id: string
  full_name: string | null
  email: string | null
}

const emptyFood = (): Alimento => ({ name: '', quantity: '', unit: 'g', calories: '' })
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
          })),
        }))

      setRefeicoes(meals.length ? meals : [emptyMeal()])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function gerarComIA() {
    setGerandoIA(true)
    setErro(null)
    const clienteSelecionado = clientes.find(c => c.id === clienteId)
    try {
      const res = await fetch('/api/ai/dieta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objetivo,
          clienteNome: clienteSelecionado?.full_name ?? '',
          observacoes,
          numRefeicoes: 5,
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
        name: f.name,
        quantity: f.quantity,
        unit: f.unit,
        calories: f.calories ? Number(f.calories) : undefined,
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

              <div className="ml-7 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alimentos</p>
                {refeicao.foods.map((food, foodIdx) => (
                  <div key={foodIdx} className="flex flex-col sm:flex-row gap-2 items-start">
                    <Input value={food.name} onChange={e => updateFood(mealIdx, foodIdx, 'name', e.target.value)} placeholder="Alimento" className="w-full sm:flex-1 text-sm" />
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
                ))}
                <button onClick={() => addFood(mealIdx)} className="text-xs text-primary hover:opacity-90 font-medium flex items-center gap-1 mt-1">
                  <Plus className="w-3 h-3" /> Adicionar alimento
                </button>
              </div>

              <div className="ml-7 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Observações desta refeição</Label>
                <Input value={refeicao.notes} onChange={e => updateRefeicao(mealIdx, 'notes', e.target.value)} placeholder="Ex: Substituir por opção vegana" className="text-sm" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
