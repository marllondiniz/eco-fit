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
  const prof = (profileData ?? {}) as Record<string, any>
  const a = (anamneseData ?? {}) as Record<string, any>

  const partes: string[] = [
    `Nome: ${nome}`,
    `Objetivo: ${prof.goal ? GOAL_LABELS[prof.goal] ?? prof.goal : 'Não informado'}`,
    `Nível de atividade: ${prof.activity_level ? ACTIVITY_LABELS[prof.activity_level] ?? prof.activity_level : 'Não informado'}`,
  ]
  if (prof.age != null) partes.push(`Idade: ${prof.age} anos`)
  if (prof.weight_kg != null) partes.push(`Peso: ${prof.weight_kg} kg`)
  if (prof.height_cm != null) partes.push(`Altura: ${prof.height_cm} cm`)
  if (prof.sex) partes.push(`Sexo: ${prof.sex}`)
  if (a.training_experience) partes.push(`Experiência: ${a.training_experience}`)
  if (a.weekly_availability) partes.push(`Disponibilidade: ${a.weekly_availability}x/semana`)
  if (a.session_duration_min) partes.push(`Tempo por sessão: ${a.session_duration_min} min`)
  if (a.training_location) partes.push(`Local: ${a.training_location}`)
  if (a.home_equipment) partes.push(`Equipamentos: ${a.home_equipment}`)
  if (a.injuries) partes.push(`Lesões: ${a.injuries}`)
  if (a.frequent_pain) partes.push(`Dores frequentes: ${a.frequent_pain}`)
  if (a.diseases) partes.push(`Condições: ${a.diseases}`)
  if (a.medications) partes.push(`Medicamentos: ${a.medications}`)
  if (a.additional_modalities) partes.push(`Modalidades adicionais: ${a.additional_modalities}`)
  if (a.does_aerobic === 'Sim') partes.push(`Aeróbico: ${a.aerobic_type ?? 'Sim'} ${a.aerobic_frequency ? `(${a.aerobic_frequency})` : ''}`)
  if (a.muscle_priorities) partes.push(`Prioridades musculares: ${a.muscle_priorities}`)
  if (a.secondary_goal) partes.push(`Objetivo secundário: ${a.secondary_goal}`)
  if (a.can_train_twice_daily) partes.push('Pode treinar 2x ao dia')
  if (a.preferred_training_time) partes.push(`Horário de treino: ${a.preferred_training_time}`)
  if (a.trains_fasted) partes.push(`Treina em jejum: ${a.trains_fasted}`)
  if (a.discipline_level != null) partes.push(`Disciplina (0-10): ${a.discipline_level}`)
  if (a.biggest_difficulty) partes.push(`Maior dificuldade: ${a.biggest_difficulty}`)
  if (a.notes) partes.push(`Observações: ${a.notes}`)

  const contexto = partes.join('\n')

  const prompt = `Você é a IA de treinamento LBFIT. Com base nos dados do cliente e no PROTOCOLO LBFIT, sugira um planejamento semanal como RASCUNHO para o personal revisar.

PROTOCOLO LBFIT — Diretrizes de Divisão por Frequência:
1x/sem → Full Body obrigatório
2x/sem → Full Body ou Upper/Lower
3x/sem → Full Body / UL + Full / PPL rotativo
4x/sem → UL 2x / PPL + Upper / Superior-Inferior / 4x Full Body
5x/sem → PPL + UL / ABCDE / Superior-Inferior-Push-Pull-Legs / 5x Full Body
6–7x/sem → PPL 2x / Especializações / Divisões híbridas / Full Body com volume diluído

Considerar: recuperação, modalidades externas (reduzir volume nos grupamentos mais exigidos), prioridades musculares (aumentar volume +20-40%), lesões (reduzir volume -30-50% + ajuste biomecânico).

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
- tipo_divisao: use "A/B" para 2 dias, "A/B/C" para 3+, "Full Body" para full body.
- Respeite as diretrizes de frequência do protocolo LBFIT.
- Respeite lesões e limitações.
- O número de dias de treino deve ser coerente com a frequência informada.
- "semana" deve ter exatamente 7 objetos. label null = descanso.
- nomes_treinos: sugestões curtas em português (ex.: "Superiores", "Inferiores", "Full Body").`

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
