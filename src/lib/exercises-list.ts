export interface Exercise {
  name: string
  group: string
}

export const EXERCISE_LIST: Exercise[] = [
  // ── Peito ──────────────────────────────────────
  { name: 'Supino reto com barra',         group: 'Peito' },
  { name: 'Supino inclinado com barra',    group: 'Peito' },
  { name: 'Supino declinado com barra',    group: 'Peito' },
  { name: 'Supino reto com halteres',      group: 'Peito' },
  { name: 'Supino inclinado com halteres', group: 'Peito' },
  { name: 'Crucifixo reto',               group: 'Peito' },
  { name: 'Crucifixo inclinado',          group: 'Peito' },
  { name: 'Cross-over no cabo',           group: 'Peito' },
  { name: 'Pull-over com haltere',        group: 'Peito' },
  { name: 'Flexão de braço',             group: 'Peito' },
  { name: 'Flexão de braço inclinada',   group: 'Peito' },
  { name: 'Mergulho entre bancos',        group: 'Peito' },
  { name: 'Peck deck',                   group: 'Peito' },

  // ── Costas ─────────────────────────────────────
  { name: 'Barra fixa (pegada pronada)',   group: 'Costas' },
  { name: 'Barra fixa (pegada supinada)',  group: 'Costas' },
  { name: 'Puxada frente com barra',      group: 'Costas' },
  { name: 'Puxada frente com triângulo',  group: 'Costas' },
  { name: 'Puxada atrás',                group: 'Costas' },
  { name: 'Remada curvada com barra',     group: 'Costas' },
  { name: 'Remada unilateral com haltere',group: 'Costas' },
  { name: 'Remada cavalinho',             group: 'Costas' },
  { name: 'Remada baixa no cabo',         group: 'Costas' },
  { name: 'Remada alta no cabo',          group: 'Costas' },
  { name: 'Levantamento terra',           group: 'Costas' },
  { name: 'Hiperextensão lombar',         group: 'Costas' },
  { name: 'Serrote com haltere',          group: 'Costas' },
  { name: 'Pulldown no cabo',             group: 'Costas' },

  // ── Ombro ──────────────────────────────────────
  { name: 'Desenvolvimento com barra',     group: 'Ombro' },
  { name: 'Desenvolvimento com halteres',  group: 'Ombro' },
  { name: 'Desenvolvimento Arnold',        group: 'Ombro' },
  { name: 'Elevação lateral com halteres', group: 'Ombro' },
  { name: 'Elevação lateral no cabo',      group: 'Ombro' },
  { name: 'Elevação frontal com halteres', group: 'Ombro' },
  { name: 'Elevação frontal com barra',    group: 'Ombro' },
  { name: 'Encolhimento com halteres',     group: 'Ombro' },
  { name: 'Encolhimento com barra',        group: 'Ombro' },
  { name: 'Face pull no cabo',             group: 'Ombro' },
  { name: 'Rotação externa com haltere',   group: 'Ombro' },

  // ── Bíceps ─────────────────────────────────────
  { name: 'Rosca direta com barra',       group: 'Bíceps' },
  { name: 'Rosca direta com halteres',    group: 'Bíceps' },
  { name: 'Rosca alternada com halteres', group: 'Bíceps' },
  { name: 'Rosca concentrada',            group: 'Bíceps' },
  { name: 'Rosca martelo',               group: 'Bíceps' },
  { name: 'Rosca 21',                    group: 'Bíceps' },
  { name: 'Rosca no cabo',               group: 'Bíceps' },
  { name: 'Rosca Scott',                 group: 'Bíceps' },
  { name: 'Rosca inclinada',             group: 'Bíceps' },

  // ── Tríceps ────────────────────────────────────
  { name: 'Tríceps corda no cabo',           group: 'Tríceps' },
  { name: 'Tríceps barra no cabo',           group: 'Tríceps' },
  { name: 'Tríceps testa com barra',         group: 'Tríceps' },
  { name: 'Tríceps testa com haltere',       group: 'Tríceps' },
  { name: 'Tríceps mergulho (paralelas)',     group: 'Tríceps' },
  { name: 'Extensão de tríceps unilateral',  group: 'Tríceps' },
  { name: 'Kickback com haltere',            group: 'Tríceps' },
  { name: 'Supino fechado',                  group: 'Tríceps' },
  { name: 'Tríceps francês',                group: 'Tríceps' },

  // ── Pernas ─────────────────────────────────────
  { name: 'Agachamento livre com barra',  group: 'Pernas' },
  { name: 'Agachamento no Smith',         group: 'Pernas' },
  { name: 'Agachamento sumô',            group: 'Pernas' },
  { name: 'Agachamento frontal',         group: 'Pernas' },
  { name: 'Leg press 45°',              group: 'Pernas' },
  { name: 'Leg press horizontal',        group: 'Pernas' },
  { name: 'Extensão de joelhos',         group: 'Pernas' },
  { name: 'Flexão de joelhos deitado',   group: 'Pernas' },
  { name: 'Mesa flexora',               group: 'Pernas' },
  { name: 'Cadeira abdutora',           group: 'Pernas' },
  { name: 'Cadeira adutora',            group: 'Pernas' },
  { name: 'Avanço com halteres',        group: 'Pernas' },
  { name: 'Avanço com barra',           group: 'Pernas' },
  { name: 'Afundo búlgaro',            group: 'Pernas' },
  { name: 'Stiff com barra',            group: 'Pernas' },
  { name: 'Stiff com halteres',         group: 'Pernas' },
  { name: 'Levantamento terra romeno',   group: 'Pernas' },
  { name: 'Hack squat',                 group: 'Pernas' },
  { name: 'Step-up com halteres',        group: 'Pernas' },

  // ── Glúteos ────────────────────────────────────
  { name: 'Elevação pélvica com barra',      group: 'Glúteos' },
  { name: 'Elevação pélvica com haltere',    group: 'Glúteos' },
  { name: 'Glúteo 4 apoios no cabo',         group: 'Glúteos' },
  { name: 'Glúteo no Smith',                group: 'Glúteos' },
  { name: 'Abdução de quadril em pé',        group: 'Glúteos' },
  { name: 'Agachamento sumô com haltere',    group: 'Glúteos' },

  // ── Panturrilha ────────────────────────────────
  { name: 'Panturrilha em pé',        group: 'Panturrilha' },
  { name: 'Panturrilha sentado',      group: 'Panturrilha' },
  { name: 'Panturrilha no leg press', group: 'Panturrilha' },
  { name: 'Panturrilha unilateral',   group: 'Panturrilha' },

  // ── Abdômen ────────────────────────────────────
  { name: 'Abdominal crunch',       group: 'Abdômen' },
  { name: 'Prancha frontal',        group: 'Abdômen' },
  { name: 'Prancha lateral',        group: 'Abdômen' },
  { name: 'Abdominal bicicleta',    group: 'Abdômen' },
  { name: 'Elevação de pernas',     group: 'Abdômen' },
  { name: 'Russian twist',          group: 'Abdômen' },
  { name: 'Crunch no cabo',         group: 'Abdômen' },
  { name: 'Hollow body',            group: 'Abdômen' },
  { name: 'Abdominal infra',        group: 'Abdômen' },
  { name: 'Dead bug',               group: 'Abdômen' },

  // ── Cardio / Funcional ─────────────────────────
  { name: 'Polichinelo',           group: 'Cardio' },
  { name: 'Burpee',                group: 'Cardio' },
  { name: 'Mountain climber',      group: 'Cardio' },
  { name: 'Corrida na esteira',    group: 'Cardio' },
  { name: 'Bicicleta ergométrica', group: 'Cardio' },
  { name: 'Elíptico',             group: 'Cardio' },
  { name: 'Corda naval',          group: 'Cardio' },
  { name: 'Pular corda',          group: 'Cardio' },
  { name: 'Kettlebell swing',      group: 'Cardio' },
]
