// ── Shared Enums ─────────────────────────────────

export type Laterality = "bilateral" | "unilateral";
export type Side = "left" | "right" | "bilateral";

// ── Auth ─────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: UserRead;
}

// ── User ─────────────────────────────────────────

export interface UserRead {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface UserUpdate {
  name?: string;
  email?: string;
}

export interface UserPasswordUpdate {
  current_password: string;
  new_password: string;
}

export interface UserSettings {
  user_id: number;
  preferences: Record<string, unknown>;
  updated_at: string;
}

// ── Exercise ─────────────────────────────────────

export interface ExerciseRead {
  id: number;
  name: string;
  muscle_region_id: number | null;
  laterality: Laterality;
  created_by_user_id: number | null;
  is_public: boolean;
  execution_notes: string | null;
}

export interface ExerciseCreate {
  name: string;
  muscle_region_id?: number | null;
  laterality?: Laterality;
  is_public?: boolean;
  execution_notes?: string | null;
}

export interface ExerciseUpdate {
  name?: string;
  muscle_region_id?: number | null;
  laterality?: Laterality;
  is_public?: boolean;
  execution_notes?: string | null;
}

export interface MuscleGroup {
  id: number;
  name: string;
}

export interface MuscleRegion {
  id: number;
  name: string;
  group_id: number | null;
}

export interface ExerciseSetHistory {
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rir: number | null;
}

export interface ExerciseSessionHistory {
  session_id: number;
  performed_at: string;
  sets: ExerciseSetHistory[];
}

export interface Estimated1RmPoint {
  performed_at: string;
  estimated_1rm: number;
}

// ── Template ─────────────────────────────────────

export interface WorkoutTemplate {
  id: number;
  split_id: number | null;
  name: string;
  order_in_split: number | null;
}

export interface TemplateExercise {
  id: number;
  template_id: number | null;
  exercise_id: number | null;
  sets: number | null;
  reps: number | null;
  rir: number | null;
  order_in_template: number | null;
  pause_seconds: number | null;
  weight_kg: number | null;
  updated_at: string | null;
}

export interface TrainingSplit {
  id: number;
  user_id: number | null;
  name: string;
  description: string | null;
  created_at: string;
}

// ── Session ──────────────────────────────────────

export interface WorkoutSession {
  id: number;
  user_id: number | null;
  template_id: number | null;
  performed_at: string;
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  active_session: boolean;
}

export interface SessionSet {
  id: number;
  session_id: number | null;
  exercise_id: number | null;
  template_exercise_id: number | null;
  session_notes: string | null;
  set_number: number;
  side: Side | null;
  weight_kg: number | null;
  reps: number | null;
  rir: number | null;
  completed: boolean;
  personal_record?: { pr_type: string; value: number } | null;
}
