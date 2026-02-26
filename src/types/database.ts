export type UserRole = 'user' | 'personal' | 'admin'
export type ProfessionalType = 'personal' | 'nutritionist' | 'both'
export type PlanStatus = 'draft' | 'review' | 'sent'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  professional_type?: ProfessionalType | null
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  email: string
  role: UserRole
  professional_type?: ProfessionalType | null
  token: string
  invited_by: string | null
  used_at: string | null
  expires_at: string
  created_at: string
}

export interface Diet {
  id: string
  professional_id: string
  client_id: string | null
  name: string
  objective: string | null
  methodology: string | null
  notes: string | null
  status: PlanStatus
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface DietMeal {
  id: string
  diet_id: string
  name: string
  time_of_day: string | null
  foods: DietFood[]
  notes: string | null
  order_index: number
}

export interface DietFood {
  name: string
  quantity: string
  unit: string
  calories?: number
}

export interface Workout {
  id: string
  professional_id: string
  client_id: string | null
  name: string
  division: string | null
  methodology: string | null
  notes: string | null
  status: PlanStatus
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  division_label: string | null
  name: string
  sets: number | null
  reps: string | null
  rest_seconds: number | null
  notes: string | null
  order_index: number
}

export interface ProfessionalDocument {
  id: string
  professional_id: string
  document_type: 'CRN' | 'CREF'
  document_number: string | null
  file_url: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

// Extended types with joins
export interface DietWithMeals extends Diet {
  diet_meals: DietMeal[]
  professional?: Profile
  client?: Profile
}

export interface WorkoutWithExercises extends Workout {
  workout_exercises: WorkoutExercise[]
  professional?: Profile
  client?: Profile
}
