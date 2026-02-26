'use client'

import { useState, useEffect } from 'react'
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

interface Exercicio {
  division_label: string
  name: string
  sets: string
  reps: string
  rest_seconds: string
  notes: string
}

interface Cliente {
  id: string
  full_name: string | null
  email: string | null
}

const emptyExercise = (): Exercicio => ({
  division_label: '', name: '', sets: '', reps: '', rest_seconds: '', notes: '',
})

const DIVISOES_SUGERIDAS = ['A', 'B', 'C', 'D', 'Full Body', 'Superior', 'Inferior', 'Push', 'Pull', 'Legs']
const OBJETIVOS_TREINO = ['Hipertrofia', 'Emagrecimento', 'Resistência', 'Força', 'Condicionamento', 'Reabilitação']

export default function NovoTreinoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(true)

  const [clienteId, setClienteId] = useState('')
  const [nome, setNome] = useState('')
  const [divisao, setDivisao] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [metodologia, setMetodologia] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [exercicios, setExercicios] = useState<Exercicio[]>([emptyExercise()])

  useEffect(() => {
    async function fetchClientes() {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'user')
        .order('full_name')
      setClientes((data as Cliente[]) ?? [])
      setLoadingClientes(false)
    }
    fetchClientes()
  }, [])

  async function gerarComIA() {
    setGerandoIA(true)
    setErro(null)
    const clienteSelecionado = clientes.find(c => c.id === clienteId)
    try {
      const res = await fetch('/api/ai/treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objetivo,
          clienteNome: clienteSelecionado?.full_name ?? '',
          divisao,
          observacoes,
          numExercicios: 9,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao gerar treino com IA.')
        return
      }
      if (data.nome) setNome(data.nome)
      if (data.divisao && !divisao) setDivisao(data.divisao)
      if (data.metodologia) setMetodologia(data.metodologia)
      if (data.observacoes) setObservacoes(data.observacoes)
      if (data.exercicios?.length) {
        setExercicios(
          data.exercicios.map((e: any) => ({
            division_label: e.division_label ?? '',
            name: e.name ?? '',
            sets: e.sets != null ? String(e.sets) : '',
            reps: e.reps != null ? String(e.reps) : '',
            rest_seconds: e.rest_seconds != null ? String(e.rest_seconds) : '',
            notes: e.notes ?? '',
          }))
        )
      }
    } catch {
      setErro('Erro ao conectar com a IA. Verifique sua chave OPENAI_API_KEY.')
    } finally {
      setGerandoIA(false)
    }
  }

  function addExercicio() { setExercicios(prev => [...prev, emptyExercise()]) }
  function removeExercicio(idx: number) { setExercicios(prev => prev.filter((_, i) => i !== idx)) }
  function updateExercicio(idx: number, field: keyof Exercicio, value: string) {
    setExercicios(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  async function handleSave(status: 'draft' | 'review') {
    if (!nome.trim()) { setErro('Informe o nome do treino.'); return }
    if (exercicios.some(e => !e.name.trim())) { setErro('Todos os exercícios precisam de um nome.'); return }

    setErro(null)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: treino, error: treinoError } = await supabase
      .from('workouts')
      .insert({
        professional_id: user.id,
        client_id: clienteId || null,
        name: nome.trim(),
        division: divisao.trim() || null,
        methodology: metodologia.trim() || null,
        notes: observacoes.trim() || null,
        status,
        sent_at: status === 'review' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (treinoError || !treino) {
      setErro('Erro ao salvar treino. Tente novamente.')
      setSaving(false)
      return
    }

    const exerciciosToInsert = exercicios
      .filter(e => e.name.trim())
      .map((e, idx) => ({
        workout_id: treino.id,
        division_label: e.division_label.trim() || null,
        name: e.name.trim(),
        sets: e.sets ? parseInt(e.sets) : null,
        reps: e.reps.trim() || null,
        rest_seconds: e.rest_seconds ? parseInt(e.rest_seconds) : null,
        notes: e.notes.trim() || null,
        order_index: idx,
      }))

    await supabase.from('workout_exercises').insert(exerciciosToInsert)

    setSaving(false)
    router.push(status === 'review' ? '/profissional/supervisao' : '/profissional/treinos')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/profissional/treinos">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ChevronLeft className="w-4 h-4" />
            Treinos
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Novo Treino</h2>
          <p className="text-muted-foreground mt-1 text-sm">Monte o plano de treino e sua metodologia.</p>
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

      {/* Informações gerais */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Informações do Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label htmlFor="cliente">Cliente</Label>
            <Select value={clienteId || 'none'} onValueChange={v => setClienteId(v === 'none' ? '' : v)}>
              <SelectTrigger id="cliente">
                <SelectValue placeholder={loadingClientes ? 'Carregando clientes...' : 'Selecionar cliente (opcional)'} />
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
              <Label htmlFor="nome">Nome do treino *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Hipertrofia A/B/C — João"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objetivo">Objetivo</Label>
              <Select value={objetivo} onValueChange={setObjetivo}>
                <SelectTrigger id="objetivo">
                  <SelectValue placeholder="Selecionar objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {OBJETIVOS_TREINO.map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="divisao">Divisão de treino</Label>
            <div className="flex gap-2">
              <Input
                id="divisao"
                value={divisao}
                onChange={e => setDivisao(e.target.value)}
                placeholder="Ex: A/B/C, Full Body..."
                list="divisoes"
              />
              <datalist id="divisoes">
                {DIVISOES_SUGERIDAS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metodologia">Metodologia aplicada</Label>
            <Textarea
              id="metodologia"
              value={metodologia}
              onChange={e => setMetodologia(e.target.value)}
              placeholder="Descreva a metodologia de treino, periodização, princípios utilizados..."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações gerais</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Informações adicionais para o cliente..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Exercícios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Exercícios</h3>
          <Button variant="outline" size="sm" onClick={addExercicio} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Adicionar exercício
          </Button>
        </div>

        {exercicios.map((exercicio, idx) => (
          <Card key={idx}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-2.5 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Divisão</Label>
                      <Input
                        value={exercicio.division_label}
                        onChange={e => updateExercicio(idx, 'division_label', e.target.value)}
                        placeholder="A, B, C..."
                        list="divisoes-label"
                        className="text-sm"
                      />
                      <datalist id="divisoes-label">
                        {DIVISOES_SUGERIDAS.map(d => <option key={d} value={d} />)}
                      </datalist>
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Nome do exercício *</Label>
                      <Input
                        value={exercicio.name}
                        onChange={e => updateExercicio(idx, 'name', e.target.value)}
                        placeholder="Ex: Supino reto com barra"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Séries</Label>
                      <Input
                        value={exercicio.sets}
                        onChange={e => updateExercicio(idx, 'sets', e.target.value)}
                        placeholder="4"
                        type="number"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Repetições</Label>
                      <Input
                        value={exercicio.reps}
                        onChange={e => updateExercicio(idx, 'reps', e.target.value)}
                        placeholder="8–12"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Descanso (seg)</Label>
                      <Input
                        value={exercicio.rest_seconds}
                        onChange={e => updateExercicio(idx, 'rest_seconds', e.target.value)}
                        placeholder="60"
                        type="number"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações</Label>
                    <Input
                      value={exercicio.notes}
                      onChange={e => updateExercicio(idx, 'notes', e.target.value)}
                      placeholder="Técnica, cadência, variações..."
                      className="text-sm"
                    />
                  </div>
                </div>
                {exercicios.length > 1 && (
                  <button
                    onClick={() => removeExercicio(idx)}
                    className="mt-6 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {erro && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-xl px-4 py-2.5">
          {erro}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-8">
        <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="flex-1 sm:flex-none">
          {saving ? 'Salvando...' : 'Salvar rascunho'}
        </Button>
        <Button
          onClick={() => handleSave('review')}
          disabled={saving}
          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? 'Enviando...' : 'Enviar para revisão'}
        </Button>
      </div>
    </div>
  )
}
