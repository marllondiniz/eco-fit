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
    divisaoAtual,
    objetivo = '',
    clienteNome = '',
    observacoes = '',
    numExercicios = 8,
  } = body

  if (!divisaoAtual || !['A', 'B', 'C'].includes(divisaoAtual)) {
    return NextResponse.json(
      { error: 'divisaoAtual é obrigatório e deve ser A, B ou C.' },
      { status: 400 }
    )
  }

  const prompt = `Você é um personal trainer profissional. O personal já definiu que está montando o Treino ${divisaoAtual}. Sua tarefa é APENAS sugerir uma lista de exercícios para essa divisão (Treino ${divisaoAtual}), nada mais.

Dados do cliente:
- Nome: ${clienteNome || 'Não informado'}
- Objetivo: ${objetivo || 'Hipertrofia'}
- Observações: ${observacoes || 'Nenhuma'}
- Número de exercícios desejados: ${numExercicios}

Retorne APENAS um JSON válido (sem markdown, sem explicações) no formato:
{
  "exercicios": [
    {
      "name": "Nome do exercício em português",
      "sets": número de séries (inteiro),
      "reps": "repetições (ex: 8-12 ou 15 ou até a falha)",
      "rest_seconds": segundos de descanso (inteiro),
      "notes": "Técnica e observações opcionais"
    }
  ],
  "metodologia": "Sugestão opcional de metodologia só para esta divisão",
  "observacoes": "Sugestão opcional de observações só para esta divisão"
}

Gere exatamente ${numExercicios} exercícios para o Treino ${divisaoAtual}. Use nomes de exercícios reais em português. Não crie outras divisões (A/B/C) nem nome do plano.`

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
          { role: 'system', content: 'Você é um personal trainer. Responda SEMPRE com JSON válido. Gere apenas exercícios para a divisão informada (Treino A, B ou C), sem criar plano completo nem outras divisões.' },
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

    return NextResponse.json({
      exercicios: parsed.exercicios ?? [],
      metodologia: parsed.metodologia ?? null,
      observacoes: parsed.observacoes ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro desconhecido.' }, { status: 500 })
  }
}
