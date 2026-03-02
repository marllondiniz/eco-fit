import { NextRequest, NextResponse } from 'next/server'

const PROTOCOLO_LBFIT = `
Você é a IA de treinamento LBFIT. Siga RIGOROSAMENTE o protocolo abaixo ao montar qualquer plano de treino.

═══════════════════════════════════════════════════════════════
                    PROTOCOLO OFICIAL LBFIT
═══════════════════════════════════════════════════════════════

1. CLASSIFICAÇÃO DO ALUNO
   Classifique com base na anamnese:
   • Sedentário
   • Iniciante
   • Intermediário
   • Avançado

   Variáveis obrigatórias a considerar:
   - Frequência semanal (1–7x)
   - Tempo disponível por sessão
   - Objetivo principal
   - Modalidades adicionais praticadas
   - Lesões ou limitações
   - Prioridades musculares

2. DEFINIÇÃO DA DIVISÃO DE TREINO
   A divisão depende de frequência, volume por músculo, recuperação, modalidades externas e prioridades.
   Full Body pode ser utilizado em qualquer frequência.

   Diretrizes por frequência:
   1x/sem → Full Body obrigatório
   2x/sem → Full Body ou Upper/Lower
   3x/sem → Full Body / UL + Full / PPL rotativo
   4x/sem → UL 2x / PPL + Upper / Superior-Inferior / 4x Full Body
   5x/sem → PPL + UL / ABCDE / Superior-Inferior-Push-Pull-Legs / 5x Full Body
   6–7x/sem → PPL 2x / Especializações / Divisões híbridas / Full Body com volume diluído

   A divisão final sempre considera recuperação e distribuição adequada do volume semanal.

3. VOLUME SEMANAL POR GRUPAMENTO MUSCULAR (séries)
   Sedentário   → 6–8
   Iniciante    → 8–12
   Intermediário → 10–16
   Avançado     → 12–20 (podendo ultrapassar em casos específicos)

   Ajustes automáticos:
   - Prioridade muscular → +20–40%
   - Modalidade externa intensa → –20–40% no grupamento mais exigido
   - Lesão ou limitação → –30–50% + ajuste biomecânico

4. DISTRIBUIÇÃO DE EXERCÍCIOS POR DIA
   Full Body:
     Sedentário/Iniciante → 4–6
     Intermediário → 5–7
     Avançado → 6–8

   Divisões específicas:
     Sedentário/Iniciante → 5–7
     Intermediário → 6–8
     Avançado → 7–10

   A quantidade respeita volume semanal alvo, tempo disponível e capacidade de recuperação.

5. ORGANIZAÇÃO INTERNA DO TREINO
   Full Body: Intercalar grupamentos (ex: Perna → Peito → Costas → Ombro → Perna → Braço).
   Treinos específicos (Push, Pull, etc.): Finalizar o trabalho principal de um grupamento antes de iniciar o próximo.

6. PERIODIZAÇÃO
   Programas em blocos. Troca geralmente a cada 6 semanas.

   Plano Mensal (4 semanas) → 1 programa, 2 microciclos de 2 semanas.
     Ex: Sem 1-2 → 8-10 reps / Sem 3-4 → 10-12 reps

   Plano Trimestral (12 semanas) → 2 programas de 6 semanas, cada um com 3 microciclos de 2 semanas.
     Ex: Sem 1-2 → 8-10 / Sem 3-4 → 10-12 / Sem 5-6 → 6-8

   Após 6 semanas pode haver troca de exercícios, divisão ou estratégia.

7. SÉRIES, AQUECIMENTO E EXECUÇÃO
   As séries prescritas incluem:
   - Pelo menos 1 série inicial de aquecimento (12-15 reps, carga leve, sem falha)
   - As demais são séries de trabalho (falha técnica dentro da faixa)

8. PROGRESSÃO DE CARGA
   - Atingiu a faixa prescrita com boa execução → aumentar carga na próxima sessão
   - Não atingiu a faixa mínima → reduzir ~5-10%

9. INTERVALO DE DESCANSO
   - Compostos livres: 90-120s
   - Máquinas e isoladores: 60-90s

10. CONTROLE DE FADIGA
    Queda persistente, dor prolongada ou fadiga acumulada → reduzir volume em ~30% por 1 semana (deload).

11. AJUSTES POR LESÃO
    - Dor anterior no joelho: priorizar dominantes de quadril, excêntrico controlado, glúteos.
    - Lombalgia: reduzir carga axial, priorizar máquinas, unilateral, core.
    - Desconforto no ombro: reduzir desenvolvimento pesado, priorizar plano escapular e dorsais.

12. FLUXO OPERACIONAL
    Classificar aluno → Definir frequência e divisão → Calcular volume por músculo → Ajustar por prioridade/lesão/modalidade → Distribuir nos dias → Definir microciclo de reps → Selecionar exercícios → Aplicar aquecimento → Definir descanso → Aplicar progressão
`

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
    divisao            = 'A/B/C',
    clienteNome        = '',
    objetivo           = '',
    nivel              = '',
    restricoes         = '',
    localTreino        = '',
    disponibilidade    = '',
    tempoSessao        = '',
    modalidadesExtras  = '',
    prioridadesMusc    = '',
    observacoes        = '',
    duracaoSemanas     = '',
  } = body

  const labelMap: Record<string, string[]> = {
    'FullBody':     ['A'],
    'A/B':          ['A', 'B'],
    'A/B/C':        ['A', 'B', 'C'],
    'A/B/C/D':      ['A', 'B', 'C', 'D'],
    'A/B/C/D/E':    ['A', 'B', 'C', 'D', 'E'],
    'A/B/C/D/E/F':  ['A', 'B', 'C', 'D', 'E', 'F'],
  }
  const labels = labelMap[divisao] ?? ['A', 'B', 'C']

  const divisaoDescricao: Record<string, string> = {
    'FullBody':     'um único treino full body (Treino A)',
    'A/B':          'dois treinos alternados — Upper/Lower ou divisão A/B (Treino A e Treino B)',
    'A/B/C':        'três treinos rotativos — PPL ou divisão A/B/C (Treino A, Treino B e Treino C)',
    'A/B/C/D':      'quatro treinos — UL 2x, PPL+Upper, Superior-Inferior ou 4x Full Body (Treino A, B, C e D)',
    'A/B/C/D/E':    'cinco treinos — PPL+UL, ABCDE, Superior-Inferior-Push-Pull-Legs ou 5x Full Body (Treino A, B, C, D e E)',
    'A/B/C/D/E/F':  'seis treinos — PPL 2x, especializações ou divisões híbridas (Treino A, B, C, D, E e F)',
  }

  const duracaoNum = parseInt(duracaoSemanas, 10)
  const semanas = duracaoNum > 0 ? duracaoNum : 12

  let periodizacaoInstrucao = ''
  if (semanas <= 4) {
    periodizacaoInstrucao = `O plano tem ${semanas} semanas. Estruture como Plano Mensal: 1 programa com 2 microciclos de 2 semanas, variando a faixa de repetições entre eles (ex: Sem 1-2 → 8-10 reps, Sem 3-4 → 10-12 reps).`
  } else if (semanas <= 6) {
    periodizacaoInstrucao = `O plano tem ${semanas} semanas. Estruture como 1 programa com 3 microciclos de 2 semanas (ex: Sem 1-2 → 8-10, Sem 3-4 → 10-12, Sem 5-6 → 6-8).`
  } else {
    periodizacaoInstrucao = `O plano tem ${semanas} semanas. Estruture como Plano Trimestral: 2 programas de ~6 semanas cada, com 3 microciclos de 2 semanas por programa. Para este JSON, gere apenas o PRIMEIRO programa (primeiras 6 semanas).`
  }

  const prompt = `Siga o PROTOCOLO LBFIT acima para gerar o plano de treino.

DADOS DO CLIENTE:
- Nome: ${clienteNome || 'Não informado'}
- Objetivo principal: ${objetivo || 'Hipertrofia'}
- Nível / experiência: ${nivel || 'Não informado'}
- Frequência semanal: ${disponibilidade || 'Não informado'}x/semana
- Tempo disponível por sessão: ${tempoSessao || 'Não informado'}
- Local de treino: ${localTreino || 'Academia'}
- Modalidades adicionais: ${modalidadesExtras || 'Nenhuma'}
- Prioridades musculares: ${prioridadesMusc || 'Nenhuma'}
- Lesões / restrições / doenças: ${restricoes || 'Nenhuma'}
- Observações: ${observacoes || 'Nenhuma'}

CONFIGURAÇÃO ESCOLHIDA PELO PROFISSIONAL:
- Divisão: ${divisaoDescricao[divisao] ?? divisao}

PERIODIZAÇÃO:
${periodizacaoInstrucao}
Para cada exercício, no campo "reps", informe a faixa do PRIMEIRO microciclo (semanas 1-2). No campo "notes" de cada treino, descreva a progressão de microciclos (ex: "Microciclo 1 (Sem 1-2): 8-10 reps | Microciclo 2 (Sem 3-4): 10-12 reps | Microciclo 3 (Sem 5-6): 6-8 reps").

INSTRUÇÕES ADICIONAIS:
- Aplique TODO o protocolo LBFIT: classifique o aluno, calcule volume semanal por grupamento, ajuste por prioridades/lesões/modalidades externas, distribua exercícios corretamente.
- A primeira série de cada exercício é aquecimento (12-15 reps, carga leve). As demais são séries de trabalho.
- Use nomes de exercícios reais em português.
- No campo "methodology" de cada treino, explique a estratégia (classificação do aluno, volume semanal definido, justificativa da organização).
- No campo "notes" de cada treino, inclua a progressão dos microciclos e dicas de execução.
- Descanso: 90-120s para compostos livres, 60-90s para máquinas/isoladores.

Retorne APENAS um JSON válido (sem markdown, sem texto antes ou depois) neste formato exato:
{
  "classificacao": "Sedentário | Iniciante | Intermediário | Avançado",
  "volume_semanal": {
    "Peito": 12, "Costas": 14, "Ombros": 10, "Bíceps": 8, "Tríceps": 8,
    "Quadríceps": 12, "Posterior": 10, "Glúteos": 10, "Panturrilha": 6, "Abdômen": 6
  },
  "workouts": [
    ${labels.map(l => `{
      "label": "${l}",
      "name": "Nome descritivo do Treino ${l}",
      "methodology": "Estratégia e justificativa baseada no protocolo LBFIT",
      "notes": "Progressão dos microciclos e dicas",
      "exercises": [
        {
          "name": "Nome do exercício",
          "sets": 4,
          "reps": "8-12",
          "rest_seconds": 90,
          "notes": "1ª série: aquecimento 12-15 reps. Demais: trabalho até falha técnica."
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
            content: `Você é a IA de treinamento LBFIT. Responda SEMPRE com JSON válido, sem markdown e sem texto adicional. Siga RIGOROSAMENTE o protocolo abaixo.\n\n${PROTOCOLO_LBFIT}`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: labels.length <= 3 ? 6000 : labels.length <= 5 ? 10000 : 14000,
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

    return NextResponse.json({
      classificacao:  parsed.classificacao ?? null,
      volume_semanal: parsed.volume_semanal ?? null,
      workouts:       parsed.workouts ?? [],
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
