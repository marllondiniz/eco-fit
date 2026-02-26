import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sua_chave_openai_aqui') {
    return NextResponse.json(
      { error: 'Chave da OpenAI não configurada. Defina OPENAI_API_KEY no .env.local.' },
      { status: 500 }
    )
  }

  const body = await req.json()
  const {
    objetivo = '',
    clienteNome = '',
    divisao = '',
    observacoes = '',
    numExercicios = 8,
  } = body

  const prompt = `Você é um personal trainer profissional criando um plano de treino detalhado.

Dados do cliente:
- Nome: ${clienteNome || 'Não informado'}
- Objetivo: ${objetivo || 'Hipertrofia'}
- Divisão de treino: ${divisao || 'A/B/C'}
- Observações: ${observacoes || 'Nenhuma'}
- Número de exercícios: ${numExercicios}

Crie um plano de treino completo e retorne APENAS um JSON válido (sem markdown, sem explicações extras) no seguinte formato:
{
  "nome": "Nome descritivo do treino",
  "divisao": "${divisao || 'A/B/C'}",
  "metodologia": "Descrição da metodologia de treino e periodização",
  "observacoes": "Recomendações gerais para o cliente",
  "exercicios": [
    {
      "division_label": "Divisão (A, B, C, etc.)",
      "name": "Nome do exercício",
      "sets": número de séries (número inteiro),
      "reps": "repetições (ex: 8-12 ou 15 ou até a falha)",
      "rest_seconds": segundos de descanso (número inteiro),
      "notes": "Técnica e observações específicas"
    }
  ]
}

Seja específico, use nomes de exercícios reais em português, distribua os ${numExercicios} exercícios pelas divisões de forma equilibrada.`

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
          { role: 'system', content: 'Você é um personal trainer experiente. Responda SEMPRE com JSON válido e nada mais.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
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

    return NextResponse.json(parsed)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro desconhecido.' }, { status: 500 })
  }
}
