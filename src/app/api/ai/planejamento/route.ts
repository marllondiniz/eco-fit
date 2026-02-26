import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const DIAS_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Emagrecimento',
  muscle_gain: 'Ganho de massa',
  maintenance: 'Manutenção',
  health: 'Saúde geral',
  performance: 'Performance',
  rehabilitation: 'Reabilitação',
}
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentário',
  light: 'Leve',
  moderate: 'Moderado',
  intense: 'Intenso',
  athlete: 'Atleta',
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sua_chave_openai_aqui') {
    return NextResponse.json(
      { error: 'Chave da OpenAI não configurada. Defina OPENAI_API_KEY no .env.local.' },
      { status: 500 }
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const profile = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile.data?.role
  if (role !== 'professional' && role !== 'admin') {
    return NextResponse.json({ error: 'Apenas profissionais podem gerar sugestão de planejamento.' }, { status: 403 })
  }

  const body = await req.json()
  const { clientId } = body
  if (!clientId || typeof clientId !== 'string') {
    return NextResponse.json({ error: 'clientId é obrigatório.' }, { status: 400 })
  }

  const [{ data: workouts }, { data: profileData }, { data: anamneseData }, { data: nameRow }] = await Promise.all([
    supabase.from('workouts').select('id').eq('client_id', clientId).eq('professional_id', user.id).limit(1),
    supabase.from('client_profiles').select('*').eq('user_id', clientId).maybeSingle(),
    supabase.from('client_anamnese').select('*').eq('user_id', clientId).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', clientId).maybeSingle(),
  ])

  if (!workouts?.length) {
    return NextResponse.json(
      { error: 'Cliente não encontrado ou sem vínculo com você.' },
      { status: 404 }
    )
  }

  const nome = nameRow?.full_name ?? 'Cliente'
  const prof = profileData ?? {}
  const anam = anamneseData ?? {}
  const goal = (prof as { goal?: string }).goal
  const activity = (prof as { activity_level?: string }).activity_level
  const age = (prof as { age?: number }).age
  const weight = (prof as { weight_kg?: number }).weight_kg
  const height = (prof as { height_cm?: number }).height_cm

  const partes: string[] = [
    `Nome: ${nome}`,
    `Objetivo: ${goal ? GOAL_LABELS[goal] ?? goal : 'Não informado'}`,
    `Nível de atividade: ${activity ? ACTIVITY_LABELS[activity] ?? activity : 'Não informado'}`,
  ]
  if (age != null) partes.push(`Idade: ${age} anos`)
  if (weight != null) partes.push(`Peso: ${weight} kg`)
  if (height != null) partes.push(`Altura: ${height} cm`)
  if ((anam as { health_history?: string }).health_history) {
    partes.push(`Histórico de saúde: ${(anam as { health_history: string }).health_history}`)
  }
  if ((anam as { injuries?: string }).injuries) {
    partes.push(`Lesões/limitações: ${(anam as { injuries: string }).injuries}`)
  }
  if ((anam as { diseases?: string }).diseases) {
    partes.push(`Doenças: ${(anam as { diseases: string }).diseases}`)
  }
  if ((anam as { medications?: string }).medications) {
    partes.push(`Medicamentos: ${(anam as { medications: string }).medications}`)
  }
  if ((anam as { training_experience?: string }).training_experience) {
    partes.push(`Experiência de treino: ${(anam as { training_experience: string }).training_experience}`)
  }
  if ((anam as { weekly_availability?: string }).weekly_availability) {
    partes.push(`Disponibilidade: até ${(anam as { weekly_availability: string }).weekly_availability}x/semana`)
  }
  if ((anam as { training_location?: string }).training_location) {
    partes.push(`Local de treino: ${(anam as { training_location: string }).training_location}`)
  }
  if ((anam as { meals_per_day?: string }).meals_per_day) {
    partes.push(`Refeições por dia: ${(anam as { meals_per_day: string }).meals_per_day}`)
  }
  if ((anam as { notes?: string }).notes) {
    partes.push(`Observações: ${(anam as { notes: string }).notes}`)
  }

  const contexto = partes.join('\n')

  const prompt = `Você é um personal trainer. Com base nos dados do cliente abaixo, sugira um planejamento semanal de treinos como RASCUNHO para o personal revisar e aprovar.

Dados do cliente:
${contexto}

Retorne APENAS um JSON válido (sem markdown, sem explicações) no formato:
{
  "tipo_divisao": "A/B" | "A/B/C" | "Full Body",
  "semana": [
    { "day": "mon", "label": "A" | "B" | "C" | null },
    { "day": "tue", "label": "A" | "B" | "C" | null },
    ... (todos os 7 dias: mon, tue, wed, thu, fri, sat, sun)
  ],
  "nomes_treinos": { "A": "Nome sugerido Treino A", "B": "Nome sugerido Treino B", "C": "Nome sugerido Treino C" }
}

Regras:
- tipo_divisao: use "A/B" para 2 dias de treino por semana, "A/B/C" para 3 (ou 4-6 alternando), "Full Body" para treino full body (pode mapear para um único rótulo ou A/B conforme dias).
- Para "Full Body", sugira semana com um mesmo rótulo em vários dias (ex.: todos A) ou A/B alternado; o personal vai usar a grade A/B/C.
- Respeite lesões e limitações: menos dias ou descanso onde fizer sentido.
- Número de dias de treino por semana deve ser coerente com objetivo e nível (ex.: iniciante 2-3, intermediário 3-4, avançado 4-5).
- "semana" deve ter exatamente 7 objetos, um para cada day: mon, tue, wed, thu, fri, sat, sun. label null = descanso.
- nomes_treinos: sugestões curtas em português (ex.: "Superiores", "Inferiores", "Core e Cardio").`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Você é um personal trainer. Responda SEMPRE com JSON válido. Sugira apenas um rascunho de planejamento semanal (tipo_divisao, semana com 7 dias, nomes_treinos).',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json(
        { error: err.error?.message ?? 'Erro na API OpenAI.' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content)

    const semana = Array.isArray(parsed.semana) ? parsed.semana : []
    const normalized = DIAS_ORDER.map(day => {
      const found = semana.find((s: { day?: string }) => s.day === day)
      const label = found?.label
      return {
        day,
        label: label === 'A' || label === 'B' || label === 'C' ? label : null,
      }
    })

    const tipo = ['A/B', 'A/B/C', 'Full Body'].includes(parsed.tipo_divisao) ? parsed.tipo_divisao : 'A/B/C'
    const nomes = parsed.nomes_treinos && typeof parsed.nomes_treinos === 'object'
      ? {
          A: String(parsed.nomes_treinos.A ?? 'Treino A'),
          B: String(parsed.nomes_treinos.B ?? 'Treino B'),
          C: String(parsed.nomes_treinos.C ?? 'Treino C'),
        }
      : { A: 'Treino A', B: 'Treino B', C: 'Treino C' }

    return NextResponse.json({
      tipo_divisao: tipo,
      semana: normalized,
      nomes_treinos: nomes,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
