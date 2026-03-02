import { NextRequest, NextResponse } from 'next/server'

const PROTOCOLO_NUTRICIONAL_LBFIT = `
Você é a IA Nutricional LBFIT. Siga RIGOROSAMENTE o protocolo abaixo ao montar qualquer plano alimentar.

═══════════════════════════════════════════════════════════════
              PROTOCOLO NUTRICIONAL OFICIAL LBFIT
═══════════════════════════════════════════════════════════════

1. BANCO DE ALIMENTOS LBFIT
   Esta é a base alimentar principal. O modelo permite substituições equivalentes conforme cultura e preferência.

   FONTES DE CARBOIDRATO:
   Arroz, Feijão, Batata inglesa, Batata doce, Aipim, Inhame, Macarrão, Aveia, Granola, Flocão de milho, Tapioca, Biscoito de arroz, Pão integral, Pão francês, Frutas naturais.

   FONTES DE PROTEÍNA:
   Peito de frango, Sobrecoxa, Moela, Patinho, Filé mignon, Acém, Músculo bovino, Tilápia, Salmão, Sardinha, Atum, Clara de ovo, Ovo inteiro, Whey protein, Proteína de soja.

   FONTES DE GORDURA (prioridade: insaturadas):
   Azeite de oliva, Abacate, Amêndoas, Amendoim, Castanhas, Nozes, Pasta de amendoim.

   LATICÍNIOS:
   Iogurte zero, Iogurte natural, Leite desnatado, Leite integral.

2. ORGANIZAÇÃO PRÁTICA DAS REFEIÇÕES
   Café da manhã, almoço, jantar e lanches são exemplos organizacionais.
   A IA estrutura as refeições conforme a rotina do cliente.

   CAFÉ DA MANHÃ (exemplo):
   Carboidratos: Pão, Aveia, Granola, Flocão, Tapioca, Frutas.
   Proteínas: Ovo, Claras, Whey, Atum.

   ALMOÇO E JANTAR (refeições principais):
   Carboidratos: Arroz, Feijão, Macarrão, Batatas, Aipim, Inhame.
   Proteínas: Frango, Carnes bovinas, Peixes.
   Inclusão obrigatória de verduras e vegetais.

   LANCHES INTERMEDIÁRIOS (exemplos):
   Whey + aveia/granola + fruta + iogurte, Pão com ovo, Pão com atum, Pão com frango, Tapioca, Crepioca.
   Refeições simples, práticas e ajustáveis.

3. FLUXO OPERACIONAL
   1) Analisar anamnese (peso, altura, idade, sexo, objetivo, restrições alimentares, alergias)
   2) Definir meta calórica por objetivo
   3) Aplicar regra fixa de proteína: 2 g/kg de peso corporal
   4) Ajustar carboidratos conforme fase e objetivo
   5) Definir gordura como % calórica (restante após proteína e carboidrato)
   6) Ajustar fibras e hidratação
   7) Distribuir refeições conforme rotina do cliente (número de refeições preferido)
   8) Selecionar alimentos do banco LBFIT
   9) Gerar substituições equivalentes para cada alimento

4. REGRAS DE MACROS
   - Proteína: SEMPRE 2g por kg de peso corporal, distribuída igualmente entre refeições
   - Para emagrecimento: déficit calórico moderado (300-500 kcal), carboidrato moderado-baixo
   - Para ganho de massa: superávit calórico moderado (300-500 kcal), carboidrato moderado-alto
   - Para manutenção: calorias no TDEE, macros equilibrados
   - Gordura: mínimo 20% das calorias totais, priorizar insaturadas

5. SUBSTITUIÇÕES
   Cada alimento principal DEVE ter ao menos 1 opção de substituição equivalente em macros do banco LBFIT.
   Respeitar alergias e preferências alimentares do cliente.

6. REFEIÇÕES
   - Cada refeição deve ser prática e realista
   - Verduras e vegetais obrigatórios no almoço e jantar
   - Manter coerência calórica entre as refeições
   - Informar quantidade em gramas ou medidas caseiras
`

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
    objetivo         = '',
    clienteNome      = '',
    observacoes      = '',
    numRefeicoes     = 5,
    peso             = '',
    altura           = '',
    idade            = '',
    sexo             = '',
    nivelAtividade   = '',
    alergias         = '',
    preferencias     = '',
    restricoes       = '',
    medicamentos     = '',
  } = body

  const pesoNum = parseFloat(peso)
  const proteinaMeta = pesoNum > 0 ? Math.round(pesoNum * 2) : null

  const prompt = `Siga o PROTOCOLO NUTRICIONAL LBFIT acima para gerar o plano alimentar.

DADOS DO CLIENTE:
- Nome: ${clienteNome || 'Não informado'}
- Objetivo: ${objetivo || 'Saúde geral'}
- Peso: ${peso ? peso + ' kg' : 'Não informado'}
- Altura: ${altura ? altura + ' cm' : 'Não informado'}
- Idade: ${idade ? idade + ' anos' : 'Não informado'}
- Sexo: ${sexo || 'Não informado'}
- Nível de atividade: ${nivelAtividade || 'Não informado'}
- Alergias alimentares: ${alergias || 'Nenhuma'}
- Preferências alimentares: ${preferencias || 'Nenhuma'}
- Restrições / doenças: ${restricoes || 'Nenhuma'}
- Medicamentos em uso: ${medicamentos || 'Nenhum'}
- Observações: ${observacoes || 'Nenhuma'}
- Número de refeições preferido: ${numRefeicoes}
${proteinaMeta ? `- Meta de proteína (2g/kg): ${proteinaMeta}g/dia` : ''}

INSTRUÇÕES:
1. Calcule o TDEE estimado e a meta calórica conforme o objetivo.
2. Aplique a regra fixa de proteína: 2g/kg de peso corporal (${proteinaMeta ?? '?'}g/dia), distribuída entre as refeições.
3. Use APENAS alimentos do banco LBFIT. Inclua verduras/vegetais obrigatórios no almoço e jantar.
4. Para cada alimento, forneça ao menos 1 substituição equivalente do banco LBFIT.
5. Respeite alergias e preferências alimentares.
6. Gere exatamente ${numRefeicoes} refeições práticas e realistas.
7. No campo "metodologia", explique: TDEE estimado, meta calórica, distribuição de macros (proteína, carboidrato, gordura em gramas e %).
8. No campo "observacoes", inclua dicas de hidratação, fibras e orientações gerais.

Retorne APENAS um JSON válido (sem markdown, sem texto antes ou depois) neste formato exato:
{
  "nome": "Nome descritivo do plano",
  "objetivo": "${objetivo || 'Saúde geral'}",
  "metodologia": "TDEE estimado: Xkcal | Meta: Ykcal | Proteína: Zg (2g/kg) | Carboidrato: Wg | Gordura: Vg",
  "observacoes": "Recomendações gerais, hidratação, fibras",
  "macros": {
    "calorias_meta": 2000,
    "proteina_g": ${proteinaMeta ?? 140},
    "carboidrato_g": 250,
    "gordura_g": 60
  },
  "refeicoes": [
    {
      "name": "Nome da refeição",
      "time_of_day": "07:00",
      "notes": "Observação desta refeição",
      "foods": [
        {
          "name": "Nome do alimento",
          "quantity": "150",
          "unit": "g",
          "calories": 200,
          "substitutions": [
            { "name": "Alimento alternativo", "quantity": "150", "unit": "g" }
          ]
        }
      ]
    }
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
            content: `Você é a IA Nutricional LBFIT. Responda SEMPRE com JSON válido, sem markdown e sem texto adicional. Siga RIGOROSAMENTE o protocolo abaixo.\n\n${PROTOCOLO_NUTRICIONAL_LBFIT}`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 5000,
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
