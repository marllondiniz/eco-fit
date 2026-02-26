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
    observacoes = '',
    numRefeicoes = 5,
  } = body

  const prompt = `Você é um nutricionista profissional criando um plano alimentar detalhado.

Dados do cliente:
- Nome: ${clienteNome || 'Não informado'}
- Objetivo: ${objetivo || 'Saúde geral'}
- Observações: ${observacoes || 'Nenhuma'}
- Número de refeições: ${numRefeicoes}

Crie um plano alimentar completo e retorne APENAS um JSON válido (sem markdown, sem explicações extras) no seguinte formato:
{
  "nome": "Nome descritivo do plano",
  "objetivo": "${objetivo || 'Saúde geral'}",
  "metodologia": "Descrição da abordagem nutricional utilizada",
  "observacoes": "Recomendações gerais para o cliente",
  "refeicoes": [
    {
      "name": "Nome da refeição",
      "time_of_day": "Horário sugerido (HH:MM)",
      "notes": "Observação específica desta refeição",
      "foods": [
        {
          "name": "Nome do alimento",
          "quantity": "quantidade numérica",
          "unit": "g ou ml ou un",
          "calories": número de kcal (apenas o número)
        }
      ]
    }
  ]
}

Seja específico, realista e profissional. Inclua ${numRefeicoes} refeições variadas com pelo menos 3-5 alimentos cada.`

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
          { role: 'system', content: 'Você é um nutricionista experiente. Responda SEMPRE com JSON válido e nada mais.' },
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
