import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sua_chave_openai_aqui') {
    return NextResponse.json(
      { error: 'Chave da OpenAI não configurada. Defina OPENAI_API_KEY no .env.local.' },
      { status: 500 },
    )
  }

  const body = await req.json()
  const {
    divisao       = 'A/B/C',
    clienteNome   = '',
    objetivo      = '',
    nivel         = '',
    restricoes    = '',
    localTreino   = '',
    disponibilidade = '',
    observacoes   = '',
  } = body

  const labelMap: Record<string, string[]> = {
    'A/B':     ['A', 'B'],
    'A/B/C':   ['A', 'B', 'C'],
    'FullBody': ['A'],
  }
  const labels = labelMap[divisao] ?? ['A', 'B', 'C']

  const divisaoDescricao: Record<string, string> = {
    'A/B':     'dois treinos alternados (Treino A e Treino B)',
    'A/B/C':   'três treinos rotativos (Treino A, Treino B e Treino C)',
    'FullBody': 'um único treino full body (Treino A)',
  }

  const prompt = `Você é um personal trainer experiente. Monte um plano de treino completo com ${divisaoDescricao[divisao] ?? 'A/B/C'}.

Dados do cliente:
- Nome: ${clienteNome || 'Não informado'}
- Objetivo: ${objetivo || 'Hipertrofia'}
- Nível / experiência: ${nivel || 'Intermediário'}
- Local de treino: ${localTreino || 'Academia'}
- Disponibilidade semanal: ${disponibilidade || 'Não informado'}
- Restrições / lesões / doenças: ${restricoes || 'Nenhuma'}
- Observações adicionais: ${observacoes || 'Nenhuma'}

Regras:
- Cada treino deve ter entre 6 e 10 exercícios
- Use nomes de exercícios reais em português
- Adapte os grupos musculares à divisão escolhida (ex: A=peito+tríceps, B=costas+bíceps, C=pernas)
- Respeite restrições e lesões informadas
- Use séries, repetições e descanso coerentes com o objetivo

Retorne APENAS um JSON válido (sem markdown, sem texto antes ou depois) neste formato exato:
{
  "workouts": [
    ${labels.map(l => `{
      "label": "${l}",
      "name": "Nome descritivo do Treino ${l}",
      "methodology": "Descrição da metodologia usada",
      "notes": "Observações gerais para este treino",
      "exercises": [
        {
          "name": "Nome do exercício",
          "sets": 4,
          "reps": "8-12",
          "rest_seconds": 90,
          "notes": "Execução ou observação"
        }
      ]
    }`).join(',\n    ')}
  ]
}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um personal trainer especialista. Responda SEMPRE com JSON válido, sem markdown e sem texto adicional. Gere um plano completo de treino conforme solicitado.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json(
        { error: err.error?.message ?? 'Erro na API OpenAI.' },
        { status: response.status },
      )
    }

    const data    = await response.json()
    const content = data.choices?.[0]?.message?.content ?? '{}'
    const parsed  = JSON.parse(content)

    return NextResponse.json({ workouts: parsed.workouts ?? [] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
